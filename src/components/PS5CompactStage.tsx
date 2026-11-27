import { ContactShadows, Environment, Grid, Lightformer } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ProceduralDualSense } from './ProceduralDualSense'
import { ProceduralPS5, type Ps5CalloutMode } from './ProceduralPS5'

export type StageId = 0 | 1 | 2 | 3 | 4

export interface FinishOption {
  name: string
  hex: string
  code: string
}

export const MONOCHROME_FINISHES: FinishOption[] = [
  { name: 'CHALK WHITE', hex: '#f5f5f5', code: 'SW-01' },
  { name: 'MATTE CARBON', hex: '#181818', code: 'SW-02' },
  { name: 'TITANIUM SILVER', hex: '#a3a3a3', code: 'SW-03' },
  { name: 'OBSIDIAN GLOSS', hex: '#050505', code: 'SW-04' },
]

export interface StagePreset {
  id: StageId
  shortLabel: string
  label: string
  pos: [number, number, number]
  target: [number, number, number]
  explode: number
  tension: number
  callout: Ps5CalloutMode
}

export const STAGE_PRESETS: StagePreset[] = [
  {
    id: 0,
    shortLabel: 'CONSOLE',
    label: '01 // MONOLITH CONSOLE',
    pos: [2.72, 0.5, 4.5],
    target: [0.3, -0.08, 0.0],
    explode: 0,
    tension: 0,
    callout: 'none',
  },
  {
    id: 1,
    shortLabel: '5.5GB/S SSD',
    label: '02 // 825GB NVME ARCHITECTURE',
    pos: [2.16, -0.34, 1.98],
    target: [0.22, -0.62, 0.16],
    explode: 1,
    tension: 0,
    callout: 'ssd',
  },
  {
    id: 2,
    shortLabel: 'LIQUID METAL & APU',
    label: '03 // LIQUID METAL & BLOWER',
    pos: [2.42, 0.4, 2.22],
    target: [0.14, 0.12, 0.02],
    explode: 1,
    tension: 0,
    callout: 'thermal',
  },
  {
    id: 3,
    shortLabel: 'DUALSENSE TRIGGERS',
    label: '04 // ADAPTIVE TRIGGER FORCE',
    pos: [1.56, -0.42, 2.34],
    target: [1.35, -1.04, 1.05],
    explode: 0,
    tension: 1,
    callout: 'none',
  },
  {
    id: 4,
    shortLabel: '4K ECOSYSTEM',
    label: '05 // 4K STUDIO ECOSYSTEM',
    pos: [2.28, 0.56, 5.18],
    target: [0.42, -0.22, 0.22],
    explode: 0,
    tension: 0,
    callout: 'none',
  },
]

interface SceneRigProps {
  activeStage: StageId
  faceplateColor: string
}

function SceneRig({ activeStage, faceplateColor }: SceneRigProps) {
  const preset = STAGE_PRESETS[activeStage]
  const showcaseGroupRef = useRef<THREE.Group>(null)
  const lookAtTarget = useRef(new THREE.Vector3(...preset.target))
  const desiredPos = useMemo(() => new THREE.Vector3(), [])
  const desiredTarget = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const springAlpha = 1 - Math.exp(-5.5 * dt)
    const { camera, clock } = state

    desiredPos.set(...preset.pos)
    desiredTarget.set(...preset.target)

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, desiredPos.x, springAlpha)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, desiredPos.y, springAlpha)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, desiredPos.z, springAlpha)

    lookAtTarget.current.x = THREE.MathUtils.lerp(
      lookAtTarget.current.x,
      desiredTarget.x,
      springAlpha,
    )
    lookAtTarget.current.y = THREE.MathUtils.lerp(
      lookAtTarget.current.y,
      desiredTarget.y,
      springAlpha,
    )
    lookAtTarget.current.z = THREE.MathUtils.lerp(
      lookAtTarget.current.z,
      desiredTarget.z,
      springAlpha,
    )

    camera.lookAt(lookAtTarget.current)

    // Subtle studio turntable sway during full-rig stages
    if (showcaseGroupRef.current) {
      const targetRotY =
        activeStage === 0 || activeStage === 4 ? Math.sin(clock.elapsedTime * 0.45) * 0.08 : 0
      showcaseGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        showcaseGroupRef.current.rotation.y,
        targetRotY,
        springAlpha,
      )
    }
  })

  return (
    <>
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 8.5, 20]} />

      {/* Studio Photography Environment with Pure White Softbox Strips */}
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 0]}>
          <Lightformer
            form="rect"
            intensity={2.8}
            color="#ffffff"
            position={[0, 5, -2]}
            scale={[10, 2.5, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            intensity={3.6}
            color="#ffffff"
            position={[-6, 1.5, 0]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[8, 1.2, 1]}
          />
          <Lightformer
            form="rect"
            intensity={2.2}
            color="#ffffff"
            position={[6, 1.0, 2]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[6, 1.4, 1]}
          />
          <Lightformer
            form="rect"
            intensity={3.2}
            color="#ffffff"
            position={[0, 3.2, -5.5]}
            scale={[7, 0.9, 1]}
            target={[0, 0, 0]}
          />
        </group>
      </Environment>

      {/* High-Contrast Monochrome Studio Lights */}
      <ambientLight intensity={0.2} color="#ffffff" />
      <directionalLight
        position={[4.2, 5.8, 4.4]}
        intensity={1.9}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      <spotLight
        position={[-4.2, 4.2, -3.2]}
        angle={0.55}
        penumbra={0.85}
        intensity={46}
        distance={15}
        color="#ffffff"
      />
      <pointLight position={[2.0, -0.3, 2.4]} intensity={0.9} distance={6} color="#ffffff" />

      <group ref={showcaseGroupRef}>
        <ProceduralPS5
          explodeProgress={preset.explode}
          faceplateColor={faceplateColor}
          calloutMode={preset.callout}
          position={[0, 0, 0]}
        />

        <ProceduralDualSense
          triggerTension={preset.tension}
          faceplateColor={faceplateColor}
          showTensionBadge={activeStage === 3}
          position={[1.35, -1.08, 1.05]}
          rotation={[-0.24, -0.32, 0.04]}
        />
      </group>

      {/* Swiss Drafting Hairline Monochrome Floor */}
      <Grid
        position={[0, -1.36, 0]}
        infiniteGrid
        cellSize={0.5}
        cellThickness={0.45}
        cellColor="#171717"
        sectionSize={2.5}
        sectionThickness={0.9}
        sectionColor="#333333"
        fadeDistance={16}
        fadeStrength={1.8}
      />

      <ContactShadows
        position={[0, -1.35, 0]}
        opacity={0.65}
        scale={8.5}
        blur={2.4}
        far={3.5}
        resolution={256}
        frames={1}
        color="#000000"
      />

      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={1.1} mipmapBlur intensity={0.45} />
        <Vignette eskil={false} offset={0.2} darkness={0.72} />
      </EffectComposer>
    </>
  )
}

export interface PS5CompactStageProps {
  activeStage: StageId
  onSelectStage: (stage: StageId) => void
  faceplateColor: string
  onSelectColorway: (hex: string) => void
}

export function PS5CompactStage({
  activeStage,
  onSelectStage,
  faceplateColor,
  onSelectColorway,
}: PS5CompactStageProps) {
  const currentPreset = STAGE_PRESETS[activeStage]
  const currentFinish =
    MONOCHROME_FINISHES.find((f) => f.hex === faceplateColor) ?? MONOCHROME_FINISHES[0]

  return (
    <div className="flex flex-col">
      {/* Main Compact 3D Stage Container with Swiss + Crosshair Corner Markers */}
      <div className="relative border border-white/[0.12] bg-[#000000]">
        {/* Subtle + Crosshair Corner Markers */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-[7px] -top-[9px] z-20 select-none font-mono text-xs leading-none text-white/60"
        >
          +
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-[6px] -top-[9px] z-20 select-none font-mono text-xs leading-none text-white/60"
        >
          +
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[7px] -left-[7px] z-20 select-none font-mono text-xs leading-none text-white/60"
        >
          +
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[7px] -right-[6px] z-20 select-none font-mono text-xs leading-none text-white/60"
        >
          +
        </span>

        {/* Top Telemetry Strip */}
        <div className="flex items-center justify-between border-b border-white/[0.12] bg-[#0A0A0A] px-4 py-2.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white">
            {currentPreset.label}
          </span>
          <span className="font-mono text-[10px] tracking-[0.16em] text-[#737373]">
            STUDIO // DPR 1.5
          </span>
        </div>

        {/* Compact WebGL Viewport */}
        <div className="relative h-[380px] w-full bg-[#000000] sm:h-[440px] lg:h-[470px]">
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [2.72, 0.5, 4.5], fov: 34 }}
            shadows
            gl={{ antialias: false, powerPreference: 'high-performance' }}
          >
            <Suspense fallback={null}>
              <SceneRig activeStage={activeStage} faceplateColor={faceplateColor} />
            </Suspense>
          </Canvas>

          {/* Bottom-Left Stage Readout Overlay */}
          <div className="pointer-events-none absolute bottom-3 left-4 font-mono text-[10px] tracking-[0.16em] text-[#737373]">
            FINISH: <span className="text-white">{currentFinish.name}</span>
          </div>
          <div className="pointer-events-none absolute bottom-3 right-4 font-mono text-[10px] tracking-[0.16em] text-[#737373]">
            STAGE [0{activeStage + 1}/05]
          </div>
        </div>

        {/* 5-Stage Morph Switcher Bar */}
        <div className="grid grid-cols-2 border-t border-white/[0.12] bg-[#0A0A0A] sm:grid-cols-5">
          {STAGE_PRESETS.map((preset) => {
            const isActive = preset.id === activeStage
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectStage(preset.id)}
                className={`border-b border-r border-white/[0.12] px-2.5 py-2.5 text-left font-mono text-[10px] tracking-[0.12em] transition-colors last:border-r-0 sm:border-b-0 ${
                  isActive
                    ? 'bg-white font-medium text-black'
                    : 'bg-[#0A0A0A] text-[#737373] hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-black/60' : 'text-[#737373]'}>
                  [0{preset.id + 1}]
                </span>{' '}
                <span className="block truncate uppercase">{preset.shortLabel}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Monochrome Studio Colorway Switcher Beneath the 3D Stage */}
      <div className="mt-3 border border-white/[0.12] bg-[#0A0A0A] p-3.5">
        <div className="mb-2.5 flex items-center justify-between font-mono text-[10px] tracking-[0.18em]">
          <span className="text-[#737373]">[STUDIO FINISH] // REAL-TIME SHELL MATERIAL</span>
          <span className="text-white">{currentFinish.code}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MONOCHROME_FINISHES.map((finish) => {
            const selected = finish.hex === faceplateColor
            return (
              <button
                key={finish.hex}
                type="button"
                onClick={() => onSelectColorway(finish.hex)}
                className={`flex items-center gap-2.5 border px-2.5 py-2 text-left transition-colors ${
                  selected
                    ? 'border-white bg-white text-black'
                    : 'border-white/[0.12] bg-[#000000] text-white hover:border-white/40'
                }`}
              >
                <span
                  className={`h-3.5 w-3.5 shrink-0 border ${
                    selected ? 'border-black/40' : 'border-white/30'
                  }`}
                  style={{ backgroundColor: finish.hex }}
                />
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[10px] font-medium tracking-wider">
                    {finish.name}
                  </span>
                  <span
                    className={`block font-mono text-[9px] ${
                      selected ? 'text-black/65' : 'text-[#737373]'
                    }`}
                  >
                    {finish.hex}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
