import type { GameState, PlayerId } from "./types"

export type DocumentFlightPhase = "resting" | "toss" | "parry-bounce"

export interface DocumentFlightState {
  phase: DocumentFlightPhase
  /** Where the document sits when nothing is animating. */
  restOwner: PlayerId
  /** Animation endpoints — for a bounce, "to" is the far point before it snaps back. */
  fromOwner: PlayerId
  toOwner: PlayerId
  /** 0-1 progress through the active phase's animation window. */
  progress: number
}

const TOSS_FLIGHT_MS = 340
const PARRY_BOUNCE_MS = 300

/** Derives the flying-document's current animation state from raw engine state. */
export function deriveDocumentFlight(state: GameState, now: number): DocumentFlightState {
  const owner = state.documentOwner
  const other: PlayerId = owner === "player" ? "opponent" : "player"
  const ownerFighter = state.fighters[owner]
  const otherFighter = state.fighters[other]

  // The document just arrived at its new owner via a landed toss or a blocked hit.
  if (
    (ownerFighter.lastActionLabel === "中招了！" || ownerFighter.lastActionLabel === "防守（減傷）") &&
    now - ownerFighter.lastActionAt < TOSS_FLIGHT_MS
  ) {
    const progress = Math.min(1, (now - ownerFighter.lastActionAt) / TOSS_FLIGHT_MS)
    return { phase: "toss", restOwner: owner, fromOwner: other, toOwner: owner, progress }
  }

  // A parry just bounced the document back without changing hands.
  if (otherFighter.lastActionLabel === "PARRY!" && now - otherFighter.lastActionAt < PARRY_BOUNCE_MS) {
    const progress = Math.min(1, (now - otherFighter.lastActionAt) / PARRY_BOUNCE_MS)
    return { phase: "parry-bounce", restOwner: owner, fromOwner: owner, toOwner: other, progress }
  }

  return { phase: "resting", restOwner: owner, fromOwner: owner, toOwner: owner, progress: 1 }
}
