"use client"

import { Suspense, useState, useSyncExternalStore } from "react"
import * as THREE from "three"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { OfficeSceneContents } from "@/components/game/office-scene"
import { SanityVignette } from "@/components/game/sanity-vignette"
import { GameHud } from "@/components/game/hud"
import { TutorialPanel } from "@/components/game/tutorial-panel"
import { useGameEngine } from "@/hooks/use-game-engine"
import { useTutorial } from "@/hooks/use-tutorial"
import { useLanguage, type Lang } from "@/lib/i18n"
import { createPersistedStore } from "@/lib/persisted-store"
import type { AIDifficulty, EffectsIntensity } from "@/lib/game/types"

type Selection = AIDifficulty | "tutorial"

const tutorialDoneStore = createPersistedStore<"yes" | "no">(
  "blame-game:tutorial-done",
  "no",
  (raw): raw is "yes" | "no" => raw === "yes" || raw === "no",
)

const optionClass = (selected: boolean) =>
  `flex-1 rounded-md px-2 py-1.5 text-sm font-semibold ring-1 ring-white/10 ${
    selected ? "bg-orange-500 text-black" : "bg-black/30 text-white/70 hover:bg-black/50"
  }`

export default function Page() {
  const { t, lang, setLang } = useLanguage()
  const tutorialDone =
    useSyncExternalStore(tutorialDoneStore.subscribe, tutorialDoneStore.get, tutorialDoneStore.getServer) === "yes"
  const [picked, setPicked] = useState<Selection | null>(null)
  const selection: Selection = picked ?? (tutorialDone ? 1 : "tutorial")
  const [effectsIntensity, setEffectsIntensity] = useState<EffectsIntensity>("strong")
  const { engine, state, start, setPaused, reset, setEffectsIntensity: applyEffectsIntensity } = useGameEngine({
    difficulty: 1,
    effectsIntensity,
  })
  const [showSettings, setShowSettings] = useState(false)

  const tutorial = useTutorial(engine, state, {
    active: state.isTutorial && state.isRunning,
    onExit: () => reset({ difficulty: 1, tutorial: false }),
    onComplete: () => {
      tutorialDoneStore.set("yes")
      reset({ difficulty: 1, tutorial: false })
      start()
    },
  })

  const handleEffectsIntensityChange = (intensity: EffectsIntensity) => {
    setEffectsIntensity(intensity)
    applyEffectsIntensity(intensity)
  }

  const startSelected = () => {
    if (selection === "tutorial") {
      reset({ difficulty: 1, tutorial: true })
      start()
      tutorial.begin()
    } else {
      reset({ difficulty: selection, tutorial: false })
      start()
    }
  }

  const showStartScreen = !state.isRunning && !state.outcome
  const inTutorial = state.isTutorial && state.isRunning
  const difficultyDescKey = selection === "tutorial" ? "start.desc.tutorial" : `start.desc.${selection}`

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
        <GameHud
          state={state}
          tutorial={inTutorial}
          highlight={inTutorial ? tutorial.step.highlight : []}
          onTogglePause={() => setPaused(!state.isPaused)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {inTutorial && (
        <TutorialPanel
          step={tutorial.step}
          index={tutorial.index}
          total={tutorial.total}
          phase={tutorial.phase}
          failKey={tutorial.failKey}
          isLast={tutorial.isLast}
          onProceed={tutorial.proceed}
          onSkip={tutorial.skip}
          onExit={tutorial.exit}
        />
      )}

      {showStartScreen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex w-[min(90vw,24rem)] flex-col gap-4 rounded-lg bg-[#241a2e] p-6 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-amber-100">{t("start.title")}</h1>
              <button
                onClick={() => setShowSettings(true)}
                className="rounded-md bg-black/30 px-2 py-1 text-[11px] text-white/70 ring-1 ring-white/10 hover:bg-black/50"
              >
                {t("hud.settings")}
              </button>
            </div>

            {selection === "tutorial" && !tutorialDone && (
              <div className="rounded-md bg-amber-400/10 p-3 ring-1 ring-amber-300/30">
                <p className="text-xs font-bold text-amber-200">{t("start.firstTitle")}</p>
                <p className="mt-0.5 text-[11px] text-white/60">{t("start.firstBody")}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/60">{t("start.difficulty")}</span>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((lvl) => (
                  <button key={lvl} onClick={() => setPicked(lvl)} className={optionClass(selection === lvl)}>
                    Lv{lvl}
                  </button>
                ))}
                <button onClick={() => setPicked("tutorial")} className={optionClass(selection === "tutorial")}>
                  {t("start.tutorialTab")}
                  {tutorialDone && <span className="sr-only"> ({t("start.completed")})</span>}
                </button>
              </div>
              <p className="text-[11px] text-white/40">{t(difficultyDescKey)}</p>
            </div>
            <button onClick={startSelected} className="rounded-md bg-orange-500 py-2 text-sm font-bold text-black hover:bg-orange-400">
              {selection === "tutorial" ? t("start.startTutorial") : t("start.startMatch")}
            </button>
            <p className="text-center text-[11px] text-white/40">{t("start.controls")}</p>
          </div>
        </div>
      )}

      {state.outcome && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex w-[min(90vw,24rem)] flex-col gap-3 rounded-lg bg-[#241a2e] p-6 text-center ring-1 ring-white/10">
            <h2 className="text-xl font-bold text-amber-100">
              {state.outcome.type === "win" && (state.outcome.winner === "player" ? t("end.win") : t("end.lose"))}
              {state.outcome.type === "doubleLoss" && t("end.doubleLoss")}
              {state.outcome.type === "doubleWin" && t("end.doubleWin")}
            </h2>
            <div className="grid grid-cols-2 gap-3 text-left text-xs text-white/70">
              {(["player", "opponent"] as const).map((id) => {
                const f = state.fighters[id]
                return (
                  <div key={id} className="rounded-md bg-black/30 p-2 ring-1 ring-white/10">
                    <p className="mb-1 font-semibold text-amber-100">{id === "player" ? t("hud.player") : t("hud.opponent")}</p>
                    <p>{t("end.tosses", { n: f.stats.tossesLanded })}</p>
                    <p>{t("end.parries", { n: f.stats.parriesLanded })}</p>
                    <p>{t("end.blocks", { n: f.stats.blocksLanded })}</p>
                    <p>{t("end.sanLeft", { n: Math.ceil(f.san) })}</p>
                    <p>{t("end.heat", { n: Math.ceil(f.heat) })}</p>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => reset({ difficulty: state.isTutorial ? 1 : (selection === "tutorial" ? 1 : selection), tutorial: false })}
              className="mt-1 rounded-md bg-orange-500 py-2 text-sm font-bold text-black hover:bg-orange-400"
            >
              {t("end.playAgain")}
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div
            className="flex w-[min(90vw,20rem)] flex-col gap-3 rounded-lg bg-[#241a2e] p-5 ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-bold text-amber-100">{t("settings.title")}</h2>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/60">{t("settings.language")}</span>
              <div className="flex gap-2">
                {([["en", "English"], ["zh", "中文"]] as [Lang, string][]).map(([code, label]) => (
                  <button key={code} onClick={() => setLang(code)} className={optionClass(lang === code)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/60">{t("settings.effects")}</span>
              <div className="flex gap-2">
                {(["strong", "weak"] as const).map((level) => (
                  <button key={level} onClick={() => handleEffectsIntensityChange(level)} className={optionClass(effectsIntensity === level)}>
                    {level === "strong" ? t("settings.strong") : t("settings.light")}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-white/40">
                {effectsIntensity === "strong" ? t("settings.strongDesc") : t("settings.lightDesc")}
              </p>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="rounded-md bg-black/30 py-1.5 text-xs text-white/70 ring-1 ring-white/10 hover:bg-black/50"
            >
              {t("settings.close")}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
