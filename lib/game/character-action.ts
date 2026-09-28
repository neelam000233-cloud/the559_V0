import type { FighterState } from "./types"

/** Body pose the character should be lerping toward this frame. */
export type CharacterPose = "idle-hold" | "idle-wait" | "guard-parry" | "guard-block" | "feint"

/** A short, punchy visual flash triggered by a just-resolved combat event. */
export type CharacterFlash = "toss" | "parry" | "block" | "hit" | null

export interface CharacterVisual {
  pose: CharacterPose
  flash: CharacterFlash
  /** Timestamp (engine ms) the flash started — used as a React key to retrigger the animation. */
  flashAt: number
}

const FLASH_WINDOW_MS = 260

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
      case "甩鍋成功！":
        flash = "toss"
        break
      case "PARRY!":
        flash = "parry"
        break
      case "防守（減傷）":
        flash = "block"
        break
      case "中招了！":
        flash = "hit"
        break
    }
  }

  return { pose, flash, flashAt: fighter.lastActionAt }
}
