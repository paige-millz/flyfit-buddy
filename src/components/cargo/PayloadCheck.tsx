import { Scale, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Aircraft, CargoPart, MECHANIC_WEIGHT } from "@/data/aircraft";

interface PayloadCheckProps {
  aircraft: Aircraft;
  parts: CargoPart[];
  includeMechanics: boolean;
  mechanicCount: number;
  toolWeight: number;
  removeSeats: boolean;
}

export function calcPayload(props: PayloadCheckProps) {
  const partsWeight = props.parts.reduce((s, p) => s + p.weight, 0);
  const mechWeight = props.includeMechanics ? props.mechanicCount * MECHANIC_WEIGHT + props.toolWeight : 0;
  const totalRequired = partsWeight + mechWeight;
  const seatBonus = props.removeSeats ? props.aircraft.removableSeats * props.aircraft.seatWeight : 0;
  const available = props.aircraft.maxPayload + seatBonus;
  const pct = available > 0 ? Math.min((totalRequired / available) * 100, 120) : 0;
  const pass = totalRequired <= available;
  return { partsWeight, mechWeight, totalRequired, available, seatBonus, pct, pass };
}

const PayloadCheck = (props: PayloadCheckProps) => {
  const { totalRequired, available, pct, pass } = calcPayload(props);

  const barColor = pct > 100 ? "bg-destructive" : pct > 80 ? "bg-warning" : "bg-success";

  return (
    <Card className="card-shadow animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="w-5 h-5 text-primary" />
          Step 4: Payload Feasibility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span>Total Required: <strong>{totalRequired.toLocaleString()} lbs</strong></span>
          <span>Available: <strong>{available.toLocaleString()} lbs</strong></span>
        </div>

        <div className="relative h-4 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="text-center text-xs text-muted-foreground">{Math.round(pct)}% capacity used</div>

        <div className={`flex items-center gap-2 p-3 rounded-lg ${pass ? "bg-success/10" : "bg-destructive/10"}`}>
          {pass ? (
            <>
              <CheckCircle2 className="w-6 h-6 text-success" />
              <span className="font-semibold text-success">Payload OK</span>
            </>
          ) : (
            <>
              <XCircle className="w-6 h-6 text-destructive" />
              <span className="font-semibold text-destructive">Over max payload by {(totalRequired - available).toLocaleString()} lbs</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PayloadCheck;
