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
            // Frost gathers at the perimeter while the center stays transparent.
            "radial-gradient(ellipse at center, transparent 68%, rgba(205, 247, 255, 0.05) 72%, rgba(137, 222, 247, 0.18) 78%, rgba(235, 252, 255, 0.88) 86%, rgba(91, 184, 221, 0.55) 91%, transparent 98%)",
            // Uneven crystal blooms imitate the reference image's irregular frozen edge.
            "radial-gradient(ellipse at 4% 8%, rgba(239, 254, 255, 0.95) 0 2%, rgba(125, 215, 244, 0.55) 7%, transparent 19%), radial-gradient(ellipse at 98% 16%, rgba(225, 251, 255, 0.9) 0 3%, rgba(101, 194, 229, 0.5) 8%, transparent 21%), radial-gradient(ellipse at 9% 94%, rgba(231, 252, 255, 0.92) 0 3%, rgba(98, 195, 230, 0.52) 9%, transparent 23%), radial-gradient(ellipse at 93% 91%, rgba(220, 249, 255, 0.88) 0 3%, rgba(87, 183, 219, 0.5) 9%, transparent 22%)",
            // Fine branching crystal streaks.
            "repeating-conic-gradient(from 8deg at 50% 50%, transparent 0deg 7deg, rgba(236, 253, 255, 0.48) 8deg 9deg, transparent 10deg 17deg, rgba(86, 178, 218, 0.24) 18deg 19deg, transparent 20deg 31deg)",
          ].join(", "),
          filter: "blur(1.35px) contrast(1.12)",
          WebkitMaskImage: "radial-gradient(ellipse at center, transparent 66%, rgba(0,0,0,0.35) 73%, black 82%, black 94%, transparent 100%)",
          maskImage: "radial-gradient(ellipse at center, transparent 66%, rgba(0,0,0,0.35) 73%, black 82%, black 94%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-[1.6%] rounded-[1.25rem]"
        style={{
          border: "1px solid rgba(220, 250, 255, 0.62)",
          boxShadow: "inset 0 0 13px rgba(111, 211, 244, 0.3), 0 0 10px rgba(121, 220, 255, 0.24)",
          opacity: 0.68,
        }}
      />
    </div>
  )
}
