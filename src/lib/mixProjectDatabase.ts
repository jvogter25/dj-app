import { MixProject } from '../types/mixStudio'

class MixProjectDatabase {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'DJStudioMixProjects'
  private readonly DB_VERSION = 1
  private readonly STORE_NAME = 'projects'
  
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        console.log('Mix project database initialized')
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' })
          
          // Indexes for querying
          store.createIndex('name', 'name', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
          store.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
      }
    })
  }
  
  async saveProject(project: MixProject): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.put(project)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
  
  async getProject(id: string): Promise<MixProject | null> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.get(id)
      
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }
  
  async getAllProjects(): Promise<MixProject[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const index = store.index('updatedAt')
      const request = index.openCursor(null, 'prev') // Sort by most recent
      
      const projects: MixProject[] = []
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          projects.push(cursor.value)
          cursor.continue()
        } else {
          resolve(projects)
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  }
  
  async deleteProject(id: string): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.delete(id)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
  
  async searchProjects(query: string): Promise<MixProject[]> {
    const allProjects = await this.getAllProjects()
    const lowercaseQuery = query.toLowerCase()
    
    return allProjects.filter(project => 
      project.name.toLowerCase().includes(lowercaseQuery)
    )
  }
}

// Singleton instance
export const mixProjectDB = new MixProjectDatabase()

// Initialize on import
mixProjectDB.init().catch(console.error)