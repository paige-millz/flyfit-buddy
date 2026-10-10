import { SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PlanOptions } from "@/lib/fit";
import NumField from "./NumField";

interface OptionsPanelProps {
  options: PlanOptions;
  onChange: (o: PlanOptions) => void;
}

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
      <Label className="text-sm">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const OptionsPanel = ({ options, onChange }: OptionsPanelProps) => {
  const set = (patch: Partial<PlanOptions>) => onChange({ ...options, ...patch });

  return (
    <Card className="card-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Load options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label="Mechanics riding along" hint="Added to payload">
          <NumField className="w-20" value={options.mechanics} integer onCommit={(v) => set({ mechanics: v })} aria-label="Mechanics" />
        </Row>
        {options.mechanics > 0 && (
          <>
            <Row label="Weight per mechanic">
              <NumField className="w-20" value={options.mechanicWeight} onCommit={(v) => set({ mechanicWeight: v })} suffix="lb" aria-label="Weight per mechanic" />
            </Row>
            <Row label="Tools (total)">
              <NumField className="w-20" value={options.toolWeight} onCommit={(v) => set({ toolWeight: v })} suffix="lb" aria-label="Tool weight" />
            </Row>
          </>
        )}
        <Row label="Pull removable seats" hint="Credits seat weight back to payload">
          <Switch checked={options.removeSeats} onCheckedChange={(v) => set({ removeSeats: v })} />
        </Row>
        <Row label="Clearance" hint="Kept free on every door & cabin dimension">
          <NumField className="w-20" value={options.clearance} onCommit={(v) => set({ clearance: v })} suffix="in" aria-label="Clearance (in)" />
        </Row>
      </CardContent>
    </Card>
  );
};

export default OptionsPanel;
