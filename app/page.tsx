"use client"

import { Suspense, useState } from "react"
import * as THREE from "three"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { OfficeSceneContents } from "@/components/game/office-scene"
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
        camera={{ position: [0.5, 2.0, 2.5], fov: 45, near: 0.1, far: 40 }}
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

      {!showStartScreen && (
        <GameHud state={state} onTogglePause={() => setPaused(!state.isPaused)} onOpenSettings={() => setShowSettings(true)} />
      )}

      {showStartScreen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex w-[min(90vw,22rem)] flex-col gap-4 rounded-lg bg-[#241a2e] p-6 ring-1 ring-white/10">
            <h1 className="text-center text-lg font-bold text-amber-100">甩鍋大戰 · PvE</h1>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/60">AI 難度</span>
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
                {difficulty === 1 && "Lv1：對手不會觀察玩家，且無法 Parry / 假動作"}
                {difficulty === 2 && "Lv2：對手不會觀察玩家，但會 Parry / 假動作"}
                {difficulty === 3 && "Lv3：對手會觀察玩家行為，也會 Parry / 假動作"}
              </p>
            </div>
            <button
              onClick={() => {
                reset({ difficulty })
                start()
              }}
              className="rounded-md bg-orange-500 py-2 text-sm font-bold text-black hover:bg-orange-400"
            >
              開始對局
            </button>
            <p className="text-center text-[11px] text-white/40">
              持有文件時：空格＝甩鍋，F＝假動作。未持有時：長按空格＝防守，前 0-1 秒為 Parry。
            </p>
          </div>
        </div>
      )}

      {state.outcome && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex w-[min(90vw,24rem)] flex-col gap-3 rounded-lg bg-[#241a2e] p-6 text-center ring-1 ring-white/10">
            <h2 className="text-xl font-bold text-amber-100">
              {state.outcome.type === "win" && (state.outcome.winner === "player" ? "你贏了！" : "你輸了")}
              {state.outcome.type === "doubleLoss" && "雙輸"}
              {state.outcome.type === "doubleWin" && "雙贏"}
            </h2>
            <div className="grid grid-cols-2 gap-3 text-left text-xs text-white/70">
              {(["player", "opponent"] as const).map((id) => {
                const f = state.fighters[id]
                return (
                  <div key={id} className="rounded-md bg-black/30 p-2 ring-1 ring-white/10">
                    <p className="mb-1 font-semibold text-amber-100">{id === "player" ? "玩家" : "對手"}</p>
                    <p>甩鍋成功：{f.stats.tossesLanded}</p>
                    <p>Parry 成功：{f.stats.parriesLanded}</p>
                    <p>防守成功：{f.stats.blocksLanded}</p>
                    <p>SAN 剩餘：{Math.ceil(f.san)}</p>
                    <p>HEAT：{Math.ceil(f.heat)}</p>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => reset({ difficulty })}
              className="mt-1 rounded-md bg-orange-500 py-2 text-sm font-bold text-black hover:bg-orange-400"
            >
              再來一局
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
            <h2 className="text-sm font-bold text-amber-100">設置</h2>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/60">打擊特效強度（鏡頭震動 / Hitstop）</span>
              <div className="flex gap-2">
                {(["strong", "weak"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => handleEffectsIntensityChange(level)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-sm font-semibold ring-1 ring-white/10 ${
                      effectsIntensity === level ? "bg-orange-500 text-black" : "bg-black/30 text-white/70 hover:bg-black/50"
                    }`}
                  >
                    {level === "strong" ? "強" : "弱"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-white/40">
                {effectsIntensity === "strong" ? "命中時鏡頭震動較大、短暫停格較長，打擊感更強烈。" : "命中反饋更輕微，適合偏好穩定畫面的玩家。"}
              </p>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="rounded-md bg-black/30 py-1.5 text-xs text-white/70 ring-1 ring-white/10 hover:bg-black/50"
            >
              關閉
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
