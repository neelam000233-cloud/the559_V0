"use client"

/** A narrow icy dissolve frame that sits above the low-SAN black vignette during cooldown. */
export function CooldownVignette({ active }: { active: boolean }) {
  if (!active) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden animate-pulse"
      style={{ animationDuration: "1.45s" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse at center, transparent 72%, rgba(112, 213, 255, 0.08) 76%, rgba(91, 196, 255, 0.7) 83%, rgba(181, 239, 255, 0.95) 88%, rgba(72, 167, 224, 0.42) 92%, transparent 97%)",
            "repeating-conic-gradient(from 12deg at 50% 50%, transparent 0deg 9deg, rgba(180, 239, 255, 0.28) 10deg 11deg, transparent 13deg 24deg)",
            "radial-gradient(ellipse at center, transparent 79%, rgba(43, 151, 211, 0.32) 88%, transparent 94%)",
          ].join(", "),
          filter: "blur(1.2px)",
          WebkitMaskImage: "radial-gradient(ellipse at center, transparent 70%, black 80%, black 94%, transparent 100%)",
          maskImage: "radial-gradient(ellipse at center, transparent 70%, black 80%, black 94%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-[1.2%] rounded-[1.5rem]"
        style={{
          border: "1px solid rgba(185, 241, 255, 0.72)",
          boxShadow: "inset 0 0 18px rgba(75, 190, 246, 0.42), 0 0 8px rgba(105, 215, 255, 0.35)",
          opacity: 0.78,
        }}
      />
    </div>
  )
}
