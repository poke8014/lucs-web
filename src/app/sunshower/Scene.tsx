"use client";

import { Html } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const RAIN_COUNT = 600;
const RAIN_AREA = 18;
const RAIN_HEIGHT = 14;

type Drop = { x: number; y: number; z: number; speed: number };

function Rain() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummyRef = useRef<THREE.Object3D | null>(null);
  const dropsRef = useRef<Drop[]>([]);

  useEffect(() => {
    dummyRef.current = new THREE.Object3D();
    dropsRef.current = Array.from({ length: RAIN_COUNT }, () => ({
      x: (Math.random() - 0.5) * RAIN_AREA,
      y: Math.random() * RAIN_HEIGHT,
      z: (Math.random() - 0.5) * RAIN_AREA * 0.6,
      speed: 0.04 + Math.random() * 0.06,
    }));
  }, []);

  useFrame(() => {
    const mesh = ref.current;
    const dummy = dummyRef.current;
    const drops = dropsRef.current;
    if (!mesh || !dummy || drops.length === 0) return;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.y -= d.speed;
      if (d.y < -2) d.y = RAIN_HEIGHT;
      dummy.position.set(d.x, d.y, d.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, RAIN_COUNT]}>
      <cylinderGeometry args={[0.006, 0.006, 0.35, 4]} />
      <meshBasicMaterial color="#fff5d6" transparent opacity={0.55} />
    </instancedMesh>
  );
}

function Sun() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = 3.2 + Math.sin(t * 0.3) * 0.05;
  });
  return (
    <mesh ref={ref} position={[3.5, 3.2, -4]}>
      <circleGeometry args={[1.4, 64]} />
      <meshBasicMaterial color="#ffd27a" />
    </mesh>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
      <planeGeometry args={[40, 18]} />
      <meshBasicMaterial color="#d8b483" />
    </mesh>
  );
}

type TuftSpec = {
  position: [number, number, number];
  scale: number;
  hue: number;
  blades: { x: number; rot: number; height: number }[];
  sway: number;
};

const TUFTS: TuftSpec[] = [
  { position: [-4, -0.55, -1], scale: 0.9, hue: 0, sway: 0.2, blades: bladePattern(7) },
  { position: [-2.2, -0.55, 0.4], scale: 1.05, hue: 0.05, sway: 0.6, blades: bladePattern(8) },
  { position: [-0.6, -0.55, -0.6], scale: 0.85, hue: -0.04, sway: 1.1, blades: bladePattern(6) },
  { position: [0.7, -0.55, 0.8], scale: 1, hue: 0.02, sway: 1.6, blades: bladePattern(7) },
  { position: [3.2, -0.55, -0.4], scale: 0.95, hue: -0.02, sway: 2.0, blades: bladePattern(7) },
  { position: [4.6, -0.55, 0.6], scale: 1.1, hue: 0.04, sway: 2.4, blades: bladePattern(8) },
];

function bladePattern(n: number) {
  const blades: { x: number; rot: number; height: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(n - 1, 1);
    blades.push({
      x: (t - 0.5) * 0.42,
      rot: (t - 0.5) * 0.35,
      height: 0.32 + ((i * 37) % 11) / 40,
    });
  }
  return blades;
}

function WeedTuft({ spec }: { spec: TuftSpec }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 0.8 + spec.sway) * 0.04;
  });
  const color = useMemo(() => {
    const base = new THREE.Color("#6f8a3a");
    base.offsetHSL(spec.hue, 0, 0);
    return base;
  }, [spec.hue]);

  return (
    <group ref={groupRef} position={spec.position} scale={spec.scale}>
      {spec.blades.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, b.height / 2, 0]}
          rotation={[0, 0, b.rot]}
        >
          <coneGeometry args={[0.045, b.height, 4]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

function Weeds() {
  return (
    <group>
      {TUFTS.map((spec, i) => (
        <WeedTuft key={i} spec={spec} />
      ))}
    </group>
  );
}

function Shovel({ onActivate }: { onActivate: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const targetScale = hovered ? 1.08 : 1;
    const current = groupRef.current.scale.x;
    const next = current + (targetScale - current) * 0.15;
    groupRef.current.scale.setScalar(next);
    groupRef.current.position.y = -0.45 + Math.sin(t * 1.2) * 0.015;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  const handleColor = hovered ? "#8a5a2b" : "#7a4f25";
  const bladeColor = hovered ? "#d6cdb4" : "#bdb39a";

  function pointerOver(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    setHovered(true);
  }
  function pointerOut(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    setHovered(false);
  }
  function click(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    onActivate();
  }

  return (
    <group
      ref={groupRef}
      position={[1.9, -0.45, 0.5]}
      rotation={[0, 0, -0.32]}
      onPointerOver={pointerOver}
      onPointerOut={pointerOut}
      onClick={click}
    >
      {/* handle */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.07, 1.5, 0.07]} />
        <meshBasicMaterial color={handleColor} />
      </mesh>
      {/* grip */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.26, 0.08, 0.08]} />
        <meshBasicMaterial color={handleColor} />
      </mesh>
      {/* socket */}
      <mesh position={[0, -0.08, 0]}>
        <boxGeometry args={[0.11, 0.18, 0.11]} />
        <meshBasicMaterial color={bladeColor} />
      </mesh>
      {/* blade */}
      <mesh position={[0, -0.45, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.22, 0.5, 4]} />
        <meshBasicMaterial color={bladeColor} />
      </mesh>
      <Html
        position={[0, 1.85, 0]}
        center
        distanceFactor={6}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <span
          className={
            "whitespace-nowrap rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition " +
            (hovered
              ? "border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]"
              : "border-[#2a1d10]/40 bg-[#f7e9c9]/80 text-[#2a1d10]/80")
          }
        >
          cleanup plan
        </span>
      </Html>
    </group>
  );
}

export default function Scene() {
  const router = useRouter();
  const pathname = usePathname();
  const onLanding = pathname === "/sunshower";

  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, 1.5, 6], fov: 55 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={["#f7e9c9"]} />
      <fog attach="fog" args={["#f7e9c9", 8, 22]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 2]} intensity={0.8} color="#ffd27a" />
      <Sun />
      <Rain />
      <Ground />
      <Weeds />
      {onLanding && (
        <Shovel onActivate={() => router.push("/sunshower/cleanup-plan")} />
      )}
    </Canvas>
  );
}
