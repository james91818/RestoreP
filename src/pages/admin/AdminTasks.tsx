import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useRole, isAdminOrManager } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Paperclip, X, ImageIcon } from "lucide-react";

type Task = {
  id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_progress" | "done";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  admin_unread: boolean;
  creator_unread: boolean;
  attachments: string[] | null;
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/15 text-blue-400",
  high: "bg-amber-500/15 text-amber-400",
  urgent: "bg-red-500/15 text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-400",
  in_progress: "bg-amber-500/15 text-amber-400",
  done: "bg-emerald-500/15 text-emerald-400",
};

export default function AdminTasks() {
  const { user } = useAuth();
  const { roleName } = useRole();
  const canManageAll = isAdminOrManager(roleName);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null; email: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("normal");
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<Task["status"]>("open");

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("staff_tasks" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load tasks: " + error.message);
      setLoading(false);
      return;
    }
    const list = ((data as unknown) as Task[]) ?? [];
    setTasks(list);
    const ids = Array.from(new Set(list.flatMap((t) => [t.created_by, t.assigned_to]).filter(Boolean) as string[]));
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const map: Record<string, { full_name: string | null; email: string | null }> = {};
      (profs ?? []).forEach((p: any) => {
        map[p.id] = { full_name: p.full_name, email: p.email };
      });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("staff_tasks_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "staff_tasks" },
        () => fetchData(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("task-attachments").upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from("task-attachments").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setUploadedFiles((prev) => [...prev, ...urls]);
    setUploading(false);
  };

  const removeUploadedFile = (url: string) => {
    setUploadedFiles((prev) => prev.filter((u) => u !== url));
  };

  const createTask = async () => {
    if (!user || !title.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("staff_tasks" as any).insert({
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      attachments: uploadedFiles,
      admin_unread: true,
      creator_unread: false,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to create task: " + error.message);
      return;
    }
    toast.success("Task submitted to admin");
    setTitle("");
    setDescription("");
    setPriority("normal");
    setUploadedFiles([]);
    setCreateOpen(false);
    fetchData();
  };

  const openEdit = async (task: Task) => {
    setEditingTask(task);
    setEditNotes(task.admin_notes ?? "");
    setEditStatus(task.status);
    // Mark as read for the viewer
    const patch: any = {};
    if (canManageAll && task.admin_unread) patch.admin_unread = false;
    if (task.created_by === user?.id && task.creator_unread) patch.creator_unread = false;
    if (Object.keys(patch).length > 0) {
      await supabase.from("staff_tasks" as any).update(patch).eq("id", task.id);
    }
  };

  const saveEdit = async () => {
    if (!editingTask || !user) return;
    const isAdminEdit = canManageAll && editingTask.created_by !== user.id;
    const updates: any = {
      status: editStatus,
      admin_notes: editNotes.trim() || null,
      completed_at: editStatus === "done" ? new Date().toISOString() : null,
    };
    // If admin/manager updates someone else's task, flag the creator
    if (isAdminEdit) {
      updates.creator_unread = true;
      updates.admin_unread = false;
    } else {
      // Creator self-editing — re-flag admins
      updates.admin_unread = true;
      updates.creator_unread = false;
    }
    const { error } = await supabase
      .from("staff_tasks" as any)
      .update(updates)
      .eq("id", editingTask.id);
    if (error) {
      toast.error("Failed to update task: " + error.message);
      return;
    }
    toast.success("Task updated");
    setEditingTask(null);
    fetchData();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("staff_tasks" as any).delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete: " + error.message);
      return;
    }
    toast.success("Task deleted");
    fetchData();
  };

  const filtered = useMemo(() => {
    if (tab === "all") return tasks;
    if (tab === "mine") return tasks.filter((t) => t.created_by === user?.id);
    return tasks.filter((t) => t.status === tab);
  }, [tasks, tab, user?.id]);

  const counts = useMemo(() => ({
    open: tasks.filter((t) => t.status === "open").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  }), [tasks]);

  const labelFor = (id: string | null) => {
    if (!id) return "—";
    const p = profiles[id];
    return p?.full_name || p?.email || id.slice(0, 8);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">Task List</h1>
          <p className="text-sm text-muted-foreground">
            {canManageAll
              ? "Manage all task requests submitted by agents."
              : "Submit requests to the admin and track their status."}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit task to admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you need?" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add context, links, client IDs..."
                  rows={5}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Priority</label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Attachments (screenshots, images)
                </label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                    <span>{uploading ? "Uploading..." : "Add files"}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => { handleFileUpload(e.target.files); e.target.value = ""; }}
                    />
                  </label>
                  <span className="text-xs text-muted-foreground">Max 10MB each</span>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {uploadedFiles.map((url) => {
                      const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(url);
                      return (
                        <div key={url} className="relative group rounded-md border border-border/60 overflow-hidden bg-muted/30">
                          {isImage ? (
                            <img src={url} alt="" className="w-full h-20 object-cover" />
                          ) : (
                            <div className="flex h-20 items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeUploadedFile(url)}
                            className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={createTask} disabled={submitting || !title.trim()}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Open</CardTitle></CardHeader><CardContent className="text-2xl font-semibold tabular-nums">{counts.open}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">In Progress</CardTitle></CardHeader><CardContent className="text-2xl font-semibold tabular-nums">{counts.in_progress}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Done</CardTitle></CardHeader><CardContent className="text-2xl font-semibold tabular-nums">{counts.done}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Total</CardTitle></CardHeader><CardContent className="text-2xl font-semibold tabular-nums">{tasks.length}</CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
          <TabsTrigger value="mine">Mine</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No tasks here.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Submitted by</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id} className="cursor-pointer" onClick={() => openEdit(t)}>
                        <TableCell>
                          <div className="font-medium">{t.title}</div>
                          {t.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">{t.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{labelFor(t.created_by)}</TableCell>
                        <TableCell>
                          <Badge className={PRIORITY_COLORS[t.priority]} variant="outline">{t.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[t.status]} variant="outline">
                            {t.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {new Date(t.created_at).toLocaleString("de-DE")}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {(canManageAll || t.created_by === user?.id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTask(t.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask?.title}</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-3 py-2">
              <div className="text-sm text-muted-foreground">
                Submitted by <span className="font-medium text-foreground">{labelFor(editingTask.created_by)}</span> on{" "}
                {new Date(editingTask.created_at).toLocaleString("de-DE")}
              </div>
              {editingTask.description && (
                <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {editingTask.description}
                </div>
              )}
              <div className="flex gap-2">
                <Badge className={PRIORITY_COLORS[editingTask.priority]} variant="outline">{editingTask.priority}</Badge>
              </div>
              {editingTask.attachments && editingTask.attachments.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Attachments</div>
                  <div className="grid grid-cols-3 gap-2">
                    {editingTask.attachments.map((url) => {
                      const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(url);
                      return (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-md border border-border/60 overflow-hidden bg-muted/30 hover:border-primary/40 transition-colors"
                        >
                          {isImage ? (
                            <img src={url} alt="" className="w-full h-24 object-cover" />
                          ) : (
                            <div className="flex h-24 items-center justify-center"><Paperclip className="h-6 w-6 text-muted-foreground" /></div>
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              {canManageAll ? (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                    <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Admin notes</label>
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={4} />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className={STATUS_COLORS[editingTask.status]} variant="outline">
                      {editingTask.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {editingTask.admin_notes && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">Admin notes</div>
                      <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                        {editingTask.admin_notes}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>Close</Button>
            {canManageAll && <Button onClick={saveEdit}>Save changes</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
