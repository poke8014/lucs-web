"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const RAIN_COUNT = 600;
const RAIN_AREA = 18;
const RAIN_HEIGHT = 14;

function Rain() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const drops = useMemo(() => {
    return Array.from({ length: RAIN_COUNT }, () => ({
      x: (Math.random() - 0.5) * RAIN_AREA,
      y: Math.random() * RAIN_HEIGHT,
      z: (Math.random() - 0.5) * RAIN_AREA * 0.6,
      speed: 0.04 + Math.random() * 0.06,
    }));
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.y -= d.speed;
      if (d.y < -2) d.y = RAIN_HEIGHT;
      dummy.position.set(d.x, d.y, d.z);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
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

export default function Scene() {
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
    </Canvas>
  );
}
