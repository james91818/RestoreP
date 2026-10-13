import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Pencil, Phone, Shield } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const COUNTRIES = [
  { code: "AT", name: "Austria" }, { code: "DE", name: "Germany" }, { code: "CH", name: "Switzerland" },
  { code: "US", name: "United States" }, { code: "GB", name: "United Kingdom" }, { code: "FR", name: "France" },
  { code: "IT", name: "Italy" }, { code: "ES", name: "Spain" }, { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" }, { code: "PT", name: "Portugal" }, { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" }, { code: "DK", name: "Denmark" }, { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" }, { code: "CZ", name: "Czech Republic" }, { code: "IE", name: "Ireland" },
  { code: "GR", name: "Greece" }, { code: "RO", name: "Romania" }, { code: "HU", name: "Hungary" },
  { code: "BG", name: "Bulgaria" }, { code: "HR", name: "Croatia" }, { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" }, { code: "LT", name: "Lithuania" }, { code: "LV", name: "Latvia" },
  { code: "EE", name: "Estonia" }, { code: "CY", name: "Cyprus" }, { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" }, { code: "AU", name: "Australia" }, { code: "CA", name: "Canada" },
  { code: "JP", name: "Japan" }, { code: "KR", name: "South Korea" }, { code: "CN", name: "China" },
  { code: "IN", name: "India" }, { code: "BR", name: "Brazil" }, { code: "MX", name: "Mexico" },
  { code: "RU", name: "Russia" }, { code: "TR", name: "Turkey" }, { code: "ZA", name: "South Africa" },
  { code: "AE", name: "UAE" }, { code: "SA", name: "Saudi Arabia" }, { code: "IL", name: "Israel" },
  { code: "SG", name: "Singapore" }, { code: "HK", name: "Hong Kong" }, { code: "NZ", name: "New Zealand" },
  { code: "TH", name: "Thailand" }, { code: "PH", name: "Philippines" }, { code: "MY", name: "Malaysia" },
  { code: "ID", name: "Indonesia" }, { code: "VN", name: "Vietnam" }, { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" }, { code: "CO", name: "Colombia" }, { code: "PE", name: "Peru" },
].sort((a, b) => a.name.localeCompare(b.name));

interface Prefix {
  id: string;
  label: string;
  prefix: string;
  country_code: string;
  phone_number: string;
  sort_order: number;
  role_ids?: string[];
}

interface Role {
  id: string;
  name: string;
}

const FLAG_URL = (cc: string) =>
  `https://flagcdn.com/24x18/${cc.toLowerCase()}.png`;

const PhonePrefixesManager = () => {
  const [prefixes, setPrefixes] = useState<Prefix[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Prefix | null>(null);
  const [form, setForm] = useState({ label: "", prefix: "", country_code: "", phone_number: "" });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const fetchData = async () => {
    const [{ data: prefixData }, { data: roleData }, { data: prefixRolesData }] = await Promise.all([
      supabase.from("phone_prefixes").select("*").order("sort_order"),
      supabase.from("roles").select("id, name").order("name"),
      supabase.from("phone_prefix_roles").select("*"),
    ]);

    const rolesMap: Record<string, string[]> = {};
    ((prefixRolesData as any) ?? []).forEach((pr: any) => {
      if (!rolesMap[pr.prefix_id]) rolesMap[pr.prefix_id] = [];
      rolesMap[pr.prefix_id].push(pr.role_id);
    });

    setPrefixes(((prefixData as any) ?? []).map((p: any) => ({ ...p, role_ids: rolesMap[p.id] ?? [] })));
    setRoles((roleData as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openDialog = (p?: Prefix) => {
    if (p) {
      setEditing(p);
      setForm({ label: p.label, prefix: p.prefix, country_code: p.country_code, phone_number: p.phone_number });
      setSelectedRoles(p.role_ids ?? []);
    } else {
      setEditing(null);
      setForm({ label: "", prefix: "", country_code: "", phone_number: "" });
      setSelectedRoles([]);
    }
    setDialogOpen(true);
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  const save = async () => {
    if (!form.label.trim() || !form.prefix.trim()) {
      toast.error("Label and prefix are required");
      return;
    }

    let prefixId: string;

    if (editing) {
      await supabase.from("phone_prefixes").update({
        label: form.label,
        prefix: form.prefix,
        country_code: form.country_code.toUpperCase(),
        phone_number: form.phone_number,
      } as any).eq("id", editing.id);
      prefixId = editing.id;
    } else {
      const maxOrder = prefixes.length > 0 ? Math.max(...prefixes.map(p => p.sort_order)) : 0;
      const { data } = await supabase.from("phone_prefixes").insert({
        label: form.label,
        prefix: form.prefix,
        country_code: form.country_code.toUpperCase(),
        phone_number: form.phone_number,
        sort_order: maxOrder + 1,
      } as any).select("id").single();
      prefixId = (data as any)?.id;
    }

    // Sync roles
    if (prefixId) {
      await supabase.from("phone_prefix_roles").delete().eq("prefix_id", prefixId);
      if (selectedRoles.length > 0) {
        await supabase.from("phone_prefix_roles").insert(
          selectedRoles.map(role_id => ({ prefix_id: prefixId, role_id })) as any
        );
      }
    }

    toast.success(editing ? "Prefix updated" : "Prefix created");
    setDialogOpen(false);
    fetchData();
  };

  const remove = async (id: string) => {
    await supabase.from("phone_prefixes").delete().eq("id", id);
    toast.success("Prefix deleted");
    fetchData();
  };

  const getRoleNames = (roleIds: string[]) =>
    roleIds.map(id => roles.find(r => r.id === id)?.name).filter(Boolean);

  if (loading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> Phone Prefixes</CardTitle>
            <CardDescription>Configure outbound call prefixes for agents. Each prefix prepends digits before the client number.</CardDescription>
          </div>
          <Button size="sm" onClick={() => openDialog()}><Plus className="h-4 w-4 mr-1" /> Add Prefix</Button>
        </CardHeader>
        <CardContent>
          {prefixes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No prefixes configured. Calls will use the client number directly.</p>
          ) : (
            <div className="space-y-2">
              {prefixes.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-3">
                    {p.country_code && (
                      <img
                        src={FLAG_URL(p.country_code)}
                        alt={p.country_code}
                        className="h-5 w-auto rounded-sm shadow-sm"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Prefix: <span className="font-mono font-semibold text-foreground">{p.prefix}</span>
                        {p.phone_number && <> · Phone: <span className="font-mono">{p.phone_number}</span></>}
                      </p>
                      {(p.role_ids?.length ?? 0) > 0 ? (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <Shield className="h-3 w-3 text-muted-foreground" />
                          {getRoleNames(p.role_ids!).map(name => (
                            <Badge key={name} variant="secondary" className="text-[10px] px-1.5 py-0">{name}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground mt-1">Available to all roles</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Prefix" : "Add Prefix"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input placeholder="e.g. Austria" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div>
              <Label>Prefix Digits</Label>
              <Input placeholder="e.g. 106" value={form.prefix} onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">These digits are prepended to the client phone number when calling.</p>
            </div>
            <div>
              <Label>Country</Label>
              <Select value={form.country_code} onValueChange={v => setForm(f => ({ ...f, country_code: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2">
                        <img src={`https://flagcdn.com/16x12/${c.code.toLowerCase()}.png`} alt={c.code} className="h-3 w-auto rounded-[1px]" />
                        {c.name} ({c.code})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input placeholder="e.g. +43 1 234 5678" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">The actual phone number associated with this prefix line.</p>
            </div>
            <div>
              <Label className="flex items-center gap-1.5 mb-2"><Shield className="h-3.5 w-3.5" /> Allowed Roles</Label>
              <p className="text-xs text-muted-foreground mb-2">Select which roles can use this prefix. Leave empty for all roles.</p>
              <div className="space-y-2 rounded-md border p-3 max-h-40 overflow-y-auto">
                {roles.map(role => (
                  <label key={role.id} className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5 transition-colors">
                    <Checkbox
                      checked={selectedRoles.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    <span className="text-sm">{role.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhonePrefixesManager;
