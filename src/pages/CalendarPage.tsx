import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Edit,
  Trash2,
  Eye,
  Loader2,
  X,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameMonth,
} from "date-fns";
import { usePosts } from "@/hooks/usePosts";
import { useAgents } from "@/hooks/useAgents";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PostSourceBadge } from "@/components/posts/PostSourceBadge";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { color: string; label: string }> = {
  posted: { color: "bg-green-500", label: "Posted" },
  pending: { color: "bg-yellow-500", label: "Scheduled" },
  posting: { color: "bg-blue-500", label: "Posting" },
  draft: { color: "bg-gray-400", label: "Draft" },
  failed: { color: "bg-red-500", label: "Failed" },
};

const agentColors: Record<string, string> = {
  comedy: "bg-warning",
  professional: "bg-primary",
  storytelling: "bg-secondary",
  "thought-leadership": "bg-success",
  motivational: "bg-pink-500",
  "data-analytics": "bg-blue-500",
  creative: "bg-purple-500",
  news: "bg-orange-500",
};

const CalendarPage = () => {
  usePageTitle("Content Calendar");
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [previewPostId, setPreviewPostId] = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState("all");

  const { posts, isLoading: postsLoading, deletePost } = usePosts();
  const { agents, isLoading: agentsLoading } = useAgents();

  const getPostsForDate = (date: Date) => {
    return posts.filter((post) => {
      if (!post.scheduled_time && !post.posted_at) return false;
      const postDate = post.posted_at ? new Date(post.posted_at) : new Date(post.scheduled_time!);
      return isSameDay(postDate, date);
    });
  };

  const getAgentColor = (agentName: string | null) => {
    if (!agentName) return "bg-muted-foreground";
    const agent = agents.find((a) => a.name === agentName);
    if (agent) return agentColors[agent.type] || "bg-primary";
    return "bg-primary";
  };

  const selectedDatePosts = selectedDate ? getPostsForDate(selectedDate) : [];
  const previewPost = previewPostId ? posts.find((p) => p.id === previewPostId) : null;

  const filteredPosts =
    filterAgent === "all"
      ? posts.filter((p) => ["pending", "posting", "posted", "failed", "draft"].includes(p.status))
      : posts.filter(
          (post) =>
            post.agent_name === filterAgent &&
            ["pending", "posting", "posted", "failed", "draft"].includes(post.status)
        );

  const isLoading = postsLoading || agentsLoading;

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const uniqueAgentNames = [...new Set(posts.map((p) => p.agent_name).filter(Boolean))];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Content Calendar</h1>
            <p className="text-muted-foreground mt-1">Schedule and manage your LinkedIn posts</p>
          </div>
          <Button variant="gradient" className="gap-2" onClick={() => navigate("/dashboard/campaigns")}>
            <Plus className="w-4 h-4" />
            New Agent Campaign
          </Button>
        </div>

        {/* Big Calendar */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-semibold min-w-[180px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCurrentMonth(new Date());
                setSelectedDate(new Date());
              }}
            >
              Today
            </Button>
          </div>

          {/* Status legend */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border flex-wrap">
            {Object.entries(statusConfig).map(([key, { color, label }]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={cn("w-2.5 h-2.5 rounded-full", color)} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {weekDays.map((day) => (
              <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayPosts = getPostsForDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative min-h-[80px] sm:min-h-[100px] p-1.5 sm:p-2 border-b border-r border-border text-left transition-colors hover:bg-muted/50 focus:outline-none",
                    !isCurrentMonth && "opacity-40",
                    isSelected && "bg-primary/5 ring-2 ring-primary ring-inset",
                    idx % 7 === 6 && "border-r-0"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium",
                      today && "bg-primary text-primary-foreground",
                      isSelected && !today && "bg-primary/20 text-primary"
                    )}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Post indicators with status */}
                  {dayPosts.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayPosts.slice(0, 2).map((post, i) => {
                        const sc = statusConfig[post.status] || statusConfig.draft;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "text-[10px] sm:text-xs truncate rounded px-1 py-0.5 text-white",
                              sc.color
                            )}
                          >
                            <span className="hidden sm:inline">
                              {sc.label} · 
                            </span>
                            {post.content.slice(0, 15)}…
                          </div>
                        );
                      })}
                      {dayPosts.length > 2 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayPosts.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected date posts — shown inline below calendar */}
        {selectedDate && (
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h3>
              <div className="flex items-center gap-2">
                {selectedDatePosts.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                    {selectedDatePosts.length} post{selectedDatePosts.length !== 1 ? "s" : ""}
                  </span>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {selectedDatePosts.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No posts scheduled for this day</p>
                <Button variant="outline" className="gap-2" onClick={() => navigate("/dashboard/campaigns")}>
                  <Plus className="w-4 h-4" />
                  New Agent Campaign
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedDatePosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium text-white", (statusConfig[post.status] || statusConfig.draft).color)}>
                        {(statusConfig[post.status] || statusConfig.draft).label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {post.scheduled_time ? format(new Date(post.scheduled_time), "h:mm a") : "No time"}
                      </span>
                      <PostSourceBadge agentName={post.agent_name} campaignId={(post as any).campaign_id} />
                    </div>
                    <p className="text-sm line-clamp-3 mb-3 leading-relaxed">{post.content}</p>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setPreviewPostId(post.id)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/dashboard/campaigns")}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deletePost(post.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Post preview modal */}
        {previewPost && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPreviewPostId(null)}>
            <div
              className="bg-card rounded-2xl border border-border p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Post Preview</h3>
                <Button variant="ghost" size="icon" onClick={() => setPreviewPostId(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${getAgentColor(previewPost.agent_name)}`} />
                <span className="text-sm text-muted-foreground">
                  {previewPost.scheduled_time ? format(new Date(previewPost.scheduled_time), "MMM d, yyyy · h:mm a") : "No schedule"}
                </span>
                <PostSourceBadge agentName={previewPost.agent_name} campaignId={(previewPost as any).campaign_id} />
              </div>
              {(previewPost as any).photo_url && (
                <img
                  src={(previewPost as any).photo_url}
                  alt="Post image"
                  className="w-full rounded-lg mb-4 max-h-60 object-cover"
                />
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{previewPost.content}</div>
            </div>
          </div>
        )}

        {/* All scheduled posts table */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-semibold">All Scheduled Posts</h2>
            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {uniqueAgentNames.map((name) => (
                  <SelectItem key={name} value={name!}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No scheduled posts yet</p>
              <Button variant="outline" onClick={() => navigate("/dashboard/campaigns")}>
                New Agent Campaign
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPosts.map((post) => (
                <div key={post.id} className="p-4 hover:bg-muted/50 transition-colors flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${getAgentColor(post.agent_name)} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{post.content}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{post.scheduled_time ? format(new Date(post.scheduled_time), "MMM d, yyyy") : "No date"}</span>
                      <span>{post.scheduled_time ? format(new Date(post.scheduled_time), "h:mm a") : ""}</span>
                      <PostSourceBadge agentName={post.agent_name} campaignId={(post as any).campaign_id} />
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewPostId(post.id)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard/campaigns")}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deletePost(post.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CalendarPage;
