import { useCallback, useEffect, useRef, useState } from 'react'

export type MicStatus = 'idle' | 'requesting' | 'listening' | 'denied' | 'error'

export type BlowSample = {
  /** Smoothed blow intensity from 0 (quiet) to 1 (strong). */
  strength: number
  /** Instant RMS volume before smoothing. */
  raw: number
}

type Options = {
  /** RMS above this counts as blowing. */
  noiseFloor?: number
  /** RMS that maps to strength 1. */
  peakLevel?: number
  /** How quickly strength rises toward a loud blow. */
  attack?: number
  /** How quickly strength falls when quiet. */
  release?: number
  onSample?: (sample: BlowSample) => void
}

const defaultOptions = {
  noiseFloor: 0.045,
  peakLevel: 0.32,
  attack: 0.28,
  release: 0.18,
} as const

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

/**
 * Captures microphone audio and maps breath/blow loudness to a 0–1 strength.
 * Blows register as broadband noise; we use time-domain RMS which works well
 * for "blow out the candle" interactions.
 */
export function useBlowDetection(options: Options = {}) {
  const {
    noiseFloor = defaultOptions.noiseFloor,
    peakLevel = defaultOptions.peakLevel,
    attack = defaultOptions.attack,
    release = defaultOptions.release,
    onSample,
  } = options

  const [status, setStatus] = useState<MicStatus>('idle')
  const [strength, setStrength] = useState(0)

  const onSampleRef = useRef(onSample)
  onSampleRef.current = onSample

  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const rafRef = useRef(0)
  const smoothedRef = useRef(0)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    const ctx = contextRef.current
    contextRef.current = null
    if (ctx && ctx.state !== 'closed') {
      void ctx.close()
    }

    smoothedRef.current = 0
    setStrength(0)
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setStatus('error')
      return
    }

    stop()
    setStatus('requesting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      })

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      const context = new AudioCtx()
      await context.resume()

      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.35
      source.connect(analyser)

      const timeData = new Float32Array(analyser.fftSize)
      streamRef.current = stream
      contextRef.current = context
      setStatus('listening')

      const tick = () => {
        analyser.getFloatTimeDomainData(timeData)

        let sum = 0
        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i]
          sum += v * v
        }
        const rms = Math.sqrt(sum / timeData.length)

        const normalized = clamp01(
          (rms - noiseFloor) / Math.max(0.0001, peakLevel - noiseFloor),
        )

        const prev = smoothedRef.current
        const rate = normalized > prev ? attack : release
        const next = prev + (normalized - prev) * rate
        smoothedRef.current = next

        setStrength(next)
        onSampleRef.current?.({ strength: next, raw: rms })

        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      setStatus(name === 'NotAllowedError' ? 'denied' : 'error')
      stop()
    }
  }, [attack, noiseFloor, peakLevel, release, stop])

  useEffect(() => () => stop(), [stop])

  return { status, strength, start, stop, isListening: status === 'listening' }
}
