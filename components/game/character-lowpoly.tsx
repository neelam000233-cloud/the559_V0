"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { Outlines } from "@react-three/drei"
import { getToonGradientMap, OUTLINE_COLOR } from "@/lib/three-toon"
import type { CharacterFlash, CharacterPose } from "@/lib/game/character-action"

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

/** Target local rotations/offsets per pose, lerped toward every frame for a snappy but smooth feel. */
const POSE_TARGETS: Record<
  CharacterPose,
  { armPitch: number; armSpread: number; torsoLean: number; headTilt: number }
> = {
  "idle-hold": { armPitch: 1.05, armSpread: 0.12, torsoLean: 0, headTilt: 0 },
  "idle-wait": { armPitch: 1.3, armSpread: 0.05, torsoLean: 0.03, headTilt: 0 },
  "guard-parry": { armPitch: 0.55, armSpread: 0.32, torsoLean: -0.09, headTilt: -0.05 },
  "guard-block": { armPitch: 0.85, armSpread: 0.22, torsoLean: 0.14, headTilt: 0.06 },
  feint: { armPitch: 0.35, armSpread: 0.4, torsoLean: -0.14, headTilt: -0.08 },
}

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
}: CharacterProps) {
  const rotY = facing === 1 ? 0 : Math.PI

  const torsoRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const lungeRef = useRef<THREE.Group>(null)

  const poseRef = useRef({ armPitch: 1.05, armSpread: 0.12, torsoLean: 0, headTilt: 0 })
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
    poseRef.current.armPitch += (target.armPitch - poseRef.current.armPitch) * k
    poseRef.current.armSpread += (target.armSpread - poseRef.current.armSpread) * k
    poseRef.current.torsoLean += (target.torsoLean - poseRef.current.torsoLean) * k
    poseRef.current.headTilt += (target.headTilt - poseRef.current.headTilt) * k

    if (leftArmRef.current) leftArmRef.current.rotation.set(poseRef.current.armPitch, 0, poseRef.current.armSpread)
    if (rightArmRef.current) rightArmRef.current.rotation.set(poseRef.current.armPitch, 0, -poseRef.current.armSpread)
    if (torsoRef.current) torsoRef.current.rotation.x = poseRef.current.torsoLean
    if (headRef.current) headRef.current.rotation.x = poseRef.current.headTilt

    if (flashElapsedRef.current < FLASH_DURATION_MS) {
      flashElapsedRef.current += delta * 1000
      // Toss attackers get a forward lunge punch that snaps out then eases back.
      if (lungeRef.current && activeFlash.current === "toss") {
        const t = Math.min(1, flashElapsedRef.current / FLASH_DURATION_MS)
        const punch = Math.sin(t * Math.PI) * 0.16
        lungeRef.current.position.z = -punch
      }
      const t = Math.min(1, flashElapsedRef.current / FLASH_DURATION_MS)
      const flashColor = activeFlash.current ? FLASH_COLOR[activeFlash.current] : OUTLINE_COLOR
      const mix = 1 - t
      outlineColorRef.current = mixHexColors(flashColor, OUTLINE_COLOR, mix)
    } else if (lungeRef.current) {
      lungeRef.current.position.z = 0
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

        {/* left arm reaching forward toward the desk */}
        <group ref={leftArmRef} position={[-0.32, 1.42, 0]} rotation={[1.05, 0, 0.12]}>
          <ToonPart color={shirtColor} position={[0, -0.28, 0]}>
            <capsuleGeometry args={[0.095, 0.46, 4, 8]} />
          </ToonPart>
          <ToonPart color={skinColor} outlineThickness={0.03} position={[0, -0.56, 0]}>
            <sphereGeometry args={[0.1, 10, 8]} />
          </ToonPart>
        </group>

        {/* right arm reaching forward toward the desk */}
        <group ref={rightArmRef} position={[0.32, 1.42, 0]} rotation={[1.05, 0, -0.12]}>
          <ToonPart color={shirtColor} position={[0, -0.28, 0]}>
            <capsuleGeometry args={[0.095, 0.46, 4, 8]} />
          </ToonPart>
          <ToonPart color={skinColor} outlineThickness={0.03} position={[0, -0.56, 0]}>
            <sphereGeometry args={[0.1, 10, 8]} />
          </ToonPart>
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
