"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import { GameEngine, createDefaultConfig } from "@/lib/game/engine"
import type { GameState, MatchConfig } from "@/lib/game/types"

/**
 * Owns a GameEngine instance for the lifetime of the component tree, drives it with
 * requestAnimationFrame, forwards keyboard input (Space = attack/defend, F = feint),
 * and exposes a React-friendly snapshot of the state.
 */
export function useGameEngine(config?: Partial<MatchConfig>) {
  const engineRef = useRef<GameEngine | null>(null)
  if (!engineRef.current) {
    engineRef.current = new GameEngine(createDefaultConfig(config))
  }
  const engine = engineRef.current

  const state = useSyncExternalStore<GameState>(
    (cb) => engine.subscribe(cb),
    () => engine.getState(),
    () => engine.getState(),
  )

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      engine.tick(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [engine])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        engine.handleSpaceDown("player")
      } else if (e.code === "KeyF") {
        engine.handleFeint("player")
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        engine.handleSpaceUp("player")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [engine])

  return {
    state,
    start: () => engine.start(),
    setPaused: (paused: boolean) => engine.setPaused(paused),
    reset: (next?: Partial<MatchConfig>) => engine.reset(next),
    setEffectsIntensity: (intensity: MatchConfig["effectsIntensity"]) => engine.setEffectsIntensity(intensity),
  }
}
