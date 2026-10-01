"use client"

import { Suspense, useState } from "react"
import * as THREE from "three"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { OfficeSceneContents } from "@/components/game/office-scene"
import { SanityVignette } from "@/components/game/sanity-vignette"
import { GameHud } from "@/components/game/hud"
import { useGameEngine } from "@/hooks/use-game-engine"
import type { AIDifficulty, EffectsIntensity } from "@/lib/game/types"

export default function Page() {
  const [difficulty, setDifficulty] = useState<AIDifficulty>(1)
  const [effectsIntensity, setEffectsIntensity] = useState<EffectsIntensity>("strong")
  const { state, start, setPaused, reset, setEffectsIntensity: applyEffectsIntensity } = useGameEngine({
    difficulty,
    effectsIntensity,
  })
  const [showSettings, setShowSettings] = useState(false)

  const handleEffectsIntensityChange = (intensity: EffectsIntensity) => {
    setEffectsIntensity(intensity)
    applyEffectsIntensity(intensity)
  }

  const showStartScreen = !state.isRunning && !state.outcome

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#140f1a]">
      <Canvas
        shadows
        camera={{ position: [1.99, 1.8, 2.66], fov: 25, near: 0.1, far: 40 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.55
        }}
      >
        <color attach="background" args={["#1c1420"]} />
        <Suspense fallback={null}>
          <OfficeSceneContents gameState={state} />
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

      {state.isRunning && <SanityVignette san={state.fighters.player.san} />}

      {!showStartScreen && (
        <GameHud state={state} onTogglePause={() => setPaused(!state.isPaused)} onOpenSettings={() => setShowSettings(true)} />
      )}

      {showStartScreen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex w-[min(90vw,22rem)] flex-col gap-4 rounded-lg bg-[#241a2e] p-6 ring-1 ring-white/10">
            <h1 className="text-center text-lg font-bold text-amber-100">Blame Game · PvE</h1>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/60">AI Difficulty</span>
              <div className="flex gap-2">
                {[1, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setDifficulty(lvl as AIDifficulty)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-sm font-semibold ring-1 ring-white/10 ${
                      difficulty === lvl ? "bg-orange-500 text-black" : "bg-black/30 text-white/70 hover:bg-black/50"
                    }`}
                  >
                    Lv{lvl}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-white/40">
                {difficulty === 1 && "Lv1: Opponent doesn't read you and can't Parry / Feint"}
                {difficulty === 2 && "Lv2: Opponent doesn't read you, but can Parry / Feint"}
                {difficulty === 3 && "Lv3: Opponent reads your behavior and can Parry / Feint"}
              </p>
            </div>
            <button
              onClick={() => {
                reset({ difficulty })
                start()
              }}
              className="rounded-md bg-orange-500 py-2 text-sm font-bold text-black hover:bg-orange-400"
            >
              Start Match
            </button>
            <p className="text-center text-[11px] text-white/40">
              With the document: Space = Toss, F = Feint. Without it: Hold Space = Block; the first 0-1s is the Parry window.
            </p>
          </div>
        </div>
      )}

      {state.outcome && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex w-[min(90vw,24rem)] flex-col gap-3 rounded-lg bg-[#241a2e] p-6 text-center ring-1 ring-white/10">
            <h2 className="text-xl font-bold text-amber-100">
              {state.outcome.type === "win" && (state.outcome.winner === "player" ? "You Win!" : "You Lose")}
              {state.outcome.type === "doubleLoss" && "Double Loss"}
              {state.outcome.type === "doubleWin" && "Double Win"}
            </h2>
            <div className="grid grid-cols-2 gap-3 text-left text-xs text-white/70">
              {(["player", "opponent"] as const).map((id) => {
                const f = state.fighters[id]
                return (
                  <div key={id} className="rounded-md bg-black/30 p-2 ring-1 ring-white/10">
                    <p className="mb-1 font-semibold text-amber-100">{id === "player" ? "Player" : "Opponent"}</p>
                    <p>Tosses landed: {f.stats.tossesLanded}</p>
                    <p>Parries: {f.stats.parriesLanded}</p>
                    <p>Blocks: {f.stats.blocksLanded}</p>
                    <p>SAN left: {Math.ceil(f.san)}</p>
                    <p>HEAT: {Math.ceil(f.heat)}</p>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => reset({ difficulty })}
              className="mt-1 rounded-md bg-orange-500 py-2 text-sm font-bold text-black hover:bg-orange-400"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div
            className="flex w-[min(90vw,20rem)] flex-col gap-3 rounded-lg bg-[#241a2e] p-5 ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-bold text-amber-100">Settings</h2>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/60">Impact Effects (Camera Shake / Hitstop)</span>
              <div className="flex gap-2">
                {(["strong", "weak"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => handleEffectsIntensityChange(level)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-sm font-semibold ring-1 ring-white/10 ${
                      effectsIntensity === level ? "bg-orange-500 text-black" : "bg-black/30 text-white/70 hover:bg-black/50"
                    }`}
                  >
                    {level === "strong" ? "Strong" : "Light"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-white/40">
                {effectsIntensity === "strong" ? "Bigger camera shake and longer hitstop on impact for punchier feedback." : "Subtler impact feedback for players who prefer a steadier view."}
              </p>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="rounded-md bg-black/30 py-1.5 text-xs text-white/70 ring-1 ring-white/10 hover:bg-black/50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
