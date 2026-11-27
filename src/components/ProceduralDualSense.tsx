import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface ProceduralDualSenseProps {
  triggerTension: number
  faceplateColor: string
  showTensionBadge?: boolean
  position?: [number, number, number]
  rotation?: [number, number, number]
}

function getShellParams(hex: string): {
  roughness: number
  metalness: number
  clearcoat: number
} {
  const normalized = hex.toLowerCase()
  if (normalized === '#050505') return { roughness: 0.08, metalness: 0.2, clearcoat: 1.0 }
  if (normalized === '#a3a3a3') return { roughness: 0.24, metalness: 0.72, clearcoat: 0.35 }
  if (normalized === '#181818') return { roughness: 0.56, metalness: 0.14, clearcoat: 0.05 }
  return { roughness: 0.34, metalness: 0.06, clearcoat: 0.18 }
}

export function ProceduralDualSense({
  triggerTension,
  faceplateColor,
  showTensionBadge = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: ProceduralDualSenseProps) {
  const leftTriggerPivotRef = useRef<THREE.Group>(null)
  const rightTriggerPivotRef = useRef<THREE.Group>(null)
  const shellMatRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const leftGripMatRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const rightGripMatRef = useRef<THREE.MeshPhysicalMaterial>(null)

  const targetColor = useMemo(() => new THREE.Color(faceplateColor), [faceplateColor])
  const shellParams = useMemo(() => getShellParams(faceplateColor), [faceplateColor])
  const clampedTension = Math.max(0, Math.min(1, triggerTension))
  const tensionPercent = Math.round(clampedTension * 100)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const alpha = 1 - Math.exp(-8.5 * dt)

    // Smoothly depress L2 / R2 adaptive triggers inward based on triggerTension (0 -> 1)
    const targetTriggerAngle = clampedTension * 0.44

    if (leftTriggerPivotRef.current) {
      leftTriggerPivotRef.current.rotation.x = THREE.MathUtils.lerp(
        leftTriggerPivotRef.current.rotation.x,
        targetTriggerAngle,
        alpha,
      )
    }
    if (rightTriggerPivotRef.current) {
      rightTriggerPivotRef.current.rotation.x = THREE.MathUtils.lerp(
        rightTriggerPivotRef.current.rotation.x,
        targetTriggerAngle,
        alpha,
      )
    }

    const materials = [shellMatRef.current, leftGripMatRef.current, rightGripMatRef.current]
    materials.forEach((mat) => {
      if (!mat) return
      mat.color.lerp(targetColor, alpha)
      mat.roughness = THREE.MathUtils.lerp(mat.roughness, shellParams.roughness, alpha)
      mat.metalness = THREE.MathUtils.lerp(mat.metalness, shellParams.metalness, alpha)
      mat.clearcoat = THREE.MathUtils.lerp(mat.clearcoat, shellParams.clearcoat, alpha)
    })
  })

  return (
    <group position={position} rotation={rotation}>
      {/* Upper Two-Tone Central Chassis Shell */}
      <mesh position={[0, 0.02, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.78, 0.14, 0.48]} />
        <meshPhysicalMaterial
          ref={shellMatRef}
          color={faceplateColor}
          roughness={shellParams.roughness}
          metalness={shellParams.metalness}
          clearcoat={shellParams.clearcoat}
        />
      </mesh>

      {/* Lower Matte-Obsidian Trim Core */}
      <mesh position={[0, -0.04, 0.08]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.11, 0.44]} />
        <meshStandardMaterial color="#0b0b0b" roughness={0.45} metalness={0.25} />
      </mesh>

      {/* Left Ergonomic Capsule Grip */}
      <group position={[-0.36, -0.08, 0.18]} rotation={[0.52, 0.14, 0.22]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.105, 0.34, 12, 20]} />
          <meshPhysicalMaterial
            ref={leftGripMatRef}
            color={faceplateColor}
            roughness={shellParams.roughness}
            metalness={shellParams.metalness}
            clearcoat={shellParams.clearcoat}
          />
        </mesh>
        <mesh position={[0.02, -0.04, -0.03]}>
          <capsuleGeometry args={[0.085, 0.28, 10, 16]} />
          <meshStandardMaterial color="#0d0d0d" roughness={0.5} metalness={0.2} />
        </mesh>
      </group>

      {/* Right Ergonomic Capsule Grip */}
      <group position={[0.36, -0.08, 0.18]} rotation={[0.52, -0.14, -0.22]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.105, 0.34, 12, 20]} />
          <meshPhysicalMaterial
            ref={rightGripMatRef}
            color={faceplateColor}
            roughness={shellParams.roughness}
            metalness={shellParams.metalness}
            clearcoat={shellParams.clearcoat}
          />
        </mesh>
        <mesh position={[-0.02, -0.04, -0.03]}>
          <capsuleGeometry args={[0.085, 0.28, 10, 16]} />
          <meshStandardMaterial color="#0d0d0d" roughness={0.5} metalness={0.2} />
        </mesh>
      </group>

      {/* Capacitive Touchpad & Pure White Studio LED Edge Strips */}
      <group position={[0, 0.095, -0.06]}>
        <mesh castShadow>
          <boxGeometry args={[0.32, 0.028, 0.22]} />
          <meshPhysicalMaterial
            color="#141414"
            roughness={0.26}
            metalness={0.18}
            clearcoat={0.7}
          />
        </mesh>
        <mesh position={[-0.172, 0.004, 0]} rotation={[0, 0.08, 0]}>
          <boxGeometry args={[0.012, 0.022, 0.225]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={1.8}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0.172, 0.004, 0]} rotation={[0, -0.08, 0]}>
          <boxGeometry args={[0.012, 0.022, 0.225]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={1.8}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Dual Analog Thumbsticks */}
      {[-0.155, 0.155].map((xOffset) => (
        <group key={xOffset} position={[xOffset, 0.095, 0.16]}>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.032, 0.042, 0.055, 18]} />
            <meshStandardMaterial color="#171717" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.052, 0]} castShadow>
            <cylinderGeometry args={[0.064, 0.058, 0.022, 24]} />
            <meshStandardMaterial color="#222222" roughness={0.65} metalness={0.1} />
          </mesh>
        </group>
      ))}

      {/* D-Pad (Left Face) */}
      <group position={[-0.29, 0.095, 0.0]}>
        <mesh>
          <boxGeometry args={[0.12, 0.022, 0.038]} />
          <meshStandardMaterial color="#242424" roughness={0.3} metalness={0.25} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.038, 0.022, 0.12]} />
          <meshStandardMaterial color="#242424" roughness={0.3} metalness={0.25} />
        </mesh>
      </group>

      {/* Face Buttons (Right Face) */}
      <group position={[0.29, 0.095, 0.0]}>
        {[
          [0, -0.052],
          [0, 0.052],
          [-0.052, 0],
          [0.052, 0],
        ].map(([bx, bz], idx) => (
          <mesh key={idx} position={[bx, 0, bz]}>
            <cylinderGeometry args={[0.023, 0.023, 0.024, 16]} />
            <meshPhysicalMaterial
              color="#2a2a2a"
              roughness={0.18}
              metalness={0.15}
              clearcoat={0.9}
            />
          </mesh>
        ))}
      </group>

      {/* L1 / R1 Shoulder Bumpers */}
      <mesh position={[-0.29, 0.06, -0.23]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.17, 0.042, 0.08]} />
        <meshStandardMaterial color="#161616" roughness={0.38} metalness={0.28} />
      </mesh>
      <mesh position={[0.29, 0.06, -0.23]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.17, 0.042, 0.08]} />
        <meshStandardMaterial color="#161616" roughness={0.38} metalness={0.28} />
      </mesh>

      {/* L2 Adaptive Trigger */}
      <group position={[-0.29, 0.01, -0.24]} ref={leftTriggerPivotRef}>
        <mesh position={[0, -0.025, -0.045]} rotation={[-0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.155, 0.075, 0.1]} />
          <meshStandardMaterial color="#202020" roughness={0.32} metalness={0.42} />
        </mesh>
      </group>

      {/* R2 Adaptive Trigger */}
      <group position={[0.29, 0.01, -0.24]} ref={rightTriggerPivotRef}>
        <mesh position={[0, -0.025, -0.045]} rotation={[-0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.155, 0.075, 0.1]} />
          <meshStandardMaterial color="#202020" roughness={0.32} metalness={0.42} />
        </mesh>
      </group>

      {/* Monochrome 3D-Pinned Adaptive Trigger Tension Badge */}
      {showTensionBadge && (
        <Html position={[0.32, 0.22, -0.22]} center zIndexRange={[20, 0]}>
          <div className="pointer-events-none flex items-center gap-2 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-white" />
            <span className="h-[1px] w-8 bg-white/75" />
            <div className="border border-white/25 bg-[#0A0A0A]/95 px-3 py-1.5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-4 font-mono text-[10px] font-medium tracking-widest text-white">
                <span>[03] L2 / R2 TENSION</span>
                <span>{tensionPercent}%</span>
              </div>
              <div className="mt-1.5 h-[2px] w-40 overflow-hidden bg-white/15">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{ width: `${tensionPercent}%` }}
                />
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
