import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Time24InputProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  className?: string;
  minuteStep?: number;
  disabled?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Always-24h time picker (Europe style: 10:00 / 22:00).
 * Native <input type="time"> follows the browser locale and can render AM/PM,
 * so we use explicit hour/minute selects instead.
 */
const Time24Input = ({ value, onChange, className, minuteStep = 5, disabled }: Time24InputProps) => {
  const [hStr = "", mStr = ""] = (value || "").split(":");
  const hour = hStr === "" ? "" : pad(Number(hStr));
  const minute = mStr === "" ? "" : pad(Number(mStr));

  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => pad(i * minuteStep));
  if (minute && !minutes.includes(minute)) minutes.push(minute);
  minutes.sort();

  return (
    <div className={cn("flex items-center gap-1", className)} translate="no">
      <Select value={hour} onValueChange={(h) => onChange(`${h}:${minute || "00"}`)} disabled={disabled}>
        <SelectTrigger className="tabular-nums">
          <SelectValue placeholder="--" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {hours.map((h) => (
            <SelectItem key={h} value={h} className="tabular-nums">{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select value={minute} onValueChange={(m) => onChange(`${hour || "00"}:${m}`)} disabled={disabled}>
        <SelectTrigger className="tabular-nums">
          <SelectValue placeholder="--" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {minutes.map((m) => (
            <SelectItem key={m} value={m} className="tabular-nums">{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default Time24Input;
