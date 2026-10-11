import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { FitResult } from "@/lib/fit";
import { cn } from "@/lib/utils";
import { itemColor } from "./colors";
import VerdictBadge from "./VerdictBadge";
import { lazy, Suspense } from "react";

const LoadAnimation = lazy(() => import("./LoadAnimation"));

const n = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 1 });

const Section = ({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) => (
  <section className="space-y-2.5 break-inside-avoid">
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {aside && <span className="text-xs text-muted-foreground">{aside}</span>}
    </div>
    {children}
  </section>
);

const verdictCopy = {
  go: "Fits. Door, cabin, floor and payload all check out.",
  check: "Likely workable — review the notes before quoting.",
  "no-go": "Won't work on this aircraft as loaded.",
};

const AircraftDetail = ({ result, clearance, seatsOut }: { result: FitResult; clearance: number; seatsOut: boolean }) => {
  const { aircraft: ac, verdict, reasons, checks, payload, layout } = result;

  return (
    <Card className="card-shadow overflow-hidden">
      <CardHeader
        className={cn(
          "border-b pb-4",
          verdict === "go" && "bg-success/5",
          verdict === "check" && "bg-warning/10",
          verdict === "no-go" && "bg-destructive/5",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{ac.name}</h2>
              <VerdictBadge verdict={verdict} className="text-xs" />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{verdictCopy[verdict]}</p>
          </div>
          <dl className="grid w-full grid-cols-2 gap-x-5 gap-y-2 text-xs sm:w-auto sm:grid-cols-4 sm:text-right">
            <Spec label="Door" value={`${ac.doorWidth}×${ac.doorHeight}"`} />
            <Spec label="Cabin L×W×H" value={`${ac.cabinLength}×${ac.cabinWidth}×${ac.cabinHeight}"`} />
            <Spec label="Max payload" value={`${n(ac.maxPayload)} lb`} />
            <Spec label="Seats" value={`${ac.seats}${ac.removableSeats > 0 ? ` (${ac.removableSeats} removable)` : ""}`} />
          </dl>
        </div>
        {reasons.length > 0 && (
          <ul className="mt-3 space-y-1">
            {reasons.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm">
                {verdict === "no-go" ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" />
                )}
                {r}
              </li>
            ))}
          </ul>
        )}
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        {/* Payload */}
        <Section title="Payload" aside={`${Math.round(payload.pct)}% used`}>
          <PayloadBar result={result} />
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Stat label="Cargo" value={`${n(payload.cargoWeight)} lb`} />
            <Stat label="Mechanics + tools" value={`${n(payload.crewWeight)} lb`} />
            <Stat
              label="Available"
              value={`${n(payload.available)} lb`}
              sub={payload.seatCredit ? `incl. +${n(payload.seatCredit)} seats pulled` : undefined}
            />
            <Stat
              label={payload.pass ? "Margin" : "Over by"}
              value={`${n(Math.abs(payload.margin))} lb`}
              tone={payload.pass ? "good" : "bad"}
            />
          </div>
        </Section>

        {/* 3D load */}
        <Section title="Loading sequence (3D)" aside="door placed ⅓ back; position not in the data">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-lg border bg-secondary/40" />}>
            <LoadAnimation result={result} seatsOut={seatsOut} />
          </Suspense>
        </Section>

        {/* Door */}
        <Section title="Door clearance" aside={`${ac.doorWidth}×${ac.doorHeight} in${clearance ? `, ${clearance}" clearance` : ""}`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {checks.map((c, i) => (
              <DoorView key={c.item.id} check={c} index={i} doorW={ac.doorWidth} doorH={ac.doorHeight} />
            ))}
          </div>
        </Section>

        {/* Cabin */}
        <Section
          title="Cabin floor plan (top-down, no stacking, seats out)"
          aside={`${Math.round(layout.floorUtilization * 100)}% floor used`}
        >
          <CabinLayout result={result} />
          {layout.unplaced.length > 0 && (
            <p className="flex items-start gap-2 text-sm text-warning-strong">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Didn't fit on the floor: {layout.unplaced.map((u) => u.label).join(", ")}. May still work stacked — verify.
            </p>
          )}
          <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
            {checks.map((c, i) => (
              <li key={c.item.id} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: itemColor(i) }} />
                <span className="min-w-0 flex-1 truncate">
                  {c.item.name}
                  {c.item.quantity > 1 && <span className="text-muted-foreground"> ×{c.item.quantity}</span>}
                </span>
                <Check ok={c.door} label="door" />
                <Check ok={c.cabin} label="cabin" />
                {c.turn?.needed && (
                  <Check
                    ok={c.turn.ok}
                    label={
                      c.turn.ok
                        ? `turn ${Math.round(c.turn.entryAngle)}°${!c.turn.okSeatsIn ? `, ${c.turn.seatsToPull} seats out` : ""}`
                        : c.turn.okSeatsOut
                          ? `turn: pull ${c.turn.seatsToPull} seats`
                          : "turn"
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        </Section>
      </CardContent>
    </Card>
  );
};

const Spec = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="whitespace-nowrap font-semibold tabular-nums">{value}</dd>
  </div>
);

const Check = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className={cn("inline-flex items-center gap-0.5 text-xs", ok ? "text-success" : "text-destructive")}>
    {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
    {label}
  </span>
);

const Stat = ({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) => (
  <div className="rounded-lg bg-secondary/60 px-3 py-2">
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div
      className={cn(
        "font-semibold tabular-nums",
        tone === "good" && "text-success",
        tone === "bad" && "text-destructive",
      )}
    >
      {value}
    </div>
    {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
  </div>
);

const PayloadBar = ({ result }: { result: FitResult }) => {
  const { payload } = result;
  const scale = Math.max(payload.available, payload.required) || 1;
  const pct = (v: number) => `${(v / scale) * 100}%`;
  return (
    <div className="relative h-5 overflow-hidden rounded-md bg-muted" role="img" aria-label={`Payload ${Math.round(payload.pct)}% of available`}>
      <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: pct(payload.cargoWeight) }} />
      <div
        className="absolute inset-y-0 bg-primary/50"
        style={{ left: pct(payload.cargoWeight), width: pct(payload.crewWeight) }}
      />
      {/* available limit line */}
      <div
        className={cn("absolute inset-y-0 w-0.5", payload.pass ? "bg-foreground/40" : "bg-destructive")}
        style={{ left: `calc(${pct(payload.available)} - 1px)` }}
      />
      {!payload.pass && (
        <div
          className="absolute inset-y-0 bg-destructive/40"
          style={{ left: pct(payload.available), right: 0 }}
        />
      )}
    </div>
  );
};

/** Door opening with the item's best cross-section, resting on the sill. */
const DoorView = ({
  check, index, doorW, doorH,
}: { check: FitResult["checks"][number]; index: number; doorW: number; doorH: number }) => {
  const { item, door, doorOrientation } = check;
  const dims = [item.length, item.width, item.height].sort((a, b) => a - b);
  // When it doesn't fit, show the smallest cross-section we tried.
  const [iw, ih] = doorOrientation ?? (item.upright ? [Math.min(item.length, item.width), item.height] : [dims[0], dims[1]]);
  const S = 120;
  const pad = 10;
  const scale = (S - pad * 2) / Math.max(doorW, doorH, iw, ih);
  const base = S - pad;
  const dx = (S - doorW * scale) / 2;
  const ix = (S - iw * scale) / 2;
  const color = itemColor(index);

  return (
    <figure className={cn("rounded-lg border p-2", !door && "border-destructive/40 bg-destructive/5")}>
      <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto block h-28 w-28" aria-hidden>
        <rect x={dx} y={base - doorH * scale} width={doorW * scale} height={doorH * scale} rx={3}
          className="fill-secondary stroke-foreground/50" strokeWidth={1.5} />
        <rect x={ix} y={base - ih * scale} width={iw * scale} height={ih * scale} rx={1.5}
          fill={color} fillOpacity={0.45} stroke={door ? color : "hsl(var(--destructive))"} strokeWidth={1.5}
          strokeDasharray={door ? undefined : "4 2"} />
        <line x1={4} x2={S - 4} y1={base} y2={base} className="stroke-foreground/30" strokeWidth={1} />
      </svg>
      <figcaption className="mt-1 text-center text-xs">
        <div className="truncate font-medium">{item.name}</div>
        <div className={cn("tabular-nums", door ? "text-muted-foreground" : "text-destructive")}>
          {n(iw)}×{n(ih)}" {door ? "passes" : "too big"}
        </div>
      </figcaption>
    </figure>
  );
};

const CabinLayout = ({ result }: { result: FitResult }) => {
  const { aircraft: ac, layout, checks } = result;
  const W = 640;
  const pad = 24;
  const scale = (W - pad * 2) / ac.cabinLength;
  const H = ac.cabinWidth * scale + pad * 2;
  const inset = { x: ((ac.cabinLength - layout.floorLength) / 2) * scale, y: ((ac.cabinWidth - layout.floorWidth) / 2) * scale };
  const nameOf = (id: string) => checks.find((c) => c.item.id === id)?.item.name ?? "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border bg-card" role="img" aria-label="Cabin floor layout">
      <defs>
        <pattern id="grid" width={12 * scale} height={12 * scale} patternUnits="userSpaceOnUse" x={pad} y={pad}>
          <path d={`M ${12 * scale} 0 L 0 0 0 ${12 * scale}`} fill="none" className="stroke-border" strokeWidth={0.75} />
        </pattern>
      </defs>
      <rect x={pad} y={pad} width={ac.cabinLength * scale} height={ac.cabinWidth * scale} rx={10}
        fill="url(#grid)" className="stroke-foreground/40" strokeWidth={1.5} />
      <text x={pad} y={pad - 8} fontSize={11} className="fill-muted-foreground">
        {ac.cabinLength}" length →
      </text>
      <text x={W - pad} y={pad - 8} fontSize={11} textAnchor="end" className="fill-muted-foreground">
        {ac.cabinWidth}" wide · grid = 1 ft
      </text>
      {layout.placements.map((p, i) => {
        const x = pad + inset.x + p.x * scale;
        const y = pad + inset.y + p.y * scale;
        const w = p.w * scale;
        const h = p.h * scale;
        const color = itemColor(p.colorIndex);
        const showText = w > 46 && h > 22;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx={2} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={1.5}>
              <title>{`${p.label}: ${n(p.w)}×${n(p.h)}" footprint, ${n(p.z)}" tall`}</title>
            </rect>
            {showText && (
              <>
                <text x={x + w / 2} y={y + h / 2 - 2} fontSize={10} fontWeight={600} textAnchor="middle" className="fill-foreground">
                  {truncate(p.label || nameOf(p.itemId), Math.floor(w / 6))}
                </text>
                <text x={x + w / 2} y={y + h / 2 + 10} fontSize={9} textAnchor="middle" className="fill-foreground/70">
                  {n(p.w)}×{n(p.h)}×{n(p.z)}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, Math.max(1, max - 1)) + "…" : s);

export default AircraftDetail;
