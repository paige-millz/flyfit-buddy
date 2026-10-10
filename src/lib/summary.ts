import type { CargoItem } from "@/data/aircraft";
import { type FitResult, type PlanOptions, VERDICT_LABEL, totalUnits } from "@/lib/fit";

const n = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 1 });

/** Plain-text summary for pasting into an email or chat. */
export function buildSummary(items: CargoItem[], opts: PlanOptions, selected: FitResult, ranked: FitResult[]): string {
  const { aircraft: ac, payload } = selected;
  const lines = [
    `Cargo fit — ${ac.name}: ${VERDICT_LABEL[selected.verdict]}`,
    "",
    `Manifest (${totalUnits(items)} units, ${n(payload.cargoWeight)} lb):`,
    ...items.map(
      (i) => `  • ${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""} — ${n(i.length)}×${n(i.width)}×${n(i.height)} in, ${n(i.weight)} lb${i.quantity > 1 ? " ea" : ""}${i.upright ? ", this side up" : ""}`,
    ),
  ];
  if (opts.mechanics > 0) lines.push(`  • ${opts.mechanics} mechanic(s) + tools — ${n(payload.crewWeight)} lb`);
  lines.push(
    "",
    `Door ${ac.doorWidth}×${ac.doorHeight} in · Cabin ${ac.cabinLength}×${ac.cabinWidth}×${ac.cabinHeight} in · ${opts.clearance}" clearance`,
    `Payload ${n(payload.required)} / ${n(payload.available)} lb (${Math.round(payload.pct)}%)${payload.seatCredit ? `, seats pulled` : ""} — ${payload.pass ? `${n(payload.margin)} lb margin` : `OVER by ${n(-payload.margin)} lb`}`,
  );
  if (selected.reasons.length) lines.push("", "Notes:", ...selected.reasons.map((r) => `  • ${r}`));

  const alts = ranked.filter((r) => r.verdict !== "no-go" && r.aircraft.id !== ac.id).slice(0, 5);
  if (alts.length) lines.push("", `Other workable aircraft: ${alts.map((r) => `${r.aircraft.name} (${VERDICT_LABEL[r.verdict]})`).join(", ")}`);
  lines.push("", "Box-model estimate. Confirm with the operator before quoting.");
  return lines.join("\n");
}
