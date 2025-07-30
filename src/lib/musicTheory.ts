// Production Music Theory Utilities
// Provides key detection, harmonic mixing, and music theory calculations

export interface MusicKey {
  notation: string       // e.g., "C", "Am", "F#m"
  camelot: string       // e.g., "8B", "5A"
  alternativeCamelot?: string[] // Alternative Camelot notations
  openKey: string       // Open Key notation
  name: string         // Full name e.g., "C Major", "A Minor"
  type: 'major' | 'minor'
  pitchClass: number   // 0-11 (C=0, C#=1, etc.)
}

// Complete Camelot wheel mapping
export const MUSIC_KEYS: MusicKey[] = [
  // Major keys (Camelot A)
  { notation: 'C', camelot: '8B', openKey: '1d', name: 'C Major', type: 'major', pitchClass: 0 },
  { notation: 'G', camelot: '9B', openKey: '2d', name: 'G Major', type: 'major', pitchClass: 7 },
  { notation: 'D', camelot: '10B', openKey: '3d', name: 'D Major', type: 'major', pitchClass: 2 },
  { notation: 'A', camelot: '11B', openKey: '4d', name: 'A Major', type: 'major', pitchClass: 9 },
  { notation: 'E', camelot: '12B', openKey: '5d', name: 'E Major', type: 'major', pitchClass: 4 },
  { notation: 'B', camelot: '1B', openKey: '6d', name: 'B Major', type: 'major', pitchClass: 11 },
  { notation: 'F#', camelot: '2B', alternativeCamelot: ['Gb'], openKey: '7d', name: 'F# Major', type: 'major', pitchClass: 6 },
  { notation: 'Db', camelot: '3B', alternativeCamelot: ['C#'], openKey: '8d', name: 'Db Major', type: 'major', pitchClass: 1 },
  { notation: 'Ab', camelot: '4B', alternativeCamelot: ['G#'], openKey: '9d', name: 'Ab Major', type: 'major', pitchClass: 8 },
  { notation: 'Eb', camelot: '5B', alternativeCamelot: ['D#'], openKey: '10d', name: 'Eb Major', type: 'major', pitchClass: 3 },
  { notation: 'Bb', camelot: '6B', alternativeCamelot: ['A#'], openKey: '11d', name: 'Bb Major', type: 'major', pitchClass: 10 },
  { notation: 'F', camelot: '7B', openKey: '12d', name: 'F Major', type: 'major', pitchClass: 5 },
  
  // Minor keys (Camelot A)
  { notation: 'Am', camelot: '8A', openKey: '1m', name: 'A Minor', type: 'minor', pitchClass: 9 },
  { notation: 'Em', camelot: '9A', openKey: '2m', name: 'E Minor', type: 'minor', pitchClass: 4 },
  { notation: 'Bm', camelot: '10A', openKey: '3m', name: 'B Minor', type: 'minor', pitchClass: 11 },
  { notation: 'F#m', camelot: '11A', alternativeCamelot: ['Gbm'], openKey: '4m', name: 'F# Minor', type: 'minor', pitchClass: 6 },
  { notation: 'C#m', camelot: '12A', alternativeCamelot: ['Dbm'], openKey: '5m', name: 'C# Minor', type: 'minor', pitchClass: 1 },
  { notation: 'G#m', camelot: '1A', alternativeCamelot: ['Abm'], openKey: '6m', name: 'G# Minor', type: 'minor', pitchClass: 8 },
  { notation: 'D#m', camelot: '2A', alternativeCamelot: ['Ebm'], openKey: '7m', name: 'D# Minor', type: 'minor', pitchClass: 3 },
  { notation: 'Bbm', camelot: '3A', alternativeCamelot: ['A#m'], openKey: '8m', name: 'Bb Minor', type: 'minor', pitchClass: 10 },
  { notation: 'Fm', camelot: '4A', openKey: '9m', name: 'F Minor', type: 'minor', pitchClass: 5 },
  { notation: 'Cm', camelot: '5A', openKey: '10m', name: 'C Minor', type: 'minor', pitchClass: 0 },
  { notation: 'Gm', camelot: '6A', openKey: '11m', name: 'G Minor', type: 'minor', pitchClass: 7 },
  { notation: 'Dm', camelot: '7A', openKey: '12m', name: 'D Minor', type: 'minor', pitchClass: 2 }
]

// Get compatible keys for harmonic mixing
export function getCompatibleKeys(keyNotation: string): string[] {
  const sourceKey = MUSIC_KEYS.find(k => 
    k.notation === keyNotation || 
    k.camelot === keyNotation ||
    k.alternativeCamelot?.includes(keyNotation)
  )
  
  if (!sourceKey) return []
  
  const compatible: string[] = []
  const camelotNumber = parseInt(sourceKey.camelot)
  const camelotLetter = sourceKey.camelot.slice(-1)
  
  // Same key (perfect match)
  compatible.push(sourceKey.notation)
  
  // Adjacent keys on the wheel (±1)
  const prevNumber = camelotNumber === 1 ? 12 : camelotNumber - 1
  const nextNumber = camelotNumber === 12 ? 1 : camelotNumber + 1
  
  // Same letter, adjacent numbers
  const prevKey = MUSIC_KEYS.find(k => k.camelot === `${prevNumber}${camelotLetter}`)
  const nextKey = MUSIC_KEYS.find(k => k.camelot === `${nextNumber}${camelotLetter}`)
  
  if (prevKey) compatible.push(prevKey.notation)
  if (nextKey) compatible.push(nextKey.notation)
  
  // Switch between major/minor (same number, different letter)
  const oppositeKey = MUSIC_KEYS.find(k => 
    k.camelot === `${camelotNumber}${camelotLetter === 'A' ? 'B' : 'A'}`
  )
  if (oppositeKey) compatible.push(oppositeKey.notation)
  
  return compatible
}

// Get Camelot number from key
export function getCamelotNumber(keyNotation: string): number {
  const key = MUSIC_KEYS.find(k => 
    k.notation === keyNotation || 
    k.camelot === keyNotation ||
    k.alternativeCamelot?.includes(keyNotation)
  )
  
  return key ? parseInt(key.camelot) : 0
}

// Get Camelot notation from key
export function getCamelotNotation(keyNotation: string): string {
  const key = MUSIC_KEYS.find(k => 
    k.notation === keyNotation || 
    k.alternativeCamelot?.includes(keyNotation)
  )
  
  return key ? key.camelot : ''
}

// Detect key from pitch class distribution
export function detectKeyFromPitchClass(pitchClasses: number[]): MusicKey | null {
  // Simplified key detection - would use more sophisticated algorithm in production
  // This is a placeholder implementation
  const maxIndex = pitchClasses.indexOf(Math.max(...pitchClasses))
  
  // Try to find a matching key based on dominant pitch class
  const possibleKeys = MUSIC_KEYS.filter(k => k.pitchClass === maxIndex)
  
  // Return major key by default if found
  return possibleKeys.find(k => k.type === 'major') || possibleKeys[0] || null
}

// Calculate harmonic compatibility score between two keys
export function getHarmonicCompatibility(key1: string, key2: string): number {
  const compatibleKeys = getCompatibleKeys(key1)
  
  if (key1 === key2) return 1.0 // Perfect match
  if (compatibleKeys.includes(key2)) return 0.8 // Compatible
  
  // Check if they share the same root note
  const k1 = MUSIC_KEYS.find(k => k.notation === key1)
  const k2 = MUSIC_KEYS.find(k => k.notation === key2)
  
  if (k1 && k2 && k1.pitchClass === k2.pitchClass) return 0.6 // Same root
  
  return 0.3 // Not very compatible
}

// Get relative major/minor key
export function getRelativeKey(keyNotation: string): string | null {
  const key = MUSIC_KEYS.find(k => k.notation === keyNotation)
  if (!key) return null
  
  if (key.type === 'major') {
    // Find relative minor (down 3 semitones)
    const relativePitch = (key.pitchClass - 3 + 12) % 12
    const relativeKey = MUSIC_KEYS.find(k => 
      k.type === 'minor' && k.pitchClass === relativePitch
    )
    return relativeKey?.notation || null
  } else {
    // Find relative major (up 3 semitones)
    const relativePitch = (key.pitchClass + 3) % 12
    const relativeKey = MUSIC_KEYS.find(k => 
      k.type === 'major' && k.pitchClass === relativePitch
    )
    return relativeKey?.notation || null
  }
}

// Energy level transitions for harmonic mixing
export function getEnergyTransition(fromKey: string, toKey: string): 'boost' | 'maintain' | 'reduce' {
  const from = MUSIC_KEYS.find(k => k.notation === fromKey)
  const to = MUSIC_KEYS.find(k => k.notation === toKey)
  
  if (!from || !to) return 'maintain'
  
  const fromNumber = parseInt(from.camelot)
  const toNumber = parseInt(to.camelot)
  
  // Moving up the wheel = energy boost
  if (toNumber > fromNumber || (fromNumber === 12 && toNumber === 1)) {
    return 'boost'
  }
  // Moving down = energy reduction
  else if (toNumber < fromNumber || (fromNumber === 1 && toNumber === 12)) {
    return 'reduce'
  }
  
  return 'maintain'
}