import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Aircraft } from "@/data/aircraft";
import { floorWidth, type FitResult } from "@/lib/fit";
import { geometryFor } from "@/data/profiles";
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
const UNIT_SECONDS = 4.4;
const FAIL_SECONDS = 2.8;


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
  /** Swing toward the tail (+1) or the nose (−1). */
  side: number;
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
        side: c.turn ? (c.turn.aft ? 1 : -1) : 1,
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

function planFor(s: Step): Plan | null {
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
  const sx = s.side;

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
  // Superellipse cross-section (n = 5): walls near vertical, rounded crown, flat-ish floor
  // sitting just above the belly, so the floor is nearly the full cabin width like the spec.
  const rx = W / 2 + 0.08;
  const ry = (H / 2) * 1.25;
  const cy = H / 2;
  const n = 5;
  const nSeg = 48, nX = 56;
  const pos: number[] = [], norm: number[] = [], idx: number[] = [];
  const sp = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);
  const ring = (i: number) => {
    const t = (i / nSeg) * Math.PI * 2;
    const c = Math.cos(t), sn = Math.sin(t);
    const z = rx * sp(c, 2 / n), y = cy + ry * sp(sn, 2 / n);
    // gradient of |z/rx|^n + |(y-cy)/ry|^n
    const nz = sp(z / rx, n - 1) / rx, ny = sp((y - cy) / ry, n - 1) / ry;
    return { z, y, nz, ny };
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

const LoadAnimation = ({ result }: { result: FitResult }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [showAirframe, setShowAirframe] = useState(true);
  const [modelState, setModelState] = useState<"none" | "loading" | "ready" | "failed">("none");
  const airframeRef = useRef(showAirframe);
  airframeRef.current = showAirframe;
  const [stepIdx, setStepIdx] = useState(0);
  const [status, setStatus] = useState("");
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const resetRef = useRef(0);
  const [resetTick, setResetTick] = useState(0);
  resetRef.current = resetTick;

  const steps = useMemo(() => buildSteps(result), [result]);
  const ac = result.aircraft;
  const geo = useMemo(() => geometryFor(ac), [ac]);
  const sillIn = geo.door.sillIn;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;

    const L = ac.cabinLength * S, W = floorWidth(ac) * S, H = ac.cabinHeight * S;
    const DW = ac.doorWidth * S, DH = ac.doorHeight * S;
    const doorX = -L / 2 + geo.door.stationIn * S;
    const GROUND = -sillIn * S;
    const af = geo.airframe;
    // Engine frame: nose at −X, door wall at +Z. A left-hand door means we're looking at
    // the aircraft's left side, nose to the viewer's right: mirror the whole scene in X.
    const mirror = geo.door.side === "left" ? -1 : 1;
    const root = new THREE.Group();
    root.scale.x = mirror;

    const scene = new THREE.Scene();
    scene.add(root);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 600);
    // Frame the whole airframe from the door side, three-quarter from above.
    const viewDist = Math.min(110, Math.max(W * 5, af.overallLengthIn * S * 1.0));
    camera.position.set(mirror * (doorX * 0.3 + viewDist * 0.4), viewDist * 0.55, viewDist * 0.9);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(mirror * doorX * 0.4, 0.4, 0);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 4;
    controls.maxDistance = 160;

    scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a7a5a, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(mirror * L * 0.8, H * 5, W * 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    const span = Math.max(af.overallLengthIn, af.wingspanIn) * S;
    sc.left = -span * 0.7; sc.right = span * 0.7; sc.top = span * 0.7; sc.bottom = -span * 0.7; sc.far = 160;
    scene.add(sun);

    // Ramp
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND;
    ground.receiveShadow = true;
    root.add(ground);
    const grid = new THREE.GridHelper(240, 120, 0xc4beb0, 0xc4beb0);
    grid.position.y = GROUND + 0.005;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    root.add(grid);

    // Cabin section of the fuselage, with the door cut from the skin
    const shell = fuselageShell(L, W, H, doorX, DW, DH);
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: 0xf2efe8, roughness: 0.35, metalness: 0.15, transparent: true, opacity: 0.24, side: THREE.DoubleSide,
      depthWrite: false,
    });
    const skin = new THREE.Mesh(shell.geometry, skinMat);
    skin.castShadow = true;
    root.add(skin);
    // Real exterior model when the type has one: meters → scene units, nose aligned to the
    // cabin front via the profile's nose length, gear on the ramp. Replaces the procedural
    // shell; drawn translucent so the load stays visible.
    let modelGroup: THREE.Group | null = null;
    const modelRef = geo.profile?.model;
    if (modelRef) {
      setModelState("loading");
      const url = `${import.meta.env.BASE_URL}models/${modelRef.file}`;
      new GLTFLoader().load(
        url,
        (gltf) => {
          if (disposed) return;
          const m = gltf.scene;
          const toScene = 1 / 0.254; // 1 scene unit = 10 in
          m.scale.setScalar(toScene);
          m.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(m);
          const noseX = -L / 2 - af.noseToCabinFrontIn * S;
          m.position.set(noseX - box.min.x, GROUND - box.min.y, -(box.min.z + box.max.z) / 2);
          m.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              const mats = Array.isArray(o.material) ? o.material : [o.material];
              o.material = mats.map((mm) => {
                const c = (mm as THREE.MeshStandardMaterial).clone();
                c.transparent = true;
                c.opacity = Math.min(c.opacity, 0.5);
                c.depthWrite = false;
                c.side = THREE.DoubleSide;
                return c;
              });
              if (!Array.isArray(o.material) || o.material.length === 1) o.material = (o.material as THREE.Material[])[0];
              o.castShadow = true;
            }
          });
          modelGroup = new THREE.Group();
          modelGroup.add(m);
          root.add(modelGroup);
          setModelState("ready");
        },
        undefined,
        () => { if (!disposed) setModelState("failed"); },
      );
    }
    const floor = new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, W), new THREE.MeshStandardMaterial({ color: 0x6f6350, roughness: 0.9 }));
    floor.position.y = -0.03;
    floor.receiveShadow = true;
    root.add(floor);
    const bulkMat = new THREE.MeshStandardMaterial({ color: 0xbdb3a0, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    for (const x of [-L / 2, L / 2]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(W, H), bulkMat);
      b.rotation.y = Math.PI / 2;
      b.position.set(x, H / 2, 0);
      root.add(b);
    }

    // Airframe around the cabin, from the type profile (or class defaults)
    const skinSolid = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.4, metalness: 0.15 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a3630, roughness: 0.8 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x2b3a4a, roughness: 0.2, metalness: 0.4 });
    // Everything outside the cabin box lives in one group so it can be switched off.
    const airframeGroup = new THREE.Group();
    root.add(airframeGroup);
    const addSolid = (m: THREE.Mesh) => { m.castShadow = true; airframeGroup.add(m); return m; };
    const noseLen = af.noseToCabinFrontIn * S;
    const tailLen = Math.max((af.overallLengthIn - af.noseToCabinFrontIn - ac.cabinLength) * S, W * 1.2);
    const bodyR = shell.rx, bodyRy = shell.ry, cy = shell.cy;
    // Nose: cockpit section, then a cone to the tip
    const cockpitLen = Math.min(noseLen * 0.45, W * 1.1);
    const cockpit = addSolid(new THREE.Mesh(new THREE.CylinderGeometry(bodyR * 0.98, bodyR, cockpitLen, 32), skinSolid));
    cockpit.scale.y = 1; cockpit.rotation.z = Math.PI / 2;
    cockpit.scale.set(1, 1, bodyRy / bodyR);
    cockpit.position.set(-L / 2 - cockpitLen / 2, cy, 0);
    const nose = addSolid(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), skinSolid));
    nose.scale.set(bodyRy * 0.98, noseLen - cockpitLen, bodyR * 0.98);
    nose.rotation.z = Math.PI / 2;
    nose.position.set(-L / 2 - cockpitLen, cy, 0);
    // Windshield band
    const wind = new THREE.Mesh(new THREE.BoxGeometry(cockpitLen * 0.45, bodyRy * 0.28, bodyR * 1.9), glass);
    wind.position.set(-L / 2 - cockpitLen * 0.6, cy + bodyRy * 0.42, 0);
    airframeGroup.add(wind);
    // Tail cone, upswept toward the stabilizer
    const tail = addSolid(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), skinSolid));
    tail.scale.set(bodyRy, tailLen, bodyR);
    tail.rotation.z = -Math.PI / 2;
    tail.position.set(L / 2, cy + bodyRy * 0.1, 0);
    const tailX = L / 2 + tailLen * 0.9;
    // Wing: tapered planform, swept for jets, strutted when high-wing
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xe3ded3, roughness: 0.4, transparent: true, opacity: 0.5, depthWrite: false });
    const halfSpan = (af.wingspanIn * S) / 2;
    const rootChord = Math.max(W * 1.1, halfSpan * 0.3), tipChord = rootChord * 0.45;
    const sweep = af.wingSweep === "swept" ? 0.55 : af.wingSweep === "moderate" ? 0.3 : 0.08;
    const planform = (dir: 1 | -1) => {
      const sh = new THREE.Shape();
      sh.moveTo(-rootChord / 2, 0);
      sh.lineTo(rootChord / 2, 0);
      sh.lineTo(rootChord / 2 + halfSpan * sweep - tipChord * 0.2, dir * halfSpan);
      sh.lineTo(rootChord / 2 + halfSpan * sweep - tipChord * 1.2, dir * halfSpan);
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      return g;
    };
    const wingX = -L / 2 + L * (af.engines === "aft-jets" ? 0.62 : af.wing === "high" ? 0.3 : 0.4);
    const wingY = af.wing === "high" ? cy + bodyRy * 1.02 : af.wing === "mid" ? cy : cy - bodyRy * 0.85;
    for (const dir of [1, -1] as const) {
      const w = new THREE.Mesh(planform(dir), wingMat);
      w.position.set(wingX, wingY, 0);
      airframeGroup.add(w);
      if (af.wingStrut) {
        const sx = wingX + rootChord * 0.1, sz = dir * halfSpan * 0.45;
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), dark);
        const from = new THREE.Vector3(sx, cy - bodyRy * 0.6, dir * bodyR * 0.9), to = new THREE.Vector3(sx, wingY - 0.05, sz);
        strut.position.copy(from).lerp(to, 0.5);
        strut.scale.y = from.distanceTo(to);
        strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
        airframeGroup.add(strut);
      }
    }
    // Engines
    const propDisc = new THREE.MeshStandardMaterial({ color: 0x555050, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
    if (af.engines === "wing-props") {
      for (const dir of [1, -1] as const) {
        const nz = dir * halfSpan * 0.32;
        const nac = addSolid(new THREE.Mesh(new THREE.CapsuleGeometry(bodyR * 0.3, rootChord * 1.1, 6, 16), skinSolid));
        nac.rotation.z = Math.PI / 2;
        nac.position.set(wingX - rootChord * 0.15, wingY + bodyR * 0.1, nz);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(bodyR * 0.85, 32), propDisc);
        disc.rotation.y = Math.PI / 2;
        disc.position.set(wingX - rootChord * 0.85, wingY + bodyR * 0.1, nz);
        airframeGroup.add(disc);
      }
    } else if (af.engines === "nose-prop") {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(bodyRy * 1.05, 32), propDisc);
      disc.rotation.y = Math.PI / 2;
      disc.position.set(-L / 2 - noseLen - 0.05, cy, 0);
      airframeGroup.add(disc);
    } else {
      for (const dir of [1, -1] as const) {
        const pod = addSolid(new THREE.Mesh(new THREE.CapsuleGeometry(bodyR * 0.32, W * 0.9, 6, 16), skinSolid));
        pod.rotation.z = Math.PI / 2;
        pod.position.set(L / 2 + tailLen * 0.2, cy + bodyRy * 0.35, dir * (bodyR + bodyR * 0.45));
      }
    }
    // Tail surfaces
    const finH = H * (af.tail === "T" ? 1.1 : 0.9);
    const fin = addSolid(new THREE.Mesh(new THREE.BoxGeometry(W * 0.6, finH, 0.06), skinSolid));
    fin.position.set(tailX, cy + bodyRy * 0.3 + finH / 2, 0);
    const stabY = af.tail === "T" ? cy + bodyRy * 0.3 + finH : af.tail === "cruciform" ? cy + bodyRy * 0.3 + finH * 0.5 : cy + bodyRy * 0.3;
    const hstab = addSolid(new THREE.Mesh(new THREE.BoxGeometry(W * 0.5, 0.06, halfSpan * 0.75), skinSolid));
    hstab.position.set(tailX + (af.tail === "T" ? W * 0.1 : 0), stabY, 0);
    // Gear
    const legLen = cy - bodyRy - GROUND;
    const mainX = af.wing === "high" ? -L / 2 + L * 0.35 : wingX + rootChord * 0.2;
    for (const [x, z] of [[-L / 2 - noseLen * 0.55, 0], [mainX, W * 0.55], [mainX, -W * 0.55]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, legLen, 8), dark);
      leg.position.set(x, GROUND + legLen / 2, z);
      airframeGroup.add(leg);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 16), dark);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, GROUND + 0.22, z);
      wheel.castShadow = true;
      airframeGroup.add(wheel);
    }
    const coneMat = skinSolid;
    // Door folded down from the sill, airstair style, so it's out of the way
    const panel = new THREE.Mesh(new THREE.BoxGeometry(DW, DH, 0.04), coneMat);
    const hinge = new THREE.Group();
    hinge.position.set(doorX, 0, W / 2);
    panel.position.set(0, DH / 2, 0);
    panel.castShadow = true;
    hinge.add(panel);
    const drop = Math.min(DH, -GROUND);
    hinge.rotation.x = Math.PI / 2 + Math.asin(Math.min(1, drop / DH)) * 0.98;
    root.add(hinge);
    // Seats the engine modeled as obstacles (same layout the floor plan draws).
    const seatMat = new THREE.MeshStandardMaterial({ color: 0xa3957f, roughness: 0.9, transparent: true, opacity: 0.9 });
    for (const st of result.layout.seats) {
      const g = new THREE.Group();
      const sd = st.w * S, sw = st.h * S;
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(sd, 0.45, sw), seatMat);
      cushion.position.y = 1.5;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.1, sw), seatMat);
      back.position.set(-sd / 2 + 0.18, 2.7, 0);
      const base = new THREE.Mesh(new THREE.BoxGeometry(sd * 0.6, 1.3, sw * 0.6), seatMat);
      base.position.y = 0.65;
      g.add(cushion, back, base);
      g.children.forEach((m) => (m.castShadow = true));
      g.position.set(-L / 2 + (st.x + st.w / 2) * S, 0, -W / 2 + (st.y + st.h / 2) * S);
      root.add(g);
    }
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2f6fb3 });
    const bar = 0.05;
    for (const [w, h, x, y] of [[bar, DH, doorX - DW / 2, DH / 2], [bar, DH, doorX + DW / 2, DH / 2], [DW + bar, bar, doorX, DH], [DW + bar, bar, doorX, 0]]) {
      const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, bar * 1.5), frameMat);
      mm.position.set(x, y, W / 2);
      root.add(mm);
    }

    // Cargo boxes at real size. Local axes = door orientation: X across, Y up, Z through.
    const plans = steps.map((s) => planFor(s));
    const boxes = steps.map((s) => {
      const [bx, by, bz] = (s.door ?? s.fail).map((v) => v * S);
      const geo = new THREE.BoxGeometry(bx, by, bz);
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(s.color), roughness: 0.65 });
      const m = new THREE.Mesh(geo, mat);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x1a1612 })));
      m.castShadow = true;
      m.visible = false;
      root.add(m);
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
          const endX = doorX + sx * (yawed ? through / 2 + 0.3 : 0);
          const endZ = yawed ? 0 : W / 2 - through / 2 - 0.15;
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
              const tailX = lerp(doorX + axis.x * 0.25, doorX + sx * 0.3, k);
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
            // slide to its floor-plan spot: down the aisle first, then across into the bay
            const kk = (u - P[4]) / (1 - P[4]);
            const y0 = plan.needsTip ? s.rest.y : up / 2;
            const split = 0.6;
            if (kk < split) {
              const k = ease(kk / split);
              pose(m, lerp(endX, s.rest.x, k), lerp(y0, s.rest.y, k), lerp(endZ, 0, k), plan.rest);
            } else {
              const k = ease((kk - split) / (1 - split));
              pose(m, s.rest.x, s.rest.y, lerp(0, s.rest.z, k), plan.rest);
            }
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

      const hasModel = !!modelGroup;
      airframeGroup.visible = airframeRef.current && !hasModel;
      skin.visible = !hasModel;
      if (modelGroup) modelGroup.visible = airframeRef.current;
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
      disposed = true;
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
  }, [steps, ac, geo, sillIn, result.layout.seats]);

  if (steps.length === 0) return null;

  return (
    <div className="space-y-2 print:hidden">
      <div className="relative">
        <div ref={mountRef} className="w-full overflow-hidden rounded-lg border bg-[#f3efe6]" aria-label="3D loading animation" />
        <div className="pointer-events-none absolute left-3 top-2 rounded bg-black/55 px-2 py-1 text-xs font-semibold text-white">
          {ac.name} · {geo.door.side === "left" ? "left" : "right"} side · cabin box {ac.cabinLength}×{Math.round(floorWidth(ac))}×{ac.cabinHeight} in
          {geo.profile?.model && modelState === "ready" && (
            <span className="block font-normal text-white/80">
              {geo.profile.model.standIn ? "stand-in: " : ""}{geo.profile.model.name} model · FlightGear, GPL
            </span>
          )}
          {geo.profile?.model && modelState === "failed" && <span className="block font-normal text-white/80">model failed to load; showing approximate shape</span>}
        </div>
      </div>
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
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={showAirframe} onChange={(e) => setShowAirframe(e.target.checked)} className="h-3.5 w-3.5" />
          {modelState === "ready" ? "Airframe model" : "Airframe (approximate shape)"}
        </label>
        <span className="text-xs text-muted-foreground">
          {Math.min(stepIdx + 1, steps.length)}/{steps.length} · {geo.door.side === "left" ? "LH" : "RH"} {geo.door.type} door, sill {sillIn}"{geo.door.approx ? " (approx)" : ""} · drag to orbit
        </span>
      </div>
    </div>
  );
};

export default LoadAnimation;
