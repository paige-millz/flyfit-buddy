import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FitResult } from "@/lib/fit";
import { cn } from "@/lib/utils";
import { itemColor } from "./colors";

/**
 * 3D loading animation: each unit approaches the door, passes through in its
 * door orientation, then slides to its floor position. Units that don't fit
 * the door stop at the opening and flash red.
 *
 * Scene units: 1 = 10 in. X = cabin length, Y = up, Z = cabin width. The door is
 * on the +Z wall; the data doesn't say where along the cabin it sits, so it's
 * drawn a third of the way back from the nose.
 */

const S = 0.1; // inches → scene units
const DOOR_X_FRAC = 0.3;
const UNIT_SECONDS = 2.6;
const FAIL_SECONDS = 1.8;

interface Step {
  label: string;
  color: string;
  /** Box dims as it passes through the door: across (x), up (y), through (z). */
  door: [number, number, number] | null;
  /** Final resting box: along length (x), height (y), across width (z). Null when it never settles. */
  rest: { x: number; y: number; z: number; w: number; h: number; d: number } | null;
  /** Smallest face shown bumping the door when it can't pass: across, up, through. */
  fail: [number, number, number];
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function buildSteps(result: FitResult): Step[] {
  const { aircraft: ac, checks, layout } = result;
  const steps: Step[] = [];
  const placed = new Map(layout.placements.map((p) => [p.label, p]));
  for (const c of checks) {
    const { item } = c;
    for (let n = 0; n < Math.max(1, Math.floor(item.quantity)); n++) {
      const label = item.quantity > 1 ? `${item.name} #${n + 1}` : item.name;
      const p = placed.get(label);
      let door: Step["door"] = null;
      if (c.doorOrientation) {
        const [across, up] = c.doorOrientation;
        const through = (item.length * item.width * item.height) / (across * up);
        door = [across, up, through];
      }
      const sorted = [item.length, item.width, item.height].sort((a, b) => a - b) as [number, number, number];
      steps.push({
        label,
        color: itemColor(checks.indexOf(c)),
        door,
        fail: door ? [door[0], door[1], door[2]] : [sorted[0], sorted[1], sorted[2]],
        rest: p && door
          ? {
              // Layout origin is the aft-left floor corner; center the cabin on the origin.
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

const LoadAnimation = ({ result }: { result: FitResult }) => {
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

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const L = ac.cabinLength * S, W = ac.cabinWidth * S, H = ac.cabinHeight * S;
    const DW = ac.doorWidth * S, DH = ac.doorHeight * S;
    const doorX = -L / 2 + L * DOOR_X_FRAC;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 500);
    camera.position.set(L * 0.55, H * 1.7, W * 3.1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, H / 3, 0);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a5a, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(L, H * 3, W * 2);
    scene.add(sun);

    // Floor + ground shadow plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(L * 2.6, W * 4),
      new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    // Cabin: translucent walls, solid-ish floor, door cut out of the +Z wall.
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xc9bda3, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
    });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(L, 0.04, W), new THREE.MeshStandardMaterial({ color: 0x8c7b5a }));
    floor.position.y = 0.02;
    scene.add(floor);
    const addWall = (geo: THREE.BufferGeometry, pos: THREE.Vector3, rot?: THREE.Euler) => {
      const m = new THREE.Mesh(geo, wallMat);
      m.position.copy(pos);
      if (rot) m.rotation.copy(rot);
      scene.add(m);
    };
    addWall(new THREE.PlaneGeometry(L, H), new THREE.Vector3(0, H / 2, -W / 2)); // far wall
    addWall(new THREE.PlaneGeometry(W, H), new THREE.Vector3(-L / 2, H / 2, 0), new THREE.Euler(0, Math.PI / 2, 0)); // aft
    addWall(new THREE.PlaneGeometry(W, H), new THREE.Vector3(L / 2, H / 2, 0), new THREE.Euler(0, Math.PI / 2, 0)); // fwd
    addWall(new THREE.PlaneGeometry(L, W), new THREE.Vector3(0, H, 0), new THREE.Euler(Math.PI / 2, 0, 0)); // ceiling
    // Near wall in three pieces around the door
    const leftW = doorX - DW / 2 + L / 2;
    const rightW = L / 2 - (doorX + DW / 2);
    addWall(new THREE.PlaneGeometry(leftW, H), new THREE.Vector3(-L / 2 + leftW / 2, H / 2, W / 2));
    addWall(new THREE.PlaneGeometry(rightW, H), new THREE.Vector3(L / 2 - rightW / 2, H / 2, W / 2));
    addWall(new THREE.PlaneGeometry(DW, H - DH), new THREE.Vector3(doorX, DH + (H - DH) / 2, W / 2));

    // Door frame: four bars so it reads at any zoom
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2f6fb3 });
    const bar = 0.06;
    const addBar = (w: number, h: number, x: number, y: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, bar), frameMat);
      m.position.set(x, y, W / 2);
      scene.add(m);
    };
    addBar(bar, DH, doorX - DW / 2, DH / 2);
    addBar(bar, DH, doorX + DW / 2, DH / 2);
    addBar(DW + bar, bar, doorX, DH);
    addBar(DW + bar, bar, doorX, 0.03);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, W)),
      new THREE.LineBasicMaterial({ color: 0x6b6252 }),
    );
    edges.position.y = H / 2;
    scene.add(edges);

    // Cargo boxes
    const boxes = steps.map((s) => {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(s.color), roughness: 0.6, metalness: 0.05 });
      const m = new THREE.Mesh(geo, mat);
      const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x1a1612 }));
      m.add(outline);
      m.visible = false;
      scene.add(m);
      return m;
    });

    let raf = 0;
    let clock = 0;
    let last = performance.now();
    let lastReset = resetRef.current;
    let lastStep = -1;
    let finishedAt: number | null = null;

    const totalDur = steps.reduce((t, s) => t + (s.door && s.rest ? UNIT_SECONDS : FAIL_SECONDS), 0);

    const placeBox = (m: THREE.Mesh, cx: number, cy: number, cz: number, w: number, h: number, d: number, rotY = 0) => {
      m.position.set(cx, cy, cz);
      m.scale.set(Math.max(w, 0.01), Math.max(h, 0.01), Math.max(d, 0.01));
      m.rotation.y = rotY;
    };

    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (resetRef.current !== lastReset) {
        lastReset = resetRef.current;
        clock = 0;
        finishedAt = null;
      }
      if (playingRef.current && finishedAt === null) clock += reduceMotion ? dt * 4 : dt;
      if (clock >= totalDur) {
        clock = totalDur;
        if (finishedAt === null) finishedAt = now;
      }

      // Walk steps against the clock
      let t0 = 0;
      let current = -1;
      steps.forEach((s, i) => {
        const dur = s.door && s.rest ? UNIT_SECONDS : FAIL_SECONDS;
        const m = boxes[i];
        const local = clock - t0;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (local < 0) {
          m.visible = false;
        } else if (local >= dur) {
          // settled (or failed → hidden)
          if (s.rest) {
            m.visible = true;
            placeBox(m, s.rest.x, s.rest.y, s.rest.z, s.rest.w, s.rest.h, s.rest.d);
            mat.emissive.setHex(0);
            mat.opacity = 1;
          } else m.visible = false;
        } else {
          current = i;
          m.visible = true;
          const u = local / dur;
          if (s.door && s.rest) {
            const [across, up, through] = s.door.map((v) => v * S) as [number, number, number];
            const startZ = W / 2 + through / 2 + W * 0.9;
            const doorZ = W / 2;
            const insideZ = W / 2 - through / 2 - 0.15;
            if (u < 0.45) {
              // approach + pass through
              const k = ease(u / 0.45);
              placeBox(m, doorX, up / 2, lerp(startZ, insideZ, k), across, up, through);
            } else {
              // reorient and slide to rest
              const k = ease((u - 0.45) / 0.55);
              placeBox(
                m,
                lerp(doorX, s.rest.x, k), lerp(up / 2, s.rest.y, k), lerp(insideZ, s.rest.z, k),
                lerp(across, s.rest.w, k), lerp(up, s.rest.h, k), lerp(through, s.rest.d, k),
              );
            }
            mat.emissive.setHex(0);
          } else if (s.door) {
            // fits the door but no floor space: pass through, then fade out just inside
            const [across, up, through] = s.door.map((v) => v * S) as [number, number, number];
            const k = ease(Math.min(u / 0.6, 1));
            placeBox(m, doorX, up / 2, lerp(W / 2 + through / 2 + W * 0.9, W / 2 - through / 2 - 0.15, k), across, up, through);
            mat.transparent = true;
            mat.opacity = u > 0.6 ? 1 - (u - 0.6) / 0.4 : 1;
            mat.emissive.setHex(u > 0.6 ? 0x7a5a00 : 0);
          } else {
            // doesn't fit: bump the door with its smallest face, flash red
            const [a, b, c] = s.fail.map((v) => v * S) as [number, number, number];
            const startZ = W / 2 + c / 2 + W * 0.9;
            const stopZ = W / 2 + c / 2 + 0.05;
            const k = ease(Math.min(u / 0.5, 1));
            const bump = u > 0.5 ? Math.sin((u - 0.5) * Math.PI * 6) * 0.04 : 0;
            placeBox(m, doorX, b / 2, lerp(startZ, stopZ, k) + bump, a, b, c);
            mat.emissive.setHex(u > 0.5 && Math.floor(u * 8) % 2 === 0 ? 0xaa1111 : 0);
          }
        }
        t0 += dur;
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
              ? `Loading ${s.label} through the door`
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
      const h = Math.max(260, Math.min(420, w * 0.6));
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
  }, [steps, ac]);

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
          {Math.min(stepIdx + 1, steps.length)}/{steps.length} · drag to orbit, scroll to zoom
        </span>
      </div>
    </div>
  );
};

export default LoadAnimation;
