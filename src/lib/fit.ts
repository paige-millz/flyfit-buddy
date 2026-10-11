import type { Aircraft, CargoItem } from "@/data/aircraft";

/**
 * Cargo fit engine. Pure functions, no React.
 *
 * Model assumptions (shown to the user in the UI):
 * - Cargo is treated as a rectangular box. Irregular shapes may fit where a box would not.
 * - Door and cabin are rectangles. Fuselage taper and sill height are not modeled.
 * - The turn from a side door into the cabin is checked in plan view (see `turnGeometry`):
 *   a unit comes in at the shallowest angle its door chord allows, then swings to lie
 *   along the cabin. Seats opposite the door narrow the room for that swing.
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
  /** Plan-view turn from the door into the cabin (present when the unit passes the door). */
  turn?: TurnCheck;
}

/** Seat footprint (across × fore-aft), row pitch, and where the door sits along the cabin. */
export const SEAT_WIDTH_IN = 18;
export const SEAT_DEPTH_IN = 20;
export const SEAT_PITCH_IN = 30;
/** Fraction of cabin length from the nose to the door center (not in the specs). */
export const DOOR_POS_FRAC = 0.3;

/** A seat on the floor, cabin coordinates: x from the nose, y from the wall opposite the door. */
export interface Seat {
  x: number;
  y: number;
  w: number;
  h: number;
  /** On the wall opposite the door. */
  far: boolean;
  removable: boolean;
}

/**
 * Assumed cabin arrangement: one seat per side per row at SEAT_PITCH_IN, skipping the
 * door bay on the door side. The removable ones are those nearest the door on the far
 * side first (the swing zone), then nearest the door on the door side.
 */
export function seatLayout(ac: Aircraft): Seat[] {
  const L = ac.cabinLength, W = ac.cabinWidth;
  const doorX = L * DOOR_POS_FRAC;
  const bay = ac.doorWidth / 2 + SEAT_DEPTH_IN / 2 + 2;
  const seats: Seat[] = [];
  for (let x = 14; x + SEAT_DEPTH_IN <= L - 6 && seats.length < ac.seats; x += SEAT_PITCH_IN) {
    seats.push({ x, y: 1, w: SEAT_DEPTH_IN, h: SEAT_WIDTH_IN, far: true, removable: false });
    if (seats.length < ac.seats && Math.abs(x + SEAT_DEPTH_IN / 2 - doorX) > bay)
      seats.push({ x, y: W - 1 - SEAT_WIDTH_IN, w: SEAT_DEPTH_IN, h: SEAT_WIDTH_IN, far: false, removable: false });
  }
  const byPriority = [...seats].sort(
    (a, b) => Number(b.far) - Number(a.far) || Math.abs(a.x + a.w / 2 - doorX) - Math.abs(b.x + b.w / 2 - doorX),
  );
  byPriority.slice(0, ac.removableSeats).forEach((st) => (st.removable = true));
  return seats;
}

/** Seats still on the floor under the current option. */
export const seatsInstalled = (ac: Aircraft, opts: PlanOptions) =>
  seatLayout(ac).filter((st) => !(opts.removeSeats && st.removable));

export interface TurnCheck {
  /** Longer than the cabin is wide: it has to swing to lie along the cabin. */
  needed: boolean;
  /** Angle from the cabin axis at which it comes through the door, degrees. 90 = straight in. */
  entryAngle: number;
  /** Swings toward the tail (true) or the nose. */
  aft: boolean;
  /** Cabin width the swing needs, inches. */
  widthNeeded: number;
  /** Cabin length the swing uses from the door jamb, inches. */
  reach: number;
  okSeatsIn: boolean;
  okSeatsOut: boolean;
  /** Seats on the far side within the swing zone that would have to come out. */
  seatsToPull: number;
  /** Feasible under the current seat option. */
  ok: boolean;
}

/**
 * Plan-view turn of a box (length `len`, width `w`) through a slot of width `slot`
 * into a corridor it must end up lying along. The chord through the slot forces an
 * entry angle φ with sin φ ≥ w/slot; once fully inside, the swing down to the
 * corridor axis needs len·sin φ + w·cos φ of corridor width at its widest.
 */
export function turnGeometry(len: number, w: number, slot: number) {
  const phiStar = Math.asin(Math.min(1, w / Math.max(slot, 1e-9)));
  const phiPeak = Math.atan2(len, w);
  const phi = Math.min(phiStar, phiPeak);
  return {
    entryAngle: (phiStar * 180) / Math.PI,
    widthNeeded: len * Math.sin(phi) + w * Math.cos(phi),
    reach: len * Math.cos(phiStar) + w * Math.sin(phiStar),
  };
}

export function checkTurn(item: CargoItem, orient: [number, number], ac: Aircraft, opts: PlanOptions): TurnCheck {
  const c = opts.clearance;
  const [across, up] = orient;
  const through = (item.length * item.width * item.height) / (across * up);
  const W = ac.cabinWidth - c;
  const needed = through > W;
  const g = turnGeometry(through, across, ac.doorWidth - c);
  // Swing toward whichever end of the cabin has more room.
  const doorX = ac.cabinLength * DOOR_POS_FRAC;
  const aftRoom = ac.cabinLength - doorX, fwdRoom = doorX;
  const aft = aftRoom >= fwdRoom;
  const roomOk = g.reach <= Math.max(aftRoom, fwdRoom) - c;
  // Seats on the far wall inside the zone the leading end sweeps.
  const zone: [number, number] = aft ? [doorX - across, doorX + g.reach] : [doorX - g.reach, doorX + across];
  const inZone = seatLayout(ac).filter((st) => st.far && st.x + st.w > zone[0] && st.x < zone[1]);
  const okSeatsIn = roomOk && (g.widthNeeded <= W - (inZone.length ? SEAT_WIDTH_IN : 0));
  const seatsToPull = okSeatsIn ? 0 : inZone.length;
  const okSeatsOut = roomOk && g.widthNeeded <= W && inZone.every((st) => st.removable);
  return {
    needed,
    entryAngle: needed ? g.entryAngle : 90,
    aft,
    widthNeeded: g.widthNeeded,
    reach: g.reach,
    okSeatsIn,
    okSeatsOut,
    seatsToPull,
    ok: !needed || okSeatsIn || (opts.removeSeats && okSeatsOut),
  };
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
  /** Seats left on the floor, as obstacles the layout worked around. */
  seats: Seat[];
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
export function layoutFloor(items: CargoItem[], ac: Aircraft, clearance = 0, seats: Seat[] = []): LayoutResult {
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
  for (const st of seats) free = splitFree(free, { x: st.x - 1, y: st.y - 1, w: st.w + 2, h: st.h + 2 });
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
  const avail = L * W - seats.reduce((s, st) => s + st.w * st.h, 0);
  return { placements, unplaced, seats, floorLength: L, floorWidth: W, floorUtilization: avail > 0 ? used / avail : 0 };
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
    return {
      item,
      door: !!orient,
      doorOrientation: orient ?? undefined,
      cabin,
      turn: orient && cabin ? checkTurn(item, orient, ac, opts) : undefined,
    };
  });
  const payload = calcPayload(items, ac, opts);
  const layout = layoutFloor(items, ac, c, seatsInstalled(ac, opts));

  const hard: string[] = [];
  const soft: string[] = [];
  const doorFails = checks.filter((x) => !x.door);
  const cabinFails = checks.filter((x) => !x.cabin);
  if (doorFails.length) hard.push(`Door too small for ${doorFails.map((x) => x.item.name).join(", ")}`);
  if (cabinFails.length) hard.push(`Cabin too small for ${cabinFails.map((x) => x.item.name).join(", ")}`);
  if (!payload.pass) hard.push(`Over payload by ${fmt(-payload.margin)} lb`);
  for (const x of checks) {
    const t = x.turn;
    if (!t || !t.needed || t.ok) continue;
    if (t.okSeatsOut) continue; // reported as a soft note below
    hard.push(
      t.widthNeeded > ac.cabinWidth - c
        ? `${x.item.name} can't make the turn from the door: the swing needs ${fmt(t.widthNeeded)}" across, cabin is ${fmt(ac.cabinWidth - c)}"`
        : t.reach > Math.max(ac.cabinLength * DOOR_POS_FRAC, ac.cabinLength * (1 - DOOR_POS_FRAC)) - c
          ? `${x.item.name} can't make the turn: the swing reaches ${fmt(t.reach)}" down the cabin from the door, more than there is`
          : `${x.item.name} can't make the turn with seats in: ${t.seatsToPull} seat${t.seatsToPull > 1 ? "s" : ""} in the swing zone aren't removable`,
    );
  }

  if (!hard.length) {
    if (layout.unplaced.length)
      soft.push(
        `${layout.unplaced.length} unit${layout.unplaced.length > 1 ? "s" : ""} won't fit on the floor${layout.seats.length ? " with seats in" : " without stacking"}`,
      );
    for (const x of checks) {
      const t = x.turn;
      if (t && t.needed && !t.ok && t.okSeatsOut)
        soft.push(`${x.item.name} needs ${t.seatsToPull} seat${t.seatsToPull > 1 ? "s" : ""} pulled to make the turn — turn on "Pull removable seats"`);
    }
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
