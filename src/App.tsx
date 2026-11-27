import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { ArrowUpRight, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  MONOCHROME_FINISHES,
  PS5CompactStage,
  type StageId,
} from './components/PS5CompactStage'
import {
  initializeAudio,
  isAudioUnlocked,
  playColorClick,
  setAudioMuted,
} from './utils/soundEngine'

gsap.registerPlugin(ScrollTrigger, useGSAP)

interface ComponentCardItem {
  index: string
  stageId: StageId
  title: string
  metric: string
  spec: string
  description: string
}

const COMPONENT_BENTO_CARDS: ComponentCardItem[] = [
  {
    index: '[01]',
    stageId: 0,
    title: 'DUAL-WING MONOLITH CHASSIS',
    metric: '390MM // VERTICAL FORM',
    spec: 'V-COLLAR INTAKE GEOMETRY',
    description:
      'Flared polycarbonate outer shells frame an obsidian gloss core, channeling negative-pressure airflow along twin studio-lit intake channels.',
  },
  {
    index: '[02]',
    stageId: 1,
    title: '825GB CUSTOM NVME SSD',
    metric: '5.5 GB/S // RAW THROUGHPUT',
    spec: '12-CHANNEL FLASH CONTROLLER',
    description:
      'Custom hardware decompression eliminates traditional seek latency, streaming compressed geometry directly into unified GDDR6 memory at 9 GB/s.',
  },
  {
    index: '[03]',
    stageId: 2,
    title: 'LIQUID METAL THERMAL CORE',
    metric: 'GALLIUM-INDIUM // TIM',
    spec: 'APU DIE INTERFACE',
    description:
      'A patented sealed liquid metal thermal compound bridges the custom AMD SoC and titanium-silver vapor baseplate for sustained clock stability.',
  },
  {
    index: '[04]',
    stageId: 2,
    title: '120MM CENTRIFUGAL BLOWER',
    metric: '45MM DEPTH // DUAL INTAKE',
    spec: '14-FIN TITANIUM ARRAY',
    description:
      'A double-sided centrifugal impeller draws cool ambient air across both faces of the mainboard through high-density heatsink fins.',
  },
  {
    index: '[05]',
    stageId: 3,
    title: 'DUALSENSE ADAPTIVE TRIGGERS',
    metric: 'L2 / R2 // DYNAMIC TORQUE',
    spec: 'MOTORIZED SPIRAL ACTUATORS',
    description:
      'Precision gear motors modulate physical trigger tension in real time, mapping mechanical resistance directly to in-game physics.',
  },
  {
    index: '[06]',
    stageId: 4,
    title: '4K / 120HZ RAY-TRACING ENGINE',
    metric: '10.28 TFLOPS // 36 CUS',
    spec: 'HDMI 2.1 VARIABLE REFRESH',
    description:
      'Custom RDNA 2 compute units execute hardware-accelerated ray intersections alongside Tempest 3D spatial audio synthesis.',
  },
]

interface UseCaseItem {
  index: string
  stageId: StageId
  title: string
  subtitle: string
  telemetry: string
  summary: string
}

const USE_CASE_CARDS: UseCaseItem[] = [
  {
    index: '[01]',
    stageId: 4,
    title: 'COMPETITIVE 120FPS',
    subtitle: 'LOW-LATENCY FRAME PACING',
    telemetry: '8.33MS FRAME BUDGET // HDMI 2.1 VRR',
    summary:
      'Variable boost clocks prioritize deterministic frame delivery at 120Hz for sub-10ms input-to-photon response.',
  },
  {
    index: '[02]',
    stageId: 2,
    title: 'NATIVE 4K RAY TRACING',
    subtitle: 'SUSTAINED THERMAL HEADROOM',
    telemetry: '2.23 GHZ VARIABLE // LIQUID METAL',
    summary:
      'Continuous liquid-metal heat dissipation prevents thermal throttling during dense global illumination workloads.',
  },
  {
    index: '[03]',
    stageId: 3,
    title: 'TACTILE HAPTIC IMMERSION',
    subtitle: 'DUAL-ACTUATOR FEEDBACK',
    telemetry: 'L2 / R2 FORCE + VOICE COIL',
    summary:
      'Synchronized voice-coil actuators and motorized triggers render surface texture, recoil impulse, and braking tension.',
  },
]

const SPEC_ROWS: Array<{ key: string; val: string; note: string }> = [
  { key: 'CPU ARCHITECTURE', val: '8x AMD ZEN 2 CORES @ 3.5 GHZ', note: 'VARIABLE FREQUENCY' },
  { key: 'GPU ARCHITECTURE', val: '36 RDNA 2 CUS @ 2.23 GHZ', note: '10.28 TFLOPS PEAK' },
  { key: 'UNIFIED MEMORY', val: '16GB GDDR6 / 256-BIT BUS', note: '448 GB/S BANDWIDTH' },
  { key: 'INTERNAL STORAGE', val: '825GB CUSTOM NVME SSD', note: '5.5 GB/S RAW // 9 GB/S KRAKEN' },
  { key: 'THERMAL INTERFACE', val: 'LIQUID METAL TIM + 120MM FAN', note: 'TITANIUM HEATPIPE STACK' },
  { key: 'VIDEO OUTPUT', val: 'HDMI 2.1 // 4K 120HZ / 8K', note: 'ALLM & VRR SUPPORT' },
]

export function App() {
  const rootRef = useRef<HTMLDivElement>(null)
  const lenisRef = useRef<Lenis | null>(null)

  const [activeStage, setActiveStage] = useState<StageId>(0)
  const [faceplateColor, setFaceplateColor] = useState<string>(MONOCHROME_FINISHES[0].hex)
  const [audioReady, setAudioReady] = useState(false)
  const [audioOn, setAudioOn] = useState(false)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 0.95,
    })
    lenisRef.current = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time: number) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  useGSAP(
    () => {
      // Masked editorial headline upward glide (y: 100% -> 0%, power4.out, 0.9s)
      const headlineLines = gsap.utils.toArray<HTMLElement>('.js-reveal-line')
      headlineLines.forEach((line) => {
        gsap.fromTo(
          line,
          { y: '100%' },
          {
            y: '0%',
            duration: 0.9,
            ease: 'power4.out',
            scrollTrigger: {
              trigger: line,
              start: 'top 92%',
              once: true,
            },
          },
        )
      })

      // Stagger 6 Component Bento cards on scroll
      gsap.fromTo(
        '.js-bento-card',
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.js-bento-grid',
            start: 'top 84%',
            once: true,
          },
        },
      )

      // Stagger 3 Use-Case cards on scroll
      gsap.fromTo(
        '.js-usecase-card',
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.js-usecase-grid',
            start: 'top 85%',
            once: true,
          },
        },
      )

      // Two-way sync: scrolling through Component Bento cards morphs the compact 3D stage
      const cardElements = gsap.utils.toArray<HTMLElement>('.js-bento-card')
      cardElements.forEach((el) => {
        const rawStage = el.dataset.stage
        const parsedStage = Number(rawStage) as StageId
        ScrollTrigger.create({
          trigger: el,
          start: 'top 58%',
          end: 'bottom 42%',
          onEnter: () => setActiveStage(parsedStage),
          onEnterBack: () => setActiveStage(parsedStage),
        })
      })
    },
    { scope: rootRef },
  )

  const handleAudioToggle = async () => {
    if (!audioReady || !isAudioUnlocked()) {
      const ok = await initializeAudio()
      setAudioReady(ok)
      setAudioOn(ok)
      return
    }
    const nextOn = !audioOn
    setAudioMuted(!nextOn)
    setAudioOn(nextOn)
    if (nextOn) playColorClick()
  }

  const handleSelectStage = (stage: StageId) => {
    setActiveStage(stage)
    playColorClick()
  }

  const handleSelectColorway = (hex: string) => {
    setFaceplateColor(hex)
    playColorClick()
  }

  const scrollToSection = (selector: string) => {
    const target = document.querySelector(selector)
    if (target && lenisRef.current) {
      lenisRef.current.scrollTo(target as HTMLElement, { offset: -68, duration: 1.0 })
    }
    playColorClick()
  }

  return (
    <div ref={rootRef} className="min-h-screen bg-[#000000] text-white selection:bg-white selection:text-black">
      {/* Minimalist Swiss Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.12] bg-[#000000]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 bg-white" />
            <span className="font-mono text-xs font-medium tracking-[0.2em] text-white">
              PS5 // MONOLITH
            </span>
          </div>

          <nav className="hidden items-center gap-6 font-mono text-[11px] tracking-[0.16em] text-[#737373] md:flex">
            <button
              type="button"
              onClick={() => scrollToSection('#overview')}
              className="transition-colors hover:text-white"
            >
              [01] OVERVIEW
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('#architecture')}
              className="transition-colors hover:text-white"
            >
              [02] ARCHITECTURE
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('#profiles')}
              className="transition-colors hover:text-white"
            >
              [03] PROFILES
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('#specs')}
              className="transition-colors hover:text-white"
            >
              [04] SPECS
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[11px] tracking-[0.16em] text-[#737373] sm:inline">
              STAGE [0{activeStage + 1}/05]
            </span>
            <button
              type="button"
              onClick={handleAudioToggle}
              className={`inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.16em] transition-colors ${
                audioOn
                  ? 'border-white bg-white text-black'
                  : 'border-white/[0.18] bg-[#0A0A0A] text-white hover:border-white'
              }`}
            >
              {audioOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              {!audioReady ? 'INITIALIZE AUDIO' : audioOn ? 'AUDIO: ON' : 'AUDIO: OFF'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Architectural Grid: Left Editorial + Bento Cards / Right Sticky 3D Stage */}
      <div className="mx-auto max-w-[1440px] border-x border-white/[0.12]">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Hero + 6 Component Bento Grid */}
          <div className="lg:col-span-6 lg:border-r lg:border-white/[0.12]">
            {/* Section 01: Editorial Hero */}
            <section id="overview" className="border-b border-white/[0.12] px-6 py-12 sm:px-10 sm:py-16">
              <div className="mb-5 font-mono text-[11px] tracking-[0.2em] text-[#737373]">
                [01] // HARDWARE ARCHITECTURE EDITION
              </div>

              <h1 className="text-4xl font-extrabold uppercase leading-[0.94] tracking-[-0.04em] text-white sm:text-6xl">
                <span className="block overflow-hidden">
                  <span className="js-reveal-line block">MONOLITHIC</span>
                </span>
                <span className="block overflow-hidden">
                  <span className="js-reveal-line block">SILICON.</span>
                </span>
                <span className="block overflow-hidden">
                  <span className="js-reveal-line block text-[#737373]">PURE FORM.</span>
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-sm leading-relaxed text-[#737373] sm:text-base">
                PlayStation 5 stripped to its architectural essence. Custom AMD RDNA 2 graphics,
                ultra-low-latency 5.5 GB/s flash storage, and liquid-metal thermal engineering inside
                a sculpted twin-wing enclosure.
              </p>

              {/* Hairline 3-Cell Telemetry Bar */}
              <div className="mt-8 grid grid-cols-3 border border-white/[0.12] bg-[#0A0A0A]">
                <div className="border-r border-white/[0.12] p-3.5">
                  <div className="font-mono text-[10px] tracking-[0.16em] text-[#737373]">
                    COMPUTE
                  </div>
                  <div className="mt-1 font-mono text-sm font-medium text-white sm:text-base">
                    10.28 TF
                  </div>
                </div>
                <div className="border-r border-white/[0.12] p-3.5">
                  <div className="font-mono text-[10px] tracking-[0.16em] text-[#737373]">
                    STORAGE I/O
                  </div>
                  <div className="mt-1 font-mono text-sm font-medium text-white sm:text-base">
                    5.5 GB/S
                  </div>
                </div>
                <div className="p-3.5">
                  <div className="font-mono text-[10px] tracking-[0.16em] text-[#737373]">
                    OUTPUT
                  </div>
                  <div className="mt-1 font-mono text-sm font-medium text-white sm:text-base">
                    4K / 120HZ
                  </div>
                </div>
              </div>
            </section>

            {/* Section 02: 6 Component Bento Cards (Two-Way Sync with Compact 3D Stage) */}
            <section id="architecture" className="px-6 py-12 sm:px-10 sm:py-16">
              <div className="mb-4 font-mono text-[11px] tracking-[0.2em] text-[#737373]">
                [02] // INTERNAL SUBSYSTEMS — SELECT OR SCROLL TO MORPH
              </div>

              <h2 className="mb-8 text-3xl font-extrabold uppercase leading-[0.96] tracking-[-0.04em] text-white sm:text-5xl">
                <span className="block overflow-hidden">
                  <span className="js-reveal-line block">ENGINEERED</span>
                </span>
                <span className="block overflow-hidden">
                  <span className="js-reveal-line block">FROM THE CORE.</span>
                </span>
              </h2>

              <div className="js-bento-grid grid grid-cols-1 gap-3 sm:grid-cols-2">
                {COMPONENT_BENTO_CARDS.map((card) => {
                  const isActive = activeStage === card.stageId
                  return (
                    <button
                      key={card.index}
                      type="button"
                      data-stage={card.stageId}
                      onClick={() => handleSelectStage(card.stageId)}
                      className={`js-bento-card group flex flex-col justify-between border p-5 text-left transition-colors ${
                        isActive
                          ? 'border-white bg-white text-black'
                          : 'border-white/[0.12] bg-[#0A0A0A] text-white hover:border-white/45'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.16em]">
                          <span className={isActive ? 'text-black/70' : 'text-[#737373]'}>
                            {card.index} // STAGE 0{card.stageId + 1}
                          </span>
                          <ArrowUpRight
                            className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                              isActive ? 'text-black' : 'text-[#737373]'
                            }`}
                          />
                        </div>

                        <h3 className="mt-4 font-sans text-lg font-bold tracking-[-0.02em]">
                          {card.title}
                        </h3>

                        <p
                          className={`mt-2 text-xs leading-relaxed ${
                            isActive ? 'text-black/75' : 'text-[#737373]'
                          }`}
                        >
                          {card.description}
                        </p>
                      </div>

                      <div
                        className={`mt-5 border-t pt-3 font-mono text-[10px] tracking-[0.14em] ${
                          isActive
                            ? 'border-black/15 text-black'
                            : 'border-white/[0.12] text-white'
                        }`}
                      >
                        <div>{card.metric}</div>
                        <div className={isActive ? 'text-black/60' : 'text-[#737373]'}>
                          {card.spec}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          {/* Right Column: Sticky Compact Monochrome 3D Stage + Colorway Switcher */}
          <div className="border-t border-white/[0.12] bg-[#000000] p-5 sm:p-8 lg:col-span-6 lg:border-t-0">
            <div className="lg:sticky lg:top-20">
              <PS5CompactStage
                activeStage={activeStage}
                onSelectStage={handleSelectStage}
                faceplateColor={faceplateColor}
                onSelectColorway={handleSelectColorway}
              />
            </div>
          </div>
        </div>

        {/* Section 03: 3 Use-Case Cards */}
        <section id="profiles" className="border-t border-white/[0.12] px-6 py-14 sm:px-10 sm:py-20">
          <div className="mb-4 font-mono text-[11px] tracking-[0.2em] text-[#737373]">
            [03] // WORKLOAD &amp; TELEMETRY PROFILES
          </div>

          <h2 className="mb-10 text-3xl font-extrabold uppercase leading-[0.96] tracking-[-0.04em] text-white sm:text-5xl">
            <span className="block overflow-hidden">
              <span className="js-reveal-line block">CALIBRATED FOR</span>
            </span>
            <span className="block overflow-hidden">
              <span className="js-reveal-line block">EVERY FRAME.</span>
            </span>
          </h2>

          <div className="js-usecase-grid grid grid-cols-1 border border-white/[0.12] bg-[#0A0A0A] md:grid-cols-3">
            {USE_CASE_CARDS.map((item, idx) => {
              const isLinked = activeStage === item.stageId
              return (
                <button
                  key={item.index}
                  type="button"
                  onClick={() => {
                    handleSelectStage(item.stageId)
                    scrollToSection('#overview')
                  }}
                  className={`js-usecase-card flex flex-col justify-between p-6 text-left transition-colors ${
                    idx < USE_CASE_CARDS.length - 1
                      ? 'border-b border-white/[0.12] md:border-b-0 md:border-r'
                      : ''
                  } ${isLinked ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'}`}
                >
                  <div>
                    <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-[#737373]">
                      <span>{item.index}</span>
                      <span>STAGE 0{item.stageId + 1}</span>
                    </div>

                    <h3 className="mt-5 font-sans text-xl font-bold tracking-[-0.02em] text-white">
                      {item.title}
                    </h3>
                    <div className="mt-1 font-mono text-[10px] tracking-[0.16em] text-[#737373]">
                      {item.subtitle}
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-[#737373]">{item.summary}</p>
                  </div>

                  <div className="mt-6 border-t border-white/[0.12] pt-3 font-mono text-[10px] tracking-[0.14em] text-white">
                    {item.telemetry}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Section 04: Technical Specification Ledger */}
        <section id="specs" className="border-t border-white/[0.12] px-6 py-14 sm:px-10 sm:py-20">
          <div className="mb-4 font-mono text-[11px] tracking-[0.2em] text-[#737373]">
            [04] // HARDWARE SPECIFICATION LEDGER
          </div>

          <h2 className="mb-8 text-3xl font-extrabold uppercase leading-[0.96] tracking-[-0.04em] text-white sm:text-5xl">
            <span className="block overflow-hidden">
              <span className="js-reveal-line block">SYSTEM MATRIX</span>
            </span>
          </h2>

          <div className="border border-white/[0.12] bg-[#0A0A0A]">
            {SPEC_ROWS.map((row, idx) => (
              <div
                key={row.key}
                className={`grid grid-cols-1 gap-2 px-5 py-4 font-mono text-xs sm:grid-cols-12 sm:items-center ${
                  idx < SPEC_ROWS.length - 1 ? 'border-b border-white/[0.12]' : ''
                }`}
              >
                <div className="text-[#737373] sm:col-span-4">{row.key}</div>
                <div className="font-medium text-white sm:col-span-5">{row.val}</div>
                <div className="text-[11px] text-[#737373] sm:col-span-3 sm:text-right">
                  {row.note}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Minimal Swiss Footer */}
        <footer className="flex flex-col items-start justify-between gap-3 border-t border-white/[0.12] px-6 py-6 font-mono text-[10px] tracking-[0.18em] text-[#737373] sm:flex-row sm:items-center sm:px-10">
          <span>PLAYSTATION®5 // SWISS MONOLITH STUDY</span>
          <span>STRICT MONOCHROME // #000000 / #FFFFFF</span>
        </footer>
      </div>
    </div>
  )
}

export default App
