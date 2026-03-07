import { supabase } from '@/integrations/supabase/client';
import type { AnalyticsScrapeResult, BulkAnalyticsResultMessage } from '@/types/extension';
import { sanitizeAnalytics } from '@/lib/analyticsSanitizer';

// ============================================================================
// v5.0 - ANALYTICS SCRAPING WITH AUTO-TRIGGER ON EXTENSION READY
// ============================================================================

let extensionConnected = false;
let cronInterval: ReturnType<typeof setInterval> | null = null;
let isScrapingInProgress = false;
let messageListenerAttached = false;
let messageHandler: ((event: MessageEvent) => void) | null = null;

// ============================================================================
// SCRAPE ALL POST ANALYTICS (v5.0 BULK)
// ============================================================================

export async function scrapeAllPostAnalytics() {
  if (isScrapingInProgress) {
    console.log('📊 Scraping already in progress, skipping...');
    return;
  }

  console.log('📊 Starting v5.0 bulk analytics scraping');
  
  try {
    isScrapingInProgress = true;
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('📊 No authenticated user - skipping analytics scrape');
      return;
    }

    // Get all posts from last 30 days that have LinkedIn URLs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, linkedin_post_url')
      .eq('user_id', user.id)
      .not('linkedin_post_url', 'is', null)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('status', 'posted')
      .order('posted_at', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch posts:', error);
      return;
    }
    
    if (!posts || posts.length === 0) {
      console.log('📊 No posts with LinkedIn URLs to scrape');
      return;
    }
    
    // Extract URLs (max 30 to avoid rate limits)
    const postUrls = posts
      .map(p => p.linkedin_post_url)
      .filter((url): url is string => url !== null)
      .slice(0, 30);
    
    console.log(`📊 Requesting bulk scrape for ${postUrls.length} posts...`);
    
    // v5.0 - Send bulk scrape request
    window.postMessage({
      type: 'SCRAPE_BULK_ANALYTICS',
      postUrls: postUrls
    }, '*');
    
  } catch (error) {
    console.error('❌ Analytics scrape initiation failed:', error);
  } finally {
    // Reset after timeout (in case no response)
    setTimeout(() => {
      isScrapingInProgress = false;
    }, 120000); // 2 minute timeout
  }
}

// ============================================================================
// HANDLE ANALYTICS RESULTS
// ============================================================================

async function handleAnalyticsResults(data: BulkAnalyticsResultMessage) {
  isScrapingInProgress = false;
  
  if (!data.success) {
    console.error('❌ Bulk scraping failed:', data.error);
    return;
  }
  
  console.log(`📊 Received analytics for ${data.successful}/${data.total} posts`);
  
  // Update each post in database
  for (const result of data.results) {
    if (result.success && result.analytics) {
      await updatePostAnalytics(result.url, result.analytics);
    }
  }
  
  console.log('✅ Analytics scraping complete');
}

async function handleSingleAnalyticsResult(data: { 
  success: boolean; 
  postUrl: string; 
  analytics?: AnalyticsScrapeResult; 
  error?: string 
}) {
  if (!data.success) {
    console.error(`❌ Scraping failed for ${data.postUrl}:`, data.error);
    return;
  }
  
  if (data.analytics) {
    await updatePostAnalytics(data.postUrl, data.analytics);
  }
}

// ============================================================================
// UPDATE DATABASE WITH ANALYTICS
// ============================================================================

async function updatePostAnalytics(postUrl: string, analytics: AnalyticsScrapeResult) {
  try {
    const safe = sanitizeAnalytics(analytics);

    console.log('💾 Updating post analytics:', {
      url: postUrl.substring(0, 50) + '...',
      views: safe.views,
      likes: safe.likes,
      comments: safe.comments,
      shares: safe.shares,
    });

    const { error } = await supabase
      .from('posts')
      .update({
        views_count: safe.views,
        likes_count: safe.likes,
        comments_count: safe.comments,
        shares_count: safe.shares,
        last_synced_at: analytics.scrapedAt || new Date().toISOString()
      })
      .eq('linkedin_post_url', postUrl);
    
    if (error) {
      console.error('Update failed for', postUrl, ':', error);
    } else {
      console.log('✅ Updated analytics for:', postUrl.substring(0, 50) + '...');
    }
  } catch (error) {
    console.error('Failed to update analytics:', error);
  }
}

// ============================================================================
// v5.0 MESSAGE LISTENERS
// ============================================================================

function setupMessageListeners() {
  if (messageListenerAttached) return;
  
  messageHandler = (event: MessageEvent) => {
    if (event.source !== window) return;
    
    const message = event.data;
    
    if (message.type === 'EXTENSION_READY_FOR_SCRAPING') {
      console.log('🚀 Extension ready for scraping - triggering auto-scrape...');
      extensionConnected = true;
      setTimeout(() => { scrapeAllPostAnalytics(); }, 2000);
    }
    
    if (message.type === 'EXTENSION_CONNECTED') {
      extensionConnected = true;
      console.log('📊 Analytics cron: Extension connected');
    }
    
    if (message.type === 'EXTENSION_STATUS' && message.connected) {
      extensionConnected = true;
      console.log('📊 Analytics cron: Extension status confirmed connected');
      // Trigger scrape if we just learned the extension is connected
      setTimeout(() => { scrapeAllPostAnalytics(); }, 3000);
    }
    
    if (message.type === 'EXTENSION_DISCONNECTED') {
      extensionConnected = false;
    }
    
    if (message.type === 'BULK_ANALYTICS_RESULT') {
      handleAnalyticsResults(message as BulkAnalyticsResultMessage);
    }
    
    if (message.type === 'ANALYTICS_RESULT') {
      handleSingleAnalyticsResult(message);
    }
  };
  
  window.addEventListener('message', messageHandler);
  messageListenerAttached = true;
}

// ============================================================================
// START/STOP CRON JOB
// ============================================================================

export function startAnalyticsCron() {
  // Prevent multiple initializations
  if (cronInterval) {
    console.log('⏰ Analytics cron already running');
    return;
  }

  console.log('⏰ Starting v5.0 analytics cron (auto-scrape + every 2 hours)');
  
  // Setup message listeners
  setupMessageListeners();
  
  // Check if extension was already connected before we started listening
  const wasConnected = localStorage.getItem('extension_connected') === 'true';
  if (wasConnected) {
    console.log('⏰ Extension was already connected, marking as connected');
    extensionConnected = true;
  }
  
  // Also send a check message to confirm current state
  window.postMessage({ type: 'CHECK_EXTENSION' }, '*');
  
  // Run initial scrape after delay (if extension already connected)
  setTimeout(() => {
    if (extensionConnected) {
      scrapeAllPostAnalytics();
    }
  }, 5000);
  
  // Then run every 2 hours
  cronInterval = setInterval(() => {
    if (extensionConnected) {
      scrapeAllPostAnalytics();
    } else {
      console.log('⏰ Extension not connected - skipping scheduled scrape');
    }
  }, 2 * 60 * 60 * 1000); // 2 hours
}

export function stopAnalyticsCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
  if (messageHandler) {
    window.removeEventListener('message', messageHandler);
    messageHandler = null;
    messageListenerAttached = false;
  }
  console.log('⏰ Analytics cron stopped');
}

// ============================================================================
// MANUAL TRIGGER (for UI button)
// ============================================================================

export function triggerManualScrape() {
  if (!extensionConnected) {
    console.warn('Cannot scrape - extension not connected');
    return false;
  }
  
  scrapeAllPostAnalytics();
  return true;
}

// ============================================================================
// SCRAPE SINGLE POST (on-demand)
// ============================================================================

export function scrapeSinglePost(postUrl: string) {
  if (!extensionConnected) {
    console.warn('Cannot scrape - extension not connected');
    return false;
  }
  
  window.postMessage({
    type: 'SCRAPE_ANALYTICS',
    postUrl: postUrl
  }, '*');
  
  return true;
}
