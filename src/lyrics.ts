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
  { text: 'Papa pwet si Pryam', beats: 6 },
  { text: 'Papa pwet si Pryam', beats: 6 },
  { text: 'Happy birthday dear Pryam', beats: 6 },
  { text: 'Papa pwet na', beats: 3 },
  { text: 'ulit yan', beats: 2 },
]
