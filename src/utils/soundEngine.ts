type BrowserAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let isMuted = false
let unlocked = false

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  const win = window as BrowserAudioWindow
  return window.AudioContext ?? win.webkitAudioContext ?? null
}

function ensureAudioContext(): AudioContext | null {
  if (audioCtx) return audioCtx
  const Ctor = getAudioContextConstructor()
  if (!Ctor) return null

  try {
    audioCtx = new Ctor()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = isMuted ? 0 : 0.75
    masterGain.connect(audioCtx.destination)
    return audioCtx
  } catch {
    return null
  }
}

export async function unlockAudioContext(): Promise<boolean> {
  const ctx = ensureAudioContext()
  if (!ctx) return false

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    unlocked = ctx.state === 'running'
    return unlocked
  } catch {
    return false
  }
}

export function isAudioUnlocked(): boolean {
  return unlocked && audioCtx !== null && audioCtx.state === 'running'
}

export function isAudioMuted(): boolean {
  return isMuted
}

export function setAudioMuted(muted: boolean): void {
  isMuted = muted
  if (audioCtx && masterGain) {
    const now = audioCtx.currentTime
    masterGain.gain.cancelScheduledValues(now)
    masterGain.gain.setTargetAtTime(muted ? 0 : 0.75, now, 0.02)
  }
}

/**
 * Synthesizes a warm PlayStation-inspired harmonic boot chord (Cmaj9 pad)
 * using zero external audio assets.
 */
export function playBootChord(): void {
  const ctx = ensureAudioContext()
  if (!ctx || !masterGain || isMuted) return
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }

  const now = ctx.currentTime

  // Warm lowpass filter sweep for atmospheric console shimmer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(320, now)
  filter.frequency.exponentialRampToValueAtTime(2400, now + 0.55)
  filter.frequency.exponentialRampToValueAtTime(750, now + 2.8)
  filter.Q.value = 1.4
  filter.connect(masterGain)

  // C2 sub + C3/G3/B3/D4/E4 lush harmonic voices
  const voices: Array<{ freq: number; type: OscillatorType; detune: number; level: number }> = [
    { freq: 65.41, type: 'sine', detune: 0, level: 0.24 },
    { freq: 130.81, type: 'triangle', detune: -4, level: 0.16 },
    { freq: 196.0, type: 'sine', detune: 3, level: 0.14 },
    { freq: 246.94, type: 'triangle', detune: -5, level: 0.11 },
    { freq: 293.66, type: 'sine', detune: 5, level: 0.11 },
    { freq: 329.63, type: 'sine', detune: 2, level: 0.09 },
    { freq: 587.33, type: 'sine', detune: -3, level: 0.045 },
  ]

  voices.forEach((voice, index) => {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()

    osc.type = voice.type
    osc.frequency.setValueAtTime(voice.freq, now)
    osc.detune.setValueAtTime(voice.detune, now)

    const onset = now + index * 0.028
    env.gain.setValueAtTime(0.0001, onset)
    env.gain.linearRampToValueAtTime(voice.level, onset + 0.18)
    env.gain.exponentialRampToValueAtTime(0.0001, onset + 2.7)

    osc.connect(env)
    env.connect(filter)

    osc.start(onset)
    osc.stop(onset + 2.85)
  })
}

export async function initializeAudio(): Promise<boolean> {
  const ready = await unlockAudioContext()
  if (ready) {
    setAudioMuted(false)
    playBootChord()
  }
  return ready
}

/**
 * Synthesizes a crisp 10ms mechanical micro-switch click when switching colorways or stages.
 * Automatically unlocks AudioContext when invoked from a user gesture unless muted.
 */
export function playColorClick(): void {
  if (isMuted) return
  const ctx = ensureAudioContext()
  if (!ctx || !masterGain) return

  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => {
      unlocked = ctx.state === 'running'
    })
    return
  }

  unlocked = true
  const now = ctx.currentTime
  const duration = 0.01

  // Short filtered noise burst for tactile switch snap
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < sampleCount; i++) {
    const decay = 1 - i / sampleCount
    data[i] = (Math.random() * 2 - 1) * decay * decay
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.setValueAtTime(2600, now)
  bandpass.Q.value = 1.8

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.45, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  noise.connect(bandpass)
  bandpass.connect(noiseGain)
  noiseGain.connect(masterGain)
  noise.start(now)
  noise.stop(now + duration)

  // Crisp 10ms high-frequency transient ping
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(1450, now)
  osc.frequency.exponentialRampToValueAtTime(420, now + duration)

  oscGain.gain.setValueAtTime(0.24, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(oscGain)
  oscGain.connect(masterGain)
  osc.start(now)
  osc.stop(now + duration)
}
