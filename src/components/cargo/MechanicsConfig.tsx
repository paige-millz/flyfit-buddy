import { Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Aircraft, MECHANIC_WEIGHT } from "@/data/aircraft";

interface MechanicsConfigProps {
  aircraft: Aircraft | null;
  includeMechanics: boolean;
  setIncludeMechanics: (v: boolean) => void;
  mechanicCount: number;
  setMechanicCount: (v: number) => void;
  toolWeight: number;
  setToolWeight: (v: number) => void;
  removeSeats: boolean;
  setRemoveSeats: (v: boolean) => void;
}

const MechanicsConfig = ({
  aircraft, includeMechanics, setIncludeMechanics,
  mechanicCount, setMechanicCount, toolWeight, setToolWeight,
  removeSeats, setRemoveSeats,
}: MechanicsConfigProps) => {
  const seatPayloadGain = aircraft ? aircraft.removableSeats * aircraft.seatWeight : 0;

  return (
    <Card className="card-shadow animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wrench className="w-5 h-5 text-primary" />
          Step 3: Mechanics & Payload Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <div>
            <Label className="font-medium">Include mechanics?</Label>
            <p className="text-xs text-muted-foreground">Each mechanic weighs {MECHANIC_WEIGHT} lbs</p>
          </div>
          <Switch checked={includeMechanics} onCheckedChange={setIncludeMechanics} />
        </div>

        {includeMechanics && (
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            <div>
              <Label className="text-sm">Number of mechanics</Label>
              <Input type="number" min={0} value={mechanicCount} onChange={(e) => setMechanicCount(Math.max(0, parseInt(e.target.value) || 0))} />
            </div>
            <div>
              <Label className="text-sm">Total tool weight (lbs)</Label>
              <Input type="number" min={0} value={toolWeight} onChange={(e) => setToolWeight(Math.max(0, parseFloat(e.target.value) || 0))} />
            </div>
          </div>
        )}

        {aircraft && aircraft.removableSeats > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <Label className="font-medium">Remove seats for extra capacity?</Label>
              <p className="text-xs text-muted-foreground">
                {aircraft.removableSeats} removable seats × {aircraft.seatWeight} lbs = +{seatPayloadGain} lbs payload
              </p>
            </div>
            <Switch checked={removeSeats} onCheckedChange={setRemoveSeats} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MechanicsConfig;
