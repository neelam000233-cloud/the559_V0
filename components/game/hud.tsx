"use client"

import { cn } from "@/lib/utils"
import { MAX_HEAT, MAX_SAN } from "@/lib/game/constants"
import type { FighterState, GameState, PlayerId } from "@/lib/game/types"

function formatTime(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

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

function FighterPanel({ fighter, side }: { fighter: FighterState; side: "left" | "right" }) {
  const isPlayer = fighter.id === "player"
  const align = side === "left" ? "items-start" : "items-end"
  const textAlign = side === "left" ? "text-left" : "text-right"
  return (
    <div className={cn("flex flex-col gap-1.5", align)}>
      <span className={cn("text-xs font-bold uppercase tracking-wider text-amber-100/90", textAlign)}>
        {isPlayer ? "玩家" : "對手"}
        {fighter.combo > 1 && <span className="ml-1.5 text-orange-300">連擊 x{fighter.combo}</span>}
      </span>
      <StatBar value={fighter.san} max={MAX_SAN} colorClass="bg-sky-400" align={side === "left" ? "left" : "right"} />
      <StatBar value={fighter.heat} max={MAX_HEAT} colorClass="bg-red-500" align={side === "left" ? "left" : "right"} />
      <div className={cn("flex gap-2 text-[10px] text-white/50", textAlign)}>
        <span>SAN {Math.ceil(fighter.san)}</span>
        <span>HEAT {Math.ceil(fighter.heat)}</span>
      </div>
    </div>
  )
}

export function GameHud({
  state,
  onTogglePause,
  onOpenSettings,
}: {
  state: GameState
  onTogglePause: () => void
  onOpenSettings: () => void
}) {
  const { player, opponent } = state.fighters
  const documentLabel = state.documentOwner === "player" ? "文件在你手上" : "文件在對手手上"

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4">
        <FighterPanel fighter={player} side="left" />

        <div className="pointer-events-auto flex flex-col items-center gap-1">
          <div className="rounded-md bg-black/50 px-3 py-1 font-mono text-lg font-bold text-amber-100 tabular-nums ring-1 ring-white/10">
            {formatTime(state.remainingMs)}
          </div>
          <button
            onClick={onTogglePause}
            className="rounded-md bg-black/40 px-2 py-0.5 text-[11px] text-white/70 ring-1 ring-white/10 hover:bg-black/60"
          >
            {state.isPaused ? "繼續" : "暫停"}
          </button>
          <button
            onClick={onOpenSettings}
            className="rounded-md bg-black/40 px-2 py-0.5 text-[11px] text-white/70 ring-1 ring-white/10 hover:bg-black/60"
          >
            設置
          </button>
        </div>

        <FighterPanel fighter={opponent} side="right" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1">
        <div className="rounded-md bg-black/40 px-3 py-1 text-xs text-amber-200/80 ring-1 ring-white/10">
          {documentLabel}
        </div>
        <div className="flex h-5 gap-3 text-sm font-semibold">
          {player.lastActionLabel && state.now - player.lastActionAt < 900 && (
            <span className="text-sky-300">{player.lastActionLabel}</span>
          )}
          {opponent.lastActionLabel && state.now - opponent.lastActionAt < 900 && (
            <span className="text-red-300">{opponent.lastActionLabel}</span>
          )}
        </div>
        <p className="text-[11px] text-white/40">
          持有文件時：空格＝甩鍋 · F＝假動作　　未持有時：長按空格＝防守（前段為 Parry）
        </p>
      </div>
    </>
  )
}
