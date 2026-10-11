import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Aircraft } from "@/data/aircraft";
import { SEAT_PITCH_IN, SEAT_WIDTH_IN, type FitResult } from "@/lib/fit";
import { cn } from "@/lib/utils";
import { itemColor } from "./colors";

/**
 * 3D loading sequence. Scene units: 1 = 10 in. X runs nose (−) to tail (+),
 * Y is up with the cabin floor at 0, Z across the cabin with the door on +Z.
 *
 * Each unit: rolls up on the ramp → lifted to the sill → threads through the
 * door leading-end first, pivoting about the opening so the inner end heads
 * down the cabin while the outer end is still outside → tipped if its floor
 * orientation needs it → slid to its floor-plan spot. Units that can't pass
 * the door are offered up, bump it, and go back down.
 *
 * Not in the data, so assumed: door position (⅓ back from the nose), sill
 * height by class, fuselage shape (elliptical tube).
 */

const S = 0.1;
const DOOR_X_FRAC = 0.3;
const UNIT_SECONDS = 4.4;
const FAIL_SECONDS = 2.8;

const SILL_IN: Record<Aircraft["category"], number> = { Piston: 26, Turboprop: 40, Jet: 44, Other: 36 };
const HIGH_WING = new Set(["caravan-208"]);

interface Step {
  label: string;
  color: string;
  /** Box as it passes the door: across (x), up (y), through (z). Null when it can't. */
  door: [number, number, number] | null;
  /** Shown bumping the door when it can't pass: across, up, through. */
  fail: [number, number, number];
  /** Resting box: center + extents along X, Y, Z. Null when it never settles. */
  rest: { x: number; y: number; z: number; w: number; h: number; d: number } | null;
  /** Entry angle from the cabin axis (radians) when it has to swing; π/2 = straight in. */
  entry: number;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function buildSteps(result: FitResult): Step[] {
  const { aircraft: ac, checks, layout } = result;
  const placed = new Map(layout.placements.map((p) => [p.label, p]));
  const steps: Step[] = [];
  for (const c of checks) {
    const { item } = c;
    for (let n = 0; n < Math.max(1, Math.floor(item.quantity)); n++) {
      const label = item.quantity > 1 ? `${item.name} #${n + 1}` : item.name;
      const p = placed.get(label);
      let door: Step["door"] = null;
      if (c.doorOrientation) {
        const [across, up] = c.doorOrientation;
        door = [across, up, (item.length * item.width * item.height) / (across * up)];
      }
      const sorted = [item.length, item.width, item.height].sort((a, b) => a - b) as [number, number, number];
      steps.push({
        label,
        color: itemColor(checks.indexOf(c)),
        door,
        fail: door ?? sorted,
        entry: ((c.turn?.needed ? c.turn.entryAngle : 90) * Math.PI) / 180,
        rest:
          p && door
            ? {
                x: (p.x + p.w / 2 - ac.cabinLength / 2) * S,
                y: (p.z / 2) * S,
                z: (p.y + p.h / 2 - ac.cabinWidth / 2) * S,
                w: p.w * S,
                h: p.z * S,
                d: p.h * S,
              }
            : null,
      });
    }
  }
  return steps;
}

/* ---------- rigid-orientation plan for one unit ---------- */

interface Plan {
  /** +1 → threads toward the tail, −1 → toward the nose. */
  sx: number;
  /** Orientation at the end of threading: identity (straight in) or ±90° yaw. */
  yawEnd: THREE.Quaternion;
  /** Final orientation (yaw plus any tip). */
  rest: THREE.Quaternion;
  yawed: boolean;
  needsTip: boolean;
}

const IDENT = new THREE.Quaternion();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
const HALF_TURNS = [IDENT, ...[AX, AY, AZ].map((a) => new THREE.Quaternion().setFromAxisAngle(a, Math.PI))];

function planFor(s: Step, doorX: number): Plan | null {
  if (!s.door || !s.rest) return null;
  // Permutation rotation: local (across, up, through) → world (w, h, d).
  const local = [...s.door];
  const target = [s.rest.w / S, s.rest.h / S, s.rest.d / S];
  const used = [false, false, false];
  const cols = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i < 3; i++) {
    let j = local.findIndex((v, k) => !used[k] && Math.abs(v - target[i]) < 1e-6);
    if (j < 0) j = used.indexOf(false);
    used[j] = true;
    cols[j] = [AX, AY, AZ][i].clone();
  }
  const m = new THREE.Matrix4().makeBasis(cols[0], cols[1], cols[2]);
  if (m.determinant() < 0) {
    cols[2].negate();
    m.makeBasis(cols[0], cols[1], cols[2]);
  }
  const base = new THREE.Quaternion().setFromRotationMatrix(m);
  const sx = s.rest.x - doorX >= 0 ? 1 : -1;

  // A box is symmetric under half-turns, so pick the equivalent orientation that
  // threads leading-end first (local −Z into the cabin) with the least extra tipping.
  let best: Plan | null = null;
  let bestAngle = Infinity;
  for (const ht of HALF_TURNS) {
    const q = base.clone().multiply(ht);
    const img = AZ.clone().applyQuaternion(q); // where the "through" axis ends up
    let yawEnd: THREE.Quaternion;
    let yawed = false;
    if (Math.abs(img.x) > 0.5) {
      if (-Math.sign(img.x) !== sx) continue; // would thread toward the wrong end
      yawEnd = new THREE.Quaternion().setFromAxisAngle(AY, (-sx * Math.PI) / 2);
      yawed = true;
    } else if (Math.abs(img.z) > 0.5) {
      if (img.z < 0) continue; // backwards
      yawEnd = IDENT;
    } else {
      yawEnd = IDENT; // ends up on end: thread straight, then tip
    }
    const angle = q.angleTo(yawEnd);
    if (angle < bestAngle) {
      bestAngle = angle;
      best = { sx, yawEnd, rest: q, yawed, needsTip: angle > 1e-3 };
    }
  }
  return best;
}

/* ---------- fuselage shell with the door cut out ---------- */

function fuselageShell(L: number, W: number, H: number, doorX: number, DW: number, DH: number) {
  const rx = W / 2;
  const ry = (H / 2) * 1.22;
  const cy = H / 2 - 0.08; // ellipse center; floor at y = 0 cuts it slightly above the belly
  const nSeg = 40, nX = 56;
  const pos: number[] = [], norm: number[] = [], idx: number[] = [];
  const ring = (i: number) => {
    const t = (i / nSeg) * Math.PI * 2;
    return { z: Math.cos(t) * rx, y: cy + Math.sin(t) * ry, nz: Math.cos(t) / rx, ny: Math.sin(t) / ry };
  };
  for (let i = 0; i <= nSeg; i++) {
    const r = ring(i);
    for (let j = 0; j <= nX; j++) {
      pos.push(-L / 2 + (j / nX) * L, r.y, r.z);
      const n = new THREE.Vector3(0, r.ny, r.nz).normalize();
      norm.push(n.x, n.y, n.z);
    }
  }
  for (let i = 0; i < nSeg; i++) {
    for (let j = 0; j < nX; j++) {
      const r0 = ring(i), r1 = ring(i + 1);
      const ymid = (r0.y + r1.y) / 2, zmid = (r0.z + r1.z) / 2;
      const xmid = -L / 2 + ((j + 0.5) / nX) * L;
      const inDoor = zmid > 0 && ymid > -0.02 && ymid < DH && Math.abs(xmid - doorX) < DW / 2;
      if (inDoor) continue;
      const a = i * (nX + 1) + j, b = a + 1, c = a + nX + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(norm, 3));
  g.setIndex(idx);
  return { geometry: g, rx, ry, cy };
}

/* ---------- component ---------- */

const LoadAnimation = ({ result, seatsOut }: { result: FitResult; seatsOut: boolean }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [status, setStatus] = useState("");
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const resetRef = useRef(0);
  const [resetTick, setResetTick] = useState(0);
  resetRef.current = resetTick;

  const steps = useMemo(() => buildSteps(result), [result]);
  const ac = result.aircraft;
  const sillIn = SILL_IN[ac.category];

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const L = ac.cabinLength * S, W = ac.cabinWidth * S, H = ac.cabinHeight * S;
    const DW = ac.doorWidth * S, DH = ac.doorHeight * S;
    const doorX = -L / 2 + L * DOOR_X_FRAC;
    const GROUND = -sillIn * S;
    const highWing = HIGH_WING.has(ac.id);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf3efe6, 60, 140);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
    camera.position.set(doorX + L * 0.5, H * 2.4, W * 4.6);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(doorX + L * 0.12, 0.2, 0);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 4;
    controls.maxDistance = 90;

    scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a7a5a, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(L * 0.8, H * 5, W * 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -L * 1.4; sc.right = L * 1.4; sc.top = L; sc.bottom = -L; sc.far = 120;
    scene.add(sun);

    // Ramp
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND;
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(200, 100, 0xc4beb0, 0xc4beb0);
    grid.position.y = GROUND + 0.005;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    scene.add(grid);

    // Fuselage
    const shell = fuselageShell(L, W, H, doorX, DW, DH);
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: 0xf2efe8, roughness: 0.35, metalness: 0.15, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
      depthWrite: false,
    });
    const skin = new THREE.Mesh(shell.geometry, skinMat);
    skin.castShadow = true;
    scene.add(skin);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, W), new THREE.MeshStandardMaterial({ color: 0x6f6350, roughness: 0.9 }));
    floor.position.y = -0.03;
    floor.receiveShadow = true;
    scene.add(floor);
    // Bulkheads at the ends of the cabin box
    const bulkMat = new THREE.MeshStandardMaterial({ color: 0xbdb3a0, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    for (const x of [-L / 2, L / 2]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(W, H), bulkMat);
      b.rotation.y = Math.PI / 2;
      b.position.set(x, H / 2, 0);
      scene.add(b);
    }
    // Nose and tail cones
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.4, metalness: 0.15 });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), coneMat);
    nose.scale.set(shell.ry, W * 0.95, shell.rx);
    nose.rotation.z = Math.PI / 2;
    nose.position.set(-L / 2, shell.cy, 0);
    nose.castShadow = true;
    scene.add(nose);
    const tail = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), coneMat);
    tail.scale.set(shell.ry, L * 0.55, shell.rx);
    tail.rotation.z = -Math.PI / 2;
    tail.position.set(L / 2, shell.cy, 0);
    tail.castShadow = true;
    scene.add(tail);
    // Wing, stabilizers, fin
    const wingY = highWing ? shell.cy + shell.ry * 0.95 : shell.cy - shell.ry * 0.75;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.08, L * 2.1), coneMat);
    wing.position.set(doorX + L * 0.28, wingY, 0);
    wing.castShadow = true;
    scene.add(wing);
    const hstab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.45, 0.06, L * 0.75), coneMat);
    hstab.position.set(L / 2 + L * 0.42, shell.cy + 0.2, 0);
    hstab.castShadow = true;
    scene.add(hstab);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.5, H * 0.9, 0.06), coneMat);
    fin.position.set(L / 2 + L * 0.42, shell.cy + shell.ry * 0.9, 0);
    fin.castShadow = true;
    scene.add(fin);
    // Gear
    const gearMat = new THREE.MeshStandardMaterial({ color: 0x3a3630, roughness: 0.8 });
    const legLen = shell.cy - shell.ry - GROUND;
    for (const [x, z] of [[-L / 2 + 0.6, 0], [doorX + L * 0.28, W * 0.45], [doorX + L * 0.28, -W * 0.45]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, legLen, 8), gearMat);
      leg.position.set(x, GROUND + legLen / 2, z);
      scene.add(leg);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 16), gearMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, GROUND + 0.22, z);
      wheel.castShadow = true;
      scene.add(wheel);
    }
    // Door folded down from the sill, airstair style, so it's out of the way
    const panel = new THREE.Mesh(new THREE.BoxGeometry(DW, DH, 0.04), coneMat);
    const hinge = new THREE.Group();
    hinge.position.set(doorX, 0, W / 2);
    panel.position.set(0, DH / 2, 0);
    panel.castShadow = true;
    hinge.add(panel);
    const drop = Math.min(DH, -GROUND);
    hinge.rotation.x = Math.PI / 2 + Math.asin(Math.min(1, drop / DH)) * 0.98;
    scene.add(hinge);
    // Seats along both walls, ghosted: the floor plan assumes they're out. The removable ones
    // are those nearest the door on the far side (the swing zone) and vanish when pulled.
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x7c6f5c, transparent: true, opacity: 0.35, roughness: 0.9 });
    const seatW = SEAT_WIDTH_IN * S, pitch = SEAT_PITCH_IN * S, seatD = 2.0;
    const slots: { x: number; z: number; far: boolean }[] = [];
    for (let x = -L / 2 + 1.4; x < L / 2 - 1 && slots.length < ac.seats * 2; x += pitch) {
      slots.push({ x, z: -W / 2 + seatW / 2 + 0.1, far: true });
      if (Math.abs(x - doorX) > DW / 2 + seatD / 2 + 0.2) slots.push({ x, z: W / 2 - seatW / 2 - 0.1, far: false });
    }
    const seats = slots.slice(0, ac.seats);
    const removable = [...seats]
      .sort((a, b) => Number(b.far) - Number(a.far) || Math.abs(a.x - doorX) - Math.abs(b.x - doorX))
      .slice(0, ac.removableSeats);
    for (const st of seats) {
      if (seatsOut && removable.includes(st)) continue;
      const g = new THREE.Group();
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(seatD, 0.45, seatW), seatMat);
      cushion.position.y = 1.5;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.1, seatW), seatMat);
      back.position.set(-seatD / 2 + 0.18, 2.7, 0);
      const base = new THREE.Mesh(new THREE.BoxGeometry(seatD * 0.6, 1.3, seatW * 0.6), seatMat);
      base.position.y = 0.65;
      g.add(cushion, back, base);
      g.position.set(st.x, 0, st.z);
      scene.add(g);
    }
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2f6fb3 });
    const bar = 0.05;
    for (const [w, h, x, y] of [[bar, DH, doorX - DW / 2, DH / 2], [bar, DH, doorX + DW / 2, DH / 2], [DW + bar, bar, doorX, DH], [DW + bar, bar, doorX, 0]]) {
      const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, bar * 1.5), frameMat);
      mm.position.set(x, y, W / 2);
      scene.add(mm);
    }

    // Cargo boxes at real size. Local axes = door orientation: X across, Y up, Z through.
    const plans = steps.map((s) => planFor(s, doorX));
    const boxes = steps.map((s) => {
      const [bx, by, bz] = (s.door ?? s.fail).map((v) => v * S);
      const geo = new THREE.BoxGeometry(bx, by, bz);
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(s.color), roughness: 0.65 });
      const m = new THREE.Mesh(geo, mat);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x1a1612 })));
      m.castShadow = true;
      m.visible = false;
      scene.add(m);
      return m;
    });

    const dur = (s: Step) => (s.door && s.rest ? UNIT_SECONDS : FAIL_SECONDS);
    const totalDur = steps.reduce((t, s) => t + dur(s), 0);
    let raf = 0, clock = 0, last = performance.now(), lastReset = resetRef.current, lastStep = -1;
    let finished = false;
    const tmpQ = new THREE.Quaternion();
    const axis = new THREE.Vector3();

    const pose = (m: THREE.Mesh, x: number, y: number, z: number, q: THREE.Quaternion = IDENT) => {
      m.position.set(x, y, z);
      m.quaternion.copy(q);
    };

    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (resetRef.current !== lastReset) {
        lastReset = resetRef.current;
        clock = 0;
        finished = false;
      }
      if (playingRef.current && !finished) clock += reduceMotion ? dt * 4 : dt;
      if (clock >= totalDur) {
        clock = totalDur;
        finished = true;
      }

      let t0 = 0, current = -1;
      steps.forEach((s, i) => {
        const d = dur(s);
        const m = boxes[i];
        const mat = m.material as THREE.MeshStandardMaterial;
        const local = clock - t0;
        t0 += d;
        if (local < 0) {
          m.visible = false;
          return;
        }
        if (local >= d) {
          const plan = plans[i];
          if (s.rest && plan) {
            m.visible = true;
            pose(m, s.rest.x, s.rest.y, s.rest.z, plan.rest);
            mat.emissive.setHex(0);
            mat.opacity = 1;
          } else m.visible = false;
          return;
        }
        current = i;
        m.visible = true;
        const u = local / d;
        const plan = plans[i];

        if (s.door && s.rest && plan) {
          const [across, up, through] = s.door.map((v) => v * S);
          const { yawed, sx } = plan;
          const startZ = W / 2 + through / 2 + W * 0.8;
          const sillZ = W / 2 + through / 2 + 0.12;
          // Where the unit sits once threaded: along the wall, just inside.
          const endX = doorX + sx * (yawed ? through / 2 : 0);
          const endZ = W / 2 - (yawed ? across / 2 : through / 2) - 0.15;
          const P = [0, 0.16, 0.3, 0.68, plan.needsTip ? 0.84 : 0.68, 1];
          if (u < P[1]) {
            // roll up on the ramp
            const k = ease(u / P[1]);
            pose(m, doorX, GROUND + up / 2, lerp(startZ, sillZ + 0.6, k));
          } else if (u < P[2]) {
            // lift to the sill
            const k = ease((u - P[1]) / (P[2] - P[1]));
            pose(m, doorX, lerp(GROUND + up / 2, up / 2, k) + Math.sin(k * Math.PI) * 0.12, lerp(sillZ + 0.6, sillZ, k));
          } else if (u < P[3]) {
            // Come through the door at the entry angle the turn check found, sliding along the
            // unit's own axis so its chord stays centered in the opening; then, once the tail
            // end is inside, swing down to lie along the cabin.
            const phi = yawed ? s.entry : Math.PI / 2;
            axis.set(sx * Math.cos(phi), 0, -Math.sin(phi)); // leading-end direction
            const beta = Math.atan2(-sx * Math.cos(phi), Math.sin(phi)); // yaw that points local −Z along `axis`
            const kk = (u - P[2]) / (P[3] - P[2]);
            const SW = yawed ? 0.62 : 1; // share of the phase spent sliding in
            if (kk < SW) {
              const k = ease(kk / SW);
              const sPos = lerp(-through / 2 - 0.5, through / 2 + 0.25, k);
              pose(m, doorX + axis.x * sPos, up / 2, W / 2 + axis.z * sPos, tmpQ.setFromAxisAngle(AY, beta));
            } else {
              // Swing about the trailing end, which gets pulled inward as the unit comes round.
              const k = ease((kk - SW) / (1 - SW));
              const phiK = lerp(phi, 0, k);
              const tailX = lerp(doorX + axis.x * 0.25, doorX, k);
              const tailZ = lerp(W / 2 + axis.z * 0.25, endZ, k);
              const dirX = sx * Math.cos(phiK), dirZ = -Math.sin(phiK);
              const betaK = Math.atan2(-sx * Math.cos(phiK), Math.sin(phiK));
              pose(m, tailX + dirX * (through / 2), up / 2, tailZ + dirZ * (through / 2), tmpQ.setFromAxisAngle(AY, betaK));
            }
          } else if (u < P[4]) {
            // tip to its floor orientation, lifted clear of the floor
            const k = ease((u - P[3]) / (P[4] - P[3]));
            tmpQ.copy(plan.yawEnd).slerp(plan.rest, k);
            pose(m, endX, lerp(up / 2, s.rest.y, k) + Math.sin(k * Math.PI) * 0.3, endZ, tmpQ);
          } else {
            // slide to its floor-plan spot
            const k = ease((u - P[4]) / (1 - P[4]));
            const y0 = plan.needsTip ? s.rest.y : up / 2;
            pose(m, lerp(endX, s.rest.x, k), lerp(y0, s.rest.y, k), lerp(endZ, s.rest.z, k), plan.rest);
          }
          mat.emissive.setHex(0);
        } else if (s.door) {
          // fits the door but no floor space: through the door, then fades
          const [, up, through] = s.door.map((v) => v * S);
          const k = ease(clamp01(u / 0.65));
          const y = k < 0.3 ? lerp(GROUND + up / 2, up / 2, k / 0.3) : up / 2;
          pose(m, doorX, y, lerp(W / 2 + through / 2 + W, W / 2 - through / 2 - 0.2, k));
          mat.transparent = true;
          mat.opacity = u > 0.65 ? 1 - (u - 0.65) / 0.35 : 1;
          mat.emissive.setHex(u > 0.65 ? 0x7a5a00 : 0);
        } else {
          // can't pass: roll up, lift, bump the opening, set back down
          const [, b, c] = s.fail.map((v) => v * S);
          const startZ = W / 2 + c / 2 + W;
          const stopZ = W / 2 + c / 2 + 0.06;
          if (u < 0.3) pose(m, doorX, GROUND + b / 2, lerp(startZ, stopZ + 0.6, ease(u / 0.3)));
          else if (u < 0.5) {
            const k = ease((u - 0.3) / 0.2);
            pose(m, doorX, lerp(GROUND + b / 2, b / 2, k), lerp(stopZ + 0.6, stopZ, k));
          } else if (u < 0.8) {
            const bump = Math.sin(((u - 0.5) / 0.3) * Math.PI * 4) * 0.05;
            pose(m, doorX, b / 2, stopZ + Math.abs(bump));
          } else {
            const k = ease((u - 0.8) / 0.2);
            pose(m, doorX, lerp(b / 2, GROUND + b / 2, k), lerp(stopZ, stopZ + 0.6, k));
          }
          mat.emissive.setHex(u > 0.5 && u < 0.8 && Math.floor(u * 10) % 2 === 0 ? 0xaa1111 : 0);
        }
      });

      if (current !== lastStep) {
        lastStep = current;
        const idx = current === -1 ? steps.length - 1 : current;
        setStepIdx(idx);
        const s = steps[idx];
        setStatus(
          current === -1
            ? `Done — ${steps.filter((x) => x.rest).length}/${steps.length} loaded`
            : s.rest
              ? `Loading ${s.label}`
              : s.door
                ? `${s.label}: fits the door but there's no floor space left`
                : `${s.label}: won't fit through the door`,
        );
      }

      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };

    const resize = () => {
      const w = mount.clientWidth;
      const h = Math.max(280, Math.min(460, w * 0.62));
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => mm.dispose());
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, [steps, ac, sillIn, seatsOut]);

  if (steps.length === 0) return null;

  return (
    <div className="space-y-2 print:hidden">
      <div ref={mountRef} className="w-full overflow-hidden rounded-lg border bg-[#f3efe6]" aria-label="3D loading animation" />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => { setResetTick((t) => t + 1); setPlaying(true); }} aria-label="Replay">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <span className={cn("text-muted-foreground", status.includes("won't") && "text-destructive")}>{status}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {Math.min(stepIdx + 1, steps.length)}/{steps.length} · sill {sillIn}" (assumed) · drag to orbit
        </span>
      </div>
    </div>
  );
};

export default LoadAnimation;
