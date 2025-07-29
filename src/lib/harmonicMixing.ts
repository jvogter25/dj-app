// Harmonic mixing utilities using the Camelot Wheel system

// Mapping of Spotify keys to Camelot notation
const CAMELOT_WHEEL = {
  // Major keys (B)
  '0-1': '8B',   // C Major
  '1-1': '3B',   // C# Major
  '2-1': '10B',  // D Major
  '3-1': '5B',   // D# Major
  '4-1': '12B',  // E Major
  '5-1': '7B',   // F Major
  '6-1': '2B',   // F# Major
  '7-1': '9B',   // G Major
  '8-1': '4B',   // G# Major
  '9-1': '11B',  // A Major
  '10-1': '6B',  // A# Major
  '11-1': '1B',  // B Major
  
  // Minor keys (A)
  '0-0': '5A',   // C Minor
  '1-0': '12A',  // C# Minor
  '2-0': '7A',   // D Minor
  '3-0': '2A',   // D# Minor
  '4-0': '9A',   // E Minor
  '5-0': '4A',   // F Minor
  '6-0': '11A',  // F# Minor
  '7-0': '6A',   // G Minor
  '8-0': '1A',   // G# Minor
  '9-0': '8A',   // A Minor
  '10-0': '3A',  // A# Minor
  '11-0': '10A', // B Minor
}

// Musical key names
const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export interface HarmonicMatch {
  camelotKey: string
  compatibility: 'perfect' | 'good' | 'energy' | 'mood'
  description: string
}

export function getCamelotKey(spotifyKey: number, spotifyMode: number): string {
  const key = `${spotifyKey}-${spotifyMode}` as keyof typeof CAMELOT_WHEEL
  return CAMELOT_WHEEL[key] || 'Unknown'
}

export function getKeyName(spotifyKey: number, spotifyMode: number): string {
  const keyName = KEY_NAMES[spotifyKey] || 'Unknown'
  const mode = spotifyMode === 1 ? 'Major' : 'Minor'
  return `${keyName} ${mode}`
}

export function getHarmonicMatches(camelotKey: string): HarmonicMatch[] {
  if (!camelotKey || camelotKey === 'Unknown') return []
  
  const matches: HarmonicMatch[] = []
  const [numberStr, letter] = camelotKey.match(/(\d+)([AB])/)?.slice(1) || []
  if (!numberStr || !letter) return []
  
  const number = parseInt(numberStr)
  
  // Same key (perfect match)
  matches.push({
    camelotKey,
    compatibility: 'perfect',
    description: 'Same key - Perfect for layering'
  })
  
  // Adjacent keys on the wheel (±1)
  const prevNumber = number === 1 ? 12 : number - 1
  const nextNumber = number === 12 ? 1 : number + 1
  
  matches.push({
    camelotKey: `${prevNumber}${letter}`,
    compatibility: 'perfect',
    description: 'Adjacent key - Smooth transition'
  })
  
  matches.push({
    camelotKey: `${nextNumber}${letter}`,
    compatibility: 'perfect',
    description: 'Adjacent key - Smooth transition'
  })
  
  // Relative major/minor (same number, different letter)
  const otherLetter = letter === 'A' ? 'B' : 'A'
  matches.push({
    camelotKey: `${number}${otherLetter}`,
    compatibility: 'good',
    description: `Relative ${letter === 'A' ? 'major' : 'minor'} - Mood change`
  })
  
  // Energy boost keys (+7 semitones)
  const energyNumber = number + 7 > 12 ? number + 7 - 12 : number + 7
  matches.push({
    camelotKey: `${energyNumber}${letter}`,
    compatibility: 'energy',
    description: 'Energy boost - Dramatic transition'
  })
  
  // Mood shift keys (+2 or -2)
  const moodUp = number + 2 > 12 ? number + 2 - 12 : number + 2
  const moodDown = number - 2 < 1 ? number - 2 + 12 : number - 2
  
  matches.push({
    camelotKey: `${moodUp}${letter}`,
    compatibility: 'mood',
    description: 'Mood shift up - Building energy'
  })
  
  matches.push({
    camelotKey: `${moodDown}${letter}`,
    compatibility: 'mood',
    description: 'Mood shift down - Cooling down'
  })
  
  return matches
}

export function getKeyCompatibility(key1: string, key2: string): number {
  if (key1 === key2) return 1.0 // Perfect match
  
  const matches = getHarmonicMatches(key1)
  const match = matches.find(m => m.camelotKey === key2)
  
  if (!match) return 0.3 // Not harmonically compatible
  
  switch (match.compatibility) {
    case 'perfect': return 1.0
    case 'good': return 0.8
    case 'energy': return 0.6
    case 'mood': return 0.5
    default: return 0.3
  }
}

// Get color for Camelot key visualization
export function getCamelotColor(camelotKey: string): string {
  const colors = {
    '1A': '#FF6B6B',  '1B': '#FFB6B6',  // Red
    '2A': '#FF8E53',  '2B': '#FFD4C4',  // Orange
    '3A': '#FFE66D',  '3B': '#FFF4DD',  // Yellow
    '4A': '#A8E6CF',  '4B': '#D4F1E6',  // Light Green
    '5A': '#7FDD97',  '5B': '#B8E8C8',  // Green
    '6A': '#7FCDCD',  '6B': '#B8E0E0',  // Cyan
    '7A': '#6FA8DC',  '7B': '#B4D4F1',  // Light Blue
    '8A': '#8E7CC3',  '8B': '#C7BDE2',  // Purple
    '9A': '#C27BA0',  '9B': '#E1BDD0',  // Pink
    '10A': '#E06666', '10B': '#F0B3B3', // Light Red
    '11A': '#F6B26B', '11B': '#FBD9B5', // Light Orange
    '12A': '#FFD966', '12B': '#FFECB3', // Light Yellow
  }
  
  return colors[camelotKey as keyof typeof colors] || '#666666'
}