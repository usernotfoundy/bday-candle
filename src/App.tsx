import { useCallback, useEffect, useState } from 'react'
import { Candle } from './components/Candle'
import { Lyrics } from './components/Lyrics'
import { useBlowDetection } from './hooks/useBlowDetection'
import { playHappyBirthday, stopHappyBirthday } from './audio/happyBirthday'
import './App.css'

function statusLabel(
  status: ReturnType<typeof useBlowDetection>['status'],
  lit: boolean,
  singing: boolean,
) {
  if (singing) return 'A little voice is singing for you…'
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
  const [singing, setSinging] = useState(false)
  const [stanzaIndex, setStanzaIndex] = useState(-1)
  const { status, strength, start, isListening } = useBlowDetection()

  useEffect(() => {
    void start()
  }, [start])

  useEffect(() => () => stopHappyBirthday(), [])

  const handleExtinguished = useCallback(() => {
    setLit(false)
    setSinging(true)
    setStanzaIndex(0)
    void playHappyBirthday({
      onStanza: (index) => setStanzaIndex(index),
    }).then((result) => {
      setSinging(false)
      setStanzaIndex(-1)
      if (result === 'finished') setLit(true)
    })
  }, [])

  const handleReset = () => {
    stopHappyBirthday()
    setSinging(false)
    setStanzaIndex(-1)
    setLit(true)
    if (!isListening) void start()
  }

  return (
    <div className="scene">
      <div className="scene-wash" />
      <div className="scene-vignette" />

      <header className="brand">
        <p className="brand-mark">Wishlight</p>
        <Lyrics activeIndex={stanzaIndex} visible={singing} />
      </header>

      <main className="hero">
        <Candle
          blowStrength={lit && isListening ? strength : 0}
          lit={lit}
          smoking={singing}
          onExtinguished={handleExtinguished}
        />

        <div className="hero-copy">
          <h1>Blow out the candle</h1>
          <p>{statusLabel(status, lit, singing)}</p>
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
