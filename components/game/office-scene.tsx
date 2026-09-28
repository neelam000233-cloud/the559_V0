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
import { SHAKE_DECAY_MS, SHAKE_MAGNITUDE } from "@/lib/game/constants"
import type { EffectsIntensity, GameState } from "@/lib/game/types"

/**
 * Nudges its children with a short decaying random offset whenever a fresh hit lands
 * (toss / block / parry), then settles back to rest. Purely a render-side effect —
 * the actual gameplay pause happens in the engine's hitstop window.
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
  const lastHitAtRef = useRef(0)

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    if (gameState) {
      const hitAt = Math.max(gameState.fighters.player.lastActionAt, gameState.fighters.opponent.lastActionAt)
      if (hitAt > lastHitAtRef.current) lastHitAtRef.current = hitAt
    }

    const elapsed = (gameState?.now ?? 0) - lastHitAtRef.current
    if (lastHitAtRef.current > 0 && elapsed >= 0 && elapsed < SHAKE_DECAY_MS) {
      const decay = 1 - elapsed / SHAKE_DECAY_MS
      const magnitude = SHAKE_MAGNITUDE[intensity] * decay
      group.position.set((Math.random() - 0.5) * magnitude, (Math.random() - 0.5) * magnitude, 0)
    } else {
      group.position.set(0, 0, 0)
    }
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
