import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

type CandleProps = {
  /** Blow intensity 0–1 from the microphone. */
  blowStrength: number
  lit: boolean
  /** Keep wick smoke drifting (e.g. while the song plays). */
  smoking?: boolean
  onExtinguished?: () => void
}

/** Sustained blow above this extinguishes the flame. */
const EXTINGUISH_STRENGTH = 0.68
/** How long (ms) the blow must stay strong before going out. */
const EXTINGUISH_HOLD_MS = 480

export function Candle({
  blowStrength,
  lit,
  smoking = false,
  onExtinguished,
}: CandleProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const flameRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const puffRefs = useRef<(HTMLDivElement | null)[]>([])
  const wickTipRef = useRef<HTMLDivElement>(null)

  const blowRef = useRef(blowStrength)
  blowRef.current = blowStrength

  const litRef = useRef(lit)
  litRef.current = lit

  const holdMsRef = useRef(0)
  const lastTsRef = useRef<number | null>(null)
  const extinguishedRef = useRef(false)
  const smokeTlRef = useRef<gsap.core.Timeline | null>(null)
  const onExtinguishedRef = useRef(onExtinguished)
  onExtinguishedRef.current = onExtinguished

  const getPuffs = () =>
    puffRefs.current.filter(Boolean) as HTMLDivElement[]

  const stopSmoke = (fade = false) => {
    smokeTlRef.current?.kill()
    smokeTlRef.current = null
    const puffs = getPuffs()
    gsap.killTweensOf(puffs)
    if (fade) {
      gsap.to(puffs, {
        opacity: 0,
        y: '-=28',
        scale: '+=0.2',
        duration: 0.7,
        ease: 'power1.in',
        stagger: 0.06,
      })
    } else {
      gsap.set(puffs, { opacity: 0, y: 0, x: 0, scale: 0.5, rotation: 0 })
    }
  }

  const startLingeringSmoke = () => {
    const puffs = getPuffs()
    if (!puffs.length) return

    smokeTlRef.current?.kill()
    gsap.killTweensOf(puffs)

    const tl = gsap.timeline({ repeat: -1 })
    smokeTlRef.current = tl

    puffs.forEach((puff, i) => {
      const drift = (i % 2 === 0 ? 1 : -1) * (7 + i * 4)
      const delay = i * 0.5
      const rise = 64 + i * 16
      const duration = 2.6 + i * 0.3

      tl.fromTo(
        puff,
        {
          opacity: 0,
          y: 4,
          x: 2 + i,
          scale: 0.3 + i * 0.06,
          rotation: -6 + i * 3,
        },
        {
          opacity: 0.42 - i * 0.05,
          y: -rise * 0.42,
          x: drift * 0.35,
          scale: 0.8 + i * 0.1,
          rotation: drift * 0.5,
          duration: duration * 0.42,
          ease: 'sine.out',
        },
        delay,
      )
      tl.to(
        puff,
        {
          opacity: 0,
          y: -rise,
          x: drift,
          scale: 1.4 + i * 0.12,
          rotation: drift * 0.9,
          duration: duration * 0.58,
          ease: 'power1.in',
        },
        delay + duration * 0.42,
      )
    })
  }

  // Relight: clear smoke and revive flame.
  useGSAP(
    () => {
      if (!lit || !flameRef.current || !wickTipRef.current) return

      extinguishedRef.current = false
      holdMsRef.current = 0
      lastTsRef.current = null
      stopSmoke(false)

      gsap.killTweensOf([flameRef.current, wickTipRef.current, glowRef.current])
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

  // When the song ends (smoking off) before relight, ease smoke away.
  useGSAP(
    () => {
      if (!smoking && !lit && smokeTlRef.current) {
        stopSmoke(true)
      }
    },
    { dependencies: [smoking, lit], scope: rootRef },
  )

  useEffect(() => {
    const flame = flameRef.current
    const inner = innerRef.current
    const glow = glowRef.current
    const wickTip = wickTipRef.current
    if (!flame || !inner || !glow || !wickTip) return

    let raf = 0

    const playExtinguish = () => {
      const puffs = getPuffs()
      gsap.killTweensOf([flame, inner, glow, ...puffs])

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
        .to(wickTip, { opacity: 0.9, duration: 0.2 }, 0.15)
        .fromTo(
          puffs[0],
          { opacity: 0, y: 8, x: 14, scale: 0.45, rotation: 12 },
          {
            opacity: 0.62,
            y: -40,
            x: 6,
            scale: 1.2,
            rotation: 4,
            duration: 0.95,
            ease: 'power1.out',
          },
          0.06,
        )
        .to(
          puffs[0],
          {
            opacity: 0,
            y: -78,
            x: 0,
            scale: 1.55,
            duration: 0.75,
            ease: 'power1.in',
            onComplete: () => startLingeringSmoke(),
          },
          0.9,
        )
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
    return () => {
      cancelAnimationFrame(raf)
      stopSmoke(false)
    }
  }, [])

  return (
    <div className="candle-stage" ref={rootRef} aria-hidden="true">
      <div className="candle-glow" ref={glowRef} />
      <div className="candle">
        <div className="flame-wrap">
          <div className="smoke-layer">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`smoke smoke-${i}`}
                ref={(el) => {
                  puffRefs.current[i] = el
                }}
              />
            ))}
          </div>
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
