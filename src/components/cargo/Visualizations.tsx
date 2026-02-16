import { useState } from "react";
import { Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Aircraft, CargoPart } from "@/data/aircraft";
import { checkDoorFit } from "./FitChecks";

interface VisualizationsProps {
  aircraft: Aircraft;
  parts: CargoPart[];
}

const PART_COLORS = [
  "hsl(40, 48%, 58%)", "hsl(200, 60%, 50%)", "hsl(142, 60%, 45%)",
  "hsl(280, 50%, 55%)", "hsl(20, 70%, 55%)", "hsl(340, 60%, 55%)",
  "hsl(170, 50%, 45%)", "hsl(60, 60%, 50%)",
];

const Visualizations = ({ aircraft, parts }: VisualizationsProps) => {
  const [selectedPartId, setSelectedPartId] = useState<string>(parts[0]?.id || "");
  const selectedPart = parts.find((p) => p.id === selectedPartId);

  // Door fit visualization
  const renderDoorView = () => {
    if (!selectedPart) return null;
    const doorW = aircraft.doorWidth;
    const doorH = aircraft.doorHeight;
    const maxDim = Math.max(doorW, doorH, selectedPart.length, selectedPart.width) * 1.3;
    const scale = 280 / maxDim;
    const svgW = 320;
    const svgH = 320;
    const cx = svgW / 2;
    const cy = svgH / 2;

    const fits = checkDoorFit(selectedPart, aircraft);

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-xs mx-auto">
        {/* Door */}
        <rect
          x={cx - (doorW * scale) / 2} y={cy - (doorH * scale) / 2}
          width={doorW * scale} height={doorH * scale}
          fill="hsl(210, 60%, 92%)" stroke="hsl(210, 60%, 50%)" strokeWidth="2" rx="2"
        />
        <text x={cx} y={cy - (doorH * scale) / 2 - 6} textAnchor="middle" fontSize="11" fill="hsl(210, 60%, 40%)" fontWeight="600">
          Door: {doorW}" × {doorH}"
        </text>

        {/* Part */}
        <rect
          x={cx - (selectedPart.length * scale) / 2} y={cy - (selectedPart.width * scale) / 2}
          width={selectedPart.length * scale} height={selectedPart.width * scale}
          fill={fits ? "hsla(142, 60%, 45%, 0.3)" : "hsla(0, 70%, 55%, 0.3)"}
          stroke={fits ? "hsl(142, 60%, 45%)" : "hsl(0, 70%, 55%)"}
          strokeWidth="2" rx="2"
        />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="currentColor">
          {selectedPart.length}" × {selectedPart.width}"
        </text>
      </svg>
    );
  };

  // Cabin layout
  const renderCabinLayout = () => {
    const cabL = aircraft.cabinLength;
    const cabW = aircraft.cabinWidth;
    const maxDim = Math.max(cabL, cabW);
    const svgPad = 40;
    const svgW = 500;
    const svgH = 300;
    const availW = svgW - svgPad * 2;
    const availH = svgH - svgPad * 2;
    const scale = Math.min(availW / cabL, availH / cabW);

    const spacing = 5;
    let curX = 0;
    let curY = 0;
    let rowMaxW = 0;
    let overflow = false;

    const placements: { part: CargoPart; x: number; y: number; color: string }[] = [];

    parts.forEach((part, i) => {
      if (curX + part.length > cabL) {
        curX = 0;
        curY += rowMaxW + spacing;
        rowMaxW = 0;
      }
      if (curY + part.width > cabW) {
        overflow = true;
      }
      placements.push({ part, x: curX, y: curY, color: PART_COLORS[i % PART_COLORS.length] });
      curX += part.length + spacing;
      rowMaxW = Math.max(rowMaxW, part.width);
    });

    return (
      <div>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full">
          {/* Cabin outline */}
          <rect
            x={svgPad} y={svgPad}
            width={cabL * scale} height={cabW * scale}
            fill="hsl(210, 20%, 96%)" stroke="hsl(0, 0%, 60%)" strokeWidth="1.5" strokeDasharray="6 3" rx="4"
          />
          <text x={svgPad + cabL * scale / 2} y={svgPad - 8} textAnchor="middle" fontSize="11" fill="hsl(0, 0%, 40%)" fontWeight="600">
            Cabin: {cabL}" × {cabW}"
          </text>

          {/* Parts */}
          {placements.map(({ part, x, y, color }, i) => (
            <g key={part.id}>
              <rect
                x={svgPad + x * scale} y={svgPad + y * scale}
                width={part.length * scale} height={part.width * scale}
                fill={color} fillOpacity={0.6} stroke={color} strokeWidth="1.5" rx="2"
              />
              {part.length * scale > 30 && part.width * scale > 14 && (
                <text
                  x={svgPad + (x + part.length / 2) * scale}
                  y={svgPad + (y + part.width / 2) * scale + 4}
                  textAnchor="middle" fontSize="8" fill="hsl(0, 0%, 10%)" fontWeight="500"
                >
                  {part.name.length > 15 ? part.name.slice(0, 12) + "…" : part.name}
                </text>
              )}
            </g>
          ))}
        </svg>
        {overflow && (
          <div className="text-center text-sm font-semibold text-destructive mt-1">
            ⚠ Not all parts fit in cabin!
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="card-shadow animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Eye className="w-5 h-5 text-primary" />
          Step 6: Visualizations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Door view */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Part vs. Door Opening</h3>
          <Select value={selectedPartId} onValueChange={setSelectedPartId}>
            <SelectTrigger className="w-full mb-3">
              <SelectValue placeholder="Select a part" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {parts.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {renderDoorView()}
        </div>

        {/* Cabin layout */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Cabin Layout (Top-Down)</h3>
          {renderCabinLayout()}
        </div>
      </CardContent>
    </Card>
  );
};

export default Visualizations;
