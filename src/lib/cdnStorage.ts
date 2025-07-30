import { supabase } from './supabase'

export interface StemFile {
  id: string
  trackId: string
  stemType: 'drums' | 'bass' | 'vocals' | 'other' | 'full'
  fileName: string
  filePath: string
  fileSize: number
  duration: number
  sampleRate: number
  bitRate: number
  format: 'wav' | 'mp3' | 'flac'
  createdAt: Date
  url?: string
}

export interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
}

export class CDNStorageService {
  private readonly BUCKET_NAME = 'stem-files'
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
  private readonly ALLOWED_FORMATS = ['wav', 'mp3', 'flac', 'ogg', 'm4a']

  constructor() {
    this.initializeBucket()
  }

  private async initializeBucket() {
    try {
      // Check if bucket exists, create if it doesn't
      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME)
      
      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: false,
          allowedMimeTypes: [
            'audio/wav',
            'audio/wave',
            'audio/x-wav',
            'audio/mpeg',
            'audio/mp3',
            'audio/flac',
            'audio/ogg',
            'audio/mp4'
          ],
          fileSizeLimit: this.MAX_FILE_SIZE
        })
        
        if (error) {
          console.error('Error creating stems bucket:', error)
        }
      }
    } catch (error) {
      console.error('Error initializing CDN storage:', error)
    }
  }

  /**
   * Upload a stem file to CDN storage
   */
  async uploadStem(
    trackId: string,
    stemType: StemFile['stemType'],
    audioBuffer: ArrayBuffer,
    metadata: {
      fileName: string
      format: StemFile['format']
      duration: number
      sampleRate: number
      bitRate: number
    },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<StemFile | null> {
    try {
      const { fileName, format, duration, sampleRate, bitRate } = metadata
      
      // Validate file size
      if (audioBuffer.byteLength > this.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`)
      }

      // Generate unique file path
      const timestamp = Date.now()
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileExtension = format === 'wav' ? 'wav' : format
      const filePath = `tracks/${trackId}/stems/${stemType}_${timestamp}.${fileExtension}`

      onProgress?.({
        fileName,
        progress: 0,
        status: 'uploading'
      })

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, audioBuffer, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
          contentType: this.getMimeType(format)
        })

      if (uploadError) {
        onProgress?.({
          fileName,
          progress: 0,
          status: 'error',
          error: uploadError.message
        })
        throw uploadError
      }

      onProgress?.({
        fileName,
        progress: 50,
        status: 'processing'
      })

      // Save metadata to database
      const stemRecord: Omit<StemFile, 'id' | 'createdAt'> = {
        trackId,
        stemType,
        fileName: sanitizedFileName,
        filePath: uploadData.path,
        fileSize: audioBuffer.byteLength,
        duration,
        sampleRate,
        bitRate,
        format
      }

      const { data: dbData, error: dbError } = await supabase
        .from('stem_files')
        .insert(stemRecord)
        .select()
        .single()

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await this.deleteStem(uploadData.path)
        onProgress?.({
          fileName,
          progress: 0,
          status: 'error',
          error: dbError.message
        })
        throw dbError
      }

      onProgress?.({
        fileName,
        progress: 100,
        status: 'complete'
      })

      return {
        ...dbData,
        createdAt: new Date(dbData.created_at)
      }
    } catch (error) {
      console.error('Error uploading stem:', error)
      onProgress?.({
        fileName: metadata.fileName,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
      return null
    }
  }

  /**
   * Get all stems for a track
   */
  async getStems(trackId: string): Promise<StemFile[]> {
    try {
      const { data, error } = await supabase
        .from('stem_files')
        .select('*')
        .eq('track_id', trackId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data.map(record => ({
        id: record.id,
        trackId: record.track_id,
        stemType: record.stem_type,
        fileName: record.file_name,
        filePath: record.file_path,
        fileSize: record.file_size,
        duration: record.duration,
        sampleRate: record.sample_rate,
        bitRate: record.bit_rate,
        format: record.format,
        createdAt: new Date(record.created_at)
      }))
    } catch (error) {
      console.error('Error fetching stems:', error)
      return []
    }
  }

  /**
   * Get a specific stem file
   */
  async getStem(stemId: string): Promise<StemFile | null> {
    try {
      const { data, error } = await supabase
        .from('stem_files')
        .select('*')
        .eq('id', stemId)
        .single()

      if (error) throw error

      return {
        id: data.id,
        trackId: data.track_id,
        stemType: data.stem_type,
        fileName: data.file_name,
        filePath: data.file_path,
        fileSize: data.file_size,
        duration: data.duration,
        sampleRate: data.sample_rate,
        bitRate: data.bit_rate,
        format: data.format,
        createdAt: new Date(data.created_at)
      }
    } catch (error) {
      console.error('Error fetching stem:', error)
      return null
    }
  }

  /**
   * Get download URL for a stem file
   */
  async getStemUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn)

      if (error) throw error

      return data.signedUrl
    } catch (error) {
      console.error('Error creating signed URL:', error)
      return null
    }
  }

  /**
   * Download stem as ArrayBuffer
   */
  async downloadStem(filePath: string): Promise<ArrayBuffer | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .download(filePath)

      if (error) throw error

      return await data.arrayBuffer()
    } catch (error) {
      console.error('Error downloading stem:', error)
      return null
    }
  }

  /**
   * Delete a stem file
   */
  async deleteStem(filePath: string): Promise<boolean> {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath])

      if (storageError) {
        console.error('Error deleting from storage:', storageError)
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('stem_files')
        .delete()
        .eq('file_path', filePath)

      if (dbError) {
        console.error('Error deleting from database:', dbError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting stem:', error)
      return false
    }
  }

  /**
   * Upload multiple stems at once
   */
  async uploadMultipleStems(
    trackId: string,
    stems: Array<{
      stemType: StemFile['stemType']
      audioBuffer: ArrayBuffer
      metadata: {
        fileName: string
        format: StemFile['format']
        duration: number
        sampleRate: number
        bitRate: number
      }
    }>,
    onProgress?: (fileName: string, progress: UploadProgress) => void
  ): Promise<StemFile[]> {
    const results: StemFile[] = []
    const promises = stems.map(async (stem) => {
      const result = await this.uploadStem(
        trackId,
        stem.stemType,
        stem.audioBuffer,
        stem.metadata,
        onProgress ? (progress) => onProgress(stem.metadata.fileName, progress) : undefined
      )
      if (result) {
        results.push(result)
      }
      return result
    })

    await Promise.all(promises)
    return results
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(userId?: string): Promise<{
    totalFiles: number
    totalSize: number
    sizeByType: Record<StemFile['stemType'], number>
  }> {
    try {
      let query = supabase
        .from('stem_files')
        .select('stem_type, file_size')

      // If userId provided, filter by user's tracks
      if (userId) {
        const { data: userTracks } = await supabase
          .from('processed_tracks')
          .select('id')
          .eq('user_id', userId)

        if (userTracks) {
          const trackIds = userTracks.map(track => track.id)
          query = query.in('track_id', trackIds)
        }
      }

      const { data, error } = await query

      if (error) throw error

      const stats = {
        totalFiles: data.length,
        totalSize: data.reduce((sum, file) => sum + file.file_size, 0),
        sizeByType: {
          drums: 0,
          bass: 0,
          vocals: 0,
          other: 0,
          full: 0
        } as Record<StemFile['stemType'], number>
      }

      data.forEach(file => {
        stats.sizeByType[file.stem_type as StemFile['stemType']] += file.file_size
      })

      return stats
    } catch (error) {
      console.error('Error fetching storage stats:', error)
      return {
        totalFiles: 0,
        totalSize: 0,
        sizeByType: { drums: 0, bass: 0, vocals: 0, other: 0, full: 0 }
      }
    }
  }

  /**
   * Clean up orphaned files (files without database records)
   */
  async cleanupOrphanedFiles(): Promise<number> {
    try {
      // Get all files in storage
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list('tracks')

      if (storageError) throw storageError

      // Get all file paths from database
      const { data: dbFiles, error: dbError } = await supabase
        .from('stem_files')
        .select('file_path')

      if (dbError) throw dbError

      const dbFilePaths = new Set(dbFiles.map(file => file.file_path))
      const orphanedFiles: string[] = []

      // Find files in storage that don't exist in database
      const checkFiles = (files: any[], prefix = '') => {
        files.forEach(file => {
          if (file.name) {
            const fullPath = prefix ? `${prefix}/${file.name}` : file.name
            if (!dbFilePaths.has(fullPath)) {
              orphanedFiles.push(fullPath)
            }
          }
        })
      }

      checkFiles(storageFiles || [], 'tracks')

      // Delete orphaned files
      if (orphanedFiles.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove(orphanedFiles)

        if (deleteError) {
          console.error('Error deleting orphaned files:', deleteError)
        }
      }

      return orphanedFiles.length
    } catch (error) {
      console.error('Error cleaning up orphaned files:', error)
      return 0
    }
  }

  private getMimeType(format: StemFile['format']): string {
    const mimeTypes = {
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
      flac: 'audio/flac',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4'
    }
    return mimeTypes[format] || 'audio/wav'
  }

  /**
   * Validate audio file format and size
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    if (!fileExtension || !this.ALLOWED_FORMATS.includes(fileExtension)) {
      return {
        valid: false,
        error: `Unsupported file format. Allowed formats: ${this.ALLOWED_FORMATS.join(', ')}`
      }
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      }
    }

    return { valid: true }
  }
}

// Singleton instance
export const cdnStorage = new CDNStorageService()