export type SfxName = "toss" | "gotHit" | "block" | "parry" | "countered"

let ctx: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === "suspended") void ctx.resume()
  return ctx
}

function getNoise(c: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer
  const length = Math.floor(c.sampleRate * 0.5)
  const buffer = c.createBuffer(1, length, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buffer
  return buffer
}

interface ToneOpts {
  type?: OscillatorType
  from: number
  to?: number
  start?: number
  duration: number
  gain: number
}

function tone(c: AudioContext, out: AudioNode, o: ToneOpts) {
  const t0 = c.currentTime + (o.start ?? 0)
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = o.type ?? "sine"
  osc.frequency.setValueAtTime(o.from, t0)
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.duration)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration)
  osc.connect(g).connect(out)
  osc.start(t0)
  osc.stop(t0 + o.duration + 0.02)
}

interface NoiseOpts {
  filter: BiquadFilterType
  freqFrom: number
  freqTo?: number
  q?: number
  start?: number
  duration: number
  gain: number
}

function noise(c: AudioContext, out: AudioNode, o: NoiseOpts) {
  const t0 = c.currentTime + (o.start ?? 0)
  const src = c.createBufferSource()
  src.buffer = getNoise(c)
  const f = c.createBiquadFilter()
  f.type = o.filter
  f.Q.value = o.q ?? 1
  f.frequency.setValueAtTime(o.freqFrom, t0)
  if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t0 + o.duration)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration)
  src.connect(f).connect(g).connect(out)
  src.start(t0)
  src.stop(t0 + o.duration + 0.02)
}

/** All effects are synthesized with the Web Audio API so no audio assets are needed. */
export function playSfx(name: SfxName, volume = 0.6) {
  const c = getContext()
  if (!c) return
  const master = c.createGain()
  master.gain.value = volume
  master.connect(c.destination)

  switch (name) {
    case "toss":
      // Whoosh up into a papery slap.
      noise(c, master, { filter: "bandpass", freqFrom: 500, freqTo: 3200, q: 1.2, duration: 0.22, gain: 0.5 })
      noise(c, master, { filter: "highpass", freqFrom: 1800, start: 0.2, duration: 0.09, gain: 0.7 })
      tone(c, master, { type: "triangle", from: 220, to: 70, start: 0.2, duration: 0.16, gain: 0.7 })
      break
    case "gotHit":
      tone(c, master, { type: "sine", from: 140, to: 45, duration: 0.28, gain: 0.9 })
      noise(c, master, { filter: "lowpass", freqFrom: 900, freqTo: 200, duration: 0.2, gain: 0.5 })
      break
    case "block":
      // Dull padded thud with a short metallic tick.
      tone(c, master, { type: "square", from: 330, to: 150, duration: 0.12, gain: 0.35 })
      tone(c, master, { type: "sine", from: 120, to: 55, duration: 0.2, gain: 0.8 })
      noise(c, master, { filter: "bandpass", freqFrom: 1400, q: 2, duration: 0.07, gain: 0.5 })
      break
    case "parry":
      // Bright sword-clash ring.
      noise(c, master, { filter: "highpass", freqFrom: 3000, duration: 0.1, gain: 0.8 })
      tone(c, master, { type: "triangle", from: 1760, to: 1500, duration: 0.55, gain: 0.45 })
      tone(c, master, { type: "sine", from: 2637, duration: 0.45, gain: 0.3 })
      tone(c, master, { type: "sine", from: 3322, start: 0.02, duration: 0.35, gain: 0.2 })
      tone(c, master, { type: "sine", from: 180, to: 70, duration: 0.18, gain: 0.7 })
      break
    case "countered":
      // Descending sting: the document comes flying back at you.
      noise(c, master, { filter: "bandpass", freqFrom: 3000, freqTo: 400, q: 1.5, duration: 0.25, gain: 0.55 })
      tone(c, master, { type: "sawtooth", from: 520, to: 110, duration: 0.3, gain: 0.35 })
      tone(c, master, { type: "square", from: 98, to: 62, start: 0.22, duration: 0.25, gain: 0.5 })
      break
  }
}
