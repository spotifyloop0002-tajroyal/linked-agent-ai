import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Activity, Loader2, Shield, Search, Filter, ExternalLink, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

interface PostActivity {
  id: string;
  user_id: string;
  content: string;
  status: string | null;
  scheduled_time: string | null;
  posted_at: string | null;
  created_at: string;
  linkedin_post_url: string | null;
  tracking_id: string | null;
  agent_name: string | null;
  campaign_id: string | null;
  likes_count: number | null;
  views_count: number | null;
  comments_count: number | null;
  // Joined fields
  user_name?: string;
  user_email?: string;
  linkedin_profile_url?: string;
}

const statusColors: Record<string, string> = {
  draft: "secondary",
  pending: "outline",
  posting: "default",
  posted: "default",
  failed: "destructive",
};

const AdminActivity = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<PostActivity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase.rpc("is_admin", { _user_id: user.id });
      setIsAdmin(data === true);
      if (data === true) await fetchPosts();
      setIsLoading(false);
    };
    init();
  }, [navigate]);

  const fetchPosts = async () => {
    // Fetch recent posts (admin can see all via RLS)
    const { data: postsData, error } = await supabase
      .from("posts")
      .select("id, user_id, content, status, scheduled_time, posted_at, created_at, linkedin_post_url, tracking_id, agent_name, campaign_id, likes_count, views_count, comments_count")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) { console.error(error); return; }

    // Fetch user profiles for all unique user_ids
    const userIds = [...new Set((postsData || []).map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, name, email, linkedin_profile_url")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    setPosts((postsData || []).map(p => {
      const profile = profileMap.get(p.user_id);
      return {
        ...p,
        user_name: profile?.name || "Unknown",
        user_email: profile?.email || "",
        linkedin_profile_url: profile?.linkedin_profile_url || null,
      };
    }));
  };

  const filtered = posts.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.user_name?.toLowerCase().includes(q) ||
        p.user_email?.toLowerCase().includes(q) ||
        p.content?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (isLoading) {
    return <AdminLayout><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  if (!isAdmin) {
    return <AdminLayout><div className="flex flex-col items-center justify-center min-h-[400px] gap-4"><Shield className="w-16 h-16 text-muted-foreground" /><h1 className="text-2xl font-bold">Access Denied</h1><Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Activity className="w-8 h-8 text-primary" />
                Activity Feed
              </h1>
              <p className="text-muted-foreground mt-1">
                Real-time posting activity across all users ({posts.length} posts)
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPosts} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by user, email, or content..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="posting">Posting</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Activity Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead className="text-center">Engagement</TableHead>
                <TableHead>LinkedIn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No posts found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(post => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div className="flex flex-col min-w-[120px]">
                        <span className="font-medium text-sm">{post.user_name}</span>
                        <span className="text-xs text-muted-foreground">{post.user_email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <p className="text-sm truncate">{post.content?.substring(0, 80)}...</p>
                      {post.agent_name && (
                        <span className="text-xs text-muted-foreground">via {post.agent_name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[post.status || "draft"] as any} className="capitalize">
                        {post.status || "draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {post.scheduled_time ? format(new Date(post.scheduled_time), "MMM d, h:mm a") : "—"}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {post.posted_at ? format(new Date(post.posted_at), "MMM d, h:mm a") : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col text-xs">
                        <span>👁 {post.views_count || 0}</span>
                        <span>❤️ {post.likes_count || 0} · 💬 {post.comments_count || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.linkedin_post_url ? (
                        <a href={post.linkedin_post_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminActivity;
