import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

type CandleProps = {
  /** Blow intensity 0–1 from the microphone. */
  blowStrength: number
  lit: boolean
  onExtinguished?: () => void
}

/** Sustained blow above this extinguishes the flame. */
const EXTINGUISH_STRENGTH = 0.55
/** How long (ms) the blow must stay strong before going out. */
const EXTINGUISH_HOLD_MS = 280

export function Candle({ blowStrength, lit, onExtinguished }: CandleProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const flameRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const smokeRef = useRef<HTMLDivElement>(null)
  const wickTipRef = useRef<HTMLDivElement>(null)

  const blowRef = useRef(blowStrength)
  blowRef.current = blowStrength

  const litRef = useRef(lit)
  litRef.current = lit

  const holdMsRef = useRef(0)
  const lastTsRef = useRef<number | null>(null)
  const extinguishedRef = useRef(false)
  const onExtinguishedRef = useRef(onExtinguished)
  onExtinguishedRef.current = onExtinguished

  useGSAP(
    () => {
      if (!lit || !flameRef.current || !smokeRef.current || !wickTipRef.current)
        return

      extinguishedRef.current = false
      holdMsRef.current = 0
      lastTsRef.current = null

      gsap.killTweensOf([
        smokeRef.current,
        flameRef.current,
        wickTipRef.current,
        glowRef.current,
      ])
      gsap.set(smokeRef.current, { opacity: 0, y: 0, scale: 0.6, x: 0 })
      gsap.set(wickTipRef.current, { opacity: 0 })
      gsap.set(flameRef.current, {
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        x: 0,
        rotation: 0,
        display: 'block',
      })
      gsap.set(glowRef.current, { opacity: 0.85, scale: 1 })
      gsap.fromTo(
        flameRef.current,
        { scaleY: 0.2, scaleX: 0.5, opacity: 0.4 },
        {
          scaleY: 1,
          scaleX: 1,
          opacity: 1,
          duration: 0.55,
          ease: 'back.out(1.6)',
        },
      )
    },
    { dependencies: [lit], scope: rootRef },
  )

  // Single rAF loop drives idle flicker + blow response.
  useEffect(() => {
    const flame = flameRef.current
    const inner = innerRef.current
    const glow = glowRef.current
    const smoke = smokeRef.current
    const wickTip = wickTipRef.current
    if (!flame || !inner || !glow || !smoke || !wickTip) return

    let raf = 0

    const playExtinguish = () => {
      gsap.killTweensOf([flame, inner, glow, smoke])

      gsap
        .timeline()
        .to(flame, {
          scaleY: 0.05,
          scaleX: 1.6,
          x: 36,
          rotation: 28,
          opacity: 0,
          duration: 0.22,
          ease: 'power2.in',
        })
        .set(flame, { display: 'none' })
        .to(
          glow,
          { opacity: 0, scale: 0.4, duration: 0.3, ease: 'power2.out' },
          0,
        )
        .fromTo(
          smoke,
          { opacity: 0, y: 8, scale: 0.5, x: 12 },
          {
            opacity: 0.55,
            y: -48,
            scale: 1.2,
            x: 4,
            duration: 1.4,
            ease: 'power1.out',
          },
          0.08,
        )
        .to(
          smoke,
          { opacity: 0, y: -72, duration: 0.9, ease: 'power1.in' },
          0.9,
        )
        .to(wickTip, { opacity: 0.9, duration: 0.2 }, 0.15)
    }

    const frame = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts
      const dt = ts - lastTsRef.current
      lastTsRef.current = ts

      if (!litRef.current || extinguishedRef.current) {
        raf = requestAnimationFrame(frame)
        return
      }

      const s = blowRef.current
      const mix = Math.min(1, s * 1.15)

      const idleX = Math.sin(ts / 320) * 2.2 + Math.sin(ts / 170) * 1.4
      const idleRot = Math.sin(ts / 280) * 2.5
      const idleScaleY = 1 + Math.sin(ts / 240) * 0.04
      const idleScaleX = 1 - Math.sin(ts / 210) * 0.03
      const idleGlow = 0.7 + Math.sin(ts / 500) * 0.12
      const idleInner = 1 + Math.sin(ts / 200) * 0.06

      const lean = s * 28
      const windJitter =
        s > 0.08
          ? (Math.sin(ts / 40) * 0.5 + Math.sin(ts / 23) * 0.5) * s * 10
          : 0

      gsap.set(flame, {
        x: idleX * (1 - mix) + lean + windJitter,
        rotation: idleRot * (1 - mix) + lean * 0.45 + windJitter * 0.3,
        scaleX: gsap.utils.interpolate(idleScaleX, 1 + s * 0.55, mix),
        scaleY: gsap.utils.interpolate(
          idleScaleY,
          Math.max(0.25, 1 - s * 0.85),
          mix,
        ),
        opacity: Math.max(0.18, 1 - s * 0.75),
      })
      gsap.set(inner, {
        scaleY: gsap.utils.interpolate(idleInner, 0.35, mix),
      })
      gsap.set(glow, {
        opacity: gsap.utils.interpolate(idleGlow, 0.15, mix),
        scale: gsap.utils.interpolate(1.02, 0.55, mix),
      })

      if (s >= EXTINGUISH_STRENGTH) {
        holdMsRef.current += dt
      } else {
        holdMsRef.current = Math.max(0, holdMsRef.current - dt * 1.4)
      }

      if (holdMsRef.current >= EXTINGUISH_HOLD_MS) {
        extinguishedRef.current = true
        playExtinguish()
        onExtinguishedRef.current?.()
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="candle-stage" ref={rootRef} aria-hidden="true">
      <div className="candle-glow" ref={glowRef} />
      <div className="candle">
        <div className="flame-wrap">
          <div className="smoke" ref={smokeRef} />
          <div className="flame" ref={flameRef}>
            <div className="flame-outer" />
            <div className="flame-inner" ref={innerRef} />
            <div className="flame-core" />
          </div>
          <div className="wick-ember" ref={wickTipRef} />
        </div>
        <div className="wick" />
        <div className="wax">
          <div className="wax-shine" />
          <div className="wax-drip" />
        </div>
        <div className="holder">
          <div className="holder-rim" />
          <div className="holder-body" />
        </div>
      </div>
      <div className="table-plane" />
    </div>
  )
}
