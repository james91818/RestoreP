import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Phone, Eye, Mail, KeyRound, Send, Ban, LogIn, DollarSign, Copy } from "lucide-react";
import { toast } from "sonner";

const copyToClipboard = (e: React.MouseEvent, value: string, label: string) => {
  e.stopPropagation();
  navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error("Copy failed")
  );
};
import StatusChanger from "@/components/admin/StatusChanger";
import CallPrefixMenu from "@/components/admin/CallPrefixMenu";
import ReorderableHeader from "@/components/admin/ReorderableHeader";
import { useColumnOrder, ColumnDef } from "@/hooks/useColumnOrder";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ReactNode, useEffect, useState } from "react";
import { isCompanyEmail } from "@/lib/isCompanyEmail";
import { setClientNavList } from "@/lib/clientNavList";

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "agent", label: "Agent" },
  { key: "country", label: "Country" },
  { key: "registration", label: "Registration" },
  { key: "first_deposit", label: "First Deposit" },
  { key: "last_seen", label: "Last Seen" },
  { key: "affiliate", label: "Affiliate" },
  { key: "funnel", label: "Funnel" },
  { key: "deposits", label: "Deposits" },
  { key: "total", label: "Total" },
  { key: "balance", label: "Balance" },
  { key: "status", label: "Status" },
  { key: "last_note", label: "Last Note" },
  { key: "notes_count", label: "#Notes" },
];

interface Props {
  loading: boolean;
  filtered: any[];
  notesMap: Record<string, { content: string; created_at: string; count: number }>;
  agents: any[];
  navigate: (path: string) => void;
  assignAgent: (userId: string, agentId: string | null) => void;
  fetchData: () => void;
  openPasswordDialog: (userId: string, name: string) => void;
  handleSendResetLink: (userId: string, email: string) => void;
  handleLoginAsClient: (userId: string) => void;
  updateStatus: (userId: string, status: string) => void;
  canAssignAgent?: boolean;
  selectedForBulk?: Set<string>;
  toggleBulkSelect?: (id: string) => void;
  toggleSelectAll?: () => void;
}

const DepositorsTable = ({
  loading, filtered, notesMap, agents, navigate,
  assignAgent, fetchData, openPasswordDialog,
  handleSendResetLink, handleLoginAsClient, updateStatus,
  canAssignAgent = true,
  selectedForBulk, toggleBulkSelect, toggleSelectAll,
}: Props) => {
  const { columns, moveColumn } = useColumnOrder("depositors_col_order", DEFAULT_COLUMNS);
  const hasBulk = selectedForBulk && toggleBulkSelect && toggleSelectAll;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderCell = (key: string, u: any, note: any): ReactNode => {
    switch (key) {
      case "name": {
        const isOnline = u.last_seen_at ? (now - new Date(u.last_seen_at).getTime()) < 60000 : false;
        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"}`}
              title={isOnline ? "Online" : (u.last_seen_at ? `Last seen: ${new Date(u.last_seen_at).toLocaleString("de-DE")}` : "Never seen")}
            />
            <p className="font-medium">{u.full_name || "—"}</p>
            {u.full_name && (
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Copy name" onClick={(e) => copyToClipboard(e, u.full_name, "Name")}>
                <Copy className="h-3 w-3" />
              </Button>
            )}
            {u.shaved_from && <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-500 shrink-0">SHAVED</Badge>}
          </div>
        );
      }
      case "phone": return (
        <div className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          <span className="text-muted-foreground whitespace-nowrap">{u.phone || "—"}</span>
          {u.phone && (
            <>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Copy phone" onClick={(e) => copyToClipboard(e, u.phone, "Phone")}>
                <Copy className="h-3 w-3" />
              </Button>
              <CallPrefixMenu clientPhone={u.phone} profileId={u.id} clientCountry={u.country} />
            </>
          )}
        </div>
      );
      case "email": return (
        <div className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          <span className="text-muted-foreground">{u.email || "—"}</span>
          {isCompanyEmail(u.email) && (
            <span className="text-amber-500 font-bold" title="Company email">★</span>
          )}
          {u.email && (
            <Button variant="ghost" size="icon" className="h-6 w-6" title="Copy email" onClick={(e) => copyToClipboard(e, u.email, "Email")}>
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      );
      case "country": return <span className="text-muted-foreground">{u.country || "—"}</span>;
      case "registration": return (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {new Date(u.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
        </span>
      );
      case "first_deposit": return (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {u.first_deposit_at ? new Date(u.first_deposit_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "—"}
        </span>
      );
      case "last_seen": {
        if (!u.last_seen_at) return <Badge variant="outline" className="text-[10px] border-destructive/60 text-destructive">Never</Badge>;
        const diff = now - new Date(u.last_seen_at).getTime();
        const isOnline = diff < 60000;
        const isStale = diff > 7 * 86400000;
        let rel: string;
        if (isOnline) rel = "Online now";
        else if (diff < 3600000) rel = `${Math.floor(diff / 60000)}m ago`;
        else if (diff < 86400000) rel = `${Math.floor(diff / 3600000)}h ago`;
        else rel = `${Math.floor(diff / 86400000)}d ago`;
        if (isStale) {
          return (
            <Badge
              variant="outline"
              className="text-[10px] border-destructive/60 text-destructive bg-destructive/10 whitespace-nowrap"
              title={`Inactive for over a week — last seen ${new Date(u.last_seen_at).toLocaleString("de-DE")}`}
            >
              ⚠ {rel}
            </Badge>
          );
        }
        return (
          <span
            className={`text-xs whitespace-nowrap ${isOnline ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}
            title={new Date(u.last_seen_at).toLocaleString("de-DE")}
          >
            {rel}
          </span>
        );
      }
      case "affiliate": return <span className="text-muted-foreground whitespace-nowrap">{u.affiliate || "—"}</span>;
      case "funnel": return <span className="text-muted-foreground whitespace-nowrap">{u.funnel || "—"}</span>;
      case "agent": {
        const agentName = agents.find(a => a.id === u.assigned_agent)?.full_name || agents.find(a => a.id === u.assigned_agent)?.email;
        if (!canAssignAgent) return <span className="text-muted-foreground text-xs whitespace-nowrap">{agentName || "Unassigned"}</span>;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select value={u.assigned_agent || "none"} onValueChange={(v) => assignAgent(u.id, v === "none" ? null : v)}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      }
      case "deposits": return <Badge variant="outline" className="text-xs">{u.deposit_count}</Badge>;
      case "total": return <span className="font-semibold text-success whitespace-nowrap">€{u.total_deposited.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      case "balance": return <span className="whitespace-nowrap">€{u.balance.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>;
      case "status": return <StatusChanger userId={u.id} currentStatus={u.status} onStatusChanged={fetchData} />;
      case "last_note": return <p className="text-xs text-muted-foreground max-w-[160px] truncate">{note?.content || "—"}</p>;
      case "notes_count": {
        let lastNote: ReactNode = <span className="text-[10px] text-muted-foreground/70">Never</span>;
        if (note?.created_at) {
          const diff = now - new Date(note.created_at).getTime();
          let rel: string;
          if (diff < 60000) rel = "Just now";
          else if (diff < 3600000) rel = `${Math.floor(diff / 60000)}m ago`;
          else if (diff < 86400000) rel = `${Math.floor(diff / 3600000)}h ago`;
          else rel = `${Math.floor(diff / 86400000)}d ago`;
          lastNote = (
            <span
              className="text-[10px] whitespace-nowrap text-muted-foreground/70"
              title={new Date(note.created_at).toLocaleString("de-DE")}
            >
              {rel}
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Badge variant="outline" className="text-xs">{note?.count ?? 0}</Badge>
            {lastNote}
          </div>
        );
      }

      default: return null;
    }
  };

  const colCount = columns.length + 1 + (hasBulk ? 1 : 0);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {hasBulk && (
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={filtered.length > 0 && selectedForBulk.size === filtered.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                )}
                {columns.map((col, idx) => (
                  <ReorderableHeader key={col.key} column={col} isFirst={idx === 0} isLast={idx === columns.length - 1} onMove={moveColumn} />
                ))}
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colCount} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={colCount} className="p-8 text-center text-muted-foreground">No depositors found</td></tr>
              ) : (
                filtered.map((u) => {
                  const note = notesMap[u.id];
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => { setClientNavList({ ids: filtered.map((x: any) => x.id), source: "Depositors" }); navigate(`/backoffice/users/${u.id}`); }}>
                      {hasBulk && (
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedForBulk.has(u.id)}
                            onCheckedChange={() => toggleBulkSelect(u.id)}
                          />
                        </td>
                      )}
                      {columns.map(col => (
                        <td key={col.key} className="p-3">{renderCell(col.key, u, note)}</td>
                      ))}
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => navigate(`/backoffice/users/${u.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/backoffice/deposits?user=${u.id}`)}>
                              <DollarSign className="h-4 w-4 mr-2" /> View Deposits
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/backoffice/withdrawals?user=${u.id}`)}>
                              <DollarSign className="h-4 w-4 mr-2" /> View Withdrawals
                            </DropdownMenuItem>
                            {u.email && (
                              <DropdownMenuItem onClick={() => window.open(`mailto:${u.email}`)}>
                                <Mail className="h-4 w-4 mr-2" /> Send Email
                              </DropdownMenuItem>
                            )}
                            {u.phone && (
                              <DropdownMenuItem onClick={() => window.open(`tel:${u.phone}`, "_self")}>
                                <Phone className="h-4 w-4 mr-2" /> Call
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openPasswordDialog(u.id, u.full_name || u.email)}>
                              <KeyRound className="h-4 w-4 mr-2" /> Change Password
                            </DropdownMenuItem>
                            {u.email && (
                              <DropdownMenuItem onClick={() => handleSendResetLink(u.id, u.email)}>
                                <Send className="h-4 w-4 mr-2" /> Send Reset Link
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleLoginAsClient(u.id)}>
                              <LogIn className="h-4 w-4 mr-2" /> Login as Client
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateStatus(u.id, "active")}>
                              Set Active
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(u.id, "suspended")} className="text-destructive">
                              <Ban className="h-4 w-4 mr-2" /> Suspend
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DepositorsTable;
