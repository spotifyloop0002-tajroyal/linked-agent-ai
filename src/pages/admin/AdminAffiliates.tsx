import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Eye, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

const AdminAffiliates = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const fetchData = async () => {
    const { data, error } = await supabase.from("affiliate_applications" as any).select("*").order("created_at", { ascending: false });
    if (!error && data) setApplications(data as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("affiliate_applications" as any).update({ status }).eq("id", id);
    toast({ title: `Marked as ${status}` });
    fetchData();
  };

  const deleteApp = async (id: string) => {
    await supabase.from("affiliate_applications" as any).delete().eq("id", id);
    toast({ title: "Deleted" });
    fetchData();
  };

  const statusColor = (s: string) => s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Affiliate Applications</h1>
          <Badge variant="outline">{applications.length}</Badge>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : applications.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No applications yet</TableCell></TableRow>
                ) : applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell>{app.email}</TableCell>
                    <TableCell>{app.phone}</TableCell>
                    <TableCell>{app.city}, {app.country}</TableCell>
                    <TableCell><Badge variant={statusColor(app.status)}>{app.status}</Badge></TableCell>
                    <TableCell>{format(new Date(app.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setSelected(app)}><Eye className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteApp(app.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Affiliate Application</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <p><strong>Name:</strong> {selected.name}</p>
              <p><strong>Email:</strong> {selected.email}</p>
              <p><strong>Phone:</strong> {selected.phone}</p>
              <p><strong>City:</strong> {selected.city}, {selected.country}</p>
              {selected.instagram_url && <p><strong>Instagram:</strong> <a href={selected.instagram_url} target="_blank" className="text-primary hover:underline">{selected.instagram_url}</a></p>}
              {selected.linkedin_url && <p><strong>LinkedIn:</strong> <a href={selected.linkedin_url} target="_blank" className="text-primary hover:underline">{selected.linkedin_url}</a></p>}
              {selected.reason && <p><strong>Reason:</strong> {selected.reason}</p>}
              <p><strong>Status:</strong> <Badge variant={statusColor(selected.status)}>{selected.status}</Badge></p>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => { updateStatus(selected.id, "approved"); setSelected(null); }}>Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => { updateStatus(selected.id, "rejected"); setSelected(null); }}>Reject</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAffiliates;
