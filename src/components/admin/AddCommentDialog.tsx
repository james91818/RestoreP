import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { notifyCommentAdded } from "@/hooks/useFollowUps";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onSaved?: () => void;
}

/**
 * Lightweight "Add Comment" dialog used directly from the Leads table.
 * Inserts into admin_notes for the selected client.
 */
const AddCommentDialog = ({ open, onOpenChange, userId, userName, onSaved }: Props) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Please write a comment first");
      return;
    }
    if (!user?.id) {
      toast.error("Not authenticated");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("admin_notes").insert({
      user_id: userId,
      author_id: user.id,
      content: trimmed,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save comment: " + error.message);
      return;
    }
    toast.success("Comment added");
    notifyCommentAdded();
    setContent("");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Add comment</DialogTitle>
          <DialogDescription>For {userName}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your comment..."
          rows={5}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !content.trim()}>
            {saving ? "Saving..." : "Save comment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddCommentDialog;
