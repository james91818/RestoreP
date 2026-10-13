import FollowUpBadge from "./FollowUpBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Phone, Eye, Mail, KeyRound, Send, Ban, LogIn, Scissors, Home, CreditCard, Copy, MessageSquarePlus } from "lucide-react";
import AddCommentDialog from "@/components/admin/AddCommentDialog";
import { Checkbox } from "@/components/ui/checkbox";
import StatusChanger from "@/components/admin/StatusChanger";
import CallPrefixMenu from "@/components/admin/CallPrefixMenu";
import ReorderableHeader from "@/components/admin/ReorderableHeader";
import ColumnVisibilityMenu from "@/components/admin/ColumnVisibilityMenu";
import { useColumnOrder, ColumnDef } from "@/hooks/useColumnOrder";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ReactNode, useEffect, useMemo, useState } from "react";
import PaymentLinkDialog from "@/components/admin/PaymentLinkDialog";
import { isCompanyEmail } from "@/lib/isCompanyEmail";
import { getStaffTz } from "@/lib/timezone";
import { useRole } from "@/hooks/useRole";
import { setClientNavList } from "@/lib/clientNavList";

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "display_id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "country", label: "Country" },
  { key: "registration", label: "Registration" },
  { key: "affiliate", label: "Affiliate" },
  { key: "funnel", label: "Funnel" },
  { key: "agent", label: "Agent" },
  { key: "status", label: "Status" },
  { key: "last_note", label: "Last Note" },
  { key: "last_note_date", label: "Last Note Date" },
  { key: "notes_count", label: "#Notes" },
  { key: "last_seen", label: "Last Online" },
  { key: "last_ip", label: "IP Address" },
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
  handleShaveLead?: (userId: string, name: string) => void;
  handleForceRedirect?: (userId: string, name: string) => void;
  canAssignAgent?: boolean;
  selectedForBulk?: Set<string>;
  toggleBulkSelect?: (id: string) => void;
  toggleSelectAll?: () => void;
}

const LeadsTable = ({
  loading, filtered, notesMap, agents, navigate,
  assignAgent, fetchData, openPasswordDialog,
  handleSendResetLink, handleLoginAsClient, updateStatus,
  handleShaveLead,
  handleForceRedirect,
  canAssignAgent = true,
  selectedForBulk,
  toggleBulkSelect,
  toggleSelectAll,
}: Props) => {
  const { columns: rawColumns, allColumns, hiddenKeys, moveColumn, toggleColumnVisibility, showAllColumns } = useColumnOrder("leads_col_order_v3", DEFAULT_COLUMNS);
  const { roleName } = useRole();
  const hideId = roleName === "Manager Conversion" || roleName === "Agent Conversion";
  const columns = useMemo(
    () => (hideId ? rawColumns.filter(c => c.key !== "display_id") : rawColumns),
    [rawColumns, hideId]
  );
  const pickerColumns = useMemo(
    () => (hideId ? allColumns.filter(c => c.key !== "display_id") : allColumns),
    [allColumns, hideId]
  );
  const [now, setNow] = useState(Date.now());
  const [paymentLinkTarget, setPaymentLinkTarget] = useState<{ id: string; name: string; country: string | null } | null>(null);
  const [commentTarget, setCommentTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        setNow(Date.now());
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const renderCell = (key: string, u: any, note: any): ReactNode => {
    switch (key) {
      case "display_id": return <span className="font-mono text-xs text-muted-foreground">{u.display_id ?? "—"}</span>;
      case "name": {
        const isOnline = u.last_seen_at ? (now - new Date(u.last_seen_at).getTime()) < 60000 : false;
        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"}`}
              title={isOnline ? "Online" : (u.last_seen_at ? `Last seen: ${new Date(u.last_seen_at).toLocaleString("de-DE")}` : "Never seen")}
            />
            <p className="font-medium">{u.full_name || "—"}</p>
            <FollowUpBadge customerId={u.id} />
            {u.shaved_to && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/50 text-orange-500 bg-orange-500/10 shrink-0">
                SHAVED — DO NOT TOUCH
              </Badge>
            )}
            {u.shaved_from && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/50 text-green-500 bg-green-500/10 shrink-0">
                SHAVED LEAD — USE THIS ONE
              </Badge>
            )}
          </div>
        );
      }
      case "phone": {
        const displayPhone = u.phone || u.secondary_phone || "";
        const isFallback = !u.phone && !!u.secondary_phone;
        return (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground whitespace-nowrap">
            {displayPhone || "—"}
            {isFallback && <span className="ml-1 text-[10px] uppercase text-amber-500">(home)</span>}
          </span>
          {displayPhone && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(displayPhone);
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <div onClick={(e) => e.stopPropagation()}>
                <CallPrefixMenu clientPhone={displayPhone} profileId={u.id} clientCountry={u.country} />
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-60 hover:opacity-100"
            title="Add comment"
            onClick={(e) => {
              e.stopPropagation();
              setCommentTarget({ id: u.id, name: u.full_name || u.email || "Lead" });
            }}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </Button>
        </div>
        );
      }
      case "email": return (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{u.email || "—"}</span>
          {isCompanyEmail(u.email) && (
            <span className="text-amber-500 font-bold" title="Company email">★</span>
          )}
          {u.email && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await navigator.clipboard.writeText(u.email);
                } catch {
                  // Ignore clipboard failures when the preview tab is not focused.
                }
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      );
      case "country": {
        const code = (u.country || "").trim().toLowerCase();
        const isValid = /^[a-z]{2}$/.test(code);
        return (
          <span className="text-muted-foreground inline-flex items-center gap-1.5 whitespace-nowrap">
            {isValid && (
              <img
                src={`https://flagcdn.com/w20/${code}.png`}
                srcSet={`https://flagcdn.com/w40/${code}.png 2x`}
                width={20}
                height={15}
                alt={code.toUpperCase()}
                className="rounded-sm shadow-sm"
                loading="lazy"
              />
            )}
            <span>{code ? code.toUpperCase() : "—"}</span>
          </span>
        );
      }
      case "registration": return (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {new Date(u.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: getStaffTz() })}
        </span>
      );
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
      case "status": {
        const isNoAnswer = typeof u.status === "string" && u.status.toLowerCase().startsWith("no answer");
        const nextNoAnswer = () => {
          const m = (u.status as string).match(/^No Answer(?:\s+(\d+))?$/i);
          const n = m && m[1] ? parseInt(m[1], 10) : 1;
          const next = n + 1;
          return next > 5 ? null : (next === 2 ? "No Answer 2" : `No Answer ${next}`);
        };
        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <StatusChanger userId={u.id} currentStatus={u.status} onStatusChanged={() => {}} />
            {isNoAnswer && nextNoAnswer() && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px] font-bold"
                title={`Bump to ${nextNoAnswer()}`}
                onClick={async (e) => {
                  e.stopPropagation();
                  const next = nextNoAnswer();
                  if (!next) return;
                  await updateStatus(u.id, next);
                }}
              >
                +1
              </Button>
            )}
          </div>
        );
      }
      case "last_seen": {
        if (!u.last_seen_at) return <span className="text-muted-foreground text-xs">Never</span>;
        const seenMs = new Date(u.last_seen_at).getTime();
        const diff = now - seenMs;
        const isOnline = diff < 60000;
        let label: string;
        if (isOnline) label = "Online now";
        else if (diff < 3600000) label = `${Math.floor(diff / 60000)}m ago`;
        else if (diff < 86400000) label = `${Math.floor(diff / 3600000)}h ago`;
        else label = `${Math.floor(diff / 86400000)}d ago`;
        return (
          <span
            className={`text-xs whitespace-nowrap ${isOnline ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}
            title={new Date(u.last_seen_at).toLocaleString("de-DE", { timeZone: getStaffTz() })}
          >
            {label}
          </span>
        );
      }
      case "last_ip": return (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{u.last_ip || "—"}</span>
          {u.last_ip && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(u.last_ip).catch(() => {}); }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      );
      case "last_note": return <p className="text-xs text-muted-foreground max-w-[160px] truncate">{note?.content || "—"}</p>;
      case "last_note_date": return (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {note?.created_at ? new Date(note.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: getStaffTz() }) : "—"}
        </span>
      );
      case "notes_count": return <Badge variant="outline" className="text-xs">{note?.count ?? 0}</Badge>;
      default: return null;
    }
  };

  const hasBulk = !!selectedForBulk && !!toggleBulkSelect;
  const colCount = columns.length + 1 + (hasBulk ? 1 : 0);

  return (
    <Card>
      <div className="flex items-center justify-end gap-2 p-2 border-b">
        <ColumnVisibilityMenu
          allColumns={pickerColumns}
          hiddenKeys={hiddenKeys}
          onToggle={toggleColumnVisibility}
          onShowAll={showAllColumns}
        />
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {hasBulk && (
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={filtered.length > 0 && selectedForBulk.size === filtered.length}
                      onCheckedChange={() => toggleSelectAll?.()}
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
                <tr><td colSpan={colCount} className="p-8 text-center text-muted-foreground">No leads found</td></tr>
              ) : (
                filtered.map((u) => {
                  const note = notesMap[u.id];
                  return (
                    <tr key={u.id} className={`border-b last:border-0 transition-colors cursor-pointer ${selectedForBulk?.has(u.id) ? "bg-primary/10" : ""} ${u.shaved_to ? "opacity-50 bg-orange-500/5 hover:bg-orange-500/10" : u.shaved_from ? "bg-green-500/5 hover:bg-green-500/10" : (u.status === "new" || u.status === "New") ? "bg-emerald-500/10 hover:bg-emerald-500/20" : u.status === "Calling..." ? "bg-blue-500/20 hover:bg-blue-500/30 animate-pulse" : "hover:bg-muted/30"}`} onClick={() => { setClientNavList({ ids: filtered.map((x: any) => x.id), source: "Leads" }); navigate(`/backoffice/users/${u.id}`); }}>
                      {hasBulk && (
                        <td className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedForBulk.has(u.id)} onCheckedChange={() => toggleBulkSelect(u.id)} />
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
                            <DropdownMenuItem onClick={() => setCommentTarget({ id: u.id, name: u.full_name || u.email || "Lead" })}>
                              <MessageSquarePlus className="h-4 w-4 mr-2" /> Add Comment
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
                            {handleShaveLead && (
                              <>
                                <DropdownMenuSeparator />
                                {!u.shaved_to ? (
                                  <DropdownMenuItem onClick={() => handleShaveLead(u.id, u.full_name || u.email)} className="text-orange-600 font-medium">
                                    <Scissors className="h-4 w-4 mr-2" /> Shave Lead
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                                    Already shaved
                                  </DropdownMenuItem>
                                )}
                              </>
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
                            {handleForceRedirect && (
                              <DropdownMenuItem onClick={() => handleForceRedirect(u.id, u.full_name || u.email)}>
                                <Home className="h-4 w-4 mr-2" /> Force to Home Page
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setPaymentLinkTarget({ id: u.id, name: u.full_name || u.email, country: u.country })}>
                              <CreditCard className="h-4 w-4 mr-2" /> Request Payment Link
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

      {paymentLinkTarget && (
        <PaymentLinkDialog
          open={!!paymentLinkTarget}
          onOpenChange={(open) => { if (!open) setPaymentLinkTarget(null); }}
          clientId={paymentLinkTarget.id}
          clientName={paymentLinkTarget.name}
          clientCountry={paymentLinkTarget.country}
        />
      )}

      {commentTarget && (
        <AddCommentDialog
          open={!!commentTarget}
          onOpenChange={(open) => { if (!open) setCommentTarget(null); }}
          userId={commentTarget.id}
          userName={commentTarget.name}
          onSaved={fetchData}
        />
      )}
    </Card>
  );
};

export default LeadsTable;
