"use client"

import { Suspense } from "react"
import * as THREE from "three"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { OfficeSceneContents } from "@/components/game/office-scene"

export default function Page() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#140f1a]">
      <Canvas
        shadows
        camera={{ position: [0.5, 2.0, 2.5], fov: 45, near: 0.1, far: 40 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.15
        }}
      >
        <color attach="background" args={["#1c1420"]} />
        <Suspense fallback={null}>
          <OfficeSceneContents />
        </Suspense>
        <OrbitControls
          target={[0.05, 1.35, -2.8]}
          enablePan={false}
          minDistance={1.5}
          maxDistance={7}
          minPolarAngle={Math.PI / 3.4}
          maxPolarAngle={Math.PI / 1.7}
          minAzimuthAngle={-0.7}
          maxAzimuthAngle={0.7}
          dampingFactor={0.08}
        />
      </Canvas>

      <div className="pointer-events-none absolute left-4 top-4 max-w-[min(90vw,22rem)] rounded-md bg-black/50 px-3 py-2 text-xs text-amber-100 backdrop-blur-sm">
        <p className="font-semibold tracking-wide">静态场景预览 · 构图与光影确认</p>
        <p className="mt-1 text-amber-200/70">拖动旋转视角 · 滚轮缩放 · 尚未加入交互玩法</p>
      </div>
    </main>
  )
}
