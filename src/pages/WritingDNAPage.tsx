import { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useWritingDNA } from "@/hooks/useWritingDNA";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dna,
  Plus,
  Loader2,
  Sparkles,
  MessageSquare,
  BarChart3,
  Lightbulb,
  Mic,
  Hash,
  List,
  ListOrdered,
  Smile,
  Type,
  Upload,
  FileText,
  CheckCircle2,
  Trash2,
  Pencil,
  Eye,
  X,
  Save,
  BookOpen,
} from "lucide-react";

interface SavedMaterial {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

const WritingDNAPage = () => {
  usePageTitle("Writing DNA");
  const { dna, isLoading, isAnalyzing, analyzePosts } = useWritingDNA();
  const [samplePosts, setSamplePosts] = useState<string[]>(["", "", ""]);
  const [showImport, setShowImport] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saved materials state
  const [materials, setMaterials] = useState<SavedMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [viewingMaterial, setViewingMaterial] = useState<SavedMaterial | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<SavedMaterial | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchMaterials = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("agent_reference_materials")
        .select("id, title, content, type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (err) {
      console.error("Failed to load materials:", err);
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("Delete this reference material?")) return;
    try {
      const { error } = await supabase
        .from("agent_reference_materials")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      toast.success("Material deleted");
      if (viewingMaterial?.id === id) setViewingMaterial(null);
      if (editingMaterial?.id === id) setEditingMaterial(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleStartEdit = (material: SavedMaterial) => {
    setEditingMaterial(material);
    setEditTitle(material.title);
    setEditContent(material.content);
    setViewingMaterial(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMaterial || !editTitle.trim() || !editContent.trim()) return;
    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from("agent_reference_materials")
        .update({ title: editTitle.trim(), content: editContent.trim() })
        .eq("id", editingMaterial.id);
      if (error) throw error;
      toast.success("Material updated");
      setEditingMaterial(null);
      fetchMaterials();
    } catch {
      toast.error("Failed to update");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const [isSavingPosts, setIsSavingPosts] = useState(false);

  const handleAnalyze = async () => {
    const validPosts = samplePosts.filter((p) => p.trim().length > 20);
    if (validPosts.length < 3) return;
    await analyzePosts(validPosts);
    setShowImport(false);
  };

  const handleSavePosts = async () => {
    const validPosts = samplePosts.filter((p) => p.trim().length > 10);
    if (validPosts.length === 0) {
      toast.error("Please add at least one post with content");
      return;
    }
    setIsSavingPosts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("agent_reference_materials").insert(
        validPosts.map((post, i) => ({
          user_id: user.id,
          title: `LinkedIn Post ${i + 1} - ${post.substring(0, 40)}...`,
          content: post.trim(),
          type: "writing_sample",
        }))
      );

      if (error) throw error;
      toast.success(`${validPosts.length} post(s) saved as reference materials!`);
      setSamplePosts(["", "", ""]);
      setShowImport(false);
      fetchMaterials();
    } catch (err) {
      toast.error("Failed to save posts");
    } finally {
      setIsSavingPosts(false);
    }
  };

  const updateSample = (index: number, value: string) => {
    setSamplePosts((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const addSample = () => {
    if (samplePosts.length < 10) {
      setSamplePosts((prev) => [...prev, ""]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File too large. Maximum 10MB allowed.");
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file type. Use PDF, JPG, PNG, WebP, or TXT.");
      return;
    }

    setIsExtracting(true);
    setExtractedData(null);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("extract-document", {
        body: { fileData: base64, fileType: file.type, fileName: file.name },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setExtractedData(data.extracted);
      toast.success("Document extracted and saved as reference material!");
      fetchMaterials(); // Refresh list
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to extract document");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const typeLabels: Record<string, string> = {
    writing_sample: "✍️ Writing Sample",
    brand_guidelines: "📋 Brand Guidelines",
    topic_notes: "📝 Topic Notes",
    text: "📄 General Text",
    company_info: "🏢 Company Info",
    product_info: "📦 Product Info",
    general: "📄 General",
  };

  const toneIcons: Record<string, React.ReactNode> = {
    storyteller: <MessageSquare className="w-5 h-5" />,
    analyst: <BarChart3 className="w-5 h-5" />,
    creator: <Sparkles className="w-5 h-5" />,
    motivator: <Lightbulb className="w-5 h-5" />,
    educator: <List className="w-5 h-5" />,
  };

  const toneDescriptions: Record<string, string> = {
    storyteller: "Personal, narrative-driven with emotional connection",
    analyst: "Data-driven with statistics and trend analysis",
    creator: "Conversational, punchy, and relatable",
    motivator: "Bold, inspiring, and action-oriented",
    educator: "Structured breakdowns with clear explanations",
  };

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
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Dna className="w-8 h-8 text-secondary" />
              Writing DNA
            </h1>
            <p className="text-muted-foreground mt-1">
              Your unique writing style profile for AI-powered content personalization
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting}
            >
              {isExtracting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload PDF/Image
            </Button>
            <Button onClick={() => setShowImport(true)} className="gap-2" variant="outline">
              <Plus className="w-4 h-4" />
              {dna ? "Re-analyze" : "Import Posts"}
            </Button>
          </div>
        </div>

        {/* DNA Profile Card */}
        {dna ? (
          <div className="space-y-6">
            {/* Primary Tone */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-primary-foreground">
                  {toneIcons[dna.tone_type] || <Type className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold capitalize">{dna.tone_type} Voice</h2>
                  <p className="text-muted-foreground text-sm">
                    {toneDescriptions[dna.tone_type] || "Your unique writing style"}
                  </p>
                </div>
              </div>

              {/* Style Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                  <Type className="w-5 h-5 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{dna.avg_post_length}</p>
                  <p className="text-xs text-muted-foreground">Avg Words</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                  <Smile className="w-5 h-5 mx-auto mb-2 text-warning" />
                  <p className="text-sm font-semibold capitalize">{dna.emoji_frequency}</p>
                  <p className="text-xs text-muted-foreground">Emoji Usage</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                  <Mic className="w-5 h-5 mx-auto mb-2 text-secondary" />
                  <p className="text-sm font-semibold capitalize">{dna.hook_style?.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">Hook Style</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                  <Hash className="w-5 h-5 mx-auto mb-2 text-success" />
                  <p className="text-sm font-semibold capitalize">{dna.avg_sentence_length}</p>
                  <p className="text-xs text-muted-foreground">Sentence Length</p>
                </div>
              </div>
            </div>

            {/* Format Preferences */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Format Preferences</h3>
              <div className="flex flex-wrap gap-3">
                <Badge variant={dna.uses_bullet_points ? "default" : "outline"} className="gap-1">
                  <List className="w-3 h-3" />
                  Bullet Points {dna.uses_bullet_points ? "✓" : "✗"}
                </Badge>
                <Badge variant={dna.uses_numbered_lists ? "default" : "outline"} className="gap-1">
                  <ListOrdered className="w-3 h-3" />
                  Numbered Lists {dna.uses_numbered_lists ? "✓" : "✗"}
                </Badge>
                <Badge variant={dna.uses_emojis ? "default" : "outline"} className="gap-1">
                  <Smile className="w-3 h-3" />
                  Emojis {dna.uses_emojis ? "✓" : "✗"}
                </Badge>
              </div>
            </div>

            {/* Signature Phrases */}
            {dna.signature_phrases?.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Signature Phrases</h3>
                <div className="flex flex-wrap gap-2">
                  {dna.signature_phrases.map((phrase: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-sm">
                      "{phrase}"
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Topics */}
            {dna.topics_history?.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Topic History</h3>
                <div className="flex flex-wrap gap-2">
                  {dna.topics_history.map((topic: string, i: number) => (
                    <Badge key={i} variant="outline">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : !showImport ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-6">
              <Dna className="w-10 h-10 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Create Your Writing DNA</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Paste posts, upload PDFs, or upload images — our AI will analyze your unique writing style.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => setShowImport(true)} className="gap-2 gradient-bg text-primary-foreground">
                <Plus className="w-4 h-4" />
                Import Your Posts
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isExtracting}>
                {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload PDF/Image
              </Button>
            </div>
          </div>
        ) : null}

        {/* Extracted Document Results */}
        {extractedData && (
          <div className="bg-card rounded-2xl border border-primary/20 p-6 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Extracted Content</h3>
              <Badge variant="secondary" className="capitalize">{extractedData.type?.replace("_", " ")}</Badge>
            </div>
            <p className="text-sm font-medium mb-2">{extractedData.title}</p>
            <p className="text-sm text-muted-foreground line-clamp-4 mb-4">{extractedData.content?.substring(0, 500)}...</p>
            
            {extractedData.key_topics?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Key Topics</p>
                <div className="flex flex-wrap gap-2">
                  {extractedData.key_topics.map((t: string, i: number) => (
                    <Badge key={i} variant="outline">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">✅ Saved to your reference materials. Ask the AI Agent to generate posts based on this content.</p>

            <Button variant="ghost" size="sm" className="mt-4" onClick={() => setExtractedData(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* SAVED REFERENCE MATERIALS SECTION */}
        {/* ═══════════════════════════════════════ */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Saved Reference Materials</h3>
              <Badge variant="secondary" className="text-xs">{materials.length}</Badge>
            </div>
          </div>

          {materialsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No reference materials yet. Upload a PDF/image or add materials via the Agent training panel.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-border transition-colors"
                >
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {typeLabels[m.type] || m.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {m.content.length.toLocaleString()} chars
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {new Date(m.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                      {m.content.substring(0, 150)}...
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => { setViewingMaterial(m); setEditingMaterial(null); }}
                      title="View full content"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleStartEdit(m)}
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive/60 hover:text-destructive"
                      onClick={() => handleDeleteMaterial(m.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View Material Modal */}
        {viewingMaterial && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h3 className="font-semibold">{viewingMaterial.title}</h3>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {typeLabels[viewingMaterial.type] || viewingMaterial.type}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setViewingMaterial(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <pre className="text-sm whitespace-pre-wrap text-foreground font-sans leading-relaxed">
                  {viewingMaterial.content}
                </pre>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => handleStartEdit(viewingMaterial)} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setViewingMaterial(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Material Modal */}
        {editingMaterial && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="font-semibold">Edit Reference Material</h3>
                <Button variant="ghost" size="icon" onClick={() => setEditingMaterial(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <Label className="text-sm">Title</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Content</Label>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="mt-1 min-h-[300px] text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setEditingMaterial(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={isSavingEdit} className="gap-1.5">
                  {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Import UI */}
        {showImport && (
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm animate-fade-in">
            <h3 className="font-semibold mb-4">
              Paste Your LinkedIn Posts
              <span className="text-muted-foreground font-normal ml-2 text-sm">
                (minimum 3 posts)
              </span>
            </h3>
            <div className="space-y-4">
              {samplePosts.map((post, index) => (
                <div key={index} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Post {index + 1}</Label>
                  <Textarea
                    value={post}
                    onChange={(e) => updateSample(index, e.target.value)}
                    placeholder="Paste your LinkedIn post content here..."
                    rows={4}
                    className="text-sm"
                  />
                </div>
              ))}
              <div className="flex flex-wrap gap-3">
                {samplePosts.length < 10 && (
                  <Button variant="outline" size="sm" onClick={addSample}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Another Post
                  </Button>
                )}
                <div className="flex-1" />
                <Button variant="ghost" onClick={() => setShowImport(false)}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSavePosts}
                  disabled={isSavingPosts || samplePosts.filter((p) => p.trim().length > 10).length === 0}
                  className="gap-2"
                >
                  {isSavingPosts ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Posts
                </Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || samplePosts.filter((p) => p.trim().length > 20).length < 3}
                  className="gap-2 gradient-bg text-primary-foreground"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analyze My Style
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WritingDNAPage;
