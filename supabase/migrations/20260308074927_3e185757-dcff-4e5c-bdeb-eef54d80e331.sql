-- Add billing_period column to payments table to track monthly vs yearly
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly';

-- Add billing_period to user_profiles to know current billing cycle
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly';