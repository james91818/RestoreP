import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileCheck, Clock, XCircle, Eye, Loader2, ShieldCheck, Check, X, FileText, AlertCircle } from "lucide-react";

interface KycDoc {
  id: string;
  document_type: string;
  file_url: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  id_front: "ID — Front",
  id_back: "ID — Back",
  utility_bill: "Proof of Address",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: JSX.Element }> = {
  pending: { label: "Pending", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  approved: { label: "Approved", variant: "default", icon: <FileCheck className="h-3 w-3" /> },
  rejected: { label: "Rejected", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

export default function AdminKycDocs({ userId }: { userId: string }) {
  const [docs, setDocs] = useState<KycDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase.functions.invoke("admin-user-actions", {
      body: { action: "get_kyc_documents", user_id: userId },
    });

    const resolveUserIdForFallback = async () => {
      if (UUID_PATTERN.test(userId)) {
        return userId;
      }

      const displayId = Number(userId);
      if (!Number.isFinite(displayId)) {
        throw new Error("Invalid client identifier");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("display_id", displayId)
        .single();

      if (profileError || !profile?.id) {
        throw new Error(profileError?.message || "Client not found");
      }

      return profile.id;
    };

    const fetchDocsFallback = async () => {
      const resolvedUserId = await resolveUserIdForFallback();
      const { data: docsData, error: docsError } = await supabase
        .from("kyc_documents")
        .select("id, document_type, file_url, status, admin_notes, created_at")
        .eq("user_id", resolvedUserId)
        .order("created_at", { ascending: false });

      if (docsError) {
        throw docsError;
      }

      return (docsData as KycDoc[]) ?? [];
    };

    if (error || data?.error) {
      try {
        const fallbackDocs = await fetchDocsFallback();
        setDocs(fallbackDocs);
        setErrorMessage(null);
      } catch (fallbackError: any) {
        setDocs([]);
        setErrorMessage(
          fallbackError?.message || error?.message || data?.error || "Could not load KYC documents"
        );
      }
      setLoading(false);
      return;
    }

    const functionDocs = (data?.docs as KycDoc[]) ?? [];

    if (functionDocs.length === 0) {
      try {
        const fallbackDocs = await fetchDocsFallback();
        setDocs(fallbackDocs);
      } catch {
        setDocs(functionDocs);
      }
    } else {
      setDocs(functionDocs);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const openSignedUrl = async (signedUrl: string, fileName: string) => {
    try {
      const res = await fetch(signedUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        // Popup blocked — force download instead
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Could not load file");
      return false;
    }
  };

  const handleView = async (doc: KycDoc) => {
    const fileName = doc.file_url.split("/").pop() || `${doc.document_type}.bin`;

    const { data, error } = await supabase.functions.invoke("admin-user-actions", {
      body: { action: "get_kyc_document_url", document_id: doc.id },
    });

    if (!error && !data?.error && data?.signedUrl) {
      const ok = await openSignedUrl(data.signedUrl, fileName);
      if (ok) return;
    }

    const { data: fallbackSigned, error: fallbackError } = await supabase.storage
      .from("kyc-documents")
      .createSignedUrl(doc.file_url, 300);

    if (fallbackError || !fallbackSigned?.signedUrl) {
      toast.error(fallbackError?.message || error?.message || data?.error || "Could not open file");
      return;
    }

    await openSignedUrl(fallbackSigned.signedUrl, fileName);
  };

  const updateStatus = async (doc: KycDoc, status: "approved" | "rejected") => {
    setActing(doc.id);

    const { data, error } = await supabase.functions.invoke("admin-user-actions", {
      body: {
        action: "update_kyc_document_status",
        document_id: doc.id,
        status,
        admin_notes: status === "rejected" ? rejectNotes[doc.id] || null : null,
      },
    });

    setActing(null);

    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Could not update document");
      return;
    }

    toast.success(`Document ${status}`);
    fetchDocs();
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Could not load KYC documents</p>
            <p className="text-xs text-muted-foreground">{errorMessage}</p>
          </div>
          <Button size="sm" variant="outline" onClick={fetchDocs}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (docs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
          <FileText className="h-8 w-8 opacity-40" />
          Client has not uploaded any KYC documents yet.
        </CardContent>
      </Card>
    );
  }

  const allApproved = ["id_front", "id_back", "utility_bill"].every(
    (type) => docs.find((doc) => doc.document_type === type)?.status === "approved"
  );

  return (
    <div className="space-y-3">
      {allApproved && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex items-center gap-2 p-3 text-sm">
            <ShieldCheck className="h-4 w-4 text-success" />
            <span className="font-medium">Identity fully verified</span>
          </CardContent>
        </Card>
      )}

      {docs.map((doc) => {
        const statusConfig = STATUS_BADGE[doc.status] ?? STATUS_BADGE.pending;

        return (
          <Card key={doc.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{TYPE_LABEL[doc.document_type] ?? doc.document_type}</CardTitle>
                <Badge variant={statusConfig.variant} className="gap-1 text-[10px]">
                  {statusConfig.icon} {statusConfig.label}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Uploaded {new Date(doc.created_at).toLocaleString("en-GB")}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {doc.status === "rejected" && doc.admin_notes && (
                <div className="rounded-lg bg-destructive/5 p-2 text-xs text-destructive">
                  <strong>Reason:</strong> {doc.admin_notes}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleView(doc)} className="gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> View
                </Button>
                {doc.status !== "approved" && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => updateStatus(doc, "approved")}
                    disabled={acting === doc.id}
                    className="gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                )}
                {doc.status !== "rejected" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateStatus(doc, "rejected")}
                    disabled={acting === doc.id}
                    className="gap-1.5"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                )}
              </div>

              {doc.status !== "rejected" && (
                <Textarea
                  placeholder="Optional rejection reason (shown to client)"
                  value={rejectNotes[doc.id] ?? ""}
                  onChange={(e) => setRejectNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                  className="min-h-[60px] text-xs"
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
