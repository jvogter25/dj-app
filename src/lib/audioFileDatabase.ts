import { AudioSource } from '../types/mixStudio'

interface StoredAudioFile {
  id: string
  file: File
  metadata: AudioSource
  addedAt: number
}

class AudioFileDatabase {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'DJStudioAudioFiles'
  private readonly DB_VERSION = 1
  private readonly STORE_NAME = 'audioFiles'
  
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        console.log('Audio file database initialized')
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' })
          store.createIndex('addedAt', 'addedAt', { unique: false })
        }
      }
    })
  }
  
  async saveFile(file: File, metadata: AudioSource): Promise<void> {
    if (!this.db) await this.init()
    
    const storedFile: StoredAudioFile = {
      id: metadata.id,
      file,
      metadata,
      addedAt: Date.now()
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.put(storedFile)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
  
  async getFile(id: string): Promise<StoredAudioFile | null> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.get(id)
      
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }
  
  async getAllFiles(): Promise<StoredAudioFile[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }
  
  async deleteFile(id: string): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.delete(id)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
  
  async getFileUrl(id: string): Promise<string | null> {
    const storedFile = await this.getFile(id)
    if (!storedFile) return null
    
    return URL.createObjectURL(storedFile.file)
  }
  
  async getTotalSize(): Promise<number> {
    const files = await this.getAllFiles()
    return files.reduce((total, file) => total + file.file.size, 0)
  }
}

// Singleton instance
export const audioFileDB = new AudioFileDatabase()

// Initialize on import
audioFileDB.init().catch(console.error)