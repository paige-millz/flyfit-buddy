import { describe, it, expect } from "vitest";
import { AIRCRAFT_DB, type Aircraft, type CargoItem } from "@/data/aircraft";
import { cabinFit, calcPayload, DEFAULT_OPTIONS, doorFit, evaluate, layoutFloor, rankFleet } from "@/lib/fit";

const ac = (id: string) => AIRCRAFT_DB.find((a) => a.id === id) as Aircraft;
const item = (p: Partial<CargoItem>): CargoItem => ({
  id: Math.random().toString(36).slice(2), name: "Box", length: 10, width: 10, height: 10, weight: 10, quantity: 1, upright: false, ...p,
});
const opts = { ...DEFAULT_OPTIONS, clearance: 0 };

describe("doorFit", () => {
  const pc12 = ac("pc-12"); // door 24 x 53

  it("uses the two smallest dimensions as the cross-section", () => {
    // 100 long goes through the door lengthwise
    expect(doorFit(item({ length: 100, width: 20, height: 50 }), pc12)).toEqual([20, 50]);
  });

  it("fails when the cross-section is too big, regardless of length", () => {
    expect(doorFit(item({ length: 30, width: 30, height: 30 }), pc12)).toBeNull();
  });

  it("respects upright: height must stay vertical", () => {
    // 60 tall can't go upright through a 53" door, but can on its side
    const tall = { length: 20, width: 40, height: 60 };
    expect(doorFit(item({ ...tall, upright: true }), pc12)).toBeNull();
    expect(doorFit(item({ ...tall, upright: false }), pc12)).toEqual([20, 40]);
  });

  it("applies clearance", () => {
    expect(doorFit(item({ length: 50, width: 24, height: 24 }), pc12, 0)).not.toBeNull();
    expect(doorFit(item({ length: 50, width: 24, height: 24 }), pc12, 1)).toBeNull();
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
    expect(p.available).toBe(3535 + 70);
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
    expect(r.unplaced).toHaveLength(0);
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
  it("reports units that don't fit on the floor", () => {
    const r = layoutFloor([item({ length: 60, width: 60, height: 50, quantity: 3, upright: true })], c208);
    expect(r.placements).toHaveLength(2);
    expect(r.unplaced).toHaveLength(1);
  });
});

describe("evaluate / rankFleet", () => {
  it("no-go when the door is too small", () => {
    const r = evaluate([item({ name: "Crate", length: 40, width: 40, height: 40 })], ac("pc-12"), opts);
    expect(r.verdict).toBe("no-go");
    expect(r.reasons[0]).toMatch(/Door too small for Crate/);
  });
  it("check when a long item must turn into the cabin", () => {
    const r = evaluate([item({ length: 100, width: 20, height: 20 })], ac("pc-12"), opts);
    expect(r.verdict).toBe("check");
  });
  it("go for a small box", () => {
    expect(evaluate([item({})], ac("pc-12"), opts).verdict).toBe("go");
  });
  it("ranks workable aircraft first", () => {
    const ranked = rankFleet([item({ length: 40, width: 40, height: 40, weight: 300 })], AIRCRAFT_DB, opts);
    expect(ranked[0].verdict).not.toBe("no-go");
    expect(ranked[0].aircraft.id).toBe("caravan-208");
    expect(ranked.at(-1)?.verdict).toBe("no-go");
  });
});
