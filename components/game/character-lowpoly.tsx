"use client"

import { Outlines } from "@react-three/drei"
import { getToonGradientMap, OUTLINE_COLOR } from "@/lib/three-toon"

/** A single low-poly body part: toon-shaded solid + thick inflated-hull outline. */
function ToonPart({
  color,
  outlineThickness = 0.045,
  children,
  ...meshProps
}: {
  color: string
  outlineThickness?: number
  children: React.ReactNode
} & JSX.IntrinsicElements["mesh"]) {
  return (
    <mesh castShadow receiveShadow {...meshProps}>
      {children}
      <meshToonMaterial color={color} gradientMap={getToonGradientMap()} />
      <Outlines thickness={outlineThickness} color={OUTLINE_COLOR} />
    </mesh>
  )
}

interface CharacterProps {
  position: [number, number, number]
  /** 1 = model faces -Z (forward into the room), -1 = faces +Z */
  facing: 1 | -1
  shirtColor: string
  skinColor?: string
  hairColor?: string
  pantsColor?: string
}

export function CharacterLowPoly({
  position,
  facing,
  shirtColor,
  skinColor = "#e3a878",
  hairColor = "#241a16",
  pantsColor = "#231e2b",
}: CharacterProps) {
  const rotY = facing === 1 ? 0 : Math.PI
  const armPitch = 1.05

  return (
    <group position={position} rotation={[0, rotY, 0]}>
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

      {/* torso */}
      <ToonPart color={shirtColor} position={[0, 1.05, 0]}>
        <capsuleGeometry args={[0.28, 0.5, 4, 8]} />
      </ToonPart>

      {/* head */}
      <ToonPart color={skinColor} outlineThickness={0.035} position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.22, 14, 12]} />
      </ToonPart>

      {/* hair cap */}
      <ToonPart color={hairColor} outlineThickness={0.032} position={[0, 1.72, -0.01]}>
        <sphereGeometry args={[0.225, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      </ToonPart>

      {/* face marks: simple bold comic eyes */}
      <mesh position={[-0.08, 1.63, -0.2]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#160b14" />
      </mesh>
      <mesh position={[0.08, 1.63, -0.2]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#160b14" />
      </mesh>

      {/* left arm reaching forward toward the desk */}
      <group position={[-0.32, 1.42, 0]} rotation={[armPitch, 0, 0.12]}>
        <ToonPart color={shirtColor} position={[0, -0.28, 0]}>
          <capsuleGeometry args={[0.095, 0.46, 4, 8]} />
        </ToonPart>
        <ToonPart color={skinColor} outlineThickness={0.03} position={[0, -0.56, 0]}>
          <sphereGeometry args={[0.1, 10, 8]} />
        </ToonPart>
      </group>

      {/* right arm reaching forward toward the desk */}
      <group position={[0.32, 1.42, 0]} rotation={[armPitch, 0, -0.12]}>
        <ToonPart color={shirtColor} position={[0, -0.28, 0]}>
          <capsuleGeometry args={[0.095, 0.46, 4, 8]} />
        </ToonPart>
        <ToonPart color={skinColor} outlineThickness={0.03} position={[0, -0.56, 0]}>
          <sphereGeometry args={[0.1, 10, 8]} />
        </ToonPart>
      </group>
    </group>
  )
}
