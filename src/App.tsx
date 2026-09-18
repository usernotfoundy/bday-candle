import { useCallback, useEffect, useState } from 'react'
import { Candle } from './components/Candle'
import { useBlowDetection } from './hooks/useBlowDetection'
import './App.css'

function statusLabel(
  status: ReturnType<typeof useBlowDetection>['status'],
  lit: boolean,
) {
  if (!lit) return 'Make a wish — then reset the candle when you are ready.'
  switch (status) {
    case 'idle':
    case 'requesting':
      return 'Getting the microphone ready…'
    case 'listening':
      return 'Blow toward the candle — gently to bend the flame, harder to put it out.'
    case 'denied':
      return 'Microphone access was blocked. Allow it in your browser settings, then reset.'
    case 'error':
      return 'Could not open the microphone. Try another browser or device.'
  }
}

function App() {
  const [lit, setLit] = useState(true)
  const { status, strength, start, isListening } = useBlowDetection()

  useEffect(() => {
    void start()
  }, [start])

  const handleExtinguished = useCallback(() => {
    setLit(false)
  }, [])

  const handleReset = () => {
    setLit(true)
    if (!isListening) void start()
  }

  return (
    <div className="scene">
      <div className="scene-wash" />
      <div className="scene-vignette" />

      <header className="brand">
        <p className="brand-mark">Wishlight</p>
      </header>

      <main className="hero">
        <Candle
          blowStrength={lit && isListening ? strength : 0}
          lit={lit}
          onExtinguished={handleExtinguished}
        />

        <div className="hero-copy">
          <h1>Blow out the candle</h1>
          <p>{statusLabel(status, lit)}</p>
        </div>

        <div className="actions">
          <button type="button" className="btn primary" onClick={handleReset}>
            Reset candle
          </button>
        </div>

        {isListening && lit && (
          <div
            className="breath-meter"
            role="meter"
            aria-label="Blow strength"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(strength * 100)}
          >
            <span className="breath-label">Breath</span>
            <div className="breath-track">
              <div
                className="breath-fill"
                style={{ transform: `scaleX(${strength})` }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
