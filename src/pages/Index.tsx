import { useMemo } from "react";
import { ClipboardCopy, FilePlus2, Info, Link2, PackageOpen, Printer } from "lucide-react";
import { toast } from "sonner";
import onflyLogo from "@/assets/onfly-logo.png";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AIRCRAFT_DB, PARTS_DB, generateId } from "@/data/aircraft";
import { rankFleet } from "@/lib/fit";
import { buildSummary } from "@/lib/summary";
import { EMPTY_PLAN, usePlan } from "@/hooks/usePlan";
import ManifestPanel from "@/components/cargo/ManifestPanel";
import OptionsPanel from "@/components/cargo/OptionsPanel";
import FleetPanel from "@/components/cargo/FleetPanel";
import AircraftDetail from "@/components/cargo/AircraftDetail";

const copy = async (text: string, msg: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(msg);
  } catch {
    toast.error("Couldn't access the clipboard");
  }
};

const Index = () => {
  const { plan, setPlan, shareUrl } = usePlan();
  const { items, options } = plan;

  const ranked = useMemo(() => rankFleet(items, AIRCRAFT_DB, options), [items, options]);
  const selected = ranked.find((r) => r.aircraft.id === plan.aircraftId) ?? ranked[0];
  const hasCargo = items.length > 0;

  const loadSample = () =>
    setPlan({
      ...plan,
      items: [PARTS_DB[0], PARTS_DB[3], PARTS_DB[4]].map((p) => ({
        id: generateId(), name: p.name, length: p.length, width: p.width, height: p.height, weight: p.weight, quantity: 1, upright: false,
      })),
    });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-ink-foreground print:static print:border-b print:bg-transparent print:text-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src={onflyLogo} alt="" className="h-9 w-9 object-contain" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight sm:text-base">FlyFit Buddy</h1>
              <p className="truncate text-[11px] leading-tight text-ink-foreground/60 print:text-muted-foreground">OnFly Air · cargo fit check</p>
            </div>
          </div>
          <div className="flex items-center gap-1 print:hidden">
            <HeaderAction label="Copy summary for email" disabled={!hasCargo} onClick={() => copy(buildSummary(items, options, selected, ranked), "Summary copied")}>
              <ClipboardCopy className="h-4 w-4" />
              <span className="hidden md:inline">Copy summary</span>
            </HeaderAction>
            <HeaderAction label="Copy a link that reopens this exact load" disabled={!hasCargo} onClick={() => copy(shareUrl(), "Share link copied")}>
              <Link2 className="h-4 w-4" />
              <span className="hidden md:inline">Share link</span>
            </HeaderAction>
            <HeaderAction label="Print or save as PDF" disabled={!hasCargo} onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              <span className="hidden md:inline">Print</span>
            </HeaderAction>
            <HeaderAction label="Start a new load" onClick={() => setPlan(EMPTY_PLAN)}>
              <FilePlus2 className="h-4 w-4" />
              <span className="hidden md:inline">New</span>
            </HeaderAction>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[400px_minmax(0,1fr)] print:block print:space-y-4">
        <div className="space-y-5 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto lg:pb-2 print:static print:max-h-none">
          <ManifestPanel items={items} onChange={(next) => setPlan({ ...plan, items: next })} />
          <OptionsPanel options={options} onChange={(o) => setPlan({ ...plan, options: o })} />
        </div>

        <div className="min-w-0 space-y-5">
          {hasCargo ? (
            <>
              <FleetPanel
                results={ranked}
                selectedId={selected.aircraft.id}
                onSelect={(id) => setPlan({ ...plan, aircraftId: id })}
              />
              <AircraftDetail result={selected} clearance={options.clearance} seatsOut={options.removeSeats} />
            </>
          ) : (
            <EmptyState onSample={loadSample} />
          )}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Estimates treat cargo as rectangular boxes and cabins as rectangles. Fuselage taper, sill height, tie-downs,
            CG and fuel load are not modeled. Confirm with the operator before quoting.
          </p>
        </div>
      </main>
    </div>
  );
};

const HeaderAction = ({
  label, onClick, disabled, children,
}: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="h-8 gap-1.5 px-2 text-ink-foreground/80 hover:bg-white/10 hover:text-ink-foreground"
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

const EmptyState = ({ onSample }: { onSample: () => void }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
    <PackageOpen className="h-10 w-10 text-primary" />
    <h2 className="mt-3 text-lg font-semibold">Will it fit?</h2>
    <p className="mt-1 max-w-md text-sm text-muted-foreground">
      Add the cargo on the left. Every aircraft in the fleet gets checked for door clearance, cabin fit, floor space and
      payload — workable options ranked first.
    </p>
    <Button variant="outline" size="sm" className="mt-5" onClick={onSample}>
      Load a sample shipment
    </Button>
  </div>
);

export default Index;
