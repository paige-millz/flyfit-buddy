import { ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Aircraft, CargoPart } from "@/data/aircraft";
import { calcPayload } from "./PayloadCheck";
import { checkDoorFit, checkCabinFit } from "./FitChecks";

interface SummaryDashboardProps {
  aircraft: Aircraft;
  parts: CargoPart[];
  includeMechanics: boolean;
  mechanicCount: number;
  toolWeight: number;
  removeSeats: boolean;
}

const SummaryDashboard = (props: SummaryDashboardProps) => {
  const { aircraft, parts } = props;
  const payload = calcPayload({ ...props });
  const doorFits = parts.filter((p) => checkDoorFit(p, aircraft)).length;
  const cabinFits = parts.filter((p) => checkCabinFit(p, aircraft)).length;

  const allGood = payload.pass && doorFits === parts.length && cabinFits === parts.length;

  return (
    <Card className={`card-shadow-lg animate-fade-in border-2 ${allGood ? "border-success/40" : "border-destructive/40"}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-sm">
          <div className="p-3 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground">Aircraft</div>
            <div className="font-bold">{aircraft.name}</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground">Parts</div>
            <div className="font-bold">{parts.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground">Total Weight</div>
            <div className="font-bold">{payload.totalRequired.toLocaleString()} lbs</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground">Payload</div>
            <Badge className={payload.pass ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
              {payload.pass ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
              {payload.pass ? "PASS" : "FAIL"}
            </Badge>
          </div>
          <div className="p-3 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground">Fit Checks</div>
            <div className="font-bold">
              <span className={doorFits === parts.length ? "text-success" : "text-destructive"}>
                Door: {doorFits}/{parts.length}
              </span>
              {" · "}
              <span className={cabinFits === parts.length ? "text-success" : "text-destructive"}>
                Cabin: {cabinFits}/{parts.length}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryDashboard;
