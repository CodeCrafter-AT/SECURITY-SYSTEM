import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export type Ps5CalloutMode = 'none' | 'ssd' | 'thermal'

export interface ProceduralPS5Props {
  explodeProgress: number
  faceplateColor: string
  calloutMode?: Ps5CalloutMode
  position?: [number, number, number]
  rotation?: [number, number, number]
}

const HEATSINK_FIN_COUNT = 14
const FAN_BLADE_COUNT = 13

function getFinishSurfaceParams(hex: string): {
  roughness: number
  metalness: number
  clearcoat: number
  clearcoatRoughness: number
} {
  const normalized = hex.toLowerCase()
  if (normalized === '#050505') {
    // OBSIDIAN GLOSS
    return { roughness: 0.08, metalness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.05 }
  }
  if (normalized === '#a3a3a3') {
    // TITANIUM SILVER
    return { roughness: 0.24, metalness: 0.72, clearcoat: 0.35, clearcoatRoughness: 0.2 }
  }
  if (normalized === '#181818') {
    // MATTE CARBON
    return { roughness: 0.56, metalness: 0.14, clearcoat: 0.05, clearcoatRoughness: 0.4 }
  }
  // CHALK WHITE (#f5f5f5)
  return { roughness: 0.34, metalness: 0.06, clearcoat: 0.18, clearcoatRoughness: 0.28 }
}

export function ProceduralPS5({
  explodeProgress,
  faceplateColor,
  calloutMode = 'none',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: ProceduralPS5Props) {
  const leftPlateRef = useRef<THREE.Group>(null)
  const rightPlateRef = useRef<THREE.Group>(null)
  const ssdModuleRef = useRef<THREE.Group>(null)
  const fanHubRef = useRef<THREE.Group>(null)
  const faceplateMatLeftRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const faceplateMatRightRef = useRef<THREE.MeshPhysicalMaterial>(null)

  const targetColor = useMemo(() => new THREE.Color(faceplateColor), [faceplateColor])
  const surfaceParams = useMemo(() => getFinishSurfaceParams(faceplateColor), [faceplateColor])

  // Custom Bezier curve profile for the iconic flared PS5 side faceplates
  const faceplateGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.72, -1.28)
    shape.bezierCurveTo(-0.2, -1.31, 0.35, -1.3, 0.74, -1.25)
    shape.bezierCurveTo(0.8, -0.45, 0.74, 0.55, 0.89, 1.34)
    shape.bezierCurveTo(0.32, 1.24, -0.34, 1.22, -0.77, 1.3)
    shape.bezierCurveTo(-0.7, 0.45, -0.77, -0.45, -0.72, -1.28)

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.044,
      bevelEnabled: true,
      bevelThickness: 0.016,
      bevelSize: 0.014,
      bevelSegments: 3,
      curveSegments: 24,
    })

    geom.translate(0, 0, -0.022)
    geom.computeVertexNormals()
    return geom
  }, [])

  // Custom Bezier inner obsidian chassis profile nestled inside the faceplates
  const coreGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.67, -1.26)
    shape.bezierCurveTo(-0.18, -1.27, 0.32, -1.26, 0.68, -1.22)
    shape.bezierCurveTo(0.73, -0.42, 0.69, 0.52, 0.79, 1.25)
    shape.bezierCurveTo(0.26, 1.18, -0.28, 1.17, -0.7, 1.23)
    shape.bezierCurveTo(-0.65, 0.44, -0.7, -0.44, -0.67, -1.26)

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.016,
      bevelSegments: 3,
      curveSegments: 20,
    })
    geom.translate(0, 0, -0.17)
    geom.computeVertexNormals()
    return geom
  }, [])

  // Curved pure white studio lightbar hugging the upper front V-collar
  const ledStripGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.22, 0.78),
      new THREE.Vector3(0, 0.75, 0.73),
      new THREE.Vector3(0, 0.15, 0.7),
      new THREE.Vector3(0, -0.42, 0.71),
    ])
    return new THREE.TubeGeometry(curve, 24, 0.013, 8, false)
  }, [])

  useEffect(() => {
    return () => {
      faceplateGeometry.dispose()
      coreGeometry.dispose()
      ledStripGeometry.dispose()
    }
  }, [faceplateGeometry, coreGeometry, ledStripGeometry])

  const fanBladeAngles = useMemo(
    () => Array.from({ length: FAN_BLADE_COUNT }, (_, i) => (i / FAN_BLADE_COUNT) * Math.PI * 2),
    [],
  )

  const heatsinkOffsets = useMemo(
    () =>
      Array.from(
        { length: HEATSINK_FIN_COUNT },
        (_, i) => -0.28 + (i / (HEATSINK_FIN_COUNT - 1)) * 0.56,
      ),
    [],
  )

  const louverOffsets = useMemo(
    () => Array.from({ length: 10 }, (_, i) => 0.18 + i * 0.1),
    [],
  )

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const alpha = 1 - Math.exp(-7.5 * dt)

    // Smoothly slide outer faceplates along the X-axis (±0.95 units)
    const targetLeftX = -0.215 - explodeProgress * 0.95
    const targetRightX = 0.215 + explodeProgress * 0.95
    const targetFlareTilt = 0.035 + explodeProgress * 0.045

    if (leftPlateRef.current) {
      leftPlateRef.current.position.x = THREE.MathUtils.lerp(
        leftPlateRef.current.position.x,
        targetLeftX,
        alpha,
      )
      leftPlateRef.current.rotation.z = THREE.MathUtils.lerp(
        leftPlateRef.current.rotation.z,
        targetFlareTilt,
        alpha,
      )
    }

    if (rightPlateRef.current) {
      rightPlateRef.current.position.x = THREE.MathUtils.lerp(
        rightPlateRef.current.position.x,
        targetRightX,
        alpha,
      )
      rightPlateRef.current.rotation.z = THREE.MathUtils.lerp(
        rightPlateRef.current.rotation.z,
        -targetFlareTilt,
        alpha,
      )
    }

    // Smoothly present the M.2 NVMe SSD when exploded
    if (ssdModuleRef.current) {
      const targetSsdX = 0.18 + explodeProgress * 0.17
      ssdModuleRef.current.position.x = THREE.MathUtils.lerp(
        ssdModuleRef.current.position.x,
        targetSsdX,
        alpha,
      )
    }

    // Spin internal centrifugal blower fan
    if (fanHubRef.current) {
      const speed = 5.0 + explodeProgress * 4.2
      fanHubRef.current.rotation.x += dt * speed
    }

    // Smoothly transition outer shell finish
    const matLeft = faceplateMatLeftRef.current
    const matRight = faceplateMatRightRef.current
    if (matLeft) {
      matLeft.color.lerp(targetColor, alpha)
      matLeft.roughness = THREE.MathUtils.lerp(matLeft.roughness, surfaceParams.roughness, alpha)
      matLeft.metalness = THREE.MathUtils.lerp(matLeft.metalness, surfaceParams.metalness, alpha)
      matLeft.clearcoat = THREE.MathUtils.lerp(matLeft.clearcoat, surfaceParams.clearcoat, alpha)
      matLeft.clearcoatRoughness = THREE.MathUtils.lerp(
        matLeft.clearcoatRoughness,
        surfaceParams.clearcoatRoughness,
        alpha,
      )
    }
    if (matRight) {
      matRight.color.lerp(targetColor, alpha)
      matRight.roughness = THREE.MathUtils.lerp(matRight.roughness, surfaceParams.roughness, alpha)
      matRight.metalness = THREE.MathUtils.lerp(matRight.metalness, surfaceParams.metalness, alpha)
      matRight.clearcoat = THREE.MathUtils.lerp(matRight.clearcoat, surfaceParams.clearcoat, alpha)
      matRight.clearcoatRoughness = THREE.MathUtils.lerp(
        matRight.clearcoatRoughness,
        surfaceParams.clearcoatRoughness,
        alpha,
      )
    }
  })

  return (
    <group position={position} rotation={rotation}>
      {/* Circular Obsidian Pedestal Stand */}
      <group position={[0, -1.32, 0]}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[0.84, 0.88, 0.055, 48]} />
          <meshStandardMaterial color="#080808" roughness={0.34} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.029, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.78, 0.82, 48]} />
          <meshStandardMaterial color="#333333" roughness={0.22} metalness={0.88} />
        </mesh>
      </group>

      {/* Glossy #050505 Obsidian Inner Chassis Core */}
      <mesh geometry={coreGeometry} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#050505"
          roughness={0.1}
          metalness={0.2}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
        />
      </mesh>

      {/* Precision Front Ventilation Louvers */}
      <group position={[0, 0, 0]}>
        {louverOffsets.map((yPos) => (
          <mesh key={yPos} position={[0, yPos, 0.72]}>
            <boxGeometry args={[0.37, 0.016, 0.05]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.45} metalness={0.45} />
          </mesh>
        ))}
      </group>

      {/* Dual Pure White Studio Light Strips */}
      <mesh geometry={ledStripGeometry} position={[-0.175, 0, 0]}>
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={ledStripGeometry} position={[0.175, 0, 0]}>
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>

      {/* Internal Hardware Core Assembly */}
      <group>
        {/* Structural Carrier Frame */}
        <mesh position={[0, -0.04, -0.02]}>
          <boxGeometry args={[0.37, 2.05, 1.12]} />
          <meshStandardMaterial color="#121212" roughness={0.45} metalness={0.55} />
        </mesh>

        {/* Centrifugal Blower Fan Assembly (Upper Bay) */}
        <group position={[0, 0.56, 0.1]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42, 0.42, 0.39, 36, 1, true]} />
            <meshStandardMaterial
              color="#171717"
              roughness={0.32}
              metalness={0.68}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0.196, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[0.36, 0.43, 36]} />
            <meshStandardMaterial color="#404040" roughness={0.25} metalness={0.85} />
          </mesh>
          <mesh position={[-0.196, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <ringGeometry args={[0.36, 0.43, 36]} />
            <meshStandardMaterial color="#404040" roughness={0.25} metalness={0.85} />
          </mesh>

          <group ref={fanHubRef}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.14, 0.14, 0.36, 24]} />
              <meshStandardMaterial color="#525252" roughness={0.22} metalness={0.9} />
            </mesh>
            {fanBladeAngles.map((angle) => (
              <group key={angle} rotation={[angle, 0, 0]}>
                <mesh position={[0, 0.25, 0]} rotation={[0.45, 0.18, 0]}>
                  <boxGeometry args={[0.31, 0.2, 0.015]} />
                  <meshStandardMaterial color="#262626" roughness={0.3} metalness={0.6} />
                </mesh>
              </group>
            ))}
          </group>
        </group>

        {/* Satin Titanium/Silver Heatsink Fin Array & Liquid Metal Thermal Core */}
        <group position={[0, -0.05, -0.15]}>
          {/* Titanium Baseplate & Heat Pipes */}
          <mesh position={[0.14, 0, 0.12]}>
            <boxGeometry args={[0.12, 0.54, 0.46]} />
            <meshStandardMaterial color="#b5b5b5" metalness={0.92} roughness={0.2} />
          </mesh>
          <mesh position={[0.16, 0.14, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.56, 12]} />
            <meshStandardMaterial color="#d4d4d4" metalness={0.94} roughness={0.16} />
          </mesh>
          <mesh position={[0.16, -0.14, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.56, 12]} />
            <meshStandardMaterial color="#d4d4d4" metalness={0.94} roughness={0.16} />
          </mesh>

          {/* Stacked Satin Titanium/Silver Heatsink Fins */}
          {heatsinkOffsets.map((yOffset) => (
            <mesh key={yOffset} position={[0.02, yOffset, -0.1]}>
              <boxGeometry args={[0.35, 0.012, 0.52]} />
              <meshStandardMaterial color="#a3a3a3" metalness={0.92} roughness={0.22} />
            </mesh>
          ))}

          {/* Mirror Liquid Metal Thermal Interface Coldplate */}
          <mesh position={[0.205, 0.02, 0.14]}>
            <boxGeometry args={[0.025, 0.24, 0.24]} />
            <meshPhysicalMaterial
              color="#f5f5f5"
              metalness={1.0}
              roughness={0.04}
              clearcoat={1.0}
            />
          </mesh>

          {calloutMode === 'thermal' && (
            <Html position={[0.24, 0.1, 0.22]} center zIndexRange={[20, 0]}>
              <div className="pointer-events-none flex items-center gap-2 whitespace-nowrap">
                <div className="relative flex items-center">
                  <span className="h-2 w-2 rounded-full bg-white" />
                  <span className="h-[1px] w-10 bg-white/75" />
                </div>
                <div className="border border-white/25 bg-[#0A0A0A]/95 px-3 py-1.5 backdrop-blur-md">
                  <div className="font-mono text-[10px] font-medium tracking-widest text-white">
                    [02] LIQUID METAL TIM // APU
                  </div>
                  <div className="font-mono text-[9px] text-[#737373]">
                    GALLIUM-INDIUM // 14-FIN TITANIUM ARRAY
                  </div>
                </div>
              </div>
            </Html>
          )}
        </group>

        {/* Monochrome M.2 NVMe SSD Expansion Module */}
        <group ref={ssdModuleRef} position={[0.18, -0.68, 0.16]}>
          {/* Matte Carbon PCB */}
          <mesh>
            <boxGeometry args={[0.026, 0.36, 0.56]} />
            <meshStandardMaterial color="#141414" roughness={0.42} metalness={0.35} />
          </mesh>
          {/* Brushed Silver PCIe Gen4 Edge Connector */}
          <mesh position={[0, 0, -0.29]}>
            <boxGeometry args={[0.028, 0.24, 0.04]} />
            <meshStandardMaterial color="#d4d4d4" metalness={0.92} roughness={0.18} />
          </mesh>
          {/* Custom 12-Channel Controller + NAND Packages */}
          <mesh position={[0.018, 0.03, -0.08]}>
            <boxGeometry args={[0.016, 0.15, 0.15]} />
            <meshStandardMaterial color="#262626" metalness={0.78} roughness={0.22} />
          </mesh>
          <mesh position={[0.018, -0.02, 0.12]}>
            <boxGeometry args={[0.014, 0.2, 0.16]} />
            <meshStandardMaterial color="#171717" metalness={0.5} roughness={0.38} />
          </mesh>
          {/* Pure White Status Indicator */}
          <mesh position={[0.02, 0.13, 0.21]}>
            <boxGeometry args={[0.012, 0.02, 0.04]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={1.8}
              toneMapped={false}
            />
          </mesh>

          {calloutMode === 'ssd' && (
            <Html position={[0.04, -0.06, 0.18]} center zIndexRange={[20, 0]}>
              <div className="pointer-events-none flex items-center gap-2 whitespace-nowrap">
                <div className="relative flex items-center">
                  <span className="h-2 w-2 rounded-full bg-white" />
                  <span className="h-[1px] w-10 bg-white/75" />
                </div>
                <div className="border border-white/25 bg-[#0A0A0A]/95 px-3 py-1.5 backdrop-blur-md">
                  <div className="font-mono text-[10px] font-medium tracking-widest text-white">
                    [01] 825GB CUSTOM NVME SSD
                  </div>
                  <div className="font-mono text-[9px] text-[#737373]">
                    12-CHANNEL CONTROLLER // 5.5 GB/S RAW
                  </div>
                </div>
              </div>
            </Html>
          )}
        </group>
      </group>

      {/* Left Flared Outer Faceplate */}
      <group ref={leftPlateRef} position={[-0.215, 0, 0]} rotation={[0, 0, 0.035]}>
        <mesh
          geometry={faceplateGeometry}
          rotation={[0, -Math.PI / 2, 0]}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            ref={faceplateMatLeftRef}
            color={faceplateColor}
            roughness={surfaceParams.roughness}
            metalness={surfaceParams.metalness}
            clearcoat={surfaceParams.clearcoat}
            clearcoatRoughness={surfaceParams.clearcoatRoughness}
          />
        </mesh>
      </group>

      {/* Right Flared Outer Faceplate */}
      <group ref={rightPlateRef} position={[0.215, 0, 0]} rotation={[0, 0, -0.035]}>
        <mesh
          geometry={faceplateGeometry}
          rotation={[0, -Math.PI / 2, 0]}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            ref={faceplateMatRightRef}
            color={faceplateColor}
            roughness={surfaceParams.roughness}
            metalness={surfaceParams.metalness}
            clearcoat={surfaceParams.clearcoat}
            clearcoatRoughness={surfaceParams.clearcoatRoughness}
          />
        </mesh>
      </group>
    </group>
  )
}
