/**
 * Edit each stanza’s `text` to customize the on-screen lyrics.
 * `beats` should stay aligned with the melody timing in happyBirthday.ts.
 */
export type LyricStanza = {
  text: string
  /** Duration of this line in song beats (at the same BPM as the melody). */
  beats: number
}

export const LYRICS: LyricStanza[] = [
  { text: 'Happy birthday Pryam', beats: 6 },
  { text: 'Happy birthday Pryam', beats: 6 },
  { text: 'Happy birthday bro Pryam', beats: 6 },
  { text: 'Happy birthday', beats: 3 },
  { text: 'To you', beats: 2 },
]
