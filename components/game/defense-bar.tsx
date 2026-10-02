"use client"

import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n"
import type { GameState } from "@/lib/game/types"

/** One bar for the whole defense hold: the first half is the Parry window, the second half is a plain Block. */
export function DefenseBar({ state, alwaysVisible, highlighted }: { state: GameState; alwaysVisible: boolean; highlighted: boolean }) {
  const { t } = useLanguage()
  const player = state.fighters.player
  const total = player.parryWindowMs * 2
  const elapsed = player.holdStartTime === null ? null : state.now - player.holdStartTime
  const active = player.isHoldingSpace && elapsed !== null && elapsed >= 0 && elapsed <= total
  if (!active && !alwaysVisible) return null

  const progress = active && elapsed !== null ? Math.min(1, elapsed / total) : 0
  const inParry = active && progress < 0.5

  return (
    <div
      data-highlight={highlighted || undefined}
      className={cn(
        "w-56 rounded-md bg-black/50 p-1.5 ring-1 ring-white/10 transition-opacity sm:w-72",
        !active && "opacity-50",
        highlighted && "ring-2 ring-amber-300",
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-label={t("bar.parry") + " / " + t("bar.block")}
    >
      <div className="relative flex h-3 overflow-hidden rounded-full bg-black/60">
        <div className={cn("h-full w-1/2 bg-amber-400/70", inParry && "bg-amber-300")} />
        <div className={cn("h-full w-1/2 bg-sky-500/60", active && !inParry && "bg-sky-400")} />
        {active && <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${progress * 100}%` }} />}
      </div>
      <div className="mt-0.5 flex text-[10px] font-bold tracking-wider">
        <span className="w-1/2 text-amber-200">{t("bar.parry")}</span>
        <span className="w-1/2 text-sky-200">{t("bar.block")}</span>
      </div>
    </div>
  )
}
