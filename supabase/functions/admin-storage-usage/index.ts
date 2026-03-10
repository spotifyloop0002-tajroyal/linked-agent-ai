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

    // Fetch storage files + reference materials in parallel
    const [filesResult, refMaterialsResult] = await Promise.all([
      adminClient.from("storage.objects" as any)
        .select("name, metadata, created_at, owner")
        .eq("bucket_id", "post-images"),
      adminClient.from("agent_reference_materials")
        .select("user_id, type, content"),
    ]);

    const { data: files, error: listError } = filesResult;

    // Process file storage
    let storageData: Record<string, { fileCount: number; totalBytes: number }> = {};
    let totalStorageBytes = 0;

    if (listError) {
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
            storageData[profile.user_id] = { fileCount: userFiles.length, totalBytes };
            totalStorageBytes += totalBytes;
          }
        } catch { /* Skip */ }
      }
    } else {
      for (const file of (files || [])) {
        const userId = file.name?.split("/")?.[0];
        if (!userId) continue;
        const size = file.metadata?.size || 0;
        if (!storageData[userId]) storageData[userId] = { fileCount: 0, totalBytes: 0 };
        storageData[userId].fileCount++;
        storageData[userId].totalBytes += size;
        totalStorageBytes += size;
      }
    }

    // Process reference materials per user
    const refMaterials = refMaterialsResult.data || [];
    const refData: Record<string, { count: number; totalChars: number; agentsTrained: number }> = {};
    let totalRefCount = 0;
    let totalRefChars = 0;

    for (const mat of refMaterials) {
      if (!refData[mat.user_id]) refData[mat.user_id] = { count: 0, totalChars: 0, agentsTrained: 0 };
      refData[mat.user_id].count++;
      refData[mat.user_id].totalChars += mat.content?.length || 0;
      totalRefCount++;
      totalRefChars += mat.content?.length || 0;
    }

    // Count unique agent types trained per user
    const agentTypesByUser: Record<string, Set<string>> = {};
    for (const mat of refMaterials) {
      if (mat.type?.startsWith("agent_training_")) {
        if (!agentTypesByUser[mat.user_id]) agentTypesByUser[mat.user_id] = new Set();
        agentTypesByUser[mat.user_id].add(mat.type);
      }
    }
    for (const userId of Object.keys(agentTypesByUser)) {
      if (refData[userId]) refData[userId].agentsTrained = agentTypesByUser[userId].size;
    }

    return new Response(JSON.stringify({
      perUser: storageData,
      totalBytes: totalStorageBytes,
      totalFiles: Object.values(storageData).reduce((sum, d) => sum + d.fileCount, 0),
      refMaterials: {
        perUser: refData,
        totalCount: totalRefCount,
        totalChars: totalRefChars,
      },
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
