import type { FeintVariant, FighterState } from "./types"

/** Body pose the character should be lerping toward this frame. */
export type CharacterPose = "idle-hold" | "idle-wait" | "guard-parry" | "guard-block" | "feint"

/** A short, punchy visual flash triggered by a just-resolved combat event. */
export type CharacterFlash = "toss" | "parry" | "block" | "hit" | null

export interface CharacterVisual {
  pose: CharacterPose
  flash: CharacterFlash
  /** Timestamp (engine ms) the flash started — used as a React key to retrigger the animation. */
  flashAt: number
  feintVariant: FeintVariant | null
  /** 0-1 progress through the active feint, or null when not feinting. */
  feintProgress: number | null
}

const FLASH_WINDOW_MS = 260

export const IDLE_VISUAL: Omit<CharacterVisual, "pose"> = {
  flash: null,
  flashAt: 0,
  feintVariant: null,
  feintProgress: null,
}

/** Derives the current pose + flash feedback for one fighter from raw engine state. */
export function deriveCharacterVisual(fighter: FighterState, isDocumentOwner: boolean, now: number): CharacterVisual {
  let pose: CharacterPose
  if (fighter.isFeinting) {
    pose = "feint"
  } else if (fighter.phase === "parryWindow") {
    pose = "guard-parry"
  } else if (fighter.phase === "defending") {
    pose = "guard-block"
  } else if (isDocumentOwner) {
    pose = "idle-hold"
  } else {
    pose = "idle-wait"
  }

  let flash: CharacterFlash = null
  if (fighter.lastActionLabel && now - fighter.lastActionAt < FLASH_WINDOW_MS) {
    switch (fighter.lastActionLabel) {
      case "Blame tossed!":
        flash = "toss"
        break
      case "PARRY!":
        flash = "parry"
        break
      case "Blocked (reduced)":
        flash = "block"
        break
      case "Got hit!":
        flash = "hit"
        break
    }
  }

  let feintProgress: number | null = null
  if (fighter.isFeinting && fighter.feintVariant) {
    const span = Math.max(1, fighter.feintUntil - fighter.feintStartedAt)
    feintProgress = Math.min(1, Math.max(0, (now - fighter.feintStartedAt) / span))
  }

  return {
    pose,
    flash,
    flashAt: fighter.lastActionAt,
    feintVariant: fighter.isFeinting ? fighter.feintVariant : null,
    feintProgress,
  }
}
