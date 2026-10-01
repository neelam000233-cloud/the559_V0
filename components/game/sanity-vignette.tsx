import { VIGNETTE_SAN_THRESHOLD } from "@/lib/game/constants"

/**
 * Dissolving black frame that closes in from the screen edges once SAN drops below
 * the threshold; the lower the SAN, the wider the border. Two soft gradients (a wide
 * haze and a darker rim) plus a slow pulse keep the edge from reading as a hard mask.
 */
export function SanityVignette({ san }: { san: number }) {
  const severity = Math.min(1, Math.max(0, (VIGNETTE_SAN_THRESHOLD - san) / VIGNETTE_SAN_THRESHOLD))
  if (severity <= 0) return null

  const clearRadius = 62 - severity * 50
  const hazeRadius = clearRadius + 12 + severity * 4
  const rimOpacity = 0.8 + severity * 0.2

  const background = [
    `radial-gradient(ellipse at center, rgba(0,0,0,0) ${clearRadius}%, rgba(0,0,0,${rimOpacity * 0.7}) ${hazeRadius}%, rgba(0,0,0,${rimOpacity}) 100%)`,
    `radial-gradient(ellipse at center, rgba(0,0,0,0) ${clearRadius + 6}%, rgba(0,0,0,${rimOpacity}) 100%)`,
    `radial-gradient(ellipse at center, rgba(0,0,0,0) ${clearRadius + 20}%, rgba(0,0,0,1) 112%)`,
  ].join(", ")

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 animate-pulse transition-[background] duration-500"
      style={{ background, animationDuration: `${3.2 - severity * 1.6}s` }}
    />
  )
}
