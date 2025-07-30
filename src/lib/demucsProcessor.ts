import { cdnStorage, StemFile } from './cdnStorage'
import { productionDemucsProcessor } from './productionDemucs'

export interface StemSeparationProgress {
  stage: 'initializing' | 'loading_model' | 'processing' | 'generating_stems' | 'uploading' | 'complete' | 'error'
  progress: number
  message: string
  error?: string
}

export interface StemSeparationResult {
  success: boolean
  stems: StemFile[]
  error?: string
  processingTime: number
}

export interface DemucsConfig {
  model: 'htdemucs' | 'htdemucs_ft' | 'mdx_extra'
  overlap: number
  splitSize: number
  shifts: number
  device: 'cpu' | 'gpu'
}

export class DemucsProcessor {
  private worker: Worker | null = null
  private isInitialized = false
  private modelLoaded = false
  private currentConfig: DemucsConfig = {
    model: 'htdemucs',
    overlap: 0.25,
    splitSize: 256,
    shifts: 1,
    device: 'cpu'
  }

  constructor() {
    this.initializeWorker()
  }

  private async initializeWorker() {
    try {
      // Create web worker for Demucs processing
      const workerBlob = new Blob([this.getWorkerScript()], { type: 'application/javascript' })
      const workerUrl = URL.createObjectURL(workerBlob)
      this.worker = new Worker(workerUrl)
      
      this.worker.onmessage = this.handleWorkerMessage.bind(this)
      this.worker.onerror = this.handleWorkerError.bind(this)
      
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize Demucs worker:', error)
    }
  }

  private getWorkerScript(): string {
    return `
      // Demucs Web Worker
      let demucsModel = null;
      let audioContext = null;
      
      // Mock Demucs implementation (in real app, this would use actual Demucs.js)
      class DemucsEngine {
        constructor() {
          this.modelLoaded = false;
        }
        
        async loadModel(modelName) {
          // Simulate model loading
          self.postMessage({ type: 'progress', data: { stage: 'loading_model', progress: 0, message: 'Loading Demucs model...' }});
          
          for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            self.postMessage({ type: 'progress', data: { stage: 'loading_model', progress: i, message: \`Loading model: \${i}%\` }});
          }
          
          this.modelLoaded = true;
          return true;
        }
        
        async separateStems(audioBuffer, config) {
          if (!this.modelLoaded) {
            throw new Error('Model not loaded');
          }
          
          const { sampleRate, length } = audioBuffer;
          const duration = length / sampleRate;
          
          // Simulate processing stages
          self.postMessage({ type: 'progress', data: { stage: 'processing', progress: 0, message: 'Analyzing audio...' }});
          
          // Generate mock stems (in real implementation, this would use actual Demucs)
          const stems = {
            drums: this.generateMockStem(audioBuffer, 'drums'),
            bass: this.generateMockStem(audioBuffer, 'bass'),
            vocals: this.generateMockStem(audioBuffer, 'vocals'),
            other: this.generateMockStem(audioBuffer, 'other')
          };
          
          // Simulate processing progress
          for (let i = 0; i <= 100; i += 5) {
            await new Promise(resolve => setTimeout(resolve, 50));
            self.postMessage({ type: 'progress', data: { stage: 'processing', progress: i, message: \`Processing stems: \${i}%\` }});
          }
          
          return stems;
        }
        
        generateMockStem(originalBuffer, stemType) {
          // Create a modified version of the original audio as a mock stem
          const { sampleRate, length, numberOfChannels } = originalBuffer;
          const newBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);
          
          for (let channel = 0; channel < numberOfChannels; channel++) {
            const originalData = originalBuffer.getChannelData(channel);
            const newData = newBuffer.getChannelData(channel);
            
            // Apply simple filtering to simulate stem separation
            for (let i = 0; i < length; i++) {
              let sample = originalData[i];
              
              // Mock stem processing based on type
              switch (stemType) {
                case 'drums':
                  // Emphasize high frequencies and transients
                  sample *= (Math.random() > 0.7) ? 1.5 : 0.3;
                  break;
                case 'bass':
                  // Emphasize low frequencies
                  sample *= (i % 100 < 20) ? 1.2 : 0.2;
                  break;
                case 'vocals':
                  // Emphasize mid frequencies
                  sample *= (i % 50 < 25) ? 1.0 : 0.4;
                  break;
                case 'other':
                  // Everything else
                  sample *= 0.6;
                  break;
              }
              
              newData[i] = Math.max(-1, Math.min(1, sample));
            }
          }
          
          return newBuffer;
        }
      }
      
      self.onmessage = async function(e) {
        const { type, data } = e.data;
        
        try {
          switch (type) {
            case 'initialize':
              audioContext = new AudioContext({ sampleRate: 44100 });
              demucsModel = new DemucsEngine();
              self.postMessage({ type: 'initialized' });
              break;
              
            case 'loadModel':
              if (!demucsModel) {
                throw new Error('Engine not initialized');
              }
              await demucsModel.loadModel(data.model);
              self.postMessage({ type: 'modelLoaded' });
              break;
              
            case 'processStem':
              if (!demucsModel) {
                throw new Error('Engine not initialized');
              }
              
              const { audioArrayBuffer, config } = data;
              const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
              
              const stems = await demucsModel.separateStems(audioBuffer, config);
              
              // Convert AudioBuffers back to ArrayBuffers for transfer
              const stemData = {};
              for (const [stemType, buffer] of Object.entries(stems)) {
                stemData[stemType] = await this.audioBufferToArrayBuffer(buffer);
              }
              
              self.postMessage({ 
                type: 'stemProcessingComplete', 
                data: { 
                  stems: stemData,
                  metadata: {
                    sampleRate: audioBuffer.sampleRate,
                    duration: audioBuffer.duration,
                    channels: audioBuffer.numberOfChannels
                  }
                }
              });
              break;
          }
        } catch (error) {
          self.postMessage({ type: 'error', data: { error: error.message } });
        }
      };
      
      async function audioBufferToArrayBuffer(audioBuffer) {
        const numberOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        const sampleRate = audioBuffer.sampleRate;
        
        // Create WAV file structure
        const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
        const view = new DataView(arrayBuffer);
        
        // WAV header
        const writeString = (offset, string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * numberOfChannels * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * numberOfChannels * 2, true);
        
        // Convert audio data
        let offset = 44;
        for (let i = 0; i < length; i++) {
          for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
          }
        }
        
        return arrayBuffer;
      }
    `;
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data
    
    switch (type) {
      case 'initialized':
        this.isInitialized = true
        break
      case 'modelLoaded':
        this.modelLoaded = true
        break
      case 'progress':
        this.onProgress?.(data)
        break
      case 'stemProcessingComplete':
        this.onComplete?.(data)
        break
      case 'error':
        this.onError?.(data.error)
        break
    }
  }

  private handleWorkerError(error: ErrorEvent) {
    console.error('Demucs worker error:', error)
    this.onError?.(error.message)
  }

  private onProgress?: (progress: StemSeparationProgress) => void
  private onComplete?: (data: any) => void
  private onError?: (error: string) => void

  /**
   * Load the Demucs model
   */
  async loadModel(model: DemucsConfig['model'] = 'htdemucs'): Promise<boolean> {
    if (!this.isInitialized || !this.worker) {
      throw new Error('Demucs processor not initialized')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Model loading timeout'))
      }, 60000) // 1 minute timeout

      this.onError = (error) => {
        clearTimeout(timeout)
        reject(new Error(error))
      }

      this.worker!.addEventListener('message', function modelLoadHandler(e) {
        if (e.data.type === 'modelLoaded') {
          clearTimeout(timeout)
          this.removeEventListener('message', modelLoadHandler)
          resolve(true)
        }
      })

      this.worker!.postMessage({ type: 'loadModel', data: { model } })
    })
  }

  /**
   * Separate stems from an audio file using production implementation
   */
  async separateStems(
    audioFile: File | ArrayBuffer,
    trackId: string,
    config: Partial<DemucsConfig> = {},
    onProgress?: (progress: StemSeparationProgress) => void
  ): Promise<StemSeparationResult> {
    try {
      // Use production Demucs processor
      const productionConfig = {
        model: config.model || 'htdemucs',
        device: config.device || 'cpu',
        shifts: config.shifts || 1,
        overlap: config.overlap || 0.25,
        splitSize: config.splitSize || 256,
        jobs: 1,
        float32: true,
        int24: false
      }

      const result = await productionDemucsProcessor.separateStems(
        audioFile,
        trackId,
        productionConfig,
        onProgress
      )

      return {
        success: result.success,
        stems: result.stems,
        error: result.error,
        processingTime: result.processingTime
      }

    } catch (error) {
      return {
        success: false,
        stems: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime: 0
      }
    }
  }

  /**
   * Check if stem separation is available
   */
  isAvailable(): boolean {
    return productionDemucsProcessor.isAvailable()
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return productionDemucsProcessor.getSupportedFormats()
  }

  /**
   * Estimate processing time based on audio duration
   */
  estimateProcessingTime(durationSeconds: number): number {
    return productionDemucsProcessor.estimateProcessingTime(durationSeconds, this.currentConfig)
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return productionDemucsProcessor.getAvailableModels()
  }

  /**
   * Get model information
   */
  getModelInfo(modelName: string) {
    return productionDemucsProcessor.getModelInfo(modelName)
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.isInitialized = false
    this.modelLoaded = false
    // Note: productionDemucsProcessor manages its own resources
  }
}

// Singleton instance
export const demucsProcessor = new DemucsProcessor()