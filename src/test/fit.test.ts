import { describe, it, expect } from "vitest";
import { AIRCRAFT_DB, type Aircraft, type CargoItem } from "@/data/aircraft";
import { cabinFit, calcPayload, DEFAULT_OPTIONS, doorFit, evaluate, layoutFloor, rankFleet, removableSeatCount, seatLayout, turnGeometry } from "@/lib/fit";

const ac = (id: string) => AIRCRAFT_DB.find((a) => a.id === id) as Aircraft;
const item = (p: Partial<CargoItem>): CargoItem => ({
  id: Math.random().toString(36).slice(2), name: "Box", length: 10, width: 10, height: 10, weight: 10, quantity: 1, upright: false, ...p,
});
const opts = { ...DEFAULT_OPTIONS, clearance: 0 };

describe("doorFit", () => {
  const pc12 = ac("pc-12"); // cargo door 53 x 52
  const ka = ac("king-air-200"); // airstair 27 x 51.75

  it("uses the two smallest dimensions as the cross-section", () => {
    // 100 long goes through the door lengthwise
    expect(doorFit(item({ length: 100, width: 20, height: 50 }), ka)).toEqual([20, 50]);
  });

  it("fails when the cross-section is too big, regardless of length", () => {
    expect(doorFit(item({ length: 30, width: 30, height: 30 }), ka)).toBeNull();
    expect(doorFit(item({ length: 30, width: 30, height: 30 }), pc12)).not.toBeNull();
  });

  it("respects upright: height must stay vertical", () => {
    // 60 tall can't go upright through a 51.75" door, but can on its side
    const tall = { length: 20, width: 40, height: 60 };
    expect(doorFit(item({ ...tall, upright: true }), ka)).toBeNull();
    expect(doorFit(item({ ...tall, upright: false }), ka)).toEqual([20, 40]);
  });

  it("applies clearance", () => {
    expect(doorFit(item({ length: 50, width: 27, height: 27 }), ka, 0)).not.toBeNull();
    expect(doorFit(item({ length: 50, width: 27, height: 27 }), ka, 1)).toBeNull();
  });
});

describe("cabinFit", () => {
  const cj1 = ac("cj1"); // 132 x 57 x 56
  it("finds any orientation when not upright", () => {
    expect(cabinFit(item({ length: 50, width: 50, height: 100 }), cj1)).toBe(true);
    expect(cabinFit(item({ length: 50, width: 50, height: 100, upright: true }), cj1)).toBe(false);
  });
  it("rejects items larger than the cabin", () => {
    expect(cabinFit(item({ length: 140, width: 10, height: 10 }), cj1)).toBe(false);
  });
});

describe("calcPayload", () => {
  it("counts quantity, mechanics, tools and seat credit", () => {
    const ka = ac("king-air-90"); // 3535, 2 removable x 35
    const p = calcPayload([item({ weight: 100, quantity: 3 })], ka, {
      ...opts, mechanics: 2, mechanicWeight: 180, toolWeight: 50, removeSeats: true,
    });
    expect(p.cargoWeight).toBe(300);
    expect(p.crewWeight).toBe(410);
    expect(p.required).toBe(710);
    expect(p.available).toBe(3535 + removableSeatCount(ka) * 35);
    expect(p.pass).toBe(true);
  });
  it("ignores tool weight with no mechanics", () => {
    expect(calcPayload([], ac("pc-12"), { ...opts, toolWeight: 99 }).crewWeight).toBe(0);
  });
});

describe("layoutFloor", () => {
  const c208 = ac("caravan-208"); // 153 x 63 floor
  it("places items without overlap and inside the floor", () => {
    const r = layoutFloor([item({ length: 40, width: 30, height: 20, quantity: 8 })], c208);
    expect(r.placements.length + r.unplaced.length).toBe(8);
    expect(r.placements.length).toBeGreaterThanOrEqual(5);
    for (const a of r.placements) {
      expect(a.x + a.w).toBeLessThanOrEqual(r.floorLength + 1e-9);
      expect(a.y + a.h).toBeLessThanOrEqual(r.floorWidth + 1e-9);
      for (const b of r.placements) {
        if (a === b) continue;
        const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlap).toBe(false);
      }
    }
  });
  it("works around seats and reports them", () => {
    const seats = seatLayout(c208);
    expect(seats.length).toBeGreaterThanOrEqual(6);
    expect(seats.length).toBeLessThanOrEqual(c208.seats);
    const r = layoutFloor([item({ length: 40, width: 30, height: 20, quantity: 8 })], c208, 0, seats);
    expect(r.seats).toBe(seats);
    for (const p of r.placements)
      for (const st of seats) {
        const overlap = p.x < st.x + st.w && p.x + p.w > st.x && p.y < st.y + st.h && p.y + p.h > st.y;
        expect(overlap).toBe(false);
      }
    expect(r.unplaced.length).toBeGreaterThan(0);
  });
  it("reports units that don't fit on the floor", () => {
    const r = layoutFloor([item({ length: 50, width: 50, height: 50, quantity: 4, upright: true })], c208);
    expect(r.placements).toHaveLength(3);
    expect(r.unplaced).toHaveLength(1);
  });
});

describe("turnGeometry", () => {
  it("straight in when the item is narrower than the slot and short", () => {
    const g = turnGeometry(40, 20, 28);
    expect(g.entryAngle).toBeCloseTo(45.6, 0);
  });
  it("needs more width as the item gets longer", () => {
    expect(turnGeometry(80, 20, 24).widthNeeded).toBeGreaterThan(turnGeometry(60, 20, 24).widthNeeded);
  });
  it("a needle can come in almost flat and needs almost no width", () => {
    expect(turnGeometry(100, 0.001, 24).widthNeeded).toBeLessThan(1);
  });
});

describe("evaluate / rankFleet", () => {
  it("no-go when the door is too small", () => {
    const r = evaluate([item({ name: "Crate", length: 40, width: 40, height: 40 })], ac("king-air-200"), opts);
    expect(r.verdict).toBe("no-go");
    expect(r.reasons[0]).toMatch(/Door too small for Crate/);
  });
  it("no-go when the swing into the cabin can't be made", () => {
    // 100" long, 20" across through the King Air 200's 27" door: enters at ≥48°, swing needs ~88" of a 49" floor
    const r = evaluate([item({ name: "Spar", length: 100, width: 20, height: 20 })], ac("king-air-200"), opts);
    expect(r.verdict).toBe("no-go");
    expect(r.reasons[0]).toMatch(/Spar can't make the turn/);
  });
  it("check when the turn only works with removable seats pulled, go once pulled", () => {
    // 55" × 16" through the King Air 350's 26" aft airstair: enters at ~38°, swing needs ~46" of the
    // 49" floor — fine with the far-side seat in the swing zone pulled, not with it in.
    const ka = ac("king-air-350");
    const long = item({ name: "Beam", length: 55, width: 16, height: 16 });
    const withSeats = evaluate([long], ka, opts);
    const t = withSeats.checks[0].turn!;
    expect(t.needed).toBe(true);
    expect(t.aft).toBe(false);
    expect(t.okSeatsIn).toBe(false);
    expect(t.okSeatsOut).toBe(true);
    expect(t.seatsToPull).toBeGreaterThan(0);
    expect(withSeats.verdict).toBe("check");
    expect(withSeats.reasons[0]).toMatch(/Beam needs \d seats? pulled/);
    expect(evaluate([long], ka, { ...opts, removeSeats: true }).verdict).toBe("go");
  });
  it("go for a small box", () => {
    expect(evaluate([item({})], ac("pc-12"), opts).verdict).toBe("go");
  });
  it("seats reduce the floor; pulling them frees it", () => {
    // 10 seats in a Caravan: 8 × 40×30 crates don't all fit with seats in (0 removable), so CHECK
    const crates = [item({ length: 40, width: 30, height: 20, weight: 50, quantity: 8 })];
    expect(evaluate(crates, ac("caravan-208"), opts).verdict).toBe("check");
    // PC-12 with 6 removable: pulling seats places more
    const withSeats = evaluate(crates, ac("pc-12"), opts).layout.placements.length;
    const pulled = evaluate(crates, ac("pc-12"), { ...opts, removeSeats: true }).layout.placements.length;
    expect(pulled).toBeGreaterThan(withSeats);
  });
  it("ranks workable aircraft first", () => {
    const ranked = rankFleet([item({ length: 40, width: 40, height: 40, weight: 300 })], AIRCRAFT_DB, opts);
    expect(ranked[0].verdict).not.toBe("no-go");
    expect(["caravan-208", "pc-12"]).toContain(ranked[0].aircraft.id);
    expect(ranked.at(-1)?.verdict).toBe("no-go");
  });
});
