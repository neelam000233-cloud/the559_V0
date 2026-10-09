import type { FeintVariant, FighterState } from "./types"

/** Body pose the character should be lerping toward this frame. */
export type CharacterPose = "idle-hold" | "idle-wait" | "guard-parry" | "guard-block" | "feint"

/** A short, punchy visual flash triggered by a just-resolved combat event. */
export type CharacterFlash = "toss" | "parry" | "block" | "hit" | null

/** Facial expression the character should be easing toward this frame. */
export type FaceExpression =
  | "neutral"
  | "smug"
  | "focused"
  | "bracing"
  | "sly"
  | "grin"
  | "wide"
  | "shocked"
  | "shout"
  | "triumph"
  | "relieved"
  | "pain"
  | "frustrated"
  | "nervous"

/** SAN below this and the character's resting face turns anxious. */
const NERVOUS_SAN = 30

/** How long a reaction face lingers after the event that caused it (engine ms). */
const REACTION_MS = {
  hit: 1100,
  parry: 900,
  guarded: 800,
  toss: 700,
  overcommitted: 900,
  parried: 900,
} as const

const FEINT_EXPRESSION: Record<FeintVariant, FaceExpression> = {
  pump: "sly",
  "double-pump": "grin",
  "sidestep-left": "sly",
  "sidestep-right": "sly",
  overhead: "wide",
  "crouch-spring": "grin",
}

export interface CharacterVisual {
  pose: CharacterPose
  expression: FaceExpression
  /** -1..1 horizontal eye direction (sidesteps make the eyes dart the way the body goes). */
  lookX: number
  flash: CharacterFlash
  /** Timestamp (engine ms) the flash started — used as a React key to retrigger the animation. */
  flashAt: number
  feintVariant: FeintVariant | null
  /** 0-1 progress through the active feint, or null when not feinting. */
  feintProgress: number | null
}

const FLASH_WINDOW_MS = 260

export const IDLE_VISUAL: Omit<CharacterVisual, "pose"> = {
  expression: "neutral",
  lookX: 0,
  flash: null,
  flashAt: 0,
  feintVariant: null,
  feintProgress: null,
}

/** Derives the current pose + flash feedback for one fighter from raw engine state. */
function deriveExpression(
  fighter: FighterState,
  isDocumentOwner: boolean,
  now: number,
  other: FighterState | undefined,
): FaceExpression {
  const sinceOwn = now - fighter.lastActionAt
  switch (fighter.lastActionLabel) {
    case "Got hit!":
      if (sinceOwn < REACTION_MS.hit) return "pain"
      break
    case "PARRY!":
      if (sinceOwn < REACTION_MS.parry) return "triumph"
      break
    case "Guarded in cooldown":
      if (sinceOwn < REACTION_MS.guarded) return "relieved"
      break
    case "Blame tossed!":
      if (sinceOwn < REACTION_MS.toss) return "shout"
      break
    case "Overcommitted!":
      if (sinceOwn < REACTION_MS.overcommitted) return "frustrated"
      break
  }

  // A parried attacker carries no label of its own; read it off the defender's PARRY! instead.
  if (other?.lastActionLabel === "PARRY!" && now - other.lastActionAt < REACTION_MS.parried) return "shocked"

  if (fighter.isFeinting && fighter.feintVariant) return FEINT_EXPRESSION[fighter.feintVariant]
  if (fighter.phase === "parryWindow") return "focused"
  if (fighter.phase === "cooldown") return "bracing"
  if (fighter.san < NERVOUS_SAN) return "nervous"
  return isDocumentOwner ? "smug" : "neutral"
}

export function deriveCharacterVisual(
  fighter: FighterState,
  isDocumentOwner: boolean,
  now: number,
  other?: FighterState,
): CharacterVisual {
  let pose: CharacterPose
  if (fighter.isFeinting) {
    pose = "feint"
  } else if (fighter.phase === "parryWindow") {
    pose = "guard-parry"
  } else if (fighter.phase === "cooldown") {
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

  let lookX = 0
  if (fighter.isFeinting) {
    if (fighter.feintVariant === "sidestep-left") lookX = -1
    else if (fighter.feintVariant === "sidestep-right") lookX = 1
  }

  return {
    pose,
    expression: deriveExpression(fighter, isDocumentOwner, now, other),
    lookX,
    flash,
    flashAt: fighter.lastActionAt,
    feintVariant: fighter.isFeinting ? fighter.feintVariant : null,
    feintProgress,
  }
}
