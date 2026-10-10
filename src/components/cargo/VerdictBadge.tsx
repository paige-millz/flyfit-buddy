import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { VERDICT_LABEL, type Verdict } from "@/lib/fit";
import { cn } from "@/lib/utils";

const styles: Record<Verdict, string> = {
  go: "bg-success/15 text-success border-success/30",
  check: "bg-warning/15 text-warning-strong border-warning/40",
  "no-go": "bg-destructive/10 text-destructive border-destructive/30",
};

const icons = { go: CheckCircle2, check: AlertTriangle, "no-go": XCircle };

const VerdictBadge = ({ verdict, className }: { verdict: Verdict; className?: string }) => {
  const Icon = icons[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-bold tracking-wide",
        styles[verdict],
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {VERDICT_LABEL[verdict]}
    </span>
  );
};

export default VerdictBadge;
