import { useCallback, useEffect, useState } from "react";
import type { CargoItem } from "@/data/aircraft";
import { DEFAULT_OPTIONS, type PlanOptions } from "@/lib/fit";

export interface Plan {
  items: CargoItem[];
  options: PlanOptions;
  /** Aircraft the user pinned. null = follow the best match. */
  aircraftId: string | null;
}

const STORAGE_KEY = "flyfit.plan.v1";
const HASH_KEY = "plan=";

export const EMPTY_PLAN: Plan = { items: [], options: DEFAULT_OPTIONS, aircraftId: null };

function normalize(raw: unknown): Plan | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Plan>;
  if (!Array.isArray(r.items)) return null;
  const items = r.items
    .filter((i): i is CargoItem => !!i && typeof i === "object" && typeof (i as CargoItem).name === "string")
    .map((i) => ({
      id: String(i.id ?? Math.random().toString(36).slice(2, 9)),
      name: i.name,
      length: Number(i.length) || 0,
      width: Number(i.width) || 0,
      height: Number(i.height) || 0,
      weight: Number(i.weight) || 0,
      quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
      upright: !!i.upright,
    }));
  return {
    items,
    options: { ...DEFAULT_OPTIONS, ...(r.options ?? {}) },
    aircraftId: typeof r.aircraftId === "string" ? r.aircraftId : null,
  };
}

const encode = (p: Plan) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const decode = (s: string): Plan | null => {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    return normalize(JSON.parse(decodeURIComponent(escape(atob(b64)))));
  } catch {
    return null;
  }
};

function loadInitial(): Plan {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith(HASH_KEY)) {
    const fromUrl = decode(hash.slice(HASH_KEY.length));
    // Shared links are one-shot: load, then clear the hash so edits don't fight it.
    history.replaceState(null, "", window.location.pathname + window.location.search);
    if (fromUrl) return fromUrl;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalize(JSON.parse(stored)) ?? EMPTY_PLAN;
  } catch {
    /* storage unavailable */
  }
  return EMPTY_PLAN;
}

export function usePlan() {
  const [plan, setPlan] = useState<Plan>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch {
      /* storage unavailable */
    }
  }, [plan]);

  const shareUrl = useCallback(
    () => `${window.location.origin}${window.location.pathname}#${HASH_KEY}${encode(plan)}`,
    [plan],
  );

  return { plan, setPlan, shareUrl };
}
