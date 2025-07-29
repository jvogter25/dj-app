// IndexedDB wrapper for track analysis caching
export interface TrackAnalysis {
  id: string // Spotify track ID
  uri: string
  name: string
  artists: string[]
  album: string
  duration: number
  analyzedAt: number // timestamp
  
  // Spotify audio features
  tempo: number
  energy: number
  danceability: number
  valence: number // happiness/positivity
  acousticness: number
  instrumentalness: number
  speechiness: number
  loudness: number
  key: number // 0-11 (C, C#, D, etc.)
  mode: number // 0 = minor, 1 = major
  time_signature: number
  
  // Computed features
  camelotKey?: string // e.g., "8A", "5B"
  energyLevel?: 'low' | 'medium' | 'high'
  moodCategory?: 'dark' | 'neutral' | 'bright'
  
  // Future: Advanced analysis
  sections?: any[] // Song structure
  beatGrid?: number[] // Beat positions
  harmonicProfile?: any // Chord progression data
}

class TrackDatabase {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'DJStudioTracks'
  private readonly DB_VERSION = 1
  private readonly STORE_NAME = 'tracks'
  
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        console.log('Track database initialized')
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' })
          
          // Indexes for querying
          store.createIndex('tempo', 'tempo', { unique: false })
          store.createIndex('energy', 'energy', { unique: false })
          store.createIndex('key', 'key', { unique: false })
          store.createIndex('camelotKey', 'camelotKey', { unique: false })
          store.createIndex('analyzedAt', 'analyzedAt', { unique: false })
        }
      }
    })
  }
  
  async saveTrack(track: TrackAnalysis): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.put(track)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
  
  async getTrack(id: string): Promise<TrackAnalysis | null> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.get(id)
      
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }
  
  async searchByTempo(targetTempo: number, tempoRange: number = 5): Promise<TrackAnalysis[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const index = store.index('tempo')
      
      const results: TrackAnalysis[] = []
      const range = IDBKeyRange.bound(targetTempo - tempoRange, targetTempo + tempoRange)
      const request = index.openCursor(range)
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  }
  
  async searchByEnergy(minEnergy: number, maxEnergy: number): Promise<TrackAnalysis[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const index = store.index('energy')
      
      const results: TrackAnalysis[] = []
      const range = IDBKeyRange.bound(minEnergy, maxEnergy)
      const request = index.openCursor(range)
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  }
  
  async getAllTracks(): Promise<TrackAnalysis[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }
  
  async clear(): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.clear()
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

// Singleton instance
export const trackDB = new TrackDatabase()

// Initialize on import
trackDB.init().catch(console.error)