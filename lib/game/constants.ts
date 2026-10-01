import type { AbilityKey, AIDifficulty, Abilities, EffectsIntensity, FeintVariant } from "./types"

export const MATCH_DURATION_MS = 3 * 60 * 1000

export const MAX_SAN = 100
export const MAX_HEAT = 100

export const DOUBLE_LOSS_SAN_THRESHOLD = 20
export const DOUBLE_LOSS_HEAT_THRESHOLD = 50

/** Shared base parry window (ms), derived from AI difficulty. Applies to both fighters. */
export const BASE_PARRY_WINDOW_MS: Record<AIDifficulty, number> = {
  1: 1000,
  2: 850,
  3: 700,
}

/** A quick tap of Space (press+release faster than this) never counts as a defense hold. */
export const TAP_GUARD_MS = 60

export const BASE_ATTACK_DAMAGE = 12
export const BASE_HEAT_GAIN_RATIO = 0.65

/** Brief simulation freeze on impact (toss / block / parry) to sell the hit. */
export const HITSTOP_MS: Record<EffectsIntensity, number> = {
  strong: 110,
  weak: 45,
}

/** Max camera tremor (world units) reached at SAN 0. */
export const SHAKE_MAGNITUDE: Record<EffectsIntensity, number> = {
  strong: 0.09,
  weak: 0.035,
}

/** One-shot frame shake (world units) when the player defends successfully. */
export const DEFENSE_SHAKE_MAGNITUDE: Record<"block" | "parry", Record<EffectsIntensity, number>> = {
  block: { strong: 0.08, weak: 0.03 },
  parry: { strong: 0.24, weak: 0.1 },
}

/** Exponential decay rate (1/s) of the defense shake; lower = lingers longer. */
export const DEFENSE_SHAKE_DECAY: Record<"block" | "parry", number> = {
  block: 9,
  parry: 6,
}

/** SAN below which the dissolving black vignette starts closing in. */
export const VIGNETTE_SAN_THRESHOLD = 30

/** Tremor starts once the player's SAN drops below this value and grows as SAN falls. */
export const SHAKE_SAN_THRESHOLD = 40

export const FEINT_VARIANTS: FeintVariant[] = [
  "pump",
  "double-pump",
  "sidestep-left",
  "sidestep-right",
  "overhead",
  "crouch-spring",
]

export const FEINT_DURATION_MS: Record<FeintVariant, number> = {
  pump: 380,
  "double-pump": 580,
  "sidestep-left": 460,
  "sidestep-right": 460,
  overhead: 540,
  "crouch-spring": 520,
}

/** Gap after a feint ends before another one can start. */
export const FEINT_RECOVERY_MS = 260

/** How strongly the camera chases a feint (fraction of the document's feint offset). */
export const FEINT_CAMERA_FOLLOW: Record<EffectsIntensity, number> = {
  strong: 0.55,
  weak: 0.25,
}

export const TOTAL_ABILITY_POINTS = 10
export const ABILITY_KEYS: AbilityKey[] = [
  "parryMultiplier",
  "defenseReduction",
  "attackDamage",
  "sanResistance",
  "heatResistance",
]

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  parryMultiplier: "Parry Window",
  defenseReduction: "Block Reduction",
  attackDamage: "Attack Damage",
  sanResistance: "SAN Resistance",
  heatResistance: "HEAT Resistance",
}

/** Convert an allocated point count (0-10 per stat) into the actual ability value. */
export function pointsToAbility(key: AbilityKey, points: number): number {
  switch (key) {
    case "parryMultiplier":
      return 1 + points * 0.15
    case "defenseReduction":
      return Math.min(0.75, 0.15 + points * 0.08)
    case "attackDamage":
      return BASE_ATTACK_DAMAGE + points * 2
    case "sanResistance":
      return Math.min(0.6, points * 0.06)
    case "heatResistance":
      return Math.min(0.6, points * 0.06)
  }
}

export function abilitiesFromAllocation(allocation: Partial<Record<AbilityKey, number>>): Abilities {
  const get = (k: AbilityKey) => pointsToAbility(k, allocation[k] ?? 0)
  return {
    parryMultiplier: get("parryMultiplier"),
    defenseReduction: get("defenseReduction"),
    attackDamage: get("attackDamage"),
    sanResistance: get("sanResistance"),
    heatResistance: get("heatResistance"),
  }
}

/** Default balanced allocation (2 points per stat = 10 total) used until the design panel is built. */
export const DEFAULT_ALLOCATION: Record<AbilityKey, number> = {
  parryMultiplier: 2,
  defenseReduction: 2,
  attackDamage: 2,
  sanResistance: 2,
  heatResistance: 2,
}
