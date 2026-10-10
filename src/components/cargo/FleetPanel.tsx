import { useMemo, useState } from "react";
import { Plane, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AircraftCategory } from "@/data/aircraft";
import type { FitResult } from "@/lib/fit";
import { cn } from "@/lib/utils";
import VerdictBadge from "./VerdictBadge";

interface FleetPanelProps {
  results: FitResult[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const CATEGORIES: ("All" | AircraftCategory)[] = ["All", "Piston", "Turboprop", "Jet"];

const FleetPanel = ({ results, selectedId, onSelect }: FleetPanelProps) => {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return results.filter((r) => {
      const ac = r.aircraft;
      if (cat !== "All" && ac.category !== cat) return false;
      if (!q) return true;
      return [ac.name, ...(ac.aliases ?? [])].some((n) => n.toLowerCase().includes(q));
    });
  }, [results, query, cat]);

  const counts = useMemo(
    () => ({
      go: results.filter((r) => r.verdict === "go").length,
      check: results.filter((r) => r.verdict === "check").length,
    }),
    [results],
  );

  return (
    <Card className="card-shadow flex flex-col print:hidden">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plane className="h-4 w-4 text-primary" />
            Fleet match
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            <strong className="text-success">{counts.go}</strong> go ·{" "}
            <strong className="text-warning-strong">{counts.check}</strong> check · {results.length} total
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search type or code (e.g. BE20)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <ToggleGroup type="single" size="sm" value={cat} onValueChange={(v) => v && setCat(v as typeof cat)}>
            {CATEGORIES.map((c) => (
              <ToggleGroupItem key={c} value={c} className="h-8 px-2 text-xs">
                {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="max-h-[340px] divide-y overflow-y-auto border-t" role="listbox" aria-label="Aircraft">
          {visible.map((r) => {
            const ac = r.aircraft;
            const active = ac.id === selectedId;
            return (
              <li key={ac.id}>
                <button
                  role="option"
                  aria-selected={active}
                  onClick={() => onSelect(ac.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary/60",
                    active && "bg-primary/10 hover:bg-primary/15",
                  )}
                >
                  <VerdictBadge verdict={r.verdict} className="w-[74px] shrink-0 justify-center" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-semibold">{ac.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{ac.category}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.reasons[0] ?? `Door ${ac.doorWidth}×${ac.doorHeight} · cabin ${ac.cabinLength}×${ac.cabinWidth}×${ac.cabinHeight} in`}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        r.payload.margin < 0 ? "text-destructive" : "text-foreground",
                      )}
                    >
                      {r.payload.margin >= 0 ? "+" : "−"}
                      {Math.abs(Math.round(r.payload.margin)).toLocaleString()} lb
                    </div>
                    <div className="text-[10px] text-muted-foreground">payload margin</div>
                  </div>
                </button>
              </li>
            );
          })}
          {visible.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No aircraft match.</li>}
        </ul>
      </CardContent>
    </Card>
  );
};

export default FleetPanel;
