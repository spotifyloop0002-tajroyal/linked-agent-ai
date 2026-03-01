import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, redirectUri } = await req.json();

    const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID");
    const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "LinkedIn API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: get_auth_url - returns the LinkedIn OAuth URL
    if (action === "get_auth_url") {
      const state = crypto.randomUUID();
      const params = new URLSearchParams({
        response_type: "code",
        client_id: LINKEDIN_CLIENT_ID,
        redirect_uri: redirectUri,
        state,
        scope: "openid profile email w_member_social",
      });
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
      return new Response(
        JSON.stringify({ authUrl, state }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: exchange_token - exchanges auth code for access token
    if (action === "exchange_token") {
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Authorization code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Exchange code for token
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        const errData = await tokenRes.text();
        console.error("Token exchange failed:", errData);
        return new Response(
          JSON.stringify({ error: "Failed to exchange token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in;
      const refreshToken = tokenData.refresh_token || null;

      // Get user profile from LinkedIn using OpenID Connect userinfo
      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!profileRes.ok) {
        const errText = await profileRes.text();
        console.error("Profile fetch failed:", errText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch LinkedIn profile" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const profileData = await profileRes.json();
      console.log("LinkedIn profile data:", JSON.stringify(profileData));

      // Extract profile info
      const linkedinId = profileData.sub;
      const fullName = profileData.name || `${profileData.given_name || ""} ${profileData.family_name || ""}`.trim();
      const email = profileData.email;
      const profileImage = profileData.picture;

      // Get the authenticated Supabase user
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Authorization header required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Not authenticated" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ✅ CRITICAL: Check if this LinkedIn account is already linked to ANOTHER user
      const { data: existingMapping } = await supabaseAdmin
        .from("user_profiles")
        .select("user_id")
        .eq("linkedin_id", linkedinId)
        .neq("user_id", user.id)
        .maybeSingle();

      if (existingMapping) {
        console.error("LinkedIn account already linked to another user:", existingMapping.user_id);
        return new Response(
          JSON.stringify({ error: "This LinkedIn account is already connected to another LinkedBot account. Each LinkedIn account can only be linked to one LinkedBot account." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate token expiry
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Update user profile with LinkedIn data
      const { error: updateError } = await supabaseAdmin
        .from("user_profiles")
        .update({
          linkedin_id: linkedinId,
          linkedin_access_token: accessToken,
          linkedin_refresh_token: refreshToken,
          linkedin_token_expires_at: tokenExpiresAt,
          linkedin_verified: true,
          linkedin_verified_at: new Date().toISOString(),
          name: fullName || undefined,
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Profile update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to save LinkedIn connection" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          profile: {
            linkedinId,
            name: fullName,
            email,
            profileImage,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: check_connection - check if LinkedIn is connected
    if (action === "check_connection") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("linkedin_id, linkedin_access_token, linkedin_token_expires_at, linkedin_verified")
        .eq("user_id", user.id)
        .single();

      const isConnected = !!(
        profile?.linkedin_access_token &&
        profile?.linkedin_id &&
        profile?.linkedin_token_expires_at &&
        new Date(profile.linkedin_token_expires_at) > new Date()
      );

      return new Response(
        JSON.stringify({
          connected: isConnected,
          verified: profile?.linkedin_verified || false,
          linkedinId: profile?.linkedin_id || null,
          tokenExpiry: profile?.linkedin_token_expires_at || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: disconnect - remove LinkedIn connection
    if (action === "disconnect") {
      const authHeader = req.headers.get("Authorization");
      const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader! } },
      });
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Not authenticated" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabaseAdmin
        .from("user_profiles")
        .update({
          linkedin_access_token: null,
          linkedin_refresh_token: null,
          linkedin_token_expires_at: null,
          linkedin_id: null,
          linkedin_verified: false,
          linkedin_verified_at: null,
        })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("LinkedIn auth error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
