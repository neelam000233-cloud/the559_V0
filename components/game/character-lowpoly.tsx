"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { Outlines } from "@react-three/drei"
import { getToonGradientMap, OUTLINE_COLOR } from "@/lib/three-toon"
import type { CharacterFlash, CharacterPose, FaceExpression } from "@/lib/game/character-action"
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
} & React.JSX.IntrinsicElements["mesh"]) {
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

/**
 * Face rig parameters, all eased toward every frame.
 * Brow angle: positive = angry (inner ends down), negative = worried (inner ends up).
 * Mouth curve: positive = smile, negative = frown.
 */
interface FaceTarget {
  eyeOpen: number
  eyeWide: number
  browYL: number
  browYR: number
  browAL: number
  browAR: number
  mouthCurve: number
  mouthWidth: number
  mouthOpen: number
  mouthTilt: number
  /** How strongly the open mouth chatters (shouting / yelping). */
  jitter: number
  sweat: number
}

const FACE_TARGETS: Record<FaceExpression, FaceTarget> = {
  neutral: { eyeOpen: 1, eyeWide: 1, browYL: 0, browYR: 0, browAL: 0, browAR: 0, mouthCurve: 0.1, mouthWidth: 0.8, mouthOpen: 0, mouthTilt: 0, jitter: 0, sweat: 0 },
  smug: { eyeOpen: 0.6, eyeWide: 1, browYL: 0, browYR: 0.008, browAL: 0.12, browAR: -0.1, mouthCurve: 0.7, mouthWidth: 0.9, mouthOpen: 0, mouthTilt: 0.22, jitter: 0, sweat: 0 },
  focused: { eyeOpen: 0.55, eyeWide: 1, browYL: -0.006, browYR: -0.006, browAL: 0.5, browAR: 0.5, mouthCurve: -0.05, mouthWidth: 0.7, mouthOpen: 0, mouthTilt: 0, jitter: 0, sweat: 0 },
  bracing: { eyeOpen: 0.18, eyeWide: 1, browYL: 0.006, browYR: 0.006, browAL: -0.4, browAR: -0.4, mouthCurve: -0.5, mouthWidth: 1, mouthOpen: 0.25, mouthTilt: 0, jitter: 0, sweat: 1 },
  sly: { eyeOpen: 0.7, eyeWide: 1, browYL: 0, browYR: 0.01, browAL: 0.3, browAR: -0.15, mouthCurve: 0.9, mouthWidth: 1, mouthOpen: 0, mouthTilt: -0.25, jitter: 0, sweat: 0 },
  grin: { eyeOpen: 0.85, eyeWide: 1, browYL: 0, browYR: 0, browAL: 0.25, browAR: 0.25, mouthCurve: 1, mouthWidth: 1.15, mouthOpen: 0.4, mouthTilt: 0, jitter: 0, sweat: 0 },
  wide: { eyeOpen: 1.35, eyeWide: 1.15, browYL: 0.012, browYR: 0.012, browAL: -0.1, browAR: -0.1, mouthCurve: 0, mouthWidth: 0.5, mouthOpen: 0.7, mouthTilt: 0, jitter: 0, sweat: 0 },
  shocked: { eyeOpen: 1.4, eyeWide: 1.2, browYL: 0.012, browYR: 0.012, browAL: -0.25, browAR: -0.25, mouthCurve: -0.1, mouthWidth: 0.55, mouthOpen: 0.8, mouthTilt: 0, jitter: 0, sweat: 0.6 },
  shout: { eyeOpen: 0.75, eyeWide: 1, browYL: -0.005, browYR: -0.005, browAL: 0.6, browAR: 0.6, mouthCurve: -0.25, mouthWidth: 1.1, mouthOpen: 0.9, mouthTilt: 0, jitter: 1, sweat: 0 },
  triumph: { eyeOpen: 0.22, eyeWide: 1, browYL: 0.01, browYR: 0.01, browAL: 0.1, browAR: 0.1, mouthCurve: 1, mouthWidth: 1.25, mouthOpen: 0.55, mouthTilt: 0, jitter: 0, sweat: 0 },
  relieved: { eyeOpen: 0.9, eyeWide: 1, browYL: 0.004, browYR: 0.004, browAL: -0.2, browAR: -0.2, mouthCurve: 0.5, mouthWidth: 0.9, mouthOpen: 0, mouthTilt: 0.1, jitter: 0, sweat: 0.5 },
  pain: { eyeOpen: 0.1, eyeWide: 1, browYL: 0.008, browYR: 0.008, browAL: -0.65, browAR: -0.65, mouthCurve: -0.9, mouthWidth: 1, mouthOpen: 0.65, mouthTilt: 0, jitter: 0.6, sweat: 1 },
  frustrated: { eyeOpen: 0.6, eyeWide: 1, browYL: -0.008, browYR: -0.008, browAL: 0.7, browAR: 0.7, mouthCurve: -0.7, mouthWidth: 0.95, mouthOpen: 0.15, mouthTilt: -0.1, jitter: 0, sweat: 0 },
  nervous: { eyeOpen: 1.1, eyeWide: 1, browYL: 0.004, browYR: 0.004, browAL: -0.35, browAR: -0.35, mouthCurve: -0.3, mouthWidth: 0.7, mouthOpen: 0.1, mouthTilt: 0, jitter: 0, sweat: 0.8 },
}

const FACE_KEYS = Object.keys(FACE_TARGETS.neutral) as (keyof FaceTarget)[]

const BROW_BASE_Y = 0.035
const MOUTH_Y = -0.095
const EYE_X = 0.08
const EYE_Y = -0.015

interface CharacterProps {
  position: [number, number, number]
  /** 1 = model faces -Z (forward into the room), -1 = faces +Z */
  facing: 1 | -1
  shirtColor: string
  skinColor?: string
  hairColor?: string
  pantsColor?: string
  pose?: CharacterPose
  expression?: FaceExpression
  /** -1..1 horizontal eye direction. */
  lookX?: number
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
  expression = "neutral",
  lookX = 0,
  flash = null,
  flashKey = 0,
  feintVariant = null,
  feintProgress = null,
}: CharacterProps) {
  const rotY = facing === 1 ? 0 : Math.PI

  const eyeLRef = useRef<THREE.Mesh>(null)
  const eyeRRef = useRef<THREE.Mesh>(null)
  const browLRef = useRef<THREE.Mesh>(null)
  const browRRef = useRef<THREE.Mesh>(null)
  const mouthGroupRef = useRef<THREE.Group>(null)
  const mouthArcRef = useRef<THREE.Mesh>(null)
  const mouthOpenRef = useRef<THREE.Mesh>(null)
  const sweatRef = useRef<THREE.Mesh>(null)
  const faceRef = useRef<FaceTarget>({ ...FACE_TARGETS.neutral })
  const lookRef = useRef(0)

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

  useFrame((state, delta) => {
    const faceTarget = FACE_TARGETS[expression]
    const face = faceRef.current
    const faceK = 1 - Math.exp(-delta * 18)
    for (const key of FACE_KEYS) face[key] += (faceTarget[key] - face[key]) * faceK
    lookRef.current += (lookX - lookRef.current) * faceK

    const t = state.clock.elapsedTime
    const eyeScaleY = Math.max(0.12, face.eyeOpen) * 1.2
    const eyeScaleX = face.eyeWide * 1.2
    if (eyeLRef.current) {
      eyeLRef.current.position.x = -EYE_X + lookRef.current * 0.022
      eyeLRef.current.scale.set(eyeScaleX, eyeScaleY, 1)
    }
    if (eyeRRef.current) {
      eyeRRef.current.position.x = EYE_X + lookRef.current * 0.022
      eyeRRef.current.scale.set(eyeScaleX, eyeScaleY, 1)
    }
    // Inner ends sit toward the nose: the left brow's inner end is +x, the right brow's is -x.
    if (browLRef.current) {
      browLRef.current.position.y = BROW_BASE_Y + face.browYL
      browLRef.current.rotation.z = -face.browAL
    }
    if (browRRef.current) {
      browRRef.current.position.y = BROW_BASE_Y + face.browYR
      browRRef.current.rotation.z = face.browAR
    }
    if (mouthGroupRef.current) mouthGroupRef.current.rotation.z = face.mouthTilt
    if (mouthArcRef.current) {
      // Negative scale flips the arc into a frown while its endpoints stay pinned to the mouth line.
      const curve = Math.sign(face.mouthCurve || 1) * Math.max(0.06, Math.abs(face.mouthCurve))
      mouthArcRef.current.scale.set(face.mouthWidth, curve, 1)
    }
    if (mouthOpenRef.current) {
      const open = Math.max(0, face.mouthOpen + Math.sin(t * 26) * 0.12 * face.jitter * face.mouthOpen)
      mouthOpenRef.current.visible = open > 0.04
      mouthOpenRef.current.scale.set(face.mouthWidth * 0.85, Math.max(0.01, open), 1)
      mouthOpenRef.current.position.y = -0.02 * open
    }
    if (sweatRef.current) {
      sweatRef.current.visible = face.sweat > 0.08
      sweatRef.current.scale.setScalar(face.sweat)
      sweatRef.current.position.y = -0.01 - ((t * 0.7) % 1) * 0.09
    }

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

          {/* animated face: comic eyes, brows, mouth and a sweat drop driven by the expression rig */}
          <mesh ref={eyeLRef} position={[-EYE_X, EYE_Y, -0.2]}>
            <sphereGeometry args={[0.025, 10, 8]} />
            <meshBasicMaterial color="#160b14" />
          </mesh>
          <mesh ref={eyeRRef} position={[EYE_X, EYE_Y, -0.2]}>
            <sphereGeometry args={[0.025, 10, 8]} />
            <meshBasicMaterial color="#160b14" />
          </mesh>

          <mesh ref={browLRef} position={[-EYE_X, BROW_BASE_Y, -0.205]}>
            <boxGeometry args={[0.075, 0.016, 0.02]} />
            <meshBasicMaterial color={hairColor} />
          </mesh>
          <mesh ref={browRRef} position={[EYE_X, BROW_BASE_Y, -0.205]}>
            <boxGeometry args={[0.075, 0.016, 0.02]} />
            <meshBasicMaterial color={hairColor} />
          </mesh>

          <group ref={mouthGroupRef} position={[0, MOUTH_Y, -0.2]}>
            <mesh ref={mouthOpenRef} position={[0, 0, 0]} visible={false}>
              <circleGeometry args={[0.05, 14]} />
              <meshBasicMaterial color="#3a0f1a" side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={mouthArcRef} position={[0, 0, -0.004]} rotation={[0, 0, Math.PI]}>
              <torusGeometry args={[0.06, 0.011, 6, 16, Math.PI]} />
              <meshBasicMaterial color="#160b14" side={THREE.DoubleSide} />
            </mesh>
          </group>

          <mesh ref={sweatRef} position={[0.19, -0.01, -0.12]} visible={false}>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshBasicMaterial color="#8fd8ff" />
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
