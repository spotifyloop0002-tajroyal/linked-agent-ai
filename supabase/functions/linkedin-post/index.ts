import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { postId, content, imageUrl, userId: bodyUserId } = body;

    // Determine the user: either from auth header (client call) or from body (server/cron call)
    let userId: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader !== `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`) {
      // Client-side call: validate user token
      const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (!userError && user) {
        userId = user.id;
      }
    }

    // If no authenticated user, check if userId was passed (server-to-server / cron call)
    if (!userId && bodyUserId) {
      userId = bodyUserId;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Not authenticated and no userId provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!content) {
      return new Response(
        JSON.stringify({ error: "content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's LinkedIn credentials
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("linkedin_id, linkedin_access_token, linkedin_token_expires_at")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.linkedin_access_token || !profile?.linkedin_id) {
      if (postId) {
        await supabaseAdmin.from("posts").update({
          status: "failed",
          last_error: "LinkedIn not connected. Please connect your LinkedIn account.",
        }).eq("id", postId);
      }
      return new Response(
        JSON.stringify({ error: "LinkedIn not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check token expiry
    if (profile.linkedin_token_expires_at && new Date(profile.linkedin_token_expires_at) <= new Date()) {
      if (postId) {
        await supabaseAdmin.from("posts").update({
          status: "failed",
          last_error: "LinkedIn token expired. Please reconnect your LinkedIn account.",
        }).eq("id", postId);
      }
      return new Response(
        JSON.stringify({ error: "LinkedIn token expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update post to "posting" status
    if (postId) {
      await supabaseAdmin.from("posts").update({ status: "posting" }).eq("id", postId);
    }

    const accessToken = profile.linkedin_access_token;
    const linkedinPersonId = profile.linkedin_id;

    let linkedinPostId: string | null = null;

    if (imageUrl) {
      // Post with image
      const registerRes = await fetch(
        "https://api.linkedin.com/v2/assets?action=registerUpload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
              owner: `urn:li:person:${linkedinPersonId}`,
              serviceRelationships: [
                { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
              ],
            },
          }),
        }
      );

      if (!registerRes.ok) {
        const errText = await registerRes.text();
        throw new Error(`Image registration failed: ${errText}`);
      }

      const registerData = await registerRes.json();
      const uploadUrl = registerData.value.uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ].uploadUrl;
      const asset = registerData.value.asset;

      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: imageBuffer,
      });

      const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: `urn:li:person:${linkedinPersonId}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: content },
              shareMediaCategory: "IMAGE",
              media: [{ status: "READY", media: asset }],
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });

      if (!postRes.ok) {
        const errText = await postRes.text();
        throw new Error(`LinkedIn post failed: ${errText}`);
      }

      const postData = await postRes.json();
      linkedinPostId = postData.id;
    } else {
      // Text-only post
      const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: `urn:li:person:${linkedinPersonId}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: content },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });

      if (!postRes.ok) {
        const errText = await postRes.text();
        throw new Error(`LinkedIn post failed: ${errText}`);
      }

      const postData = await postRes.json();
      linkedinPostId = postData.id;
    }

    // Update post in database
    // LinkedIn UGC API returns urn:li:ugcPost:XXX or urn:li:share:XXX
    // Use the original URN directly — share/ugcPost IDs ≠ activity IDs
    let linkedinPostUrl: string | null = null;
    if (linkedinPostId) {
      // Use the original URN as-is in the feed/update URL
      linkedinPostUrl = `https://www.linkedin.com/feed/update/${linkedinPostId}`;
      console.log('📎 LinkedIn post URL:', linkedinPostUrl, '(from ID:', linkedinPostId, ')');
    }

    if (postId) {
      await supabaseAdmin.from("posts").update({
        status: "posted",
        linkedin_post_id: linkedinPostId,
        linkedin_post_url: linkedinPostUrl,
        posted_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", postId);

      await supabaseAdmin.rpc("increment_daily_post_count", { p_user_id: userId });
    }

    return new Response(
      JSON.stringify({ success: true, linkedinPostId, postUrl: linkedinPostUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("LinkedIn post error:", err);

    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      // Try to get postId from the already parsed body - use a fallback approach
      const errorMsg = err.message || "Unknown error";
      // We can't re-read the body, so just log
      console.error("Post failed with:", errorMsg);
    } catch (_) {
      // ignore cleanup errors
    }

    return new Response(
      JSON.stringify({ error: "Failed to publish post. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
