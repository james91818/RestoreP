import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileCheck, Clock, XCircle, Trash2, Eye, Loader2, ShieldCheck } from "lucide-react";

type DocType = "id_front" | "id_back" | "utility_bill";

interface KycDoc {
  id: string;
  document_type: DocType;
  file_url: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const DOC_CONFIG: { type: DocType; label: string; description: string }[] = [
  { type: "id_front", label: "Ausweis – Vorderseite", description: "Personalausweis, Reisepass oder Führerschein (Vorderseite)" },
  { type: "id_back", label: "Ausweis – Rückseite", description: "Rückseite Ihres Ausweisdokuments" },
  { type: "utility_bill", label: "Adressnachweis", description: "Aktuelle Stromrechnung, Kontoauszug oder Meldebestätigung (max. 3 Monate alt)" },
];

const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "In Prüfung", icon: <Clock className="h-3 w-3" />, variant: "secondary" },
  approved: { label: "Genehmigt", icon: <FileCheck className="h-3 w-3" />, variant: "default" },
  rejected: { label: "Abgelehnt", icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
};

export default function KycUpload() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<KycDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocType | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchDocs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("kyc_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDocs((data as KycDoc[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [user]);

  const getDocForType = (type: DocType): KycDoc | undefined =>
    docs.find(d => d.document_type === type);

  const handleUpload = async (type: DocType, file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Datei zu groß. Maximal 10 MB erlaubt.");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Nur JPG, PNG, WebP oder PDF erlaubt.");
      return;
    }

    setUploading(type);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${type}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Delete old doc of same type if exists and pending
      const existing = getDocForType(type);
      if (existing && existing.status === "pending") {
        // Remove old file from storage
        const oldPath = existing.file_url.split("/kyc-documents/")[1];
        if (oldPath) await supabase.storage.from("kyc-documents").remove([oldPath]);
        await supabase.from("kyc_documents").delete().eq("id", existing.id);
      }

      // Insert record
      const { error: dbError } = await supabase.from("kyc_documents").insert({
        user_id: user.id,
        document_type: type,
        file_url: path,
        status: "pending",
      });

      if (dbError) throw dbError;

      toast.success("Dokument erfolgreich hochgeladen");
      fetchDocs();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Fehler beim Hochladen");
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (doc: KycDoc) => {
    try {
      await supabase.storage.from("kyc-documents").remove([doc.file_url]);
      await supabase.from("kyc_documents").delete().eq("id", doc.id);
      toast.success("Dokument gelöscht");
      fetchDocs();
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  const handleView = async (doc: KycDoc) => {
    const { data } = await supabase.storage
      .from("kyc-documents")
      .createSignedUrl(doc.file_url, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Datei konnte nicht geöffnet werden");
    }
  };

  // Overall KYC status
  const allApproved = DOC_CONFIG.every(c => {
    const d = getDocForType(c.type);
    return d && d.status === "approved";
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allApproved && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-success" />
            <div>
              <p className="font-semibold text-sm text-success">Identität verifiziert</p>
              <p className="text-xs text-muted-foreground">Alle Dokumente wurden genehmigt.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {DOC_CONFIG.map(({ type, label, description }) => {
        const doc = getDocForType(type);
        const status = doc ? STATUS_MAP[doc.status] : null;
        const canReupload = !doc || doc.status === "pending" || doc.status === "rejected";

        return (
          <Card key={type}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-display">{label}</CardTitle>
                {status && (
                  <Badge variant={status.variant} className="gap-1 text-[10px]">
                    {status.icon} {status.label}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {doc?.status === "rejected" && doc.admin_notes && (
                <div className="text-xs text-destructive bg-destructive/5 rounded-lg p-2">
                  <strong>Grund:</strong> {doc.admin_notes}
                </div>
              )}

              <div className="flex items-center gap-2">
                {doc && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleView(doc)} className="gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> Ansehen
                    </Button>
                    {doc.status === "pending" && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)} className="gap-1.5 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Löschen
                      </Button>
                    )}
                  </>
                )}

                {canReupload && (
                  <>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      ref={el => { fileInputRefs.current[type] = el; }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(type, file);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => fileInputRefs.current[type]?.click()}
                      disabled={uploading === type}
                      className="gap-1.5"
                    >
                      {uploading === type ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {doc ? "Erneut hochladen" : "Hochladen"}
                    </Button>
                  </>
                )}
              </div>

              {doc && (
                <p className="text-[10px] text-muted-foreground">
                  Hochgeladen am {new Date(doc.created_at).toLocaleDateString("de-DE")}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
