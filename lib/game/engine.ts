import type {
  Abilities,
  DocumentEventKind,
  FeintVariant,
  FighterState,
  GameState,
  MatchConfig,
  PlayerId,
} from "./types"
import {
  FEINT_DURATION_MS,
  FEINT_RECOVERY_MS,
  FEINT_VARIANTS,
  BASE_ATTACK_DAMAGE,
  BASE_HEAT_GAIN_RATIO,
  BLOCKED_ATTACKER_PENALTY,
  BASE_PARRY_WINDOW_MS,
  DOUBLE_LOSS_HEAT_THRESHOLD,
  DOUBLE_LOSS_SAN_THRESHOLD,
  HITSTOP_MS,
  MAX_HEAT,
  MAX_SAN,
  TAP_GUARD_MS,
} from "./constants"

const OPPONENT_OF: Record<PlayerId, PlayerId> = { player: "opponent", opponent: "player" }

let logId = 0
let documentEventId = 0

function pickFeintVariant(previous: FeintVariant | null): FeintVariant {
  const pool = FEINT_VARIANTS.filter((v) => v !== previous)
  return pool[Math.floor(Math.random() * pool.length)]
}

function createFighter(id: PlayerId, abilities: Abilities): FighterState {
  return {
    id,
    san: MAX_SAN,
    heat: 0,
    abilities,
    isHoldingSpace: false,
    holdStartTime: null,
    phase: "idle",
    cooldownUntil: null,
    combo: 0,
    isFeinting: false,
    feintCooldownUntil: null,
    feintVariant: null,
    feintStartedAt: 0,
    feintUntil: 0,
    lastActionLabel: null,
    lastActionAt: 0,
    hasAttackedThisPress: false,
    stats: { tossesLanded: 0, parriesLanded: 0, blocksLanded: 0, sanLost: 0, heatGained: 0 },
  }
}

/**
 * Pure, framework-agnostic game state machine for the document tug-of-war.
 * Consumed by a React hook that drives it with rAF and forwards input events.
 */
export class GameEngine {
  private state: GameState
  private config: MatchConfig
  private subscribers = new Set<() => void>()
  private aiNextDecisionAt = 0

  constructor(config: MatchConfig) {
    this.config = config
    this.state = this.buildInitialState()
  }

  private buildInitialState(): GameState {
    return {
      now: 0,
      remainingMs: this.config.matchDurationMs,
      isPaused: true,
      isRunning: false,
      documentOwner: "player",
      fighters: {
        player: createFighter("player", this.config.playerAbilities),
        opponent: createFighter("opponent", this.config.opponentAbilities),
      },
      outcome: null,
      log: [],
      hitstopRemainingMs: 0,
      documentEvent: null,
    }
  }

  getState(): GameState {
    return this.state
  }

  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb)
    return () => this.subscribers.delete(cb)
  }

  private emit() {
    this.state = { ...this.state }
    for (const cb of this.subscribers) cb()
  }

  private parryWindowFor(id: PlayerId): number {
    const base = BASE_PARRY_WINDOW_MS[this.config.difficulty]
    return base * this.state.fighters[id].abilities.parryMultiplier
  }

  start() {
    this.state.isPaused = false
    this.state.isRunning = true
    this.emit()
  }

  setPaused(paused: boolean) {
    if (!this.state.isRunning || this.state.outcome) return
    this.state.isPaused = paused
    this.emit()
  }

  reset(config?: Partial<MatchConfig>) {
    this.config = { ...this.config, ...config }
    this.aiNextDecisionAt = 0
    this.state = this.buildInitialState()
    this.emit()
  }

  private pushLog(text: string, owner: PlayerId | null) {
    this.state.log = [...this.state.log.slice(-24), { id: ++logId, text, owner }]
  }

  /** Main loop tick, called every animation frame with the elapsed delta in ms. */
  tick(dtMs: number) {
    if (!this.state.isRunning || this.state.isPaused || this.state.outcome) return

    if (this.state.hitstopRemainingMs > 0) {
      // Count down with real frame time: the sim clock is frozen, so it can't be used to end the freeze.
      this.state.hitstopRemainingMs = Math.max(0, this.state.hitstopRemainingMs - dtMs)
      this.emit()
      return
    }

    this.state.now += dtMs
    this.state.remainingMs = Math.max(0, this.state.remainingMs - dtMs)

    for (const id of ["player", "opponent"] as PlayerId[]) {
      this.updateDefensePhase(id)
      const f = this.state.fighters[id]
      if (f.isFeinting && this.state.now >= f.feintUntil) f.isFeinting = false
    }

    this.updateAI()
    this.checkOutcomes()

    if (this.state.remainingMs <= 0 && !this.state.outcome) {
      this.resolveTimeUp()
    }

    this.emit()
  }

  private updateDefensePhase(id: PlayerId) {
    const f = this.state.fighters[id]
    if (f.phase === "cooldown") {
      if (f.cooldownUntil !== null && this.state.now >= f.cooldownUntil) {
        f.phase = "idle"
        f.cooldownUntil = null
      }
      return
    }
    if (!f.isHoldingSpace || f.holdStartTime === null) return
    const elapsed = this.state.now - f.holdStartTime
    const parryWindow = this.parryWindowFor(id)
    const maxHold = parryWindow * 2
    if (elapsed <= parryWindow) {
      f.phase = "parryWindow"
    } else if (elapsed <= maxHold) {
      f.phase = "defending"
    } else {
      // Auto-cancel: held too long past the defense window.
      f.isHoldingSpace = false
      f.phase = "cooldown"
      f.cooldownUntil = this.state.now + parryWindow
      f.holdStartTime = null
    }
  }

  /** Space key pressed down for a given fighter. */
  handleSpaceDown(id: PlayerId) {
    const f = this.state.fighters[id]
    if (!this.state.isRunning || this.state.isPaused || this.state.outcome) return
    if (f.isHoldingSpace) return // ignore key-repeat

    if (this.state.documentOwner === id) {
      // Attacker role: a press is an instant blame-toss attack attempt.
      if (!f.hasAttackedThisPress) {
        f.hasAttackedThisPress = true
        this.attemptAttack(id)
      }
      return
    }

    // Defender role: begin a hold. Blocked while cooling down from a prior over-hold.
    if (f.phase === "cooldown") return
    f.isHoldingSpace = true
    f.holdStartTime = this.state.now
    f.phase = "parryWindow"
    this.emit()
  }

  /** Space key released for a given fighter. */
  handleSpaceUp(id: PlayerId) {
    const f = this.state.fighters[id]
    f.hasAttackedThisPress = false
    if (f.isHoldingSpace) {
      f.isHoldingSpace = false
      if (f.phase !== "cooldown") f.phase = "idle"
      f.holdStartTime = null
      this.emit()
    }
  }

  /** F key: feint. Only meaningful for the current document owner (attacker). */
  handleFeint(id: PlayerId) {
    const f = this.state.fighters[id]
    if (!this.state.isRunning || this.state.isPaused || this.state.outcome) return
    if (this.state.documentOwner !== id) return
    if (f.feintCooldownUntil !== null && this.state.now < f.feintCooldownUntil) return
    const variant = pickFeintVariant(f.feintVariant)
    const duration = FEINT_DURATION_MS[variant]
    f.isFeinting = true
    f.feintVariant = variant
    f.feintStartedAt = this.state.now
    f.feintUntil = this.state.now + duration
    f.feintCooldownUntil = f.feintUntil + FEINT_RECOVERY_MS
    this.pushLog("Feint!", id)
    this.emit()
  }

  private pushDocumentEvent(kind: DocumentEventKind, from: PlayerId, to: PlayerId) {
    this.state.documentEvent = { id: ++documentEventId, kind, from, to }
  }

  private computeDamage(attacker: FighterState, defender: FighterState, mitigated: boolean) {
    let san = attacker.abilities.attackDamage
    if (mitigated) san *= 1 - defender.abilities.defenseReduction
    san *= 1 - defender.abilities.sanResistance
    let heat = attacker.abilities.attackDamage * BASE_HEAT_GAIN_RATIO
    if (mitigated) heat *= 1 - defender.abilities.defenseReduction
    heat *= 1 - defender.abilities.heatResistance
    return { san: Math.max(0, san), heat: Math.max(0, heat) }
  }

  private penalizeBlockedAttacker(attacker: FighterState, kind: "block" | "parry") {
    const { san, heat } = BLOCKED_ATTACKER_PENALTY[kind]
    const sanLoss = Math.min(attacker.san, san)
    const heatGain = Math.min(MAX_HEAT - attacker.heat, heat)
    attacker.san -= sanLoss
    attacker.heat += heatGain
    attacker.stats.sanLost += sanLoss
    attacker.stats.heatGained += heatGain
  }

  private attemptAttack(attackerId: PlayerId) {
    const defenderId = OPPONENT_OF[attackerId]
    const attacker = this.state.fighters[attackerId]
    const defender = this.state.fighters[defenderId]
    // Committing to a real toss cancels any feint in progress; the document launches from wherever the fake left it.
    attacker.isFeinting = false

    if (defender.phase === "parryWindow") {
      this.pushDocumentEvent("parry", attackerId, defenderId)
      // Parry success: document bounces back, no damage, combo continues.
      defender.combo += 1
      defender.stats.parriesLanded += 1
      defender.lastActionLabel = "PARRY!"
      defender.lastActionAt = this.state.now
      attacker.lastActionLabel = null
      this.penalizeBlockedAttacker(attacker, "parry")
      this.pushLog("Parry! Document bounced back", defenderId)
      this.aiNextDecisionAt = this.state.now + 280 + Math.random() * 260
      this.triggerHitstop()
    } else if (defender.phase === "defending") {
      const dmg = this.computeDamage(attacker, defender, true)
      defender.san = Math.max(0, defender.san - dmg.san)
      defender.heat = Math.min(MAX_HEAT, defender.heat + dmg.heat)
      defender.stats.sanLost += dmg.san
      defender.stats.heatGained += dmg.heat
      defender.stats.blocksLanded += 1
      defender.combo = 0
      defender.lastActionLabel = "Blocked (reduced)"
      defender.lastActionAt = this.state.now
      this.state.documentOwner = defenderId
      this.pushDocumentEvent("block", attackerId, defenderId)
      this.penalizeBlockedAttacker(attacker, "block")
      this.pushLog("Blocked! Damage reduced, document transferred", defenderId)
      this.aiNextDecisionAt = this.state.now + 280 + Math.random() * 260
      this.triggerHitstop()
    } else {
      const dmg = this.computeDamage(attacker, defender, false)
      defender.san = Math.max(0, defender.san - dmg.san)
      defender.heat = Math.min(MAX_HEAT, defender.heat + dmg.heat)
      defender.stats.sanLost += dmg.san
      defender.stats.heatGained += dmg.heat
      attacker.stats.tossesLanded += 1
      defender.combo = 0
      attacker.lastActionLabel = "Blame tossed!"
      attacker.lastActionAt = this.state.now
      defender.lastActionLabel = "Got hit!"
      defender.lastActionAt = this.state.now
      this.state.documentOwner = defenderId
      this.pushDocumentEvent("toss", attackerId, defenderId)
      this.pushLog("Blame tossed! Document transferred", attackerId)
      this.aiNextDecisionAt = this.state.now + 280 + Math.random() * 260
      this.triggerHitstop()
    }
    this.checkOutcomes()
    this.emit()
  }

  private triggerHitstop() {
    this.state.hitstopRemainingMs = HITSTOP_MS[this.config.effectsIntensity]
  }

  /** Update the screen-shake / hitstop strength from the Settings panel without resetting the match. */
  setEffectsIntensity(intensity: MatchConfig["effectsIntensity"]) {
    this.config = { ...this.config, effectsIntensity: intensity }
  }

  private checkOutcomes() {
    if (this.state.outcome) return
    const p = this.state.fighters.player
    const o = this.state.fighters.opponent
    const pDoubleLoss = p.san < DOUBLE_LOSS_SAN_THRESHOLD && p.heat > DOUBLE_LOSS_HEAT_THRESHOLD
    const oDoubleLoss = o.san < DOUBLE_LOSS_SAN_THRESHOLD && o.heat > DOUBLE_LOSS_HEAT_THRESHOLD
    if (pDoubleLoss && oDoubleLoss) {
      this.finish({ type: "doubleLoss" })
      return
    }
    if (p.san <= 0) {
      this.finish({ type: "win", winner: "opponent", reason: "san" })
      return
    }
    if (o.san <= 0) {
      this.finish({ type: "win", winner: "player", reason: "san" })
      return
    }
    if (p.heat >= MAX_HEAT) {
      this.finish({ type: "win", winner: "opponent", reason: "heat" })
      return
    }
    if (o.heat >= MAX_HEAT) {
      this.finish({ type: "win", winner: "player", reason: "heat" })
      return
    }
  }

  private resolveTimeUp() {
    const p = this.state.fighters.player
    const o = this.state.fighters.opponent
    const pDoubleLoss = p.san < DOUBLE_LOSS_SAN_THRESHOLD && p.heat > DOUBLE_LOSS_HEAT_THRESHOLD
    const oDoubleLoss = o.san < DOUBLE_LOSS_SAN_THRESHOLD && o.heat > DOUBLE_LOSS_HEAT_THRESHOLD
    if (pDoubleLoss && oDoubleLoss) {
      this.finish({ type: "doubleLoss" })
    } else {
      this.finish({ type: "doubleWin" })
    }
  }

  private finish(outcome: GameState["outcome"]) {
    this.state.outcome = outcome
    this.state.isRunning = false
    this.pushLog(
      outcome?.type === "win"
        ? `${outcome.winner === "player" ? "Player" : "Opponent"} wins (${outcome.reason === "san" ? "SAN depleted" : "HEAT maxed"})`
        : outcome?.type === "doubleLoss"
          ? "Double loss"
          : "Double win",
      null,
    )
  }

  // ---- AI (opponent) ----
  private updateAI() {
    const ai = this.state.fighters.opponent
    const now = this.state.now
    const difficulty = this.config.difficulty

    if (this.state.documentOwner === "opponent") {
      // AI is the attacker: decide when to toss (and occasionally feint first).
      if (now >= this.aiNextDecisionAt) {
        const shouldFeint = difficulty >= 2 && Math.random() < 0.28 && !ai.isFeinting
        if (shouldFeint) {
          this.handleFeint("opponent")
          // Let most of the fake play out before deciding again (sometimes tossing mid-feint as a mix-up).
          const feintSpan = ai.isFeinting ? ai.feintUntil - now : 0
          this.aiNextDecisionAt = now + feintSpan * (0.55 + Math.random() * 0.6) + 80
          return
        }
        this.aiNextDecisionAt = now + 550 + Math.random() * 650
        this.handleSpaceDown("opponent")
        this.handleSpaceUp("opponent")
      }
      return
    }

    // AI is the defender.
    if (difficulty === 1) {
      // Never defends.
      return
    }

    if (ai.phase === "idle" && !ai.isHoldingSpace) {
      const parryWindow = this.parryWindowFor("opponent")
      let reactionDelay: number
      if (difficulty === 3) {
        // Reads the player: react quickly and land in the parry window more often.
        reactionDelay = 80 + Math.random() * 120
      } else {
        // Doesn't observe the player: semi-random timing.
        reactionDelay = 120 + Math.random() * 500
      }
      if (now >= this.aiNextDecisionAt) {
        this.aiNextDecisionAt = now + reactionDelay + parryWindow * (0.6 + Math.random() * 1.2)
        this.handleSpaceDown("opponent")
        const holdDuration = difficulty === 3 ? parryWindow * (0.3 + Math.random() * 0.5) : parryWindow * (0.5 + Math.random() * 1.4)
        setTimeout(() => this.handleSpaceUp("opponent"), holdDuration)
      }
    }
  }
}

export function createDefaultConfig(overrides?: Partial<MatchConfig>): MatchConfig {
  return {
    difficulty: 1,
    matchDurationMs: 3 * 60 * 1000,
    effectsIntensity: "strong",
    playerAbilities: {
      parryMultiplier: 1.3,
      defenseReduction: 0.31,
      attackDamage: BASE_ATTACK_DAMAGE + 4,
      sanResistance: 0.12,
      heatResistance: 0.12,
    },
    opponentAbilities: {
      parryMultiplier: 1.3,
      defenseReduction: 0.31,
      attackDamage: BASE_ATTACK_DAMAGE + 4,
      sanResistance: 0.12,
      heatResistance: 0.12,
    },
    ...overrides,
  }
}
