import { useRef, useState } from "react";
import { Copy, Download, Package, Plus, Trash2, Upload, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type CargoItem, PARTS_DB, generateId } from "@/data/aircraft";
import { totalUnits } from "@/lib/fit";
import { itemColor } from "./colors";
import NumField from "./NumField";
import { toast } from "sonner";

interface ManifestPanelProps {
  items: CargoItem[];
  onChange: (items: CargoItem[]) => void;
}

type Units = "imperial" | "metric";
const CM_PER_IN = 2.54;
const KG_PER_LB = 0.45359237;
const round1 = (n: number) => Math.round(n * 10) / 10;

const ManifestPanel = ({ items, onChange }: ManifestPanelProps) => {
  const [presetOpen, setPresetOpen] = useState(false);
  const [units, setUnits] = useState<Units>("imperial");
  const [draft, setDraft] = useState({ name: "", l: "", w: "", h: "", wt: "", qty: "1" });
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const update = (id: string, patch: Partial<CargoItem>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const add = (item: Omit<CargoItem, "id">) => onChange([...items, { ...item, id: generateId() }]);

  const addDraft = () => {
    const [l, w, h, wt] = [draft.l, draft.w, draft.h, draft.wt].map(parseFloat);
    const qty = parseInt(draft.qty, 10) || 1;
    if (![l, w, h, wt].every((n) => Number.isFinite(n) && n > 0)) {
      toast.error("Enter length, width, height and weight — all positive.");
      return;
    }
    const d = units === "metric" ? 1 / CM_PER_IN : 1;
    const m = units === "metric" ? 1 / KG_PER_LB : 1;
    add({
      name: draft.name.trim() || `Item ${items.length + 1}`,
      length: round1(l * d),
      width: round1(w * d),
      height: round1(h * d),
      weight: round1(wt * m),
      quantity: Math.max(1, qty),
      upright: false,
    });
    setDraft({ name: "", l: "", w: "", h: "", wt: "", qty: "1" });
    nameRef.current?.focus();
  };

  const exportCSV = () => {
    const header = "Name,Length (in),Width (in),Height (in),Weight (lb),Qty,This side up\n";
    const rows = items
      .map((p) => `"${p.name.replace(/"/g, '""')}",${p.length},${p.width},${p.height},${p.weight},${p.quantity},${p.upright ? "yes" : "no"}`)
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + rows], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "cargo-manifest.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = async (file: File) => {
    const text = await file.text();
    const parsed: Omit<CargoItem, "id">[] = [];
    for (const line of text.split(/\r?\n/)) {
      const cols = (line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? [])
        .map((c) => c.replace(/,$/, "").trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
      const [name, l, w, h, wt, qty, up] = cols;
      const nums = [l, w, h, wt].map(parseFloat);
      if (!name || !nums.every((n) => Number.isFinite(n) && n > 0)) continue; // skips header / blank rows
      parsed.push({
        name, length: nums[0], width: nums[1], height: nums[2], weight: nums[3],
        quantity: Math.max(1, parseInt(qty, 10) || 1),
        upright: /^(y|yes|true|1)$/i.test(up ?? ""),
      });
    }
    if (!parsed.length) {
      toast.error("No rows found. Expected: Name, Length, Width, Height, Weight[, Qty] in inches/lb.");
      return;
    }
    onChange([...items, ...parsed.map((p) => ({ ...p, id: generateId() }))]);
    toast.success(`Imported ${parsed.length} item${parsed.length > 1 ? "s" : ""}`);
  };

  const totalWeight = items.reduce((s, i) => s + i.weight * i.quantity, 0);
  const lenUnit = units === "metric" ? "cm" : "in";
  const wtUnit = units === "metric" ? "kg" : "lb";

  return (
    <Card className="card-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            Cargo manifest
          </CardTitle>
          <div className="flex items-center gap-1 print:hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileRef.current?.click()} aria-label="Import CSV">
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Import CSV (Name, L, W, H, Weight, Qty)</TooltipContent>
            </Tooltip>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCSV(f);
                e.target.value = "";
              }}
            />
            {items.length > 0 && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportCSV} aria-label="Export CSV">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export CSV</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChange([])} aria-label="Clear manifest">
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear all</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add item */}
        <form
          className="space-y-2 rounded-lg border bg-secondary/40 p-3 print:hidden"
          onSubmit={(e) => {
            e.preventDefault();
            addDraft();
          }}
        >
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add item</Label>
            <ToggleGroup
              type="single"
              size="sm"
              value={units}
              onValueChange={(v) => v && setUnits(v as Units)}
              className="h-7"
            >
              <ToggleGroupItem value="imperial" className="h-7 px-2 text-xs">in / lb</ToggleGroupItem>
              <ToggleGroupItem value="metric" className="h-7 px-2 text-xs">cm / kg</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Input
            ref={nameRef}
            placeholder="Description (e.g. Engine crate)"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="h-9"
          />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {(
              [
                ["l", `L ${lenUnit}`],
                ["w", `W ${lenUnit}`],
                ["h", `H ${lenUnit}`],
                ["wt", wtUnit],
                ["qty", "Qty"],
              ] as const
            ).map(([k, ph]) => (
              <Input
                key={k}
                inputMode="decimal"
                placeholder={ph}
                aria-label={ph}
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                className="h-9 px-2 tabular-nums"
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="gold" className="flex-1">
              <Plus className="mr-1 h-4 w-4" /> Add to manifest
            </Button>
            <Popover open={presetOpen} onOpenChange={setPresetOpen}>
              <PopoverTrigger asChild>
                <Button type="button" size="sm" variant="outline">Saved parts</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search saved parts…" />
                  <CommandList>
                    <CommandEmpty>No parts found.</CommandEmpty>
                    <CommandGroup>
                      {PARTS_DB.map((p) => (
                        <CommandItem
                          key={p.name}
                          value={p.name}
                          onSelect={() => {
                            add({ name: p.name, length: p.length, width: p.width, height: p.height, weight: p.weight, quantity: 1, upright: false });
                            setPresetOpen(false);
                          }}
                        >
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.length}×{p.width}×{p.height} in · {p.weight} lb{p.notes && ` · ${p.notes}`}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </form>

        {/* Items */}
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No cargo yet. Add an item, pick a saved part, or import a CSV.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((it, idx) => (
              <li key={it.id} className="rounded-lg border p-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: itemColor(idx) }} aria-hidden />
                  <Input
                    value={it.name}
                    onChange={(e) => update(it.id, { name: e.target.value })}
                    className="h-8 flex-1 border-transparent px-1 font-medium shadow-none hover:border-input focus-visible:border-input"
                    aria-label="Item name"
                  />
                  <div className="flex shrink-0 print:hidden">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8" aria-label="Duplicate"
                      onClick={() => {
                        const copy = { ...it, id: generateId(), name: `${it.name} (copy)` };
                        onChange([...items.slice(0, idx + 1), copy, ...items.slice(idx + 1)]);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove"
                      onClick={() => onChange(items.filter((x) => x.id !== it.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-1.5 grid grid-cols-5 gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span className="pr-2 text-right">L in</span>
                  <span className="pr-2 text-right">W in</span>
                  <span className="pr-2 text-right">H in</span>
                  <span className="pr-2 text-right">lb ea</span>
                  <span className="pr-2 text-right">Qty</span>
                </div>
                <div className="mt-0.5 grid grid-cols-5 gap-1.5">
                  <NumField value={it.length} onCommit={(v) => v > 0 && update(it.id, { length: v })} aria-label="Length (in)" />
                  <NumField value={it.width} onCommit={(v) => v > 0 && update(it.id, { width: v })} aria-label="Width (in)" />
                  <NumField value={it.height} onCommit={(v) => v > 0 && update(it.id, { height: v })} aria-label="Height (in)" />
                  <NumField value={it.weight} onCommit={(v) => update(it.id, { weight: v })} aria-label="Weight per unit (lb)" />
                  <NumField value={it.quantity} integer min={1} onCommit={(v) => update(it.id, { quantity: v })} aria-label="Quantity" />
                </div>
                <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={it.upright}
                    onCheckedChange={(v) => update(it.id, { upright: v })}
                    className="scale-75"
                  />
                  This side up {it.upright ? "(height stays vertical)" : "(can be tipped)"}
                </label>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">
              {totalUnits(items)} unit{totalUnits(items) === 1 ? "" : "s"} · inches / lb
            </span>
            <span className="font-semibold tabular-nums">{totalWeight.toLocaleString()} lb</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManifestPanel;
