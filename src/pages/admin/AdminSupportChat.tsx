import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, MessageCircle, User, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Conversation {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  created_at: string;
}

const AdminSupportChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load admin user and conversations
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setAdminId(user.id);

      const { data } = await supabase
        .from("support_conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      setConversations(data || []);
      setLoading(false);
    };
    init();
  }, []);

  // Realtime for new conversations
  useEffect(() => {
    const channel = supabase
      .channel("admin-support-convos")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, () => {
        // Refresh conversations list
        supabase.from("support_conversations").select("*").order("updated_at", { ascending: false }).then(({ data }) => {
          setConversations(data || []);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load messages when selecting a conversation
  useEffect(() => {
    if (!selectedConvo) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", selectedConvo)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    };
    loadMessages();

    // Realtime for messages
    const channel = supabase
      .channel(`admin-msgs-${selectedConvo}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${selectedConvo}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvo]);

  const sendMessage = async () => {
    if (!input.trim() || !adminId || !selectedConvo) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from("support_messages")
        .insert({ conversation_id: selectedConvo, sender_id: adminId, sender_role: "admin", content: input.trim() });
      if (error) throw error;
      setInput("");
      // Update conversation updated_at
      await supabase.from("support_conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConvo);
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const closeConversation = async (convId: string) => {
    await supabase.from("support_conversations").update({ status: "closed" }).eq("id", convId);
    setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, status: "closed" } : c));
    toast.success("Conversation closed");
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConvo);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Support Chat</h1>
        <p className="text-muted-foreground">Respond to user support requests in real-time</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Conversations list */}
        <div className="border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-muted/50 font-semibold text-sm">
            Conversations ({conversations.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No conversations yet</p>
            ) : (
              conversations.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConvo(convo.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors ${
                    selectedConvo === convo.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm truncate">
                        {convo.user_name || convo.user_email || "Unknown"}
                      </span>
                    </div>
                    <Badge variant={convo.status === "open" ? "default" : "secondary"} className="text-xs">
                      {convo.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {convo.user_email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(convo.updated_at).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="lg:col-span-2 border border-border rounded-xl overflow-hidden flex flex-col">
          {!selectedConvo ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select a conversation to start responding</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{selectedConversation?.user_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{selectedConversation?.user_email}</p>
                </div>
                {selectedConversation?.status === "open" && (
                  <Button size="sm" variant="outline" onClick={() => closeConversation(selectedConvo)} className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Close
                  </Button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                      msg.sender_role === "admin"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}>
                      {msg.content}
                      <p className={`text-[10px] mt-1 ${msg.sender_role === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {selectedConversation?.status === "open" ? (
                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    disabled={sending}
                  />
                  <Button size="icon" onClick={sendMessage} disabled={sending || !input.trim()}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              ) : (
                <div className="p-3 border-t border-border text-center text-sm text-muted-foreground">
                  This conversation is closed.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSupportChat;
