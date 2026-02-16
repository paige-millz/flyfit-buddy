import { ScanSearch, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Aircraft, CargoPart } from "@/data/aircraft";

interface FitChecksProps {
  aircraft: Aircraft;
  parts: CargoPart[];
}

export function checkDoorFit(part: CargoPart, ac: Aircraft): boolean {
  return (
    (part.length <= ac.doorWidth && part.width <= ac.doorHeight) ||
    (part.width <= ac.doorWidth && part.length <= ac.doorHeight)
  );
}

export function checkCabinFit(part: CargoPart, ac: Aircraft): boolean {
  return part.length <= ac.cabinLength && part.width <= ac.cabinWidth && part.height <= ac.cabinHeight;
}

const FitChecks = ({ aircraft, parts }: FitChecksProps) => {
  if (parts.length === 0) return null;

  return (
    <Card className="card-shadow animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ScanSearch className="w-5 h-5 text-primary" />
          Step 5: Door & Cabin Fit Checks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {parts.map((part) => {
            const doorOk = checkDoorFit(part, aircraft);
            const cabinOk = checkCabinFit(part, aircraft);
            return (
              <div key={part.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 flex-wrap gap-2">
                <span className="font-medium text-sm">{part.name}</span>
                <div className="flex gap-2">
                  <Badge variant={doorOk ? "default" : "destructive"} className={doorOk ? "bg-success text-success-foreground" : ""}>
                    {doorOk ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    {doorOk ? "Fits door" : "Too large for door"}
                  </Badge>
                  <Badge variant={cabinOk ? "default" : "destructive"} className={cabinOk ? "bg-success text-success-foreground" : ""}>
                    {cabinOk ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    {cabinOk ? "Fits cabin" : "Too large for cabin"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FitChecks;
