import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Update post status + error in DB (best-effort) */
async function markPostFailed(
  supabase: ReturnType<typeof createClient>,
  postId: string | undefined,
  error: string
) {
  if (!postId) return;
  await supabase.from("posts").update({
    status: "failed",
    last_error: error,
    updated_at: new Date().toISOString(),
  }).eq("id", postId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Parse body early so we can reference postId in error handler
  let postId: string | undefined;
  let content: string | undefined;
  let imageUrl: string | undefined;
  let bodyUserId: string | undefined;

  try {
    const body = await req.json();
    postId = body.postId;
    content = body.content;
    imageUrl = body.imageUrl;
    bodyUserId = body.userId;

    // --- Resolve userId ---
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && !authHeader.endsWith(Deno.env.get("SUPABASE_ANON_KEY")!)) {
      const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (user) userId = user.id;
    }
    if (!userId && bodyUserId) userId = bodyUserId;

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

    console.log(`📝 LinkedIn post request: userId=${userId}, postId=${postId}, hasImage=${!!imageUrl}`);

    // --- Get LinkedIn credentials ---
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("linkedin_id, linkedin_access_token, linkedin_token_expires_at")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.linkedin_access_token || !profile?.linkedin_id) {
      const msg = "LinkedIn not connected. Please connect your LinkedIn account.";
      console.error("❌ No LinkedIn credentials:", profileError?.message);
      await markPostFailed(supabaseAdmin, postId, msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Token expiry check ---
    if (profile.linkedin_token_expires_at && new Date(profile.linkedin_token_expires_at) <= new Date()) {
      const msg = "LinkedIn token expired. Please reconnect your LinkedIn account.";
      console.error("❌ Token expired at:", profile.linkedin_token_expires_at);
      await markPostFailed(supabaseAdmin, postId, msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Token valid, linkedinId:", profile.linkedin_id);

    // --- Mark as posting ---
    if (postId) {
      await supabaseAdmin.from("posts").update({ status: "posting" }).eq("id", postId);
    }

    const accessToken = profile.linkedin_access_token;
    const linkedinPersonId = profile.linkedin_id;
    let linkedinPostId: string | null = null;

    if (imageUrl) {
      linkedinPostId = await postWithImage(accessToken, linkedinPersonId, content, imageUrl);
    } else {
      linkedinPostId = await postTextOnly(accessToken, linkedinPersonId, content);
    }

    // --- Build post URL ---
    const linkedinPostUrl = linkedinPostId
      ? `https://www.linkedin.com/feed/update/${linkedinPostId}`
      : null;

    console.log("🎉 Post published! URL:", linkedinPostUrl);

    // --- Update DB ---
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
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ LinkedIn post error:", errorMsg);
    await markPostFailed(supabaseAdmin, postId, errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Image post: 3-step flow ───────────────────────────────────────────────────

async function postWithImage(
  accessToken: string,
  personId: string,
  text: string,
  imageUrl: string
): Promise<string> {
  // Step 1 — Register upload
  console.log("📸 Step 1: Registering image upload…");
  const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: `urn:li:person:${personId}`,
        serviceRelationships: [
          { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
        ],
      },
    }),
  });

  if (!registerRes.ok) {
    const errText = await registerRes.text();
    console.error("❌ Step 1 failed:", registerRes.status, errText);
    throw new Error(`Image registration failed (${registerRes.status}): ${errText}`);
  }

  const registerData = await registerRes.json();
  const uploadUrl =
    registerData.value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ].uploadUrl;
  const asset = registerData.value.asset;
  console.log("✅ Step 1 done. Asset:", asset);

  // Step 2 — Download image & upload binary
  console.log("📸 Step 2: Downloading image from:", imageUrl);
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
  }
  const imageBuffer = await imageResponse.arrayBuffer();
  const imageSize = imageBuffer.byteLength;
  console.log(`📸 Step 2: Uploading ${(imageSize / 1024 / 1024).toFixed(2)} MB to LinkedIn…`);

  if (imageSize > 5 * 1024 * 1024) {
    throw new Error(`Image too large (${(imageSize / 1024 / 1024).toFixed(1)} MB). LinkedIn limit is 5 MB.`);
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error("❌ Step 2 failed:", uploadRes.status, errText);
    throw new Error(`Image upload failed (${uploadRes.status}): ${errText}`);
  }
  console.log("✅ Step 2 done. Image uploaded.");

  // Step 3 — Create UGC post with media
  console.log("📸 Step 3: Creating LinkedIn post with image…");
  const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "IMAGE",
          media: [{ status: "READY", media: asset }],
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });

  if (!postRes.ok) {
    const errText = await postRes.text();
    console.error("❌ Step 3 failed:", postRes.status, errText);
    throw new Error(`LinkedIn post failed (${postRes.status}): ${errText}`);
  }

  const postData = await postRes.json();
  console.log("✅ Step 3 done. Post ID:", postData.id);
  return postData.id;
}

// ─── Text-only post ────────────────────────────────────────────────────────────

async function postTextOnly(
  accessToken: string,
  personId: string,
  text: string
): Promise<string> {
  console.log("📝 Creating text-only LinkedIn post…");
  const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });

  if (!postRes.ok) {
    const errText = await postRes.text();
    console.error("❌ Text post failed:", postRes.status, errText);
    throw new Error(`LinkedIn post failed (${postRes.status}): ${errText}`);
  }

  const postData = await postRes.json();
  console.log("✅ Text post published. ID:", postData.id);
  return postData.id;
}
