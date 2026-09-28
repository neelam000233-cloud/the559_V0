import type { AbilityKey, AIDifficulty, Abilities, EffectsIntensity } from "./types"

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

/** Screen-shake magnitude (world units) applied while the impact is fresh. */
export const SHAKE_MAGNITUDE: Record<EffectsIntensity, number> = {
  strong: 0.05,
  weak: 0.018,
}

/** How long after an impact the shake keeps decaying, in ms. */
export const SHAKE_DECAY_MS = 220

export const TOTAL_ABILITY_POINTS = 10
export const ABILITY_KEYS: AbilityKey[] = [
  "parryMultiplier",
  "defenseReduction",
  "attackDamage",
  "sanResistance",
  "heatResistance",
]

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  parryMultiplier: "Parry 時長",
  defenseReduction: "防守減傷",
  attackDamage: "攻擊傷害",
  sanResistance: "San 抗性",
  heatResistance: "Heat 抗性",
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
