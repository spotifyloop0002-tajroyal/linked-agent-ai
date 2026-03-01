import { useState, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useWritingDNA } from "@/hooks/useWritingDNA";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";

const WritingDNAPage = () => {
  usePageTitle("Writing DNA");
  const { dna, isLoading, isAnalyzing, analyzePosts } = useWritingDNA();
  const [samplePosts, setSamplePosts] = useState<string[]>(["", "", ""]);
  const [showImport, setShowImport] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    const validPosts = samplePosts.filter((p) => p.trim().length > 20);
    if (validPosts.length < 3) return;
    await analyzePosts(validPosts);
    setShowImport(false);
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

    const maxSize = 10 * 1024 * 1024; // 10MB
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
      // Read file as base64
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to extract document");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
                  {dna.signature_phrases.map((phrase, i) => (
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
                  {dna.topics_history.map((topic, i) => (
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
              Paste 3–10 of your best LinkedIn posts and our AI will analyze your unique writing style to personalize all future content.
            </p>
            <Button onClick={() => setShowImport(true)} className="gap-2 gradient-bg text-primary-foreground">
              <Plus className="w-4 h-4" />
              Import Your Posts
            </Button>
          </div>
        ) : null}

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
              <div className="flex gap-3">
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
