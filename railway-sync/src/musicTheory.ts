/**
 * musicTheory.ts
 * Convert Spotify key/mode values to Camelot Wheel notation for harmonic mixing.
 */

// Camelot key mapping: [key (0-11)][mode (0=minor, 1=major)]
const CAMELOT_MAP: Record<number, Record<number, string>> = {
  0:  { 0: '5A', 1: '8B' },  // C
  1:  { 0: '12A', 1: '3B' }, // C#/Db
  2:  { 0: '7A', 1: '10B' }, // D
  3:  { 0: '2A', 1: '5B' },  // D#/Eb
  4:  { 0: '9A', 1: '12B' }, // E
  5:  { 0: '4A', 1: '7B' },  // F
  6:  { 0: '11A', 1: '2B' }, // F#/Gb
  7:  { 0: '6A', 1: '9B' },  // G
  8:  { 0: '1A', 1: '4B' },  // G#/Ab
  9:  { 0: '8A', 1: '11B' }, // A
  10: { 0: '3A', 1: '6B' },  // A#/Bb
  11: { 0: '10A', 1: '1B' }, // B
}

const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const MODE_NAMES = ['minor', 'major']

export function camelotKey(key: number, mode: number): string | null {
  if (key < 0 || key > 11) return null
  return CAMELOT_MAP[key]?.[mode] ?? null
}

export function keyName(key: number, mode: number): string {
  const name = KEY_NAMES[key] ?? '?'
  const modeName = MODE_NAMES[mode] ?? '?'
  return `${name} ${modeName}`
}

/**
 * Are two tracks harmonically compatible?
 * Compatible = same Camelot number (A↔B), ±1 Camelot number
 */
export function areHarmonicallyCompatible(camelot1: string, camelot2: string): boolean {
  const num1 = parseInt(camelot1)
  const letter1 = camelot1.slice(-1)
  const num2 = parseInt(camelot2)
  const letter2 = camelot2.slice(-1)

  if (isNaN(num1) || isNaN(num2)) return false

  // Same position (exact match)
  if (num1 === num2 && letter1 === letter2) return true

  // Same number, different letter (relative major/minor)
  if (num1 === num2) return true

  // Adjacent on the wheel (±1, wrapping around 12→1)
  const diff = Math.abs(num1 - num2)
  if ((diff === 1 || diff === 11) && letter1 === letter2) return true

  return false
}
