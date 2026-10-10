import type { Aircraft, CargoItem } from "@/data/aircraft";

/**
 * Cargo fit engine. Pure functions, no React.
 *
 * Model assumptions (shown to the user in the UI):
 * - Cargo is treated as a rectangular box. Irregular shapes may fit where a box would not.
 * - Door and cabin are rectangles. Fuselage taper, sill height, and the turn from door
 *   into cabin are not modeled — long items get a "verify the turn" warning instead.
 * - Floor layout is single-layer (no stacking).
 * - `clearance` is subtracted from every opening/cabin dimension.
 */

export interface PlanOptions {
  mechanics: number;
  mechanicWeight: number;
  toolWeight: number;
  removeSeats: boolean;
  /** Inches of clearance to keep on every opening/cabin dimension. */
  clearance: number;
}

export const DEFAULT_OPTIONS: PlanOptions = {
  mechanics: 0,
  mechanicWeight: 180,
  toolWeight: 0,
  removeSeats: false,
  clearance: 1,
};

export type Verdict = "go" | "check" | "no-go";

export const VERDICT_LABEL: Record<Verdict, string> = { go: "GO", check: "CHECK", "no-go": "NO-GO" };

export interface ItemCheck {
  item: CargoItem;
  door: boolean;
  /** Cross-section (w × h, inches) that goes through the door, when it fits. */
  doorOrientation?: [number, number];
  cabin: boolean;
  /** Item's longest dimension exceeds cabin width: it must turn after entering. */
  turnWarning: boolean;
}

export interface Placement {
  itemId: string;
  label: string;
  colorIndex: number;
  x: number;
  y: number;
  /** Footprint along cabin length. */
  w: number;
  /** Footprint along cabin width. */
  h: number;
  /** Height of the unit as placed. */
  z: number;
}

export interface LayoutResult {
  placements: Placement[];
  unplaced: { itemId: string; label: string }[];
  floorLength: number;
  floorWidth: number;
  floorUtilization: number;
}

export interface PayloadResult {
  cargoWeight: number;
  crewWeight: number;
  required: number;
  seatCredit: number;
  available: number;
  margin: number;
  pct: number;
  pass: boolean;
}

export interface FitResult {
  aircraft: Aircraft;
  verdict: Verdict;
  reasons: string[];
  checks: ItemCheck[];
  payload: PayloadResult;
  layout: LayoutResult;
}

const sortAsc = (a: number[]) => [...a].sort((x, y) => x - y);

/** Can the item pass through the door? Returns the cross-section used, or null. */
export function doorFit(item: CargoItem, ac: Aircraft, clearance = 0): [number, number] | null {
  const dw = ac.doorWidth - clearance;
  const dh = ac.doorHeight - clearance;
  if (item.upright) {
    // Height stays vertical; either L or W goes across the door.
    for (const across of sortAsc([item.length, item.width])) {
      if (across <= dw && item.height <= dh) return [across, item.height];
    }
    return null;
  }
  // Any orientation: the two smallest dimensions form the best cross-section.
  const [s0, s1] = sortAsc([item.length, item.width, item.height]);
  if (s0 <= dw && s1 <= dh) return [s0, s1];
  if (s1 <= dw && s0 <= dh) return [s1, s0];
  return null;
}

/** Does the item fit inside the cabin in some allowed orientation? */
export function cabinFit(item: CargoItem, ac: Aircraft, clearance = 0): boolean {
  const L = ac.cabinLength - clearance;
  const W = ac.cabinWidth - clearance;
  const H = ac.cabinHeight - clearance;
  if (item.upright) {
    const [a, b] = sortAsc([item.length, item.width]);
    const [fa, fb] = sortAsc([L, W]);
    return item.height <= H && a <= fa && b <= fb;
  }
  const [i0, i1, i2] = sortAsc([item.length, item.width, item.height]);
  const [c0, c1, c2] = sortAsc([L, W, H]);
  return i0 <= c0 && i1 <= c1 && i2 <= c2;
}

export function calcPayload(items: CargoItem[], ac: Aircraft, opts: PlanOptions): PayloadResult {
  const cargoWeight = items.reduce((s, i) => s + i.weight * i.quantity, 0);
  const crewWeight = opts.mechanics * opts.mechanicWeight + (opts.mechanics > 0 ? opts.toolWeight : 0);
  const required = cargoWeight + crewWeight;
  const seatCredit = opts.removeSeats ? ac.removableSeats * ac.seatWeight : 0;
  const available = ac.maxPayload + seatCredit;
  const margin = available - required;
  const pct = available > 0 ? (required / available) * 100 : 0;
  return { cargoWeight, crewWeight, required, seatCredit, available, margin, pct, pass: required <= available };
}

interface Rect { x: number; y: number; w: number; h: number }

/** Footprint options (w along cabin length, h across, z vertical) honoring `upright` and cabin height. */
function footprints(item: CargoItem, maxZ: number): { w: number; h: number; z: number }[] {
  const { length: l, width: wd, height: ht } = item;
  const opts = item.upright
    ? [{ w: l, h: wd, z: ht }, { w: wd, h: l, z: ht }]
    : [
        { w: l, h: wd, z: ht }, { w: wd, h: l, z: ht },
        { w: l, h: ht, z: wd }, { w: ht, h: l, z: wd },
        { w: wd, h: ht, z: l }, { w: ht, h: wd, z: l },
      ];
  return opts.filter((o) => o.z <= maxZ);
}

/**
 * Single-layer floor layout using MaxRects (best short side fit).
 * Units that individually can't fit are reported as unplaced.
 */
export function layoutFloor(items: CargoItem[], ac: Aircraft, clearance = 0): LayoutResult {
  const L = Math.max(0, ac.cabinLength - clearance);
  const W = Math.max(0, ac.cabinWidth - clearance);
  const H = ac.cabinHeight - clearance;

  const units = items.flatMap((item, colorIndex) =>
    Array.from({ length: Math.max(0, Math.floor(item.quantity)) }, (_, n) => ({
      item,
      colorIndex,
      label: item.quantity > 1 ? `${item.name} #${n + 1}` : item.name,
      fps: footprints(item, H),
    })),
  );
  // Largest minimum footprint first.
  const minArea = (u: (typeof units)[number]) =>
    u.fps.length ? Math.min(...u.fps.map((f) => f.w * f.h)) : Infinity;
  units.sort((a, b) => minArea(b) - minArea(a));

  let free: Rect[] = [{ x: 0, y: 0, w: L, h: W }];
  const placements: Placement[] = [];
  const unplaced: LayoutResult["unplaced"] = [];

  for (const u of units) {
    let best: { r: Rect; f: { w: number; h: number; z: number }; s1: number; s2: number } | null = null;
    for (const r of free) {
      for (const f of u.fps) {
        if (f.w <= r.w && f.h <= r.h) {
          const dx = r.w - f.w, dy = r.h - f.h;
          const s1 = Math.min(dx, dy), s2 = Math.max(dx, dy);
          if (!best || s1 < best.s1 || (s1 === best.s1 && s2 < best.s2)) best = { r, f, s1, s2 };
        }
      }
    }
    if (!best) {
      unplaced.push({ itemId: u.item.id, label: u.label });
      continue;
    }
    const p: Rect = { x: best.r.x, y: best.r.y, w: best.f.w, h: best.f.h };
    placements.push({ itemId: u.item.id, label: u.label, colorIndex: u.colorIndex, ...p, z: best.f.z });
    free = splitFree(free, p);
  }

  const used = placements.reduce((s, p) => s + p.w * p.h, 0);
  return { placements, unplaced, floorLength: L, floorWidth: W, floorUtilization: L * W > 0 ? used / (L * W) : 0 };
}

function splitFree(free: Rect[], p: Rect): Rect[] {
  const out: Rect[] = [];
  for (const r of free) {
    const overlaps = p.x < r.x + r.w && p.x + p.w > r.x && p.y < r.y + r.h && p.y + p.h > r.y;
    if (!overlaps) {
      out.push(r);
      continue;
    }
    if (p.x > r.x) out.push({ x: r.x, y: r.y, w: p.x - r.x, h: r.h });
    if (p.x + p.w < r.x + r.w) out.push({ x: p.x + p.w, y: r.y, w: r.x + r.w - (p.x + p.w), h: r.h });
    if (p.y > r.y) out.push({ x: r.x, y: r.y, w: r.w, h: p.y - r.y });
    if (p.y + p.h < r.y + r.h) out.push({ x: r.x, y: p.y + p.h, w: r.w, h: r.y + r.h - (p.y + p.h) });
  }
  // Drop rects contained in another.
  return out.filter(
    (a, i) =>
      a.w > 0 && a.h > 0 &&
      !out.some(
        (b, j) =>
          j !== i &&
          a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h &&
          // keep the first of identical rects
          !(a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && i < j),
      ),
  );
}

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

export function evaluate(items: CargoItem[], ac: Aircraft, opts: PlanOptions): FitResult {
  const c = opts.clearance;
  const checks: ItemCheck[] = items.map((item) => {
    const orient = doorFit(item, ac, c);
    const cabin = cabinFit(item, ac, c);
    const longest = Math.max(item.length, item.width, item.height);
    return {
      item,
      door: !!orient,
      doorOrientation: orient ?? undefined,
      cabin,
      turnWarning: !!orient && cabin && longest > ac.cabinWidth - c,
    };
  });
  const payload = calcPayload(items, ac, opts);
  const layout = layoutFloor(items, ac, c);

  const hard: string[] = [];
  const soft: string[] = [];
  const doorFails = checks.filter((x) => !x.door);
  const cabinFails = checks.filter((x) => !x.cabin);
  if (doorFails.length) hard.push(`Door too small for ${doorFails.map((x) => x.item.name).join(", ")}`);
  if (cabinFails.length) hard.push(`Cabin too small for ${cabinFails.map((x) => x.item.name).join(", ")}`);
  if (!payload.pass) hard.push(`Over payload by ${fmt(-payload.margin)} lb`);

  if (!hard.length) {
    if (layout.unplaced.length)
      soft.push(`${layout.unplaced.length} unit${layout.unplaced.length > 1 ? "s" : ""} won't fit on the floor without stacking`);
    const turns = checks.filter((x) => x.turnWarning);
    if (turns.length) soft.push(`Verify the turn from door into cabin: ${turns.map((x) => x.item.name).join(", ")}`);
    if (payload.pct > 90) soft.push(`Payload at ${Math.round(payload.pct)}% — little margin for fuel`);
  }

  const verdict: Verdict = hard.length ? "no-go" : soft.length ? "check" : "go";
  return { aircraft: ac, verdict, reasons: [...hard, ...soft], checks, payload, layout };
}

const VERDICT_RANK: Record<Verdict, number> = { go: 0, check: 1, "no-go": 2 };

/** Evaluate every aircraft. Workable ones first, smallest capable airframe first within a tier. */
export function rankFleet(items: CargoItem[], fleet: Aircraft[], opts: PlanOptions): FitResult[] {
  return fleet
    .map((ac) => evaluate(items, ac, opts))
    .sort(
      (a, b) =>
        VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] ||
        (a.verdict === "no-go" ? b.payload.margin - a.payload.margin : a.aircraft.maxPayload - b.aircraft.maxPayload),
    );
}

export const totalUnits = (items: CargoItem[]) => items.reduce((s, i) => s + i.quantity, 0);
