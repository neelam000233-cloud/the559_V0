"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import { CharacterLowPoly } from "@/components/game/character-lowpoly"
import {
  Desk,
  FlyingFolder,
  FileCabinet,
  ComputerDesk,
  CoffeeCup,
  Chair,
  WallFrame,
  Window,
  LightShafts,
} from "@/components/game/office-props"
import { getToonGradientMap } from "@/lib/three-toon"
import { deriveCharacterVisual } from "@/lib/game/character-action"
import { SHAKE_MAGNITUDE, SHAKE_SAN_THRESHOLD } from "@/lib/game/constants"
import type { EffectsIntensity, GameState } from "@/lib/game/types"

/**
 * Continuous nervous tremor tied to the player's SAN: off above the threshold, then
 * ramps up (quadratically) as SAN approaches 0. Layered sines give an organic shake
 * instead of per-frame white noise.
 */
function ScreenShake({
  gameState,
  intensity,
  children,
}: {
  gameState?: GameState
  intensity: EffectsIntensity
  children: React.ReactNode
}) {
  const groupRef = useRef<THREE.Group>(null)
  const strengthRef = useRef(0)

  useFrame(({ clock }, delta) => {
    const group = groupRef.current
    if (!group) return

    const san = gameState?.isRunning ? gameState.fighters.player.san : 100
    const severity = Math.max(0, (SHAKE_SAN_THRESHOLD - san) / SHAKE_SAN_THRESHOLD)
    const target = severity * severity * SHAKE_MAGNITUDE[intensity]
    strengthRef.current = THREE.MathUtils.damp(strengthRef.current, target, 6, delta)

    const s = strengthRef.current
    if (s < 0.0005) {
      group.position.set(0, 0, 0)
      group.rotation.z = 0
      return
    }

    const t = clock.elapsedTime
    const freq = 18 + severity * 22
    group.position.set(
      (Math.sin(t * freq) + Math.sin(t * freq * 1.73 + 1.3) * 0.6) * s,
      (Math.sin(t * freq * 1.31 + 2.1) + Math.sin(t * freq * 2.07) * 0.5) * s,
      0,
    )
    group.rotation.z = Math.sin(t * freq * 0.87 + 0.7) * s * 0.25
  })

  return <group ref={groupRef}>{children}</group>
}

/** Low sun outside the window, raking warm light through the room toward the camera. */
function SunLight() {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const targetRef = useRef<THREE.Object3D>(null)

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current
    }
  }, [])

  return (
    <>
      <directionalLight
        ref={lightRef}
        position={[6.5, 4.3, -1.3]}
        intensity={4.2}
        color="#ff9152"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={16}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0015}
      />
      <object3D ref={targetRef} position={[-0.5, 0.85, -1.3]} />
      {/* cool fill light from the camera side, so the near player isn't a pure black silhouette */}
      <directionalLight position={[0.6, 2.2, 3.4]} intensity={0.55} color="#7a8fd4" />
      {/* warm bounce light over the desk so the folder/props stay readable */}
      <pointLight position={[0, 2.1, -1.3]} intensity={0.9} distance={4.5} decay={2} color="#ffb066" />
      <hemisphereLight args={["#4a3a63", "#241a24", 1.25]} />
      <ambientLight intensity={0.32} color="#3a2a44" />
    </>
  )
}

function RoomShell() {
  const gradientMap = getToonGradientMap()
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshToonMaterial color="#3d3548" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 1.5, -6.1]}>
        <planeGeometry args={[9, 4]} />
        <meshToonMaterial color="#4a3f57" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[-4.5, 1.5, -2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[8, 4]} />
        <meshToonMaterial color="#4f4460" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[4.5, 1.5, -2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[8, 4]} />
        <meshToonMaterial color="#4f4460" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 3.05, -2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 8]} />
        <meshToonMaterial color="#211c28" gradientMap={gradientMap} />
      </mesh>
    </group>
  )
}

export function OfficeSceneContents({
  gameState,
  effectsIntensity = "strong",
}: {
  gameState?: GameState
  effectsIntensity?: EffectsIntensity
}) {
  const playerVisual = gameState
    ? deriveCharacterVisual(gameState.fighters.player, gameState.documentOwner === "player", gameState.now)
    : { pose: "idle-hold" as const, flash: null, flashAt: 0 }
  const opponentVisual = gameState
    ? deriveCharacterVisual(gameState.fighters.opponent, gameState.documentOwner === "opponent", gameState.now)
    : { pose: "idle-wait" as const, flash: null, flashAt: 0 }

  return (
    <>
      <fog attach="fog" args={["#3a2a40", 6, 20]} />

      <SunLight />
      <ScreenShake gameState={gameState} intensity={effectsIntensity}>
      <RoomShell />
      <Window position={[4.2, 0, -1.3]} rotation={[0, -Math.PI / 2, 0]} />
      <LightShafts />

      <Desk />
      <FlyingFolder gameState={gameState} />
      <FileCabinet />
      <ComputerDesk />
      <CoffeeCup />

      <Chair position={[0, 0, 1.1]} rotation={[0, Math.PI, 0]} />
      <Chair position={[0, 0, -3.55]} rotation={[0, 0, 0]} />

      <WallFrame position={[-4.42, 1.9, -1]} rotation={[0, Math.PI / 2, 0]} tone="#c9b98a" />
      <WallFrame position={[-4.42, 1.9, -3.2]} rotation={[0, Math.PI / 2, 0]} tone="#b7c2c9" />
      <WallFrame position={[0, 1.9, -6.0]} tone="#c9b98a" />
      <WallFrame position={[-2.3, 1.9, -6.0]} tone="#b7c2c9" />

      {/* Player A — near the camera, back turned, magenta/pink shirt */}
      <CharacterLowPoly
        position={[0, 0, 0.35]}
        facing={1}
        shirtColor="#d13a7c"
        pantsColor="#241c2b"
        pose={playerVisual.pose}
        flash={playerVisual.flash}
        flashKey={playerVisual.flashAt}
      />

      {/* Player B — across the desk, facing the camera, violet shirt */}
      <CharacterLowPoly
        position={[0.05, 0, -3.0]}
        facing={-1}
        shirtColor="#7a3ad1"
        pantsColor="#201a2b"
        pose={opponentVisual.pose}
        flash={opponentVisual.flash}
        flashKey={opponentVisual.flashAt}
      />
      </ScreenShake>
    </>
  )
}
