export type TutorialKey = { key: "Space" | "F"; mode: "press" | "hold" }

export interface TutorialStep {
  /** Also the i18n prefix: `${id}.title`, `${id}.explain`, `${id}.practice`, `${id}.success`. */
  id: string
  /** Practice steps pause for the explanation, then run live until the player succeeds. */
  practice: boolean
  /** HUD regions to highlight while this step is shown. */
  highlight: string[]
  keys?: TutorialKey[]
  /** Simulation speed during practice. */
  timeScale?: number
}

/** Add new mechanics by appending a step here and its strings in lib/i18n.ts; the runner is data-driven. */
export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: "intro-scene", practice: false, highlight: [] },
  { id: "intro-bars", practice: false, highlight: ["player-bars", "opponent-bars"] },
  { id: "intro-timer", practice: false, highlight: ["timer", "hint"], keys: [{ key: "Space", mode: "press" }, { key: "F", mode: "press" }] },
  { id: "toss", practice: true, highlight: ["hint"], keys: [{ key: "Space", mode: "press" }] },
  { id: "block", practice: true, highlight: ["defense-bar"], keys: [{ key: "Space", mode: "hold" }] },
  { id: "parry", practice: true, highlight: ["defense-bar"], keys: [{ key: "Space", mode: "press" }], timeScale: 0.35 },
  { id: "feint", practice: true, highlight: ["hint"], keys: [{ key: "F", mode: "press" }] },
  { id: "penalty", practice: true, highlight: ["player-bars"], keys: [{ key: "Space", mode: "press" }] },
  { id: "summary", practice: false, highlight: [] },
]
