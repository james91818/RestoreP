import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { isBackofficeHost } from "@/lib/hosts";

interface ThemePickerDialogProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
}

const t = (de: string, en: string) => isBackofficeHost() ? en : de;

const ThemePickerDialog = ({ open, onClose, userId }: ThemePickerDialogProps) => {
  const { setTheme } = useTheme();
  const [selected, setSelected] = useState<"light" | "dark">("light");

  // Default to light theme when dialog opens
  useEffect(() => {
    if (open) {
      setSelected("light");
      setTheme("light");
    }
  }, [open, setTheme]);

  const handleSelect = (themeVal: "light" | "dark") => {
    setSelected(themeVal);
    setTheme(themeVal);
  };

  const handleConfirm = () => {
    localStorage.setItem("crypto-boerse-theme-chosen", "true");
    if (userId) localStorage.setItem(`crypto-boerse-theme-chosen-${userId}`, "true");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-display text-center">
            {t("Wählen Sie Ihr Design", "Choose Your Theme")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {t(
              "Wählen Sie Ihr bevorzugtes Erscheinungsbild. Sie können dies jederzeit in der Seitenleiste ändern.",
              "Select your preferred appearance. You can change this anytime from the sidebar."
            )}
          </p>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <button
            onClick={() => handleSelect("light")}
            className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
              selected === "light"
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div className="h-14 w-14 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
              <Sun className="h-7 w-7 text-amber-500" />
            </div>
            <span className="font-display font-bold text-base">{t("Hell", "Light")}</span>
            <span className="text-xs text-muted-foreground">{t("Klar & hell", "Clean & bright")}</span>
          </button>

          <button
            onClick={() => handleSelect("dark")}
            className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
              selected === "dark"
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div className="h-14 w-14 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
              <Moon className="h-7 w-7 text-blue-300" />
            </div>
            <span className="font-display font-bold text-base">{t("Dunkel", "Dark")}</span>
            <span className="text-xs text-muted-foreground">{t("Augenschonend", "Easy on the eyes")}</span>
          </button>
        </div>

        <Button onClick={handleConfirm} className="w-full mt-4 h-11 text-base font-bold rounded-xl">
          {t("Weiter", "Continue")}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ThemePickerDialog;
