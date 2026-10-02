"use client"

import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n"
import { BLOCKED_ATTACKER_PENALTY } from "@/lib/game/constants"
import type { TutorialStep } from "@/lib/game/tutorial-steps"
import type { TutorialPhase } from "@/hooks/use-tutorial"

function KeyCap({ label, mode }: { label: string; mode: "press" | "hold" }) {
  const { t } = useLanguage()
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd
        className={cn(
          "rounded-md border-b-4 border-white/30 bg-white/15 px-2.5 py-1 font-mono text-xs font-bold text-white shadow",
          label === "Space" && "min-w-20 text-center",
        )}
      >
        {label}
      </kbd>
      <span className="text-[10px] uppercase tracking-wider text-white/50">{mode === "hold" ? t("tut.keyHold") : t("tut.keyPress")}</span>
    </span>
  )
}

export function TutorialPanel({
  step,
  index,
  total,
  phase,
  failKey,
  isLast,
  onProceed,
  onSkip,
  onExit,
}: {
  step: TutorialStep
  index: number
  total: number
  phase: TutorialPhase
  failKey: string | null
  isLast: boolean
  onProceed: () => void
  onSkip: () => void
  onExit: () => void
}) {
  const { t } = useLanguage()
  const penaltyParams = {
    blockSan: BLOCKED_ATTACKER_PENALTY.block.san,
    blockHeat: BLOCKED_ATTACKER_PENALTY.block.heat,
    parrySan: BLOCKED_ATTACKER_PENALTY.parry.san,
    parryHeat: BLOCKED_ATTACKER_PENALTY.parry.heat,
  }

  let body: string
  if (phase === "explain") body = t(`${step.id}.explain`, penaltyParams)
  else if (phase === "practice") body = t(`${step.id}.practice`)
  else if (phase === "success") body = t(`${step.id}.success`)
  else body = failKey ? t(failKey) : t("fail.generic")

  const primaryLabel =
    phase === "explain" ? (step.practice ? t("tut.tryIt") : isLast ? t("tut.finish") : t("tut.continue")) : t("tut.continue")
  const showPrimary = phase === "explain" || phase === "success"

  return (
    <div className="absolute inset-x-0 bottom-3 flex justify-center px-3">
      <section
        aria-live="polite"
        className="pointer-events-auto flex w-[min(96vw,38rem)] flex-col gap-2 rounded-lg bg-[#241a2e]/95 p-3.5 shadow-xl ring-1 ring-amber-300/40 backdrop-blur"
      >
        <header className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
            {t("tut.progress", { n: index + 1, total })}
          </span>
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className={cn("h-1.5 w-4 rounded-full", i <= index ? "bg-amber-400" : "bg-white/15")} />
            ))}
          </div>
        </header>

        <h2 className="text-base font-bold text-amber-100">{t(`${step.id}.title`)}</h2>

        <p
          className={cn(
            "whitespace-pre-line text-sm leading-relaxed",
            phase === "failed" ? "text-red-300" : phase === "success" ? "text-emerald-300" : "text-white/85",
          )}
        >
          {body}
        </p>

        {phase === "failed" && <p className="text-xs text-white/50">{t("tut.tryAgain")}</p>}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {step.keys && phase !== "success" && (
            <div className="flex flex-wrap items-center gap-3">
              {step.keys.map((k) => (
                <KeyCap key={k.key + k.mode} label={k.key} mode={k.mode} />
              ))}
            </div>
          )}
          {phase === "explain" && step.practice && <span className="text-[11px] text-white/40">{t("tut.paused")}</span>}
          {phase === "practice" && step.timeScale && step.timeScale < 1 && (
            <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[11px] font-semibold text-amber-200">
              {t("tut.slowmo")} x{step.timeScale}
            </span>
          )}
          {phase === "practice" && <span className="text-[11px] font-semibold text-sky-300">{t("tut.yourTurn")}</span>}
        </div>

        <footer className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={onExit}
            className="rounded-md bg-black/30 px-2.5 py-1.5 text-xs text-white/70 ring-1 ring-white/10 hover:bg-black/50"
          >
            {t("tut.exit")}
          </button>
          <div className="flex gap-2">
            {!isLast && (
              <button
                onClick={onSkip}
                className="rounded-md bg-black/30 px-2.5 py-1.5 text-xs text-white/70 ring-1 ring-white/10 hover:bg-black/50"
              >
                {t("tut.skip")}
              </button>
            )}
            {showPrimary && (
              <button onClick={onProceed} className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-orange-400">
                {primaryLabel}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  )
}
