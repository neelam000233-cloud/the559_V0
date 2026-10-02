"use client"

import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n"
import { MAX_HEAT, MAX_SAN } from "@/lib/game/constants"
import type { FighterState, GameState } from "@/lib/game/types"
import { DefenseBar } from "./defense-bar"

function formatTime(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

const HIGHLIGHT_RING = "rounded-lg ring-2 ring-amber-300 ring-offset-2 ring-offset-transparent animate-pulse"

function StatBar({
  value,
  max,
  colorClass,
  align,
}: {
  value: number
  max: number
  colorClass: string
  align: "left" | "right"
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="h-2.5 w-44 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10 sm:w-56">
      <div
        className={cn("h-full rounded-full transition-[width] duration-150", colorClass)}
        style={{
          width: `${pct}%`,
          marginLeft: align === "right" ? `${100 - pct}%` : undefined,
        }}
      />
    </div>
  )
}

function FighterPanel({ fighter, side, highlighted }: { fighter: FighterState; side: "left" | "right"; highlighted: boolean }) {
  const { t } = useLanguage()
  const isPlayer = fighter.id === "player"
  const align = side === "left" ? "items-start" : "items-end"
  const textAlign = side === "left" ? "text-left" : "text-right"
  return (
    <div className={cn("flex flex-col gap-1.5 p-1", align, highlighted && HIGHLIGHT_RING)}>
      <span className={cn("text-xs font-bold uppercase tracking-wider text-amber-100/90", textAlign)}>
        {isPlayer ? t("hud.player") : t("hud.opponent")}
        {fighter.combo > 1 && <span className="ml-1.5 text-orange-300">{t("hud.combo", { n: fighter.combo })}</span>}
      </span>
      <StatBar value={fighter.san} max={MAX_SAN} colorClass="bg-sky-400" align={side} />
      <StatBar value={fighter.heat} max={MAX_HEAT} colorClass="bg-red-500" align={side} />
      <div className={cn("flex gap-2 text-[10px] text-white/50", textAlign)}>
        <span>
          {t("hud.san")} {Math.ceil(fighter.san)}
        </span>
        <span>
          {t("hud.heat")} {Math.ceil(fighter.heat)}
        </span>
      </div>
    </div>
  )
}

export function GameHud({
  state,
  tutorial = false,
  highlight = [],
  bottomOffset = 0,
  onTogglePause,
  onOpenSettings,
}: {
  state: GameState
  tutorial?: boolean
  highlight?: string[]
  /** Height in px of the tutorial panel (with its hint); the bottom HUD stack sits above it. */
  bottomOffset?: number
  onTogglePause: () => void
  onOpenSettings: () => void
}) {
  const { t } = useLanguage()
  const { player, opponent } = state.fighters
  const documentLabel = state.documentOwner === "player" ? t("hud.docYou") : t("hud.docOpp")
  const lit = (name: string) => highlight.includes(name)

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4">
        <FighterPanel fighter={player} side="left" highlighted={lit("player-bars")} />

        <div className="pointer-events-auto flex flex-col items-center gap-1">
          <div
            className={cn(
              "rounded-md bg-black/50 px-3 py-1 font-mono text-lg font-bold text-amber-100 tabular-nums ring-1 ring-white/10",
              lit("timer") && HIGHLIGHT_RING,
            )}
          >
            {formatTime(state.remainingMs)}
          </div>
          {!tutorial && (
            <button
              onClick={onTogglePause}
              className="rounded-md bg-black/40 px-2 py-0.5 text-[11px] text-white/70 ring-1 ring-white/10 hover:bg-black/60"
            >
              {state.isPaused ? t("hud.resume") : t("hud.pause")}
            </button>
          )}
          <button
            onClick={onOpenSettings}
            className="rounded-md bg-black/40 px-2 py-0.5 text-[11px] text-white/70 ring-1 ring-white/10 hover:bg-black/60"
          >
            {t("hud.settings")}
          </button>
        </div>

        <FighterPanel fighter={opponent} side="right" highlighted={lit("opponent-bars")} />
      </div>

      <div
        className={cn("pointer-events-none absolute inset-x-0 flex flex-col items-center gap-1", !tutorial && "bottom-4")}
        style={tutorial ? { bottom: bottomOffset + 24 } : undefined}
      >
        <DefenseBar state={state} alwaysVisible={tutorial && lit("defense-bar")} highlighted={lit("defense-bar")} />
        <div className="rounded-md bg-black/40 px-3 py-1 text-xs text-amber-200/80 ring-1 ring-white/10">{documentLabel}</div>
        <div className="flex h-5 gap-3 text-sm font-semibold">
          {player.lastActionLabel && state.now - player.lastActionAt < 900 && (
            <span className="text-sky-300">{t(player.lastActionLabel)}</span>
          )}
          {opponent.lastActionLabel && state.now - opponent.lastActionAt < 900 && (
            <span className="text-red-300">{t(opponent.lastActionLabel)}</span>
          )}
        </div>
        {!tutorial && <p className={cn("text-[11px] text-white/40", lit("hint") && HIGHLIGHT_RING)}>{t("hud.hint")}</p>}
      </div>
    </>
  )
}
