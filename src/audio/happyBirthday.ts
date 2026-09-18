/**
 * Tiny-device a cappella "Happy Birthday" via Web Audio.
 * Soft vowel-like tones with vibrato — like a music-box throat.
 */

type Note = { freq: number; beats: number }

/** Happy Birthday in C, sung an octave up for a cute chip voice. */
const MELODY: Note[] = [
  // Happy birthday to you
  { freq: 523.25, beats: 0.75 }, // C5
  { freq: 523.25, beats: 0.25 },
  { freq: 587.33, beats: 1 }, // D5
  { freq: 523.25, beats: 1 },
  { freq: 698.46, beats: 1 }, // F5
  { freq: 659.25, beats: 2 }, // E5
  // Happy birthday to you
  { freq: 523.25, beats: 0.75 },
  { freq: 523.25, beats: 0.25 },
  { freq: 587.33, beats: 1 },
  { freq: 523.25, beats: 1 },
  { freq: 783.99, beats: 1 }, // G5
  { freq: 698.46, beats: 2 }, // F5
  // Happy birthday dear friend
  { freq: 523.25, beats: 0.75 },
  { freq: 523.25, beats: 0.25 },
  { freq: 1046.5, beats: 1 }, // C6
  { freq: 880.0, beats: 1 }, // A5
  { freq: 698.46, beats: 1 }, // F5
  { freq: 659.25, beats: 1 }, // E5
  { freq: 587.33, beats: 1 }, // D5
  // Happy birthday to you
  { freq: 932.33, beats: 0.75 }, // Bb5
  { freq: 932.33, beats: 0.25 },
  { freq: 880.0, beats: 1 }, // A5
  { freq: 698.46, beats: 1 }, // F5
  { freq: 783.99, beats: 1 }, // G5
  { freq: 698.46, beats: 2.2 }, // F5
]

const BPM = 96
const BEAT = 60 / BPM

let sharedCtx: AudioContext | null = null
let stopCurrent: (() => void) | null = null

function getContext() {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    sharedCtx = new Ctx()
  }
  return sharedCtx
}

function scheduleVoiceNote(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  start: number,
  duration: number,
) {
  const end = start + duration
  const voiceGain = ctx.createGain()
  voiceGain.gain.setValueAtTime(0, start)
  voiceGain.gain.linearRampToValueAtTime(0.22, start + 0.045)
  voiceGain.gain.setValueAtTime(0.2, end - Math.min(0.12, duration * 0.35))
  voiceGain.gain.exponentialRampToValueAtTime(0.001, end)
  voiceGain.connect(dest)

  // Soft sine fundamental
  const fund = ctx.createOscillator()
  fund.type = 'sine'
  fund.frequency.setValueAtTime(freq, start)

  // Gentle triangle body (device “throat”)
  const body = ctx.createOscillator()
  body.type = 'triangle'
  body.frequency.setValueAtTime(freq, start)
  body.detune.setValueAtTime(6, start)

  const bodyGain = ctx.createGain()
  bodyGain.gain.value = 0.28

  // Formant-ish bandpass for ooh/aah color
  const formant = ctx.createBiquadFilter()
  formant.type = 'bandpass'
  formant.frequency.setValueAtTime(freq * 1.85, start)
  formant.Q.value = 4.5

  // Vibrato
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.setValueAtTime(5.2, start)
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 7.5
  lfo.connect(lfoGain)
  lfoGain.connect(fund.frequency)
  lfoGain.connect(body.frequency)

  // Quiet breath air under the tone
  const noiseBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
  const data = noiseBuf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.015
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuf
  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.value = 1800
  noiseFilter.Q.value = 0.7
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0, start)
  noiseGain.gain.linearRampToValueAtTime(0.35, start + 0.03)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, end)

  fund.connect(formant)
  body.connect(bodyGain)
  bodyGain.connect(formant)
  formant.connect(voiceGain)
  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(voiceGain)

  fund.start(start)
  body.start(start)
  lfo.start(start)
  noise.start(start)
  fund.stop(end + 0.02)
  body.stop(end + 0.02)
  lfo.stop(end + 0.02)
  noise.stop(end + 0.02)
}

/** Stop any currently playing birthday song. */
export function stopHappyBirthday() {
  stopCurrent?.()
  stopCurrent = null
}

/**
 * Plays a cute device-style a cappella Happy Birthday.
 * Returns a promise that resolves when the song finishes (or is stopped).
 */
export async function playHappyBirthday(): Promise<void> {
  stopHappyBirthday()

  const ctx = getContext()
  await ctx.resume()

  const master = ctx.createGain()
  master.gain.value = 0.85

  // Soft speaker cabinet feel
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 3200
  lowpass.Q.value = 0.7

  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.value = 180

  master.connect(highpass)
  highpass.connect(lowpass)
  lowpass.connect(ctx.destination)

  const t0 = ctx.currentTime + 0.12
  let t = t0

  for (const note of MELODY) {
    const dur = note.beats * BEAT
    // Leave a tiny gap between notes for syllable articulation
    scheduleVoiceNote(ctx, master, note.freq, t, dur * 0.92)
    t += dur
  }

  const endAt = t + 0.15

  return new Promise((resolve) => {
    let finished = false
    const timer = window.setTimeout(() => {
      if (finished) return
      finished = true
      stopCurrent = null
      master.disconnect()
      resolve()
    }, (endAt - ctx.currentTime) * 1000 + 50)

    stopCurrent = () => {
      if (finished) return
      finished = true
      window.clearTimeout(timer)
      const now = ctx.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(0, now + 0.08)
      window.setTimeout(() => {
        try {
          master.disconnect()
        } catch {
          /* already gone */
        }
        resolve()
      }, 100)
    }
  })
}
