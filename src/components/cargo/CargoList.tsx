import { useState } from "react";
import { Package, Plus, Trash2, Download, RotateCw, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CargoPart, PARTS_DB, generatePartId } from "@/data/aircraft";
import { useToast } from "@/hooks/use-toast";

interface CargoListProps {
  parts: CargoPart[];
  setParts: React.Dispatch<React.SetStateAction<CargoPart[]>>;
}

const CargoList = ({ parts, setParts }: CargoListProps) => {
  const { toast } = useToast();
  const [presetOpen, setPresetOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customL, setCustomL] = useState("");
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");
  const [customWt, setCustomWt] = useState("");

  const addPreset = (name: string) => {
    const p = PARTS_DB.find((x) => x.name === name);
    if (!p) return;
    setParts((prev) => [...prev, { id: generatePartId(), name: p.name, length: p.length, width: p.width, height: p.height, weight: p.weight, rotated: false }]);
    setPresetOpen(false);
    toast({ title: "Part added", description: p.name });
  };

  const addCustom = () => {
    const l = parseFloat(customL), w = parseFloat(customW), h = parseFloat(customH), wt = parseFloat(customWt);
    if (!customName.trim() || isNaN(l) || isNaN(w) || isNaN(h) || isNaN(wt) || l <= 0 || w <= 0 || h <= 0 || wt <= 0) {
      toast({ title: "Invalid input", description: "All fields required with positive values", variant: "destructive" });
      return;
    }
    setParts((prev) => [...prev, { id: generatePartId(), name: customName.trim(), length: l, width: w, height: h, weight: wt, rotated: false }]);
    toast({ title: "Part added", description: customName.trim() });
    setCustomName(""); setCustomL(""); setCustomW(""); setCustomH(""); setCustomWt("");
  };

  const toggleRotate = (id: string) => {
    setParts((prev) => prev.map((p) => p.id === id ? { ...p, rotated: !p.rotated, length: p.width, width: p.length } : p));
  };

  const removePart = (id: string) => {
    const part = parts.find((p) => p.id === id);
    setParts((prev) => prev.filter((p) => p.id !== id));
    if (part) toast({ title: "Part removed", description: part.name });
  };

  const exportCSV = () => {
    const header = "Name,Length (in),Width (in),Height (in),Weight (lbs)\n";
    const rows = parts.map((p) => `"${p.name}",${p.length},${p.width},${p.height},${p.weight}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "cargo-parts.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);

  return (
    <Card className="card-shadow animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="w-5 h-5 text-primary" />
          Step 2: Add Cargo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset selector */}
        <div>
          <Label className="text-sm font-medium mb-1 block">Select from database</Label>
          <Popover open={presetOpen} onOpenChange={setPresetOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                Choose a preset part...
                <Plus className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" align="start">
              <Command>
                <CommandInput placeholder="Search parts..." />
                <CommandList>
                  <CommandEmpty>No parts found.</CommandEmpty>
                  <CommandGroup>
                    {PARTS_DB.map((p) => (
                      <CommandItem key={p.name} value={p.name} onSelect={() => addPreset(p.name)}>
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.length}" × {p.width}" × {p.height}" — {p.weight} lbs</div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Custom part form */}
        <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
          <Label className="text-sm font-medium">Or add custom part</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Input placeholder="Part name" value={customName} onChange={(e) => setCustomName(e.target.value)} />
            <Input placeholder="Length (in)" type="number" min="0.1" value={customL} onChange={(e) => setCustomL(e.target.value)} />
            <Input placeholder="Width (in)" type="number" min="0.1" value={customW} onChange={(e) => setCustomW(e.target.value)} />
            <Input placeholder="Height (in)" type="number" min="0.1" value={customH} onChange={(e) => setCustomH(e.target.value)} />
            <Input placeholder="Weight (lbs)" type="number" min="0.1" value={customWt} onChange={(e) => setCustomWt(e.target.value)} />
          </div>
          <Button onClick={addCustom} size="sm" variant="gold">
            <Plus className="w-4 h-4 mr-1" /> Add Custom Part
          </Button>
        </div>

        {/* Parts table */}
        {parts.length > 0 && (
          <>
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">L (in)</TableHead>
                    <TableHead className="text-right">W (in)</TableHead>
                    <TableHead className="text-right">H (in)</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-center">Rotate</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{p.length}</TableCell>
                      <TableCell className="text-right">{p.width}</TableCell>
                      <TableCell className="text-right">{p.height}</TableCell>
                      <TableCell className="text-right">{p.weight} lbs</TableCell>
                      <TableCell className="text-center">
                        <Checkbox checked={p.rotated} onCheckedChange={() => toggleRotate(p.id)} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removePart(p.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-semibold text-sm">
                Total Weight: <span className="text-primary">{totalWeight.toLocaleString()} lbs</span> ({parts.length} parts)
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setParts([]); toast({ title: "All parts cleared" }); }}>
                  <X className="w-4 h-4 mr-1" /> Clear All
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CargoList;
