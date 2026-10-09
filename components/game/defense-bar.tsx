"use client"

import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n"
import type { GameState } from "@/lib/game/types"

/** The Parry window followed by an unskippable cooldown; there is no ordinary Block window. */
export function DefenseBar({ state, alwaysVisible, highlighted }: { state: GameState; alwaysVisible: boolean; highlighted: boolean }) {
  const { t } = useLanguage()
  const player = state.fighters.player
  const elapsed = player.holdStartTime === null ? null : state.now - player.holdStartTime
  const isCooldown = player.phase === "cooldown" && player.cooldownUntil !== null
  const active = player.phase === "parryWindow" && player.isHoldingSpace && elapsed !== null && elapsed >= 0
  if (!active && !isCooldown && !alwaysVisible) return null

  const duration = isCooldown ? Math.max(1, player.cooldownUntil! - (player.holdStartTime ?? state.now)) : player.parryWindowMs
  const elapsedPhase = isCooldown ? Math.max(0, state.now - (player.holdStartTime ?? state.now)) : Math.max(0, elapsed ?? 0)
  const progress = Math.min(1, elapsedPhase / duration)
  const inParry = active

  return (
    <div
      data-highlight={highlighted || undefined}
      className={cn(
        "w-56 rounded-md bg-black/50 p-1.5 ring-1 ring-white/10 transition-opacity sm:w-72",
        isCooldown && "ring-slate-300/40",
        !active && !isCooldown && "opacity-50",
        highlighted && "ring-2 ring-amber-300",
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-label={t("bar.parry") + " / " + t("bar.cooldown")}
    >
      <div className="relative flex h-3 overflow-hidden rounded-full bg-black/60">
        <div className={cn("h-full w-full bg-amber-400/70", inParry && "bg-amber-300", isCooldown && "bg-slate-500/80")} />
        {(active || isCooldown) && <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${progress * 100}%` }} />}
      </div>
      <div className="mt-0.5 flex text-[10px] font-bold tracking-wider">
        <span className={cn("w-full", isCooldown ? "text-slate-200" : "text-amber-200")}>{isCooldown ? t("bar.cooldown") : t("bar.parry")}</span>
      </div>
    </div>
  )
}
