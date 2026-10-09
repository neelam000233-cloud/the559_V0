export type PlayerId = "player" | "opponent"

export type AIDifficulty = 1 | 2 | 3

/** Strength of screen-shake / hitstop juice on impact. User-configurable in Settings. */
export type EffectsIntensity = "strong" | "weak"

/** Player-allocated ability points (10 total across 5 stats for v1). */
export interface Abilities {
  /** Multiplies the shared base parry window (difficulty-derived). */
  parryMultiplier: number
  /** Fraction (0-1) of incoming damage negated while blocking outside the parry window. */
  defenseReduction: number
  /** Base SAN damage dealt on a successful toss. */
  attackDamage: number
  /** Fraction (0-1) reduction to SAN damage taken. */
  sanResistance: number
  /** Fraction (0-1) reduction to HEAT gained when hit. */
  heatResistance: number
}

export type AbilityKey = keyof Abilities

export type FeintVariant = "pump" | "double-pump" | "sidestep-left" | "sidestep-right" | "overhead" | "crouch-spring"

export type DocumentEventKind = "toss" | "block" | "parry"

/** A discrete document movement, keyed by a unique id so the renderer can animate each one exactly once. */
export interface DocumentEvent {
  id: number
  kind: DocumentEventKind
  from: PlayerId
  to: PlayerId
  /** Tutorial-only: a staged hand-over that carries no damage and no sound. */
  scripted?: boolean
}

/** What the defender was doing at the instant they were attacked. */
export type CombatPhase = "idle" | "parryWindow" | "recovery" | "cooldown"

export type DefenseResolution = "parry" | "cooldown" | null

export interface FighterState {
  id: PlayerId
  defenseResolution: DefenseResolution
  san: number
  heat: number
  abilities: Abilities
  /** Length of the parry segment of this fighter's defense hold; the block segment is the same length. */
  parryWindowMs: number
  isHoldingSpace: boolean
  holdStartTime: number | null
  phase: CombatPhase
  cooldownUntil: number | null
  recoveryUntil: number | null
  combo: number
  isFeinting: boolean
  feintCooldownUntil: number | null
  feintVariant: FeintVariant | null
  feintStartedAt: number
  feintUntil: number
  lastActionLabel: string | null
  lastActionAt: number
  hasAttackedThisPress: boolean
  stats: {
    tossesLanded: number
    parriesLanded: number
    blocksLanded: number
    sanLost: number
    heatGained: number
  }
}

export type MatchOutcome =
  | { type: "win"; winner: PlayerId; reason: "san" | "heat" }
  | { type: "doubleLoss" }
  | { type: "doubleWin" }

export interface GameState {
  now: number
  remainingMs: number
  isPaused: boolean
  isRunning: boolean
  documentOwner: PlayerId
  fighters: Record<PlayerId, FighterState>
  outcome: MatchOutcome | null
  log: { id: number; text: string; owner: PlayerId | null }[]
  /** Real-time ms left in the impact freeze; the simulation clock is paused while > 0. */
  hitstopRemainingMs: number
  documentEvent: DocumentEvent | null
  /** Simulation speed multiplier (1 = normal); the tutorial lowers it for parry practice. */
  timeScale: number
  isTutorial: boolean
}

export interface MatchConfig {
  difficulty: AIDifficulty
  matchDurationMs: number
  playerAbilities: Abilities
  opponentAbilities: Abilities
  effectsIntensity: EffectsIntensity
  /** Scripted tutorial match: opponent AI is driven externally, nobody can lose, the clock is frozen. */
  tutorial?: boolean
}
