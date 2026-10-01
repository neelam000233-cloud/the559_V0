"use client"

import { useRef } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import { Edges } from "@react-three/drei"
import { getToonGradientMap } from "@/lib/three-toon"
import { feintDocWorldOffset, fighterFeintMotion } from "@/lib/game/feint-motion"
import type { DocumentEventKind, GameState, PlayerId } from "@/lib/game/types"

/** A hard-surface prop piece: toon-shaded solid + crisp comic-book edge lines. */
function PropMesh({
  color,
  edgeColor = "#160b14",
  edgeThreshold = 8,
  children,
  emissive,
  ...meshProps
}: {
  color: string
  edgeColor?: string
  edgeThreshold?: number
  emissive?: boolean
  children: React.ReactNode
} & JSX.IntrinsicElements["mesh"]) {
  return (
    <mesh castShadow receiveShadow {...meshProps}>
      {children}
      {emissive ? (
        <meshBasicMaterial color={color} toneMapped={false} />
      ) : (
        <meshToonMaterial color={color} gradientMap={getToonGradientMap()} />
      )}
      <Edges threshold={edgeThreshold} color={edgeColor} />
    </mesh>
  )
}

/** The central desk both characters fight across. */
export function Desk({ position = [0, 0, -1.3] as [number, number, number] }) {
  return (
    <group position={position}>
      <PropMesh color="#6b4530" position={[0, 0.72, 0]}>
        <boxGeometry args={[1.9, 0.08, 1.5]} />
      </PropMesh>
      {[
        [-0.85, -0.65],
        [0.85, -0.65],
        [-0.85, 0.65],
        [0.85, 0.65],
      ].map(([x, z], i) => (
        <PropMesh key={i} color="#3f2719" position={[x, 0.34, z]}>
          <boxGeometry args={[0.1, 0.68, 0.1]} />
        </PropMesh>
      ))}
      <PropMesh color="#503321" position={[-0.85, 0.4, 0]}>
        <boxGeometry args={[0.06, 0.5, 1.3]} />
      </PropMesh>
      <PropMesh color="#503321" position={[0.85, 0.4, 0]}>
        <boxGeometry args={[0.06, 0.5, 1.3]} />
      </PropMesh>
    </group>
  )
}

/** File folder held between the two hands, above the desk center. */
export function Folder({ position = [0, 1.32, -1.3] as [number, number, number] }) {
  return (
    <group position={position} rotation={[0.1, 0, 0]}>
      <PropMesh color="#e2c589" edgeColor="#4a3417">
        <boxGeometry args={[0.32, 0.24, 0.02]} />
      </PropMesh>
      <PropMesh color="#c9a86b" edgeColor="#4a3417" position={[0, 0.01, 0.011]}>
        <boxGeometry args={[0.3, 0.08, 0.005]} />
      </PropMesh>
    </group>
  )
}

type Vec3 = [number, number, number]

/**
 * Held positions sit off each fighter's hand on the camera side, so the folder is never
 * hidden behind the near player's head (the old centered spot sat right on that sightline).
 */
const DOCUMENT_HOLD_POSITION: Record<PlayerId, Vec3> = {
  player: [0.44, 1.12, -0.55],
  opponent: [0.3, 1.22, -2.35],
}
const DOCUMENT_HOLD_ROTATION: Record<PlayerId, Vec3> = {
  player: [-0.45, -0.2, 0.06],
  opponent: [-0.2, 0.25, -0.05],
}

const FLIGHT: Record<DocumentEventKind, { durationMs: number; arc: number; spins: number }> = {
  toss: { durationMs: 400, arc: 0.6, spins: 1.5 },
  block: { durationMs: 440, arc: 0.35, spins: 0.75 },
  parry: { durationMs: 380, arc: 0.45, spins: 1 },
}

interface ActiveFlight {
  kind: DocumentEventKind
  start: Vec3
  startRot: Vec3
  /** For a parry the folder heads toward the defender, then snaps back to the attacker. */
  turnaround: Vec3 | null
  end: PlayerId
  elapsedMs: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpVec3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

function holdTarget(state: GameState, owner: PlayerId, time: number): Vec3 {
  const base = DOCUMENT_HOLD_POSITION[owner]
  const [ox, oy, oz] = feintDocWorldOffset(fighterFeintMotion(state, owner), owner)
  const bob = Math.sin(time * 2.4 + (owner === "player" ? 0 : 1.7)) * 0.015
  return [base[0] + ox, base[1] + oy + bob, base[2] + oz]
}

/**
 * The folder both fighters fight over. Each engine document event is animated exactly once,
 * in real time, starting from wherever the folder currently is — so rapid exchanges, feint
 * cancels, and hitstop never make it teleport.
 */
export function FlyingFolder({ gameState }: { gameState?: GameState }) {
  const groupRef = useRef<THREE.Group>(null)
  const flightRef = useRef<ActiveFlight | null>(null)
  const lastEventIdRef = useRef(0)

  useFrame(({ clock }, delta) => {
    const group = groupRef.current
    if (!group) return

    if (!gameState) {
      group.position.set(...DOCUMENT_HOLD_POSITION.player)
      group.rotation.set(...DOCUMENT_HOLD_ROTATION.player)
      return
    }

    const event = gameState.documentEvent
    if (!event) {
      flightRef.current = null
    } else if (event.id !== lastEventIdRef.current) {
      lastEventIdRef.current = event.id
      flightRef.current = {
        kind: event.kind,
        start: [group.position.x, group.position.y, group.position.z],
        startRot: [group.rotation.x, group.rotation.y, group.rotation.z],
        turnaround: event.kind === "parry" ? lerpVec3(group.position.toArray() as Vec3, DOCUMENT_HOLD_POSITION[event.to], 0.72) : null,
        end: event.kind === "parry" ? event.from : event.to,
        elapsedMs: 0,
      }
    }

    const flight = flightRef.current
    if (flight) {
      if (gameState.hitstopRemainingMs <= 0) flight.elapsedMs += delta * 1000
      const cfg = FLIGHT[flight.kind]
      const t = Math.min(1, flight.elapsedMs / cfg.durationMs)
      const endPos = holdTarget(gameState, flight.end, clock.elapsedTime)
      const endRot = DOCUMENT_HOLD_ROTATION[flight.end]

      let pos: Vec3
      if (flight.turnaround) {
        const out = 0.45
        pos =
          t < out
            ? lerpVec3(flight.start, flight.turnaround, easeInOutQuad(t / out))
            : lerpVec3(flight.turnaround, endPos, easeInOutQuad((t - out) / (1 - out)))
      } else {
        pos = lerpVec3(flight.start, endPos, easeInOutQuad(t))
        // A blocked folder gets knocked sideways a little before settling.
        if (flight.kind === "block") pos[0] += Math.sin(t * Math.PI * 2) * 0.12 * (1 - t)
      }
      pos[1] += Math.sin(t * Math.PI) * cfg.arc

      const spin = t * Math.PI * 2 * cfg.spins
      group.position.set(pos[0], pos[1], pos[2])
      group.rotation.set(
        lerp(flight.startRot[0], endRot[0], t) + Math.sin(spin) * 0.5,
        lerp(flight.startRot[1], endRot[1], t) + spin,
        lerp(flight.startRot[2], endRot[2], t) + Math.sin(t * Math.PI) * 0.4,
      )
      if (t >= 1) flightRef.current = null
      return
    }

    const owner = gameState.documentOwner
    const [x, y, z] = holdTarget(gameState, owner, clock.elapsedTime)
    const [rx, ry, rz] = DOCUMENT_HOLD_ROTATION[owner]
    const motion = fighterFeintMotion(gameState, owner)
    const facing = owner === "player" ? 1 : -1
    const k = 1 - Math.exp(-delta * 22)
    group.position.x = lerp(group.position.x, x, k)
    group.position.y = lerp(group.position.y, y, k)
    group.position.z = lerp(group.position.z, z, k)
    group.rotation.x = lerp(group.rotation.x, rx - motion.docForward * 0.9, k)
    group.rotation.y = lerp(group.rotation.y, ry + motion.docSide * facing * 0.8, k)
    group.rotation.z = lerp(group.rotation.z, rz - motion.docSide * facing * 0.5, k)
  })

  return (
    <group ref={groupRef} position={DOCUMENT_HOLD_POSITION.player} rotation={DOCUMENT_HOLD_ROTATION.player}>
      <group scale={1.35}>
        <PropMesh color="#f4f1e8" edgeColor="#4a3417" position={[0.01, 0.035, 0.004]}>
          <boxGeometry args={[0.28, 0.24, 0.006]} />
        </PropMesh>
        <PropMesh color="#e2c589" edgeColor="#4a3417">
          <boxGeometry args={[0.32, 0.24, 0.02]} />
        </PropMesh>
        <PropMesh color="#c9a86b" edgeColor="#4a3417" position={[-0.08, 0.13, 0]}>
          <boxGeometry args={[0.12, 0.03, 0.02]} />
        </PropMesh>
        <PropMesh color="#d13a3a" edgeColor="#4a1717" position={[0.04, -0.02, 0.012]}>
          <boxGeometry args={[0.14, 0.05, 0.004]} />
        </PropMesh>
      </group>
    </group>
  )
}

export function FileCabinet({ position = [-3.6, 0, -3.4] as [number, number, number] }) {
  return (
    <group position={position}>
      <PropMesh color="#8a8f9a" position={[0, 0.65, 0]}>
        <boxGeometry args={[0.7, 1.3, 0.6]} />
      </PropMesh>
      {[0.25, 0.68, 1.11].map((y, i) => (
        <group key={i}>
          <PropMesh color="#767c88" position={[0, y, 0.31]}>
            <boxGeometry args={[0.62, 0.36, 0.03]} />
          </PropMesh>
          <PropMesh color="#3a3d44" edgeColor="#1a1c1f" position={[0, y, 0.335]}>
            <boxGeometry args={[0.16, 0.03, 0.02]} />
          </PropMesh>
        </group>
      ))}
    </group>
  )
}

export function ComputerDesk({ position = [3.5, 0, -3.6] as [number, number, number] }) {
  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]}>
      <PropMesh color="#5b4530" position={[0, 0.68, 0]}>
        <boxGeometry args={[1.1, 0.06, 0.6]} />
      </PropMesh>
      {[
        [-0.48, -0.24],
        [0.48, -0.24],
        [-0.48, 0.24],
        [0.48, 0.24],
      ].map(([x, z], i) => (
        <PropMesh key={i} color="#3a281a" position={[x, 0.33, z]}>
          <boxGeometry args={[0.06, 0.64, 0.06]} />
        </PropMesh>
      ))}
      {/* CRT monitor body */}
      <PropMesh color="#d7d2c4" position={[0, 0.95, -0.08]}>
        <boxGeometry args={[0.42, 0.36, 0.4]} />
      </PropMesh>
      <PropMesh color="#232428" edgeColor="#0c0d0f" emissive position={[0, 0.97, 0.13]}>
        <boxGeometry args={[0.3, 0.24, 0.02]} />
      </PropMesh>
      {/* keyboard */}
      <PropMesh color="#cfc9ba" position={[0, 0.715, 0.16]} rotation={[-0.05, 0, 0]}>
        <boxGeometry args={[0.34, 0.02, 0.14]} />
      </PropMesh>
    </group>
  )
}

export function CoffeeCup({ position = [0.75, 0.78, -0.95] as [number, number, number] }) {
  return (
    <group position={position}>
      <PropMesh color="#f2f2ec" edgeColor="#8a8a80">
        <cylinderGeometry args={[0.055, 0.045, 0.09, 12]} />
      </PropMesh>
      <PropMesh color="#3a2417" edgeColor="#8a8a80" position={[0, 0.041, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.01, 12]} />
      </PropMesh>
      <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.03, 0.008, 8, 12, Math.PI]} />
        <meshToonMaterial color="#f2f2ec" gradientMap={getToonGradientMap()} />
      </mesh>
    </group>
  )
}

export function Chair({
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
}) {
  return (
    <group position={position} rotation={rotation}>
      <PropMesh color="#2e2a35" position={[0, 0.46, 0]}>
        <boxGeometry args={[0.42, 0.06, 0.42]} />
      </PropMesh>
      <PropMesh color="#2e2a35" position={[0, 0.78, -0.19]}>
        <boxGeometry args={[0.4, 0.5, 0.06]} />
      </PropMesh>
      <PropMesh color="#141018" position={[0, 0.23, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.46, 8]} />
      </PropMesh>
      <PropMesh color="#141018" position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.04, 12]} />
      </PropMesh>
    </group>
  )
}

export function WallFrame({
  position = [0, 1.7, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  tone = "#c9b98a",
}) {
  return (
    <group position={position} rotation={rotation}>
      <PropMesh color="#2c2620" edgeColor="#100e0a">
        <boxGeometry args={[0.42, 0.56, 0.03]} />
      </PropMesh>
      <PropMesh color={tone} edgeColor="#100e0a" position={[0, 0, 0.02]}>
        <boxGeometry args={[0.34, 0.46, 0.01]} />
      </PropMesh>
    </group>
  )
}

/** Side wall window: warm sunset glow, skyline silhouette, frame and venetian blinds. */
export function Window({
  position = [0, 0, -6.02] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* sunset glow fill */}
      <mesh position={[0, 1.72, -0.35]}>
        <planeGeometry args={[3.5, 1.9]} />
        <meshBasicMaterial color="#ff7d3d" />
      </mesh>
      <mesh position={[0, 1.55, -0.32]}>
        <circleGeometry args={[0.85, 28]} />
        <meshBasicMaterial color="#ffdf9c" />
      </mesh>
      {/* skyline silhouette */}
      {[
        [-1.15, 0.55, 1.1],
        [-0.5, 0.35, 0.72],
        [0.15, 0.62, 1.3],
        [0.75, 0.4, 0.82],
      ].map(([x, w, h], i) => (
        <mesh key={i} position={[x, 0.55 + Number(h) / 2 - 0.5, -0.28]}>
          <boxGeometry args={[Number(w), Number(h), 0.04]} />
          <meshBasicMaterial color="#3a1f38" toneMapped={false} />
        </mesh>
      ))}

      {/* frame: top / bottom / left / right strips */}
      <PropMesh color="#efe6d8" edgeColor="#8f836e" position={[0, 2.68, 0]}>
        <boxGeometry args={[3.7, 0.1, 0.1]} />
      </PropMesh>
      <PropMesh color="#efe6d8" edgeColor="#8f836e" position={[0, 0.72, 0]}>
        <boxGeometry args={[3.7, 0.1, 0.1]} />
      </PropMesh>
      <PropMesh color="#efe6d8" edgeColor="#8f836e" position={[-1.85, 1.7, 0]}>
        <boxGeometry args={[0.1, 2.06, 0.1]} />
      </PropMesh>
      <PropMesh color="#efe6d8" edgeColor="#8f836e" position={[1.85, 1.7, 0]}>
        <boxGeometry args={[0.1, 2.06, 0.1]} />
      </PropMesh>
      {[-1.16, 0, 1.16].map((x, i) => (
        <PropMesh key={i} color="#efe6d8" edgeColor="#8f836e" position={[x, 1.7, 0.06]}>
          <boxGeometry args={[0.06, 1.96, 0.08]} />
        </PropMesh>
      ))}

      {/* venetian blinds */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[0, 0.9 + i * 0.18, 0.16]} rotation={[0.4, 0, 0]} castShadow>
          <boxGeometry args={[3.55, 0.025, 0.24]} />
          <meshToonMaterial color="#d8cdb4" gradientMap={getToonGradientMap()} />
        </mesh>
      ))}
    </group>
  )
}

/** Thin additive light-shaft planes fanning from the side window across to the desk. */
export function LightShafts() {
  const shafts: Array<{ position: [number, number, number]; rotation: [number, number, number]; scaleY: number }> = [
    { position: [3.2, 2.45, -1.9], rotation: [0.06, 0.06, 1.84], scaleY: 1 },
    { position: [1.9, 2.05, -1.3], rotation: [0, 0, 1.84], scaleY: 1.1 },
    { position: [0.7, 1.65, -0.7], rotation: [-0.06, -0.06, 1.84], scaleY: 1 },
  ]
  return (
    <group>
      {shafts.map((s, i) => (
        <mesh key={i} position={s.position} rotation={s.rotation} scale={[1, s.scaleY, 1]}>
          <planeGeometry args={[1.1, 6]} />
          <meshBasicMaterial
            color="#ffb066"
            transparent
            opacity={0.09}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
