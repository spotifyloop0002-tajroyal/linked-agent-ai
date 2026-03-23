import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DAILY_LIMITS = {
  free: 1,
  pro: 3,
  business: 4,
  custom: 999,
} as const;

export const MONTHLY_LIMITS = {
  free: 5,
  pro: 60,
  business: 100,
  custom: 9999,
} as const;

export type PlanType = keyof typeof DAILY_LIMITS;

interface PostingLimitsStatus {
  plan: PlanType;
  postsToday: number;
  postsThisMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
  canPost: boolean;
  remainingToday: number;
  remainingThisMonth: number;
  limitMessage: string | null;
}

export const usePostingLimits = (autoCheck = true) => {
  const [status, setStatus] = useState<PostingLimitsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(autoCheck);

  const checkLimits = useCallback(async (): Promise<PostingLimitsStatus | null> => {
    try {
      setIsLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setStatus(null);
        return null;
      }
      const user = session.user;

      const { data: profile } = await supabase
        .from('user_profiles_safe')
        .select('subscription_plan')
        .eq('user_id', user.id)
        .maybeSingle();

      const plan = (profile?.subscription_plan as PlanType) || 'free';
      const dailyLimit = DAILY_LIMITS[plan] || DAILY_LIMITS.free;
      const monthlyLimit = MONTHLY_LIMITS[plan] || MONTHLY_LIMITS.free;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { count: postedToday } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['posted', 'pending', 'posting', 'draft'])
        .gte('scheduled_time', todayStart.toISOString())
        .lte('scheduled_time', todayEnd.toISOString());

      const { count: postsThisMonth } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['posted', 'pending', 'posting', 'draft'])
        .gte('created_at', monthStart.toISOString());

      const todayCount = postedToday || 0;
      const monthCount = postsThisMonth || 0;

      const canPostDaily = todayCount < dailyLimit;
      const canPostMonthly = monthCount < monthlyLimit;
      const canPost = canPostDaily && canPostMonthly;

      let limitMessage: string | null = null;
      if (!canPostDaily) {
        limitMessage = `⚠️ Daily limit reached. You can create ${dailyLimit} post${dailyLimit > 1 ? 's' : ''}/day on the ${plan} plan. Upgrade for more!`;
      } else if (!canPostMonthly) {
        limitMessage = `⚠️ Monthly limit reached. You can create ${monthlyLimit} posts/month on the ${plan} plan. Upgrade for more!`;
      }

      const nextStatus: PostingLimitsStatus = {
        plan,
        postsToday: todayCount,
        postsThisMonth: monthCount,
        dailyLimit,
        monthlyLimit,
        canPost,
        remainingToday: Math.max(0, dailyLimit - todayCount),
        remainingThisMonth: Math.max(0, monthlyLimit - monthCount),
        limitMessage,
      };

      setStatus(nextStatus);
      return nextStatus;
    } catch (error) {
      console.error('Error checking posting limits:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoCheck) {
      checkLimits();
    } else {
      setIsLoading(false);
    }
  }, [autoCheck, checkLimits]);

  const incrementPostCount = useCallback(async () => {
    await checkLimits();
  }, [checkLimits]);

  return {
    status,
    isLoading,
    checkLimits,
    incrementPostCount,
    canPost: autoCheck ? (isLoading ? false : (status?.canPost ?? false)) : (status?.canPost ?? true),
    limitMessage: status?.limitMessage ?? null,
  };
};