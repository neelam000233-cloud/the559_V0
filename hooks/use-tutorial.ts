"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { GameEngine } from "@/lib/game/engine"
import type { DocumentEvent, GameState, PlayerId } from "@/lib/game/types"
import { TUTORIAL_STEPS } from "@/lib/game/tutorial-steps"

export type TutorialPhase = "explain" | "practice" | "success" | "failed"

const RETRY_DELAY_MS = 2600
const RETURN_DELAY_MS = 1100
const OPPONENT_TOSS_AT_MS: Record<string, number> = { block: 2000, parry: 1000 }

export function useTutorial(
  engine: GameEngine,
  state: GameState,
  { active, onExit, onComplete }: { active: boolean; onExit: () => void; onComplete: () => void },
) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<TutorialPhase>("explain")
  const [failKey, setFailKey] = useState<string | null>(null)
  const step = TUTORIAL_STEPS[index]

  const indexRef = useRef(index)
  indexRef.current = index
  const script = useRef({ start: 0, feinted: false, tossed: false })
  const lastEventId = useRef<number | null>(state.documentEvent?.id ?? null)
  const wasFeinting = useRef(false)
  const releaseTimer = useRef<number | null>(null)
  const returnTimer = useRef<number | null>(null)
  const lastReturnEventId = useRef<number | null>(state.documentEvent?.id ?? null)

  const enterPractice = useCallback(
    (retry: boolean) => {
      const current = TUTORIAL_STEPS[indexRef.current]
      const owner: PlayerId = current.id === "block" || current.id === "parry" ? "opponent" : "player"
      if (releaseTimer.current !== null) window.clearTimeout(releaseTimer.current)
      engine.handleSpaceUp("player")
      if (retry) {
        engine.tutorialResetRound(owner)
      } else {
        engine.tutorialFreezePhase("player", "idle")
        engine.tutorialFreezePhase("player", null)
        engine.tutorialFreezePhase("opponent", null)
        engine.tutorialSetDocumentOwner(owner)
      }
      if (current.id === "penalty") engine.tutorialFreezePhase("opponent", "defending")
      script.current = { start: engine.getState().now, feinted: false, tossed: false }
      wasFeinting.current = false
      engine.setTimeScale(current.timeScale ?? 1)
      setFailKey(null)
      setPhase("practice")
    },
    [engine],
  )

  const next = useCallback(() => {
    if (indexRef.current + 1 >= TUTORIAL_STEPS.length) {
      onComplete()
      return
    }
    setIndex(indexRef.current + 1)
    setPhase("explain")
    setFailKey(null)
  }, [onComplete])

  const begin = useCallback(() => {
    setIndex(0)
    setPhase("explain")
    setFailKey(null)
    lastEventId.current = engine.getState().documentEvent?.id ?? null
  }, [engine])

  useEffect(() => {
    if (!active) return
    if (phase !== "practice") engine.setTimeScale(1)
    engine.setPaused(phase === "explain")
  }, [active, engine, phase, index])

  useEffect(() => {
    if (!active || phase !== "failed") return
    const id = window.setTimeout(() => enterPractice(true), RETRY_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [active, phase, enterPractice])

  useEffect(
    () => () => {
      if (releaseTimer.current !== null) window.clearTimeout(releaseTimer.current)
      if (returnTimer.current !== null) window.clearTimeout(returnTimer.current)
    },
    [],
  )

  // In the feint step the player may still press Space and toss; the opponent throws the document straight back.
  const eventId = state.documentEvent?.id ?? null
  useEffect(() => {
    const event = state.documentEvent
    if (!active || !event || event.id === lastReturnEventId.current) return
    lastReturnEventId.current = event.id
    if (step.id !== "feint" || event.scripted || event.from !== "player" || event.kind === "parry") return
    if (returnTimer.current !== null) window.clearTimeout(returnTimer.current)
    returnTimer.current = window.setTimeout(() => {
      returnTimer.current = null
      if (TUTORIAL_STEPS[indexRef.current].id !== "feint") return
      engine.tutorialFreezePhase("opponent", null)
      engine.tutorialSetDocumentOwner("player")
    }, RETURN_DELAY_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, engine, eventId, step.id])

  useEffect(() => {
    const event: DocumentEvent | null = state.documentEvent
    const isNewEvent = !!event && event.id !== lastEventId.current
    if (event) lastEventId.current = event.id
    if (!active || phase !== "practice") {
      wasFeinting.current = state.fighters.player.isFeinting
      return
    }

    const fail = (key: string) => {
      setFailKey(key)
      setPhase("failed")
    }
    const succeed = () => setPhase("success")

    if (isNewEvent && event && !event.scripted) {
      switch (step.id) {
        case "toss":
          if (event.from === "player" && event.kind === "toss") succeed()
          break
        case "block":
          if (event.from === "opponent") {
            if (event.kind === "block") succeed()
            else if (event.kind === "parry") fail("fail.blockWasParry")
            else fail("fail.notGuarding")
          }
          break
        case "parry":
          if (event.from === "opponent") {
            if (event.kind === "parry") succeed()
            else if (event.kind === "block") fail("fail.parryTooEarly")
            else fail("fail.parryTooLate")
          }
          break
        case "penalty":
          if (event.from === "player" && event.kind !== "toss") succeed()
          break
      }
      return
    }

    if (step.id === "feint") {
      const feinting = state.fighters.player.isFeinting
      if (feinting && !wasFeinting.current) {
        engine.tutorialFreezePhase("opponent", "defending")
        releaseTimer.current = window.setTimeout(() => engine.tutorialFreezePhase("opponent", null), 1400)
        succeed()
      }
      wasFeinting.current = feinting
      return
    }

    const tossAt = OPPONENT_TOSS_AT_MS[step.id]
    if (tossAt !== undefined) {
      const s = script.current
      if (!s.feinted) {
        s.feinted = true
        engine.handleFeint("opponent")
      }
      if (!s.tossed && state.now - s.start >= tossAt) {
        s.tossed = true
        engine.handleSpaceDown("opponent")
        engine.handleSpaceUp("opponent")
      }
    }
  }, [active, engine, phase, state, step.id])

  const proceed = useCallback(() => {
    if (phase === "explain" && TUTORIAL_STEPS[indexRef.current].practice) enterPractice(false)
    else next()
  }, [phase, enterPractice, next])

  return {
    step,
    index,
    total: TUTORIAL_STEPS.length,
    phase,
    failKey,
    isLast: index === TUTORIAL_STEPS.length - 1,
    begin,
    proceed,
    skip: next,
    exit: onExit,
  }
}
