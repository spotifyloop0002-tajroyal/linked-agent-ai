import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generatePostTrackingId, embedTrackingId } from "@/lib/postHelpers";
import { 
  parseScheduleTime, 
  validateScheduleTime, 
  formatRelativeScheduledTime,
  SCHEDULE_ERRORS 
} from "@/lib/scheduling";
import { 
  PostStatus, 
  validatePreflightForScheduling, 
  validatePreflightForPostNow,
  canEditPost,
  canDeletePost,
  canPostNow,
  isProcessingState,
  shouldArchivePost,
} from "@/lib/postLifecycle";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  uploadedImages?: string[]; // URLs of uploaded images for display
}

export interface PreviewPost {
  content: string;
  imageUrl?: string;
  agentType?: string;
}

export interface GeneratedPost {
  id: string;
  content: string;
  suggestedTime: string;
  reasoning: string;
  scheduledDateTime: string;
  generateImage?: boolean;
  imagePrompt?: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  status?: PostStatus;
  scheduledTime?: string; // ISO string for when to post
  trackingId?: string;
  dbId?: string; // Database ID after saving
  // NEW: Approval and lifecycle fields
  approved?: boolean;
  imageSkipped?: boolean;
  queuedAt?: string;
  extensionAckAt?: string;
  postedAt?: string;
}

export interface AgentSettings {
  type: string;
  tone: string;
  emojiLevel: number;
  postLength: string;
  voiceReference?: string;
}

export interface UserContext {
  name?: string;
  industry?: string;
}

// Storage keys for persistence - now user-specific with actual user ID
const CHAT_STORAGE_PREFIX = "linkedbot_chat_history_";
const POSTS_STORAGE_PREFIX = "linkedbot_generated_posts_";
const MAX_STORED_MESSAGES = 20;
const MAX_STORED_POSTS = 15;

// Generate a descriptive image prompt from post content
function generateImagePromptFromContent(content: string): string {
  const firstLine = content.split('\n').filter(l => l.trim())[0]?.trim() || 'Professional content';
  const clean = firstLine.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[^\w\s.,!?-]/g, '').trim().substring(0, 120);
  const lower = content.toLowerCase();
  const themes: string[] = [];
  if (lower.includes('ai') || lower.includes('artificial intelligence')) themes.push('AI technology');
  if (lower.includes('leader')) themes.push('leadership');
  if (lower.includes('tech') || lower.includes('software')) themes.push('technology');
  if (lower.includes('data') || lower.includes('analytics')) themes.push('data visualization');
  if (lower.includes('team') || lower.includes('collaboration')) themes.push('teamwork');
  if (lower.includes('sales') || lower.includes('marketing')) themes.push('marketing');
  if (lower.includes('health') || lower.includes('medical')) themes.push('healthcare');
  const themeStr = themes.length > 0 ? themes.join(', ') : 'professional business';
  return `Professional LinkedIn image: ${clean}, ${themeStr}, modern clean design, high quality`;
}

// Get user-specific storage keys — include user ID to prevent cross-user leakage
function getUserIdForStorage(): string {
  try {
    // Read from supabase session in localStorage
    const keys = Object.keys(localStorage);
    const sessionKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (sessionKey) {
      const session = JSON.parse(localStorage.getItem(sessionKey) || '{}');
      return session?.user?.id || 'anonymous';
    }
  } catch {
    // ignore
  }
  return 'anonymous';
}

function getChatStorageKey(agentId?: string | null): string {
  const uid = getUserIdForStorage();
  return `${CHAT_STORAGE_PREFIX}${uid}_${agentId || 'default'}`;
}
function getPostsStorageKey(agentId?: string | null): string {
  const uid = getUserIdForStorage();
  return `${POSTS_STORAGE_PREFIX}${uid}_${agentId || 'default'}`;
}

// Agent type specific welcome messages
const agentWelcomeMessages: Record<string, { intro: string; samples: string[] }> = {
  comedy: {
    intro: "Ready to make your network laugh! 😄 I specialize in witty, humorous content.",
    samples: ["Monday motivation (with a twist)", "Tech industry stereotypes", "Office culture observations"]
  },
  professional: {
    intro: "I'll help you craft polished, industry-focused content that positions you as a thought leader.",
    samples: ["Industry best practices", "Leadership lessons learned", "Career growth strategies"]
  },
  storytelling: {
    intro: "Let's turn your experiences into compelling narratives! 📖",
    samples: ["Your career journey moments", "Lessons from failure", "A mentor who changed your path"]
  },
  "thought-leadership": {
    intro: "Time to share bold ideas! 💡 I help you craft contrarian takes.",
    samples: ["Unpopular industry opinions", "Future predictions for your field", "What most people miss about..."]
  },
  motivational: {
    intro: "Let's inspire your network! ✨",
    samples: ["Overcoming challenges", "Celebrating small wins", "Advice for your younger self"]
  },
  "data-analytics": {
    intro: "Let's make your insights data-driven! 📊",
    samples: ["Industry statistics breakdown", "Market trends analysis", "Data-backed predictions"]
  },
  creative: {
    intro: "Time to get creative! 🎨",
    samples: ["Design thinking in action", "Creative process insights", "Innovation tips"]
  },
  news: {
    intro: "Stay current and relevant! 📰",
    samples: ["Breaking industry news", "Company announcements", "Weekly industry roundup"]
  }
};

function getInitialMessage(agentType: string): ChatMessage {
  const config = agentWelcomeMessages[agentType] || agentWelcomeMessages.professional;
  
  return {
    role: "assistant",
    content: `Hi — I'm your LinkedIn posting agent powered by AI. ${config.intro}

I can help you:
• **Create posts** with real-time research
• **Schedule** posts for optimal times
• **Post immediately** to LinkedIn

**Sample topics:**
${config.samples.map(s => `• ${s}`).join('\n')}

What should we write about?`,
    timestamp: new Date(),
  };
}

// Load from localStorage
function loadStoredMessages(agentId?: string | null): ChatMessage[] {
  try {
    const stored = localStorage.getItem(getChatStorageKey(agentId));
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }));
    }
  } catch (error) {
    console.error("Error loading chat history:", error);
  }
  return [];
}

function loadStoredPosts(agentId?: string | null): GeneratedPost[] {
  try {
    const stored = localStorage.getItem(getPostsStorageKey(agentId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading generated posts:", error);
  }
  return [];
}

export function useAgentChat(
  agentSettings: AgentSettings,
  userContext: UserContext = {},
  agentId?: string | null
) {
  // Initialize with welcome message (DB load happens in useEffect)
  const [messages, setMessages] = useState<ChatMessage[]>([getInitialMessage(agentSettings.type)]);
  const [dbLoaded, setDbLoaded] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [previewPost, setPreviewPost] = useState<PreviewPost | null>(null);
  
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>(() => {
    const stored = loadStoredPosts(agentId);
    return stored;
  });

  // Load chat history from database on mount
  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Fall back to localStorage
          const stored = loadStoredMessages(agentId);
          if (stored.length > 0) setMessages(stored);
          setDbLoaded(true);
          return;
        }

        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .eq('agent_id', agentId || '')
          .order('created_at', { ascending: true })
          .limit(MAX_STORED_MESSAGES);

        if (error) {
          console.warn('Failed to load chat from DB, using localStorage:', error);
          const stored = loadStoredMessages(agentId);
          if (stored.length > 0) setMessages(stored);
        } else if (data && data.length > 0) {
          const dbMessages: ChatMessage[] = data.map((m: any) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.created_at),
            uploadedImages: m.uploaded_images || undefined,
          }));
          setMessages(dbMessages);
        }
      } catch (err) {
        console.warn('DB chat load error:', err);
        const stored = loadStoredMessages(agentId);
        if (stored.length > 0) setMessages(stored);
      }
      setDbLoaded(true);
    };

    loadFromDb();
  }, [agentId]);

  // Save new messages to database (debounced via message additions)
  const saveMessageToDb = useCallback(async (msg: ChatMessage) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !agentId) return;

      await supabase.from('chat_messages').insert({
        user_id: user.id,
        agent_id: agentId,
        role: msg.role,
        content: msg.content,
        uploaded_images: msg.uploadedImages || null,
      });
    } catch (err) {
      console.warn('Failed to save message to DB:', err);
    }
  }, [agentId]);

  // Also keep localStorage as fallback
  useEffect(() => {
    if (messages.length > 0 && dbLoaded) {
      try {
        const messagesToStore = messages.slice(-MAX_STORED_MESSAGES);
        localStorage.setItem(getChatStorageKey(agentId), JSON.stringify(messagesToStore));
      } catch (error) {
        console.error("Error saving chat history:", error);
      }
    }
  }, [messages, agentId, dbLoaded]);

  // Save posts to localStorage when they change (cap to prevent OOM)
  useEffect(() => {
    try {
      const postsToStore = generatedPosts.slice(0, MAX_STORED_POSTS);
      localStorage.setItem(getPostsStorageKey(agentId), JSON.stringify(postsToStore));
    } catch (error) {
      console.error("Error saving posts:", error);
      // If storage is full, clear old data
      try { localStorage.removeItem(getPostsStorageKey(agentId)); } catch {}
    }
  }, [generatedPosts, agentId]);

  const sendMessage = useCallback(async (message: string, options?: { generateImage?: boolean; uploadedImages?: string[] }): Promise<any> => {
    if (!message.trim() || isLoading) return;

    console.log("=== useAgentChat.sendMessage ===");
    console.log("Message:", message);
    console.log("Options:", options);

    // Store image URLs for display in chat (clean display version)
    const displayImages = options?.uploadedImages ?? [];
    
    // Create display message (without the [UPLOADED_IMAGES:] marker for cleaner chat)
    const displayContent = message.replace(/\[UPLOADED_IMAGES:[^\]]+\]/g, "").trim() || 
      (displayImages.length > 0 ? "Create posts for these images" : message);
    
    const userMessage: ChatMessage = { 
      role: "user", 
      content: displayContent,
      timestamp: new Date(),
      uploadedImages: displayImages.length > 0 ? displayImages : undefined,
    };
    setMessages(prev => [...prev, userMessage]);
    saveMessageToDb(userMessage);
    setIsLoading(true);

    try {
      // Only send lightweight summaries of generated posts to avoid OOM
      const postSummaries = generatedPosts.slice(0, 5).map(p => ({
        id: p.id,
        content: p.content?.substring(0, 200),
        status: p.status,
        approved: p.approved,
      }));

      const requestBody = {
        message,
        history: [...messages, userMessage].slice(-8).map(m => ({
          role: m.role,
          content: m.content.substring(0, 500),
        })),
        agentSettings,
        userContext,
        generatedPosts: postSummaries,
        generateImage: options?.generateImage ?? false,
        uploadedImages: options?.uploadedImages ?? [],
      };

      // CRITICAL: Log what we're sending to edge function
      console.log("🚀 Sending to edge function:", {
        message,
        generatedPostsCount: generatedPosts.length,
        generatedPosts: generatedPosts.map(p => ({ id: p.id, content: p.content?.substring(0, 50) })),
      });

      const invokeAgentChatWithTimeout = async (attempt = 1): Promise<{ data: any; error: any }> => {
        const timeoutMs = 55000; // 55s — allow time for context fetch + AI call chain
        let timeoutId: number | undefined;

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => {
            reject(new Error("Agent request timed out. Please try again."));
          }, timeoutMs);
        });

        try {
          const result = await Promise.race([
            supabase.functions.invoke("agent-chat", { body: requestBody }),
            timeoutPromise,
          ]);
          return result as { data: any; error: any };
        } catch (err: any) {
          const msg = String(err?.message || "").toLowerCase();
          const isRetryable =
            attempt === 1 &&
            (msg.includes("timed out") ||
              msg.includes("failed to send a request") ||
              msg.includes("functionshttperror") ||
              msg.includes("network") ||
              msg.includes("fetch"));

          if (isRetryable) {
            console.warn("Retrying agent-chat request after transient failure...");
            await new Promise(resolve => window.setTimeout(resolve, 800));
            return invokeAgentChatWithTimeout(2);
          }

          throw err;
        } finally {
          if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
          }
        }
      };

      const { data, error } = await invokeAgentChatWithTimeout();

      console.log("Agent response:", data);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      saveMessageToDb(assistantMessage);

      // Handle preview response (for image uploads) - show scheduling dialog
      if (data.type === "post_preview" && data.previewPost) {
        console.log("📸 Received preview post - showing scheduling dialog");
        setPreviewPost({
          content: data.previewPost.content,
          imageUrl: data.previewPost.imageUrl,
          agentType: data.previewPost.agentType,
        });
        // Don't add to generatedPosts yet - wait for user confirmation
        return data;
      }

      // Handle auto_schedule response - return data for parent to handle
      if (data.type === "auto_schedule" && data.postToSchedule && data.scheduledTime) {
        console.log("📅 Auto-schedule response received");
        return data;
      }

      // ALWAYS add posts to generatedPosts IMMEDIATELY when received
      console.log("📦 Response data:", { type: data.type, postsCount: data.posts?.length });
      
      // Add posts regardless of response type (posts_generated, message, etc)
      if (data.posts && data.posts.length > 0) {
        console.log("🔥 ADDING POSTS TO STATE NOW:", data.posts.length);
        console.log("🔥 Post content:", data.posts[0]?.content?.substring(0, 100));
        
        const newPosts: GeneratedPost[] = data.posts.map((p: any) => {
          const postId = p.id || `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          // If generateImage was requested, create a content-based prompt but DON'T auto-generate
          const shouldGenerateImage = p.generateImage || options?.generateImage;
          const autoPrompt = shouldGenerateImage ? generateImagePromptFromContent(p.content) : undefined;
          
          return {
            ...p,
            id: postId,
            status: 'draft' as PostStatus,
            approved: false,
            imageSkipped: false,
            generateImage: shouldGenerateImage || false,
            imagePrompt: p.imagePrompt || autoPrompt || '',
          };
        });
        
        // CRITICAL: Add to generated posts immediately
        setGeneratedPosts(prev => {
          const updated = [...newPosts, ...prev];
          console.log("✅ generatedPosts NOW HAS:", updated.length, "posts");
          return updated;
        });
        
        const imageNote = newPosts.some(p => p.generateImage) 
          ? ' Toggle the AI image switch on the post card to generate.' 
          : '';
        toast.success(`📝 Post created! Say "post now" or give a time to schedule.${imageNote}`);
      } else {
        console.log("⚠️ No posts in response to add");
      }

      return data;

    } catch (error: any) {
      console.error("Chat error:", error);
      
      // Provide user-friendly error message
      let userMessage = "Please try again.";
      if (error.message?.includes("timed out")) {
        userMessage = "Request timed out. Please try again.";
      } else if (error.message?.includes("Failed to send a request") || error.message?.includes("FunctionsHttpError")) {
        userMessage = "Server is temporarily unavailable. Please try again in a moment.";
      } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
        userMessage = "Network error. Please check your connection and try again.";
      }
      
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Sorry, I encountered an error. ${userMessage}`,
        timestamp: new Date(),
      }]);
      toast.error("Failed to send message", { description: userMessage });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [messages, agentSettings, userContext, isLoading, generatedPosts]);

  const resetChat = useCallback(async () => {
    setMessages([getInitialMessage(agentSettings.type)]);
    setGeneratedPosts([]);
    localStorage.removeItem(getChatStorageKey(agentId));
    localStorage.removeItem(getPostsStorageKey(agentId));
    
    // Clear from database too
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && agentId) {
        await supabase.from('chat_messages')
          .delete()
          .eq('user_id', user.id)
          .eq('agent_id', agentId);
      }
    } catch (err) {
      console.warn('Failed to clear DB chat:', err);
    }
    
    toast.success("Chat history cleared");
  }, [agentSettings.type, agentId]);

  const clearHistory = useCallback(() => {
    resetChat();
  }, [resetChat]);

  const updatePost = useCallback((postId: string, updates: Partial<GeneratedPost>) => {
    setGeneratedPosts(prev =>
      prev.map(post => post.id === postId ? { ...post, ...updates } : post)
    );
  }, []);

  const deletePost = useCallback((postId: string) => {
    setGeneratedPosts(prev => prev.filter(post => post.id !== postId));
    toast.success("Post removed");
  }, []);

  const regeneratePost = useCallback(async (
    postId: string, 
    settings: AgentSettings, 
    context: UserContext
  ) => {
    const post = generatedPosts.find(p => p.id === postId);
    if (!post) return;

    setGeneratedPosts(prev =>
      prev.map(p => p.id === postId ? { ...p, isGeneratingImage: true } : p)
    );

    try {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          message: `Regenerate a post similar to: ${post.content.substring(0, 100)}`,
          history: [],
          agentSettings: settings,
          userContext: context,
        },
      });

      if (error) throw error;
      if (data.posts?.[0]) {
        setGeneratedPosts(prev =>
          prev.map(p => p.id === postId ? { 
            ...data.posts[0], 
            id: postId,
            scheduledDateTime: p.scheduledDateTime 
          } : p)
        );
        toast.success("Post regenerated!");
      }
    } catch (error) {
      toast.error("Failed to regenerate post");
    } finally {
      setGeneratedPosts(prev =>
        prev.map(p => p.id === postId ? { ...p, isGeneratingImage: false } : p)
      );
    }
  }, [generatedPosts]);

  const generateImageForPost = useCallback(async (postId: string) => {
    const post = generatedPosts.find(p => p.id === postId);
    if (!post) return;
    await generateImageForPostDirect(postId, post.content, post.imagePrompt);
  }, [generatedPosts]);

  // Direct image generation that doesn't depend on generatedPosts state
  const generateImageForPostDirect = useCallback(async (postId: string, content: string, imagePrompt?: string) => {
    setGeneratedPosts(prev =>
      prev.map(p => p.id === postId ? { ...p, isGeneratingImage: true } : p)
    );

    try {
      const { data, error } = await supabase.functions.invoke("generate-post-image", {
        body: {
          prompt: imagePrompt,
          postContent: content,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedPosts(prev =>
        prev.map(p => p.id === postId ? { 
          ...p, 
          imageUrl: data.imageUrl,
          isGeneratingImage: false 
        } : p)
      );
      toast.success("Image generated!");
    } catch (error: any) {
      console.error("Image generation error:", error);
      toast.error(error.message || "Failed to generate image");
      setGeneratedPosts(prev =>
        prev.map(p => p.id === postId ? { ...p, isGeneratingImage: false } : p)
      );
    }
  }, []);

  // Validate post content before saving
  const isValidPostContent = (content: string): boolean => {
    if (!content || content.trim().length < 20) return false;
    // Reject JSON-looking content (AI hallucinations)
    if (content.trim().startsWith('{') && content.includes('"action"')) return false;
    if (content.includes('"action_input"')) return false;
    if (content.includes('dalle.text2im')) return false;
    return true;
  };

  // Save post to database with tracking ID
  const savePostToDatabase = useCallback(async (
    post: GeneratedPost,
    scheduledTime?: Date
  ): Promise<GeneratedPost | null> => {
    try {
      // Validate content first
      if (!isValidPostContent(post.content)) {
        toast.error("Invalid post content. Please generate a new post.");
        console.error("❌ Rejected invalid post content:", post.content.substring(0, 100));
        return null;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to save posts");
        return null;
      }

      // Generate tracking ID
      const trackingId = generatePostTrackingId();
      const contentWithTracking = embedTrackingId(post.content, trackingId);

      // ✅ CLEAN ARCHITECTURE: Website ONLY inserts with status='pending'
      // Extension updates to: posting, posted, failed
      const { data: savedPost, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: post.content,
          content_with_tracking: contentWithTracking,
          tracking_id: trackingId,
          photo_url: post.imageUrl || null,
          status: 'pending', // ✅ ALWAYS 'pending' - extension owns status updates
          scheduled_time: scheduledTime?.toISOString() || null,
          agent_id: agentId || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Save post error:", error);
        throw error;
      }

      console.log("✅ Post saved to database with status=pending:", savedPost.id);
      
      // Return updated post with DB info
      return {
        ...post,
        dbId: savedPost.id,
        trackingId: trackingId,
        status: 'pending' as PostStatus, // Always pending
        scheduledTime: scheduledTime?.toISOString(),
      };
    } catch (err) {
      console.error("Failed to save post:", err);
      toast.error("Failed to save post to database");
      return null;
    }
  }, [agentId]);

  // Confirm preview post and add to generated posts
  const confirmPreviewPost = useCallback(async (scheduledTime?: Date) => {
    if (!previewPost) return null;
    
    const newPost: GeneratedPost = {
      id: `post-${Date.now()}`,
      content: previewPost.content,
      suggestedTime: (scheduledTime || new Date()).toISOString(),
      reasoning: "Created from preview",
      scheduledDateTime: (scheduledTime || new Date()).toISOString(),
      imageUrl: previewPost.imageUrl,
      status: 'pending' as PostStatus, // ✅ Always pending
    };
    
    // Save to database
    const savedPost = await savePostToDatabase(newPost, scheduledTime);
    
    if (savedPost) {
      setGeneratedPosts(prev => [savedPost, ...prev]);
      setPreviewPost(null);
      toast.success(scheduledTime ? "Post scheduled!" : "Post created!");
      return savedPost;
    }
    
    // Fallback to local-only if DB save fails
    setGeneratedPosts(prev => [newPost, ...prev]);
    setPreviewPost(null);
    return newPost;
  }, [previewPost, savePostToDatabase]);

  // Clear preview
  const clearPreview = useCallback(() => {
    setPreviewPost(null);
  }, []);

  return {
    messages,
    isLoading,
    generatedPosts,
    previewPost,
    sendMessage,
    resetChat,
    clearHistory,
    updatePost,
    deletePost,
    regeneratePost,
    generateImageForPost,
    setGeneratedPosts,
    confirmPreviewPost,
    clearPreview,
    savePostToDatabase,
  };
}
