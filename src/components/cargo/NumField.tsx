import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NumFieldProps {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  integer?: boolean;
  className?: string;
  "aria-label"?: string;
  suffix?: string;
}

/** Number input that keeps the raw text while typing and commits only valid values. */
const NumField = ({ value, onCommit, min = 0, integer, className, suffix, ...rest }: NumFieldProps) => {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  // Sync external changes, but never while the user is typing (would eat "1." etc).
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const n = integer ? parseInt(raw, 10) : parseFloat(raw);
    if (Number.isFinite(n) && n >= min) onCommit(n);
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        onBlur={() => {
          focused.current = false;
          setText(String(value));
        }}
        onFocus={(e) => {
          focused.current = true;
          e.target.select();
        }}
        className={cn("h-8 px-2 text-right tabular-nums", suffix && "pr-6")}
        aria-label={rest["aria-label"]}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
};

export default NumField;
