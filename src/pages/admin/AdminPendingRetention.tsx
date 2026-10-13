import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { Repeat, Plus, Trash2, Search, ChevronsUpDown } from "lucide-react";

type Status = "sent" | "in" | "settled";

type Row = {
  id: string;
  client_id: string | null;
  client_name: string;
  amount: number;
  currency: string;
  sent_date: string;
  status: Status;
  notes: string | null;
  created_at: string;
};

type ProfileOption = { id: string; full_name: string | null; email: string | null; first_deposit_at: string | null };

const STATUS_LABEL: Record<Status, string> = { sent: "Sent", in: "In", settled: "Settled" };
const STATUS_STYLE: Record<Status, string> = {
  sent: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  in: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  settled: "bg-success/10 text-success border-success/30",
};

const fmtAmount = (n: number, currency: string) =>
  `${currency === "EUR" ? "€" : currency === "USD" ? "$" : currency + " "}${Number(n).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("de-DE");

const AdminPendingRetention = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [form, setForm] = useState({
    client_id: null as string | null,
    client_name: "",
    amount: "",
    currency: "EUR",
    sent_date: new Date().toISOString().slice(0, 10),
    status: "sent" as Status,
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pending_retention")
      .select("*")
      .order("sent_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!open || profiles.length) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, first_deposit_at")
        .not("first_deposit_at", "is", null)
        .order("first_deposit_at", { ascending: false })
        .limit(1000);
      setProfiles((data ?? []) as ProfileOption[]);
    })();
  }, [open, profiles.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return r.client_name.toLowerCase().includes(q) || (r.notes ?? "").toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter]);

  const totals = useMemo(() => {
    const sum = (s?: Status) =>
      filtered.filter((r) => !s || r.status === s).reduce((acc, r) => acc + Number(r.amount), 0);
    return { all: sum(), sent: sum("sent"), inn: sum("in"), settled: sum("settled") };
  }, [filtered]);

  const resetForm = () =>
    setForm({
      client_id: null,
      client_name: "",
      amount: "",
      currency: "EUR",
      sent_date: new Date().toISOString().slice(0, 10),
      status: "sent",
      notes: "",
    });

  const save = async () => {
    if (!form.client_name.trim()) {
      toast({ title: "Client name required", variant: "destructive" });
      return;
    }
    const amount = Number(String(form.amount).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("pending_retention").insert({
      client_id: form.client_id,
      client_name: form.client_name.trim(),
      amount,
      currency: form.currency,
      sent_date: form.sent_date,
      status: form.status,
      notes: form.notes.trim() || null,
      created_by: auth?.user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Transaction added" });
    setOpen(false);
    resetForm();
    void load();
  };

  const updateStatus = async (id: string, status: Status) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from("pending_retention").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      void load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("pending_retention").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Repeat className="h-6 w-6 text-primary" />
            Pending Retention
          </h1>
          <p className="text-muted-foreground">Track pending transactions and their statuses</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Transaction</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New Pending Transaction</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      {form.client_name || "Select a depositor"}
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command>
                      <CommandInput placeholder="Search depositors..." />
                      <CommandList>
                        <CommandEmpty>No depositor found.</CommandEmpty>
                        <CommandGroup>
                          {profiles.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.full_name ?? ""} ${p.email ?? ""}`}
                              onSelect={() => {
                                setForm((f) => ({
                                  ...f,
                                  client_id: p.id,
                                  client_name: p.full_name || p.email || "Unnamed",
                                }));
                                setPickerOpen(false);
                              }}
                            >
                              <div className="min-w-0">
                                <p className="text-sm truncate">{p.full_name || "—"}</p>
                                <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input
                  placeholder="Or type a depositor name manually"
                  value={form.client_name}
                  onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value, client_id: null }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <Label>Amount</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CHF">CHF</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Date sent</Label>
                  <Input
                    type="date"
                    value={form.sent_date}
                    onChange={(e) => setForm((f) => ({ ...f, sent_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="in">In</SelectItem>
                      <SelectItem value="settled">Settled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Total", value: totals.all, cls: "" },
          { label: "Sent", value: totals.sent, cls: "text-yellow-600" },
          { label: "In", value: totals.inn, cls: "text-blue-600" },
          { label: "Settled", value: totals.settled, cls: "text-success" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              <p className={`text-xl font-display font-bold tabular-nums ${s.cls}`}>
                {fmtAmount(s.value, "EUR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex flex-wrap items-center gap-2 justify-between">
            Transactions
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-9 w-[200px]"
                  placeholder="Search client..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="in">In</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No pending transactions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date sent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.client_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtAmount(Number(r.amount), r.currency)}</TableCell>
                    <TableCell>{fmtDate(r.sent_date)}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as Status)}>
                        <SelectTrigger className="h-8 w-[120px] border-0 bg-transparent p-0 focus:ring-0">
                          <Badge variant="outline" className={STATUS_STYLE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="in">In</SelectItem>
                          <SelectItem value="settled">Settled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">{r.notes || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPendingRetention;
