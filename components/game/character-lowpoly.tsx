"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { Outlines } from "@react-three/drei"
import { getToonGradientMap, OUTLINE_COLOR } from "@/lib/three-toon"
import type { CharacterFlash, CharacterPose } from "@/lib/game/character-action"
import { feintMotion, ZERO_FEINT_MOTION, type FeintMotion } from "@/lib/game/feint-motion"
import type { FeintVariant } from "@/lib/game/types"

const FEINT_KEYS = Object.keys(ZERO_FEINT_MOTION) as (keyof FeintMotion)[]

/** A single low-poly body part: toon-shaded solid + thick inflated-hull outline. */
function ToonPart({
  color,
  outlineThickness = 0.045,
  outlineColor = OUTLINE_COLOR,
  children,
  ...meshProps
}: {
  color: string
  outlineThickness?: number
  outlineColor?: string
  children: React.ReactNode
} & JSX.IntrinsicElements["mesh"]) {
  return (
    <mesh castShadow receiveShadow {...meshProps}>
      {children}
      <meshToonMaterial color={color} gradientMap={getToonGradientMap()} />
      <Outlines thickness={outlineThickness} color={outlineColor} />
    </mesh>
  )
}

/** Quick, camera-facing burst of color that pops and fades — combat feedback "juice". */
function ImpactBurst({ elapsed, duration, color }: { elapsed: number; duration: number; color: string }) {
  if (elapsed >= duration) return null
  const t = elapsed / duration
  const scale = 0.22 + t * 0.55
  const opacity = 1 - t
  return (
    <mesh position={[0, 1.4, -0.24]} scale={scale}>
      <ringGeometry args={[0.55, 1, 20]} />
      <meshBasicMaterial color={color} transparent opacity={opacity * 0.85} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

const FLASH_COLOR: Record<Exclude<CharacterFlash, null>, string> = {
  toss: "#ffb347",
  parry: "#ffe066",
  block: "#7fd4ff",
  hit: "#ff5a5a",
}

const FLASH_DURATION_MS = 320

/** Hip height: the upper body pivots here so forward lean carries the head and arms with it. */
const HIP_Y = 0.84

interface PoseTarget {
  armPitch: number
  armSpread: number
  /** Whole upper body pitch at the hips; negative leans toward the opponent. */
  bodyLean: number
  elbow: number
  headTilt: number
}

/** Target local rotations/offsets per pose, lerped toward every frame for a snappy but smooth feel. */
const POSE_TARGETS: Record<CharacterPose, PoseTarget> = {
  "idle-hold": { armPitch: 0.95, armSpread: 0.12, bodyLean: -0.06, elbow: 0.45, headTilt: 0 },
  "idle-wait": { armPitch: 1.1, armSpread: 0.05, bodyLean: -0.03, elbow: 0.35, headTilt: 0 },
  "guard-parry": { armPitch: 0.7, armSpread: 0.32, bodyLean: -0.3, elbow: 1.35, headTilt: -0.05 },
  "guard-block": { armPitch: 0.9, armSpread: 0.22, bodyLean: -0.2, elbow: 1.55, headTilt: 0.06 },
  // Feints are driven by additive per-variant curves (see feint-motion.ts), so the base stays at the hold pose.
  feint: { armPitch: 0.95, armSpread: 0.12, bodyLean: -0.06, elbow: 0.45, headTilt: 0 },
}

const POSE_KEYS = Object.keys(POSE_TARGETS["idle-hold"]) as (keyof PoseTarget)[]

interface CharacterProps {
  position: [number, number, number]
  /** 1 = model faces -Z (forward into the room), -1 = faces +Z */
  facing: 1 | -1
  shirtColor: string
  skinColor?: string
  hairColor?: string
  pantsColor?: string
  pose?: CharacterPose
  flash?: CharacterFlash
  /** Changes whenever a new flash should retrigger (engine timestamp of the event). */
  flashKey?: number
  feintVariant?: FeintVariant | null
  feintProgress?: number | null
}

export function CharacterLowPoly({
  position,
  facing,
  shirtColor,
  skinColor = "#e3a878",
  hairColor = "#241a16",
  pantsColor = "#231e2b",
  pose = "idle-hold",
  flash = null,
  flashKey = 0,
  feintVariant = null,
  feintProgress = null,
}: CharacterProps) {
  const rotY = facing === 1 ? 0 : Math.PI

  const torsoRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const leftForearmRef = useRef<THREE.Group>(null)
  const rightForearmRef = useRef<THREE.Group>(null)
  const lungeRef = useRef<THREE.Group>(null)
  const upperBodyRef = useRef<THREE.Group>(null)
  const feintRef = useRef<FeintMotion>({ ...ZERO_FEINT_MOTION })

  const poseRef = useRef<PoseTarget>({ ...POSE_TARGETS["idle-hold"] })
  const flashElapsedRef = useRef(FLASH_DURATION_MS)
  const activeFlash = useRef<CharacterFlash>(null)
  const lastFlashKey = useRef(flashKey)

  if (flashKey !== lastFlashKey.current && flash) {
    lastFlashKey.current = flashKey
    flashElapsedRef.current = 0
    activeFlash.current = flash
  }

  const outlineColorRef = useRef(OUTLINE_COLOR)

  useFrame((_, delta) => {
    const target = POSE_TARGETS[pose]
    const lerpSpeed = pose === "feint" || pose === "guard-parry" ? 14 : 8
    const k = Math.min(1, delta * lerpSpeed)
    for (const key of POSE_KEYS) poseRef.current[key] += (target[key] - poseRef.current[key]) * k

    // Feint curves are already eased; a fast follow just hides the pop when a feint is cancelled by a real toss.
    const targetFeint = feintVariant && feintProgress !== null ? feintMotion(feintVariant, feintProgress) : ZERO_FEINT_MOTION
    const fk = 1 - Math.exp(-delta * 28)
    const m = feintRef.current
    for (const key of FEINT_KEYS) m[key] += (targetFeint[key] - m[key]) * fk

    let punch = 0
    if (flashElapsedRef.current < FLASH_DURATION_MS) {
      flashElapsedRef.current += delta * 1000
      const t = Math.min(1, flashElapsedRef.current / FLASH_DURATION_MS)
      // Toss attackers get a forward lunge punch that snaps out then eases back.
      if (activeFlash.current === "toss") punch = Math.sin(t * Math.PI) * 0.16
      const flashColor = activeFlash.current ? FLASH_COLOR[activeFlash.current] : OUTLINE_COLOR
      outlineColorRef.current = mixHexColors(flashColor, OUTLINE_COLOR, 1 - t)
    }

    const p = poseRef.current
    // Throw lunge: upper body pitches hard over the desk while the elbows whip from bent to extended.
    const lean = p.bodyLean + m.torsoLean - punch * 2.4
    const elbow = Math.max(0, p.elbow + m.elbow - punch * 2.5)
    const throwElbow = elbow + m.throwArm * 0.6

    if (leftArmRef.current) leftArmRef.current.rotation.set(p.armPitch + m.armPitch, 0, p.armSpread + m.armSpread)
    if (rightArmRef.current)
      rightArmRef.current.rotation.set(p.armPitch + m.armPitch + m.throwArm, 0, -(p.armSpread + m.armSpread))
    if (leftForearmRef.current) leftForearmRef.current.rotation.x = elbow
    if (rightForearmRef.current) rightForearmRef.current.rotation.x = throwElbow
    // A little extra spine curl on top of the hip pivot keeps the lean from looking like a rigid plank.
    if (torsoRef.current) torsoRef.current.rotation.x = lean * 0.25
    // Head counter-rotates so the eyes stay on the opponent while leaning.
    if (headRef.current) headRef.current.rotation.x = p.headTilt - lean * 0.55
    if (upperBodyRef.current) {
      upperBodyRef.current.position.y = HIP_Y + m.crouchY
      upperBodyRef.current.rotation.set(lean, -m.twist, 0)
    }
    if (lungeRef.current) {
      lungeRef.current.position.x = m.shiftX
      lungeRef.current.position.z = -(punch + m.forward)
    }
  })

  const rimColor = outlineColorRef.current
  const showBurst = flashElapsedRef.current < FLASH_DURATION_MS && !!activeFlash.current
  const burstColor = activeFlash.current ? FLASH_COLOR[activeFlash.current] : "#ffffff"

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <group ref={lungeRef}>
        {/* legs */}
        <ToonPart color={pantsColor} position={[-0.14, 0.42, 0]}>
          <boxGeometry args={[0.17, 0.84, 0.22]} />
        </ToonPart>
        <ToonPart color={pantsColor} position={[0.14, 0.42, 0]}>
          <boxGeometry args={[0.17, 0.84, 0.22]} />
        </ToonPart>

        {/* shoes */}
        <ToonPart color="#141018" outlineThickness={0.03} position={[-0.14, 0.06, 0.03]}>
          <boxGeometry args={[0.19, 0.12, 0.32]} />
        </ToonPart>
        <ToonPart color="#141018" outlineThickness={0.03} position={[0.14, 0.06, 0.03]}>
          <boxGeometry args={[0.19, 0.12, 0.32]} />
        </ToonPart>

        {/* upper body: crouches and twists as one unit during feints */}
        <group ref={upperBodyRef} position={[0, HIP_Y, 0]}>
        <group position={[0, -HIP_Y, 0]}>
        {/* torso (leans with pose, rim-flashes on combat events) */}
        <group ref={torsoRef} position={[0, 1.05, 0]}>
          <ToonPart color={shirtColor} outlineColor={rimColor} position={[0, 0, 0]}>
            <capsuleGeometry args={[0.28, 0.5, 4, 8]} />
          </ToonPart>
        </group>

        {/* head */}
        <group ref={headRef} position={[0, 1.62, 0]}>
          <ToonPart color={skinColor} outlineThickness={0.035} outlineColor={rimColor} position={[0, 0, 0]}>
            <sphereGeometry args={[0.22, 14, 12]} />
          </ToonPart>

          {/* hair cap */}
          <ToonPart color={hairColor} outlineThickness={0.032} position={[0, 0.1, -0.01]}>
            <sphereGeometry args={[0.225, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          </ToonPart>

          {/* face marks: simple bold comic eyes */}
          <mesh position={[-0.08, 0.01, -0.2]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color="#160b14" />
          </mesh>
          <mesh position={[0.08, 0.01, -0.2]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color="#160b14" />
          </mesh>
        </group>

        {/* left arm: shoulder -> upper arm -> elbow joint -> forearm -> hand */}
        <group ref={leftArmRef} position={[-0.32, 1.42, 0]} rotation={[0.95, 0, 0.12]}>
          <ToonPart color={shirtColor} position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.095, 0.2, 4, 8]} />
          </ToonPart>
          <group ref={leftForearmRef} position={[0, -0.3, 0]}>
            <ToonPart color={shirtColor} position={[0, -0.13, 0]}>
              <capsuleGeometry args={[0.088, 0.18, 4, 8]} />
            </ToonPart>
            <ToonPart color={skinColor} outlineThickness={0.03} position={[0, -0.3, 0]}>
              <sphereGeometry args={[0.1, 10, 8]} />
            </ToonPart>
          </group>
        </group>

        {/* right (throwing) arm */}
        <group ref={rightArmRef} position={[0.32, 1.42, 0]} rotation={[0.95, 0, -0.12]}>
          <ToonPart color={shirtColor} position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.095, 0.2, 4, 8]} />
          </ToonPart>
          <group ref={rightForearmRef} position={[0, -0.3, 0]}>
            <ToonPart color={shirtColor} position={[0, -0.13, 0]}>
              <capsuleGeometry args={[0.088, 0.18, 4, 8]} />
            </ToonPart>
            <ToonPart color={skinColor} outlineThickness={0.03} position={[0, -0.3, 0]}>
              <sphereGeometry args={[0.1, 10, 8]} />
            </ToonPart>
          </group>
        </group>
        </group>
        </group>

        {showBurst && <ImpactBurst elapsed={flashElapsedRef.current} duration={FLASH_DURATION_MS} color={burstColor} />}
      </group>
    </group>
  )
}

function mixHexColors(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a)
  const cb = new THREE.Color(b)
  return `#${ca.lerp(cb, 1 - t).getHexString()}`
}
