import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await userClient.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to list all storage objects
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: files, error: listError } = await adminClient
      .from("storage.objects" as any)
      .select("name, metadata, created_at, owner")
      .eq("bucket_id", "post-images");

    // Fallback: list via storage API
    let storageData: Record<string, { fileCount: number; totalBytes: number }> = {};
    let totalStorageBytes = 0;

    if (listError) {
      // Try listing files per known user from the bucket
      console.log("Direct table query failed, using storage.list fallback");
      
      const { data: profiles } = await adminClient
        .from("user_profiles")
        .select("user_id");

      for (const profile of (profiles || [])) {
        try {
          const { data: userFiles } = await adminClient.storage
            .from("post-images")
            .list(profile.user_id, { limit: 1000 });

          if (userFiles && userFiles.length > 0) {
            const totalBytes = userFiles.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
            storageData[profile.user_id] = {
              fileCount: userFiles.length,
              totalBytes,
            };
            totalStorageBytes += totalBytes;
          }
        } catch {
          // Skip users with no folder
        }
      }
    } else {
      // Parse from direct query
      for (const file of (files || [])) {
        const userId = file.name?.split("/")?.[0];
        if (!userId) continue;
        const size = file.metadata?.size || 0;
        if (!storageData[userId]) {
          storageData[userId] = { fileCount: 0, totalBytes: 0 };
        }
        storageData[userId].fileCount++;
        storageData[userId].totalBytes += size;
        totalStorageBytes += size;
      }
    }

    return new Response(JSON.stringify({
      perUser: storageData,
      totalBytes: totalStorageBytes,
      totalFiles: Object.values(storageData).reduce((sum, d) => sum + d.fileCount, 0),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Storage usage error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Failed to get storage usage",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
