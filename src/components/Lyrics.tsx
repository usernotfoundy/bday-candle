import { LYRICS } from '../lyrics'

type LyricsProps = {
  activeIndex: number
  visible: boolean
}

export function Lyrics({ activeIndex, visible }: LyricsProps) {
  return (
    <div
      className={`lyrics${visible ? ' lyrics-visible' : ''}`}
      aria-live="polite"
      aria-hidden={!visible}
    >
      <ul className="lyrics-list">
        {LYRICS.map((stanza, index) => (
          <li
            key={`${index}-${stanza.text}`}
            className={
              index === activeIndex
                ? 'lyrics-line lyrics-line-active'
                : index < activeIndex
                  ? 'lyrics-line lyrics-line-done'
                  : 'lyrics-line'
            }
          >
            {stanza.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
