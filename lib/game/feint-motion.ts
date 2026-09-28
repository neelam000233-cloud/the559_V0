import type { FeintVariant, GameState, PlayerId } from "./types"

/**
 * Additive body + document offsets for a feint, in the fighter's local space:
 * `forward` points toward the opponent, `side` is the fighter's own right.
 */
export interface FeintMotion {
  forward: number
  shiftX: number
  crouchY: number
  twist: number
  torsoLean: number
  armPitch: number
  armSpread: number
  throwArm: number
  docSide: number
  docUp: number
  docForward: number
  /** 0-1 overall intensity at this instant, used for camera zoom. */
  energy: number
}

export const ZERO_FEINT_MOTION: FeintMotion = {
  forward: 0,
  shiftX: 0,
  crouchY: 0,
  twist: 0,
  torsoLean: 0,
  armPitch: 0,
  armSpread: 0,
  throwArm: 0,
  docSide: 0,
  docUp: 0,
  docForward: 0,
  energy: 0,
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

/** Snaps out to 1 by `peak`, then eases back to 0 — a fake that commits fast and recovers slower. */
function pulse(t: number, peak: number) {
  if (t <= 0 || t >= 1) return 0
  return t < peak ? easeOutCubic(t / peak) : 1 - easeInOutSine((t - peak) / (1 - peak))
}

export function feintMotion(variant: FeintVariant, t: number): FeintMotion {
  switch (variant) {
    case "pump": {
      const e = pulse(t, 0.32)
      return {
        ...ZERO_FEINT_MOTION,
        forward: 0.32 * e,
        torsoLean: -0.42 * e,
        armPitch: 0.5 * e,
        throwArm: 0.9 * e,
        docForward: 0.7 * e,
        docUp: 0.18 * e,
        energy: e,
      }
    }
    case "double-pump": {
      const first = pulse(t / 0.5, 0.4)
      const second = pulse((t - 0.45) / 0.55, 0.35)
      const e = Math.max(first * 0.7, second)
      return {
        ...ZERO_FEINT_MOTION,
        forward: 0.28 * e,
        torsoLean: -0.36 * e,
        armPitch: 0.45 * e,
        throwArm: 0.8 * e,
        docForward: 0.6 * e,
        docUp: 0.14 * e,
        energy: e,
      }
    }
    case "sidestep-left":
    case "sidestep-right": {
      const s = variant === "sidestep-right" ? 1 : -1
      const e = pulse(t, 0.38)
      return {
        ...ZERO_FEINT_MOTION,
        forward: 0.1 * e,
        shiftX: 0.38 * s * e,
        twist: 0.65 * s * e,
        torsoLean: -0.12 * e,
        armSpread: 0.28 * e,
        throwArm: 0.35 * e,
        docSide: 0.62 * s * e,
        docForward: 0.28 * e,
        docUp: 0.06 * e,
        energy: e,
      }
    }
    case "overhead": {
      const e = pulse(t, 0.5)
      // A sharp downward "almost throw" in the recovery half sells the fake.
      const snap = t > 0.5 ? Math.sin(((t - 0.5) / 0.5) * Math.PI) * 0.35 : 0
      return {
        ...ZERO_FEINT_MOTION,
        crouchY: 0.07 * e,
        torsoLean: 0.24 * e - snap * 0.5,
        armPitch: 1.75 * e,
        forward: snap * 0.3,
        docUp: 0.85 * e,
        docForward: 0.1 * e + snap * 0.5,
        energy: Math.max(e, snap),
      }
    }
    case "crouch-spring": {
      const dip = pulse(t / 0.7, 0.55)
      const spring = pulse((t - 0.55) / 0.45, 0.35)
      return {
        ...ZERO_FEINT_MOTION,
        crouchY: -0.24 * dip + 0.08 * spring,
        torsoLean: -0.34 * dip - 0.2 * spring,
        armPitch: -0.35 * dip + 0.6 * spring,
        forward: 0.12 * dip + 0.26 * spring,
        throwArm: 0.5 * spring,
        docUp: -0.22 * dip + 0.3 * spring,
        docForward: 0.18 * dip + 0.55 * spring,
        energy: Math.max(dip * 0.7, spring),
      }
    }
  }
}

/** Current feint motion for one fighter, or zero if they aren't feinting. */
export function fighterFeintMotion(state: GameState, id: PlayerId): FeintMotion {
  const f = state.fighters[id]
  if (!f.isFeinting || !f.feintVariant) return ZERO_FEINT_MOTION
  const span = Math.max(1, f.feintUntil - f.feintStartedAt)
  const t = Math.min(1, Math.max(0, (state.now - f.feintStartedAt) / span))
  return feintMotion(f.feintVariant, t)
}

/** Converts a fighter's local document offset to world space (player faces -Z, opponent faces +Z). */
export function feintDocWorldOffset(motion: FeintMotion, id: PlayerId): [number, number, number] {
  const facing = id === "player" ? 1 : -1
  return [motion.docSide * facing, motion.docUp, -motion.docForward * facing]
}
