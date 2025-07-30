import { supabase } from './supabase'

export interface TrackFingerprint {
  id: string
  trackId: string
  algorithm: 'chromaprint' | 'mfcc' | 'spectral_hash'
  fingerprint: string
  duration: number
  confidence: number
  createdAt: Date
}

export interface DuplicateMatch {
  trackA: string
  trackB: string
  similarity: number
  algorithm: string
  confidence: number
  details: {
    durationDiff: number
    fingerprintMatch: number
    spectralSimilarity: number
  }
}

export interface DuplicateGroup {
  id: string
  tracks: string[]
  primaryTrack: string
  similarity: number
  detectedAt: Date
  status: 'pending' | 'confirmed' | 'dismissed'
}

export class DuplicateDetectionService {
  private audioContext: AudioContext | null = null
  private worker: Worker | null = null

  constructor() {
    this.initializeAudioContext()
    this.initializeWorker()
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error)
    }
  }

  private initializeWorker() {
    try {
      const workerBlob = new Blob([this.getWorkerScript()], { type: 'application/javascript' })
      const workerUrl = URL.createObjectURL(workerBlob)
      this.worker = new Worker(workerUrl)
    } catch (error) {
      console.error('Failed to initialize duplicate detection worker:', error)
    }
  }

  private getAudioFingerprintingCode(): string {
    // Inline the ProductionAudioFingerprinter class for the worker
    return `
      class ProductionAudioFingerprinter {
        constructor() {
          this.sampleRate = 22050;
          this.frameSize = 2048;
          this.hopSize = 512;
          this.melBands = 26;
          this.mfccCoeffs = 13;
          this.initializeLookupTables();
        }
        
        initializeLookupTables() {
          this.lookupTables = {
            cosine: new Map(),
            melFilters: null,
            chromaFilters: null,
            hammingWindow: null
          };
          
          // Pre-compute Hamming window
          this.lookupTables.hammingWindow = new Float32Array(this.frameSize);
          for (let i = 0; i < this.frameSize; i++) {
            this.lookupTables.hammingWindow[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (this.frameSize - 1));
          }
          
          // Pre-compute mel filter bank
          this.lookupTables.melFilters = this.createMelFilterBank();
          
          // Pre-compute chroma filters
          this.lookupTables.chromaFilters = this.createChromaFilterBank();
        }
        
        async generateFingerprint(audioBuffer) {
          const samples = this.resampleIfNeeded(audioBuffer);
          const frames = this.extractFrames(samples);
          
          const [chromaFeatures, mfccFeatures, spectralFeatures] = await Promise.all([
            this.extractChromaFeatures(frames),
            this.extractMFCCFeatures(frames),
            this.extractSpectralFeatures(frames)
          ]);
          
          const chromaprint = this.generateChromaprintHash(chromaFeatures);
          const mfcc = this.generateMFCCHash(mfccFeatures);
          const spectralHash = this.generateSpectralHash(spectralFeatures);
          
          return {
            chromaprint,
            mfcc,
            spectralHash,
            duration: audioBuffer.duration,
            confidence: this.calculateConfidence(chromaFeatures, mfccFeatures, spectralFeatures)
          };
        }
        
        resampleIfNeeded(audioBuffer) {
          const inputSampleRate = audioBuffer.sampleRate;
          const samples = audioBuffer.getChannelData(0);
          
          if (inputSampleRate === this.sampleRate) {
            return samples;
          }
          
          const ratio = inputSampleRate / this.sampleRate;
          const outputLength = Math.floor(samples.length / ratio);
          const output = new Float32Array(outputLength);
          
          for (let i = 0; i < outputLength; i++) {
            const sourceIndex = i * ratio;
            const index = Math.floor(sourceIndex);
            const fraction = sourceIndex - index;
            
            if (index + 1 < samples.length) {
              output[i] = samples[index] * (1 - fraction) + samples[index + 1] * fraction;
            } else {
              output[i] = samples[index];
            }
          }
          
          return output;
        }
        
        extractFrames(samples) {
          const frames = [];
          const numFrames = Math.floor((samples.length - this.frameSize) / this.hopSize) + 1;
          
          for (let i = 0; i < numFrames; i++) {
            const start = i * this.hopSize;
            const frame = new Float32Array(this.frameSize);
            
            for (let j = 0; j < this.frameSize && start + j < samples.length; j++) {
              frame[j] = samples[start + j] * this.lookupTables.hammingWindow[j];
            }
            
            frames.push(frame);
          }
          
          return frames;
        }
        
        async extractChromaFeatures(frames) {
          const chromaFeatures = [];
          
          for (const frame of frames) {
            const spectrum = this.computeFFT(frame);
            const magnitudeSpectrum = this.getMagnitudeSpectrum(spectrum);
            const chroma = this.computeChromaVector(magnitudeSpectrum);
            chromaFeatures.push(chroma);
          }
          
          return chromaFeatures;
        }
        
        async extractMFCCFeatures(frames) {
          const mfccFeatures = [];
          
          for (const frame of frames) {
            const spectrum = this.computeFFT(frame);
            const magnitudeSpectrum = this.getMagnitudeSpectrum(spectrum);
            const mfcc = this.computeMFCC(magnitudeSpectrum);
            mfccFeatures.push(mfcc);
          }
          
          return mfccFeatures;
        }
        
        async extractSpectralFeatures(frames) {
          const spectralFeatures = [];
          
          for (const frame of frames) {
            const spectrum = this.computeFFT(frame);
            const magnitudeSpectrum = this.getMagnitudeSpectrum(spectrum);
            const bands = this.computeSpectralBands(magnitudeSpectrum, 32);
            spectralFeatures.push({ bands });
          }
          
          return spectralFeatures;
        }
        
        computeFFT(signal) {
          const N = signal.length;
          if (N <= 1) return signal;
          
          const paddedN = Math.pow(2, Math.ceil(Math.log2(N)));
          const paddedSignal = new Float32Array(paddedN * 2);
          
          for (let i = 0; i < N; i++) {
            paddedSignal[i * 2] = signal[i];
            paddedSignal[i * 2 + 1] = 0;
          }
          
          this.fftInPlace(paddedSignal, paddedN);
          return paddedSignal;
        }
        
        fftInPlace(data, N) {
          // Bit-reversal permutation
          let j = 0;
          for (let i = 1; i < N; i++) {
            let bit = N >> 1;
            while (j & bit) {
              j ^= bit;
              bit >>= 1;
            }
            j ^= bit;
            
            if (i < j) {
              const tempReal = data[i * 2];
              const tempImag = data[i * 2 + 1];
              data[i * 2] = data[j * 2];
              data[i * 2 + 1] = data[j * 2 + 1];
              data[j * 2] = tempReal;
              data[j * 2 + 1] = tempImag;
            }
          }
          
          // Cooley-Tukey FFT
          for (let length = 2; length <= N; length <<= 1) {
            const angle = -2 * Math.PI / length;
            const wlenReal = Math.cos(angle);
            const wlenImag = Math.sin(angle);
            
            for (let i = 0; i < N; i += length) {
              let wReal = 1;
              let wImag = 0;
              
              for (let j = 0; j < length / 2; j++) {
                const u = i + j;
                const v = i + j + length / 2;
                
                const uReal = data[u * 2];
                const uImag = data[u * 2 + 1];
                const vReal = data[v * 2];
                const vImag = data[v * 2 + 1];
                
                const tReal = vReal * wReal - vImag * wImag;
                const tImag = vReal * wImag + vImag * wReal;
                
                data[u * 2] = uReal + tReal;
                data[u * 2 + 1] = uImag + tImag;
                data[v * 2] = uReal - tReal;
                data[v * 2 + 1] = uImag - tImag;
                
                const tempReal = wReal * wlenReal - wImag * wlenImag;
                wImag = wReal * wlenImag + wImag * wlenReal;
                wReal = tempReal;
              }
            }
          }
        }
        
        getMagnitudeSpectrum(spectrum) {
          const length = spectrum.length / 2;
          const magnitude = new Float32Array(length);
          
          for (let i = 0; i < length; i++) {
            const real = spectrum[i * 2];
            const imag = spectrum[i * 2 + 1];
            magnitude[i] = Math.sqrt(real * real + imag * imag);
          }
          
          return magnitude;
        }
        
        computeChromaVector(magnitudeSpectrum) {
          const chroma = new Array(12).fill(0);
          const filters = this.lookupTables.chromaFilters;
          
          for (let bin = 0; bin < magnitudeSpectrum.length && bin < filters.length; bin++) {
            for (let note = 0; note < 12; note++) {
              chroma[note] += magnitudeSpectrum[bin] * filters[bin][note];
            }
          }
          
          const sum = chroma.reduce((a, b) => a + b, 0);
          return sum > 0 ? chroma.map(x => x / sum) : chroma;
        }
        
        computeMFCC(magnitudeSpectrum) {
          const melFilters = this.lookupTables.melFilters;
          const melEnergies = new Array(this.melBands).fill(0);
          
          for (let i = 0; i < this.melBands; i++) {
            for (let j = 0; j < magnitudeSpectrum.length && j < melFilters[i].length; j++) {
              melEnergies[i] += magnitudeSpectrum[j] * melFilters[i][j];
            }
            melEnergies[i] = Math.log(melEnergies[i] + 1e-10);
          }
          
          const mfcc = this.discreteCosineTransform(melEnergies).slice(0, this.mfccCoeffs);
          return mfcc;
        }
        
        computeSpectralBands(spectrum, numBands) {
          const bands = new Array(numBands).fill(0);
          const bandSize = Math.floor(spectrum.length / numBands);
          
          for (let band = 0; band < numBands; band++) {
            const start = band * bandSize;
            const end = Math.min(start + bandSize, spectrum.length);
            
            for (let i = start; i < end; i++) {
              bands[band] += spectrum[i];
            }
            
            bands[band] /= (end - start);
          }
          
          return bands;
        }
        
        createMelFilterBank() {
          const melMin = this.hzToMel(0);
          const melMax = this.hzToMel(this.sampleRate / 2);
          const melPoints = [];
          
          for (let i = 0; i <= this.melBands + 1; i++) {
            melPoints.push(melMin + (melMax - melMin) * i / (this.melBands + 1));
          }
          
          const hzPoints = melPoints.map(mel => this.melToHz(mel));
          const binPoints = hzPoints.map(hz => Math.floor((this.frameSize + 1) * hz / this.sampleRate));
          
          const filters = [];
          const fftBins = this.frameSize / 2;
          
          for (let i = 1; i <= this.melBands; i++) {
            const filter = new Array(fftBins).fill(0);
            
            for (let j = binPoints[i - 1]; j < binPoints[i]; j++) {
              if (j >= 0 && j < fftBins) {
                filter[j] = (j - binPoints[i - 1]) / (binPoints[i] - binPoints[i - 1]);
              }
            }
            
            for (let j = binPoints[i]; j < binPoints[i + 1]; j++) {
              if (j >= 0 && j < fftBins) {
                filter[j] = (binPoints[i + 1] - j) / (binPoints[i + 1] - binPoints[i]);
              }
            }
            
            filters.push(filter);
          }
          
          return filters;
        }
        
        createChromaFilterBank() {
          const fftBins = this.frameSize / 2;
          const filters = [];
          
          for (let bin = 0; bin < fftBins; bin++) {
            const freq = (bin * this.sampleRate) / this.frameSize;
            const filter = new Array(12).fill(0);
            
            if (freq > 0) {
              const pitchClass = this.frequencyToPitchClass(freq);
              if (pitchClass >= 0 && pitchClass < 12) {
                filter[pitchClass] = 1;
              }
            }
            
            filters.push(filter);
          }
          
          return filters;
        }
        
        hzToMel(hz) {
          return 2595 * Math.log10(1 + hz / 700);
        }
        
        melToHz(mel) {
          return 700 * (Math.pow(10, mel / 2595) - 1);
        }
        
        frequencyToPitchClass(freq) {
          const a4 = 440;
          const c0 = a4 * Math.pow(2, -4.75);
          if (freq <= 0) return -1;
          const pitchClass = Math.round(12 * Math.log2(freq / c0)) % 12;
          return pitchClass >= 0 ? pitchClass : pitchClass + 12;
        }
        
        discreteCosineTransform(input) {
          const N = input.length;
          const output = new Array(N);
          
          for (let k = 0; k < N; k++) {
            let sum = 0;
            for (let n = 0; n < N; n++) {
              sum += input[n] * Math.cos(Math.PI * k * (2 * n + 1) / (2 * N));
            }
            output[k] = sum;
          }
          
          return output;
        }
        
        generateChromaprintHash(chromaFeatures) {
          let hash = '';
          
          for (let i = 0; i < chromaFeatures.length - 1; i++) {
            const current = chromaFeatures[i];
            const next = chromaFeatures[i + 1];
            
            for (let j = 0; j < 12; j++) {
              hash += next[j] > current[j] ? '1' : '0';
            }
          }
          
          return hash;
        }
        
        generateMFCCHash(mfccFeatures) {
          let hash = '';
          
          for (let i = 0; i < mfccFeatures.length - 1; i++) {
            for (let j = 1; j < this.mfccCoeffs; j++) {
              const diff = mfccFeatures[i + 1][j] - mfccFeatures[i][j];
              hash += diff > 0 ? '1' : '0';
            }
          }
          
          return hash;
        }
        
        generateSpectralHash(spectralFeatures) {
          let hash = '';
          
          for (let i = 0; i < spectralFeatures.length - 1; i++) {
            const current = spectralFeatures[i].bands;
            const next = spectralFeatures[i + 1].bands;
            
            for (let j = 0; j < current.length; j++) {
              hash += next[j] > current[j] ? '1' : '0';
            }
          }
          
          return hash;
        }
        
        calculateConfidence(chromaFeatures, mfccFeatures, spectralFeatures) {
          // Simple confidence calculation based on feature stability
          if (chromaFeatures.length < 2) return 0.5;
          
          let stability = 0;
          for (let i = 1; i < chromaFeatures.length; i++) {
            let similarity = 0;
            for (let j = 0; j < 12; j++) {
              similarity += Math.abs(chromaFeatures[i][j] - chromaFeatures[i-1][j]);
            }
            stability += 1 - (similarity / 12);
          }
          
          return Math.max(0.1, Math.min(1.0, stability / (chromaFeatures.length - 1)));
        }
        
        compareHammingDistance(fp1, fp2) {
          if (fp1.length !== fp2.length) {
            const minLen = Math.min(fp1.length, fp2.length);
            fp1 = fp1.substring(0, minLen);
            fp2 = fp2.substring(0, minLen);
          }
          
          let matches = 0;
          for (let i = 0; i < fp1.length; i++) {
            if (fp1[i] === fp2[i]) matches++;
          }
          
          return matches / fp1.length;
        }
        
        compareFingerprintsAdvanced(fp1, fp2, weights = { chromaprint: 0.4, mfcc: 0.4, spectral: 0.2 }) {
          const chromaSimilarity = this.compareHammingDistance(fp1.chromaprint, fp2.chromaprint);
          const mfccSimilarity = this.compareHammingDistance(fp1.mfcc, fp2.mfcc);
          const spectralSimilarity = this.compareHammingDistance(fp1.spectralHash, fp2.spectralHash);
          
          return (
            chromaSimilarity * weights.chromaprint +
            mfccSimilarity * weights.mfcc +
            spectralSimilarity * weights.spectral
          );
        }
      }
    `;
  }

  private getWorkerScript(): string {
    return `
      // Production Audio Fingerprinting Worker
      // Include the production fingerprinting implementation directly
      ${this.getAudioFingerprintingCode()}
      
      // Initialize the production fingerprinting class
      const fingerprinter = new ProductionAudioFingerprinter();
      
      self.onmessage = async function(e) {
        const { type, data } = e.data;
        
        try {
          switch (type) {
            case 'generateFingerprint':
              const { audioArrayBuffer, algorithm, trackId } = data;
              const audioContext = new AudioContext({ sampleRate: 22050 });
              const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
              
              // Generate comprehensive fingerprint
              const result = await fingerprinter.generateFingerprint(audioBuffer);
              
              // Extract specific algorithm result
              let fingerprint;
              switch (algorithm) {
                case 'chromaprint':
                  fingerprint = result.chromaprint;
                  break;
                case 'mfcc':
                  fingerprint = result.mfcc;
                  break;
                case 'spectral_hash':
                  fingerprint = result.spectralHash;
                  break;
                default:
                  throw new Error('Unknown algorithm: ' + algorithm);
              }
              
              self.postMessage({
                type: 'fingerprintGenerated',
                data: {
                  trackId,
                  algorithm,
                  fingerprint,
                  duration: result.duration,
                  confidence: result.confidence,
                  features: result.features
                }
              });
              break;
              
            case 'compareFingerprints':
              const { fp1, fp2, algorithm: compareAlg } = data;
              
              // Use production comparison method
              const similarity = fingerprinter.compareHammingDistance(fp1, fp2);
              
              self.postMessage({
                type: 'comparisonComplete',
                data: { similarity }
              });
              break;
              
            case 'compareFullFingerprints':
              const { result1, result2 } = data;
              
              // Advanced comparison using all features
              const advancedSimilarity = fingerprinter.compareFingerprintsAdvanced(result1, result2);
              
              self.postMessage({
                type: 'advancedComparisonComplete',
                data: { similarity: advancedSimilarity }
              });
              break;
              
            default:
              throw new Error('Unknown message type: ' + type);
          }
        } catch (error) {
          self.postMessage({
            type: 'error',
            data: { error: error.message }
          });
        }
      };
    `;
  }

  /**
   * Generate fingerprint for an audio file
   */
  async generateFingerprint(
    audioFile: File | ArrayBuffer,
    trackId: string,
    algorithm: TrackFingerprint['algorithm'] = 'chromaprint'
  ): Promise<TrackFingerprint | null> {
    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    let audioArrayBuffer: ArrayBuffer
    if (audioFile instanceof File) {
      audioArrayBuffer = await audioFile.arrayBuffer()
    } else {
      audioArrayBuffer = audioFile
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Fingerprint generation timeout'))
      }, 30000)

      const messageHandler = (e: MessageEvent) => {
        const { type, data } = e.data

        if (type === 'fingerprintGenerated') {
          clearTimeout(timeout)
          this.worker!.removeEventListener('message', messageHandler)
          
          const fingerprint: TrackFingerprint = {
            id: crypto.randomUUID(),
            trackId: data.trackId,
            algorithm: data.algorithm,
            fingerprint: data.fingerprint,
            duration: data.duration,
            confidence: data.confidence,
            createdAt: new Date()
          }
          
          resolve(fingerprint)
        } else if (type === 'error') {
          clearTimeout(timeout)
          this.worker!.removeEventListener('message', messageHandler)
          reject(new Error(data.error))
        }
      }

      this.worker!.addEventListener('message', messageHandler)
      this.worker!.postMessage({
        type: 'generateFingerprint',
        data: { audioArrayBuffer, algorithm, trackId }
      })
    })
  }

  /**
   * Store fingerprint in database
   */
  async storeFingerprint(fingerprint: TrackFingerprint): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('track_fingerprints')
        .insert({
          id: fingerprint.id,
          track_id: fingerprint.trackId,
          algorithm: fingerprint.algorithm,
          fingerprint: fingerprint.fingerprint,
          duration: fingerprint.duration,
          confidence: fingerprint.confidence,
          created_at: fingerprint.createdAt.toISOString()
        })

      return !error
    } catch (error) {
      console.error('Error storing fingerprint:', error)
      return false
    }
  }

  /**
   * Get all fingerprints for a track
   */
  async getTrackFingerprints(trackId: string): Promise<TrackFingerprint[]> {
    try {
      const { data, error } = await supabase
        .from('track_fingerprints')
        .select('*')
        .eq('track_id', trackId)

      if (error) throw error

      return data.map(record => ({
        id: record.id,
        trackId: record.track_id,
        algorithm: record.algorithm,
        fingerprint: record.fingerprint,
        duration: record.duration,
        confidence: record.confidence,
        createdAt: new Date(record.created_at)
      }))
    } catch (error) {
      console.error('Error fetching fingerprints:', error)
      return []
    }
  }

  /**
   * Compare two fingerprints for similarity
   */
  async compareFingerprints(fp1: string, fp2: string, algorithm: string): Promise<number> {
    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Comparison timeout'))
      }, 10000)

      const messageHandler = (e: MessageEvent) => {
        const { type, data } = e.data

        if (type === 'comparisonComplete') {
          clearTimeout(timeout)
          this.worker!.removeEventListener('message', messageHandler)
          resolve(data.similarity)
        } else if (type === 'error') {
          clearTimeout(timeout)
          this.worker!.removeEventListener('message', messageHandler)
          reject(new Error(data.error))
        }
      }

      this.worker!.addEventListener('message', messageHandler)
      this.worker!.postMessage({
        type: 'compareFingerprints',
        data: { fp1, fp2, algorithm }
      })
    })
  }

  /**
   * Find potential duplicates for a track
   */
  async findDuplicates(
    trackId: string,
    threshold: number = 0.85,
    userId?: string
  ): Promise<DuplicateMatch[]> {
    try {
      // Get fingerprints for the target track
      const targetFingerprints = await this.getTrackFingerprints(trackId)
      if (targetFingerprints.length === 0) {
        return []
      }

      // Get all other fingerprints (optionally filtered by user)
      let query = supabase
        .from('track_fingerprints')
        .select(`
          *,
          processed_tracks!inner(id, user_id, name, artist)
        `)
        .neq('track_id', trackId)

      if (userId) {
        query = query.eq('processed_tracks.user_id', userId)
      }

      const { data: candidateData, error } = await query

      if (error) throw error

      const candidates = candidateData.map(record => ({
        id: record.id,
        trackId: record.track_id,
        algorithm: record.algorithm,
        fingerprint: record.fingerprint,
        duration: record.duration,
        confidence: record.confidence,
        createdAt: new Date(record.created_at),
        trackInfo: record.processed_tracks
      }))

      // Compare fingerprints
      const matches: DuplicateMatch[] = []

      for (const targetFp of targetFingerprints) {
        const sameAlgorithm = candidates.filter(c => c.algorithm === targetFp.algorithm)

        for (const candidate of sameAlgorithm) {
          const similarity = await this.compareFingerprints(
            targetFp.fingerprint,
            candidate.fingerprint,
            targetFp.algorithm
          )

          if (similarity >= threshold) {
            const durationDiff = Math.abs(targetFp.duration - candidate.duration)
            
            matches.push({
              trackA: trackId,
              trackB: candidate.trackId,
              similarity,
              algorithm: targetFp.algorithm,
              confidence: Math.min(targetFp.confidence, candidate.confidence),
              details: {
                durationDiff,
                fingerprintMatch: similarity,
                spectralSimilarity: similarity // Simplified for now
              }
            })
          }
        }
      }

      // Sort by similarity (highest first) and remove duplicates
      return matches
        .sort((a, b) => b.similarity - a.similarity)
        .filter((match, index, array) => 
          array.findIndex(m => m.trackB === match.trackB) === index
        )
    } catch (error) {
      console.error('Error finding duplicates:', error)
      return []
    }
  }

  /**
   * Create a duplicate group from matches
   */
  async createDuplicateGroup(tracks: string[], primaryTrack?: string): Promise<DuplicateGroup> {
    const group: DuplicateGroup = {
      id: crypto.randomUUID(),
      tracks,
      primaryTrack: primaryTrack || tracks[0],
      similarity: 0.9, // Will be calculated based on matches
      detectedAt: new Date(),
      status: 'pending'
    }

    try {
      const { error } = await supabase
        .from('duplicate_groups')
        .insert({
          id: group.id,
          tracks: group.tracks,
          primary_track: group.primaryTrack,
          similarity: group.similarity,
          detected_at: group.detectedAt.toISOString(),
          status: group.status
        })

      if (error) throw error
    } catch (error) {
      console.error('Error creating duplicate group:', error)
    }

    return group
  }

  /**
   * Get duplicate groups for a user
   */
  async getDuplicateGroups(userId: string): Promise<DuplicateGroup[]> {
    try {
      const { data, error } = await supabase
        .from('duplicate_groups')
        .select(`
          *,
          processed_tracks!inner(user_id)
        `)
        .eq('processed_tracks.user_id', userId)
        .order('detected_at', { ascending: false })

      if (error) throw error

      return data.map(record => ({
        id: record.id,
        tracks: record.tracks,
        primaryTrack: record.primary_track,
        similarity: record.similarity,
        detectedAt: new Date(record.detected_at),
        status: record.status
      }))
    } catch (error) {
      console.error('Error fetching duplicate groups:', error)
      return []
    }
  }

  /**
   * Update duplicate group status
   */
  async updateDuplicateGroupStatus(
    groupId: string, 
    status: DuplicateGroup['status']
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('duplicate_groups')
        .update({ status })
        .eq('id', groupId)

      return !error
    } catch (error) {
      console.error('Error updating duplicate group:', error)
      return false
    }
  }

  /**
   * Process a batch of tracks for duplicate detection
   */
  async processBatch(
    tracks: Array<{ id: string; audioFile: File | ArrayBuffer }>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ fingerprints: TrackFingerprint[]; duplicates: DuplicateMatch[] }> {
    const fingerprints: TrackFingerprint[] = []
    const allDuplicates: DuplicateMatch[] = []

    for (let i = 0; i < tracks.length; i++) {
      const { id, audioFile } = tracks[i]

      try {
        // Generate fingerprints using multiple algorithms
        const algorithms: TrackFingerprint['algorithm'][] = ['chromaprint', 'spectral_hash']
        
        for (const algorithm of algorithms) {
          const fingerprint = await this.generateFingerprint(audioFile, id, algorithm)
          if (fingerprint) {
            fingerprints.push(fingerprint)
            await this.storeFingerprint(fingerprint)
          }
        }

        // Find duplicates for this track
        const duplicates = await this.findDuplicates(id, 0.8)
        allDuplicates.push(...duplicates)

        onProgress?.(i + 1, tracks.length)
      } catch (error) {
        console.error(`Error processing track ${id}:`, error)
      }
    }

    return { fingerprints, duplicates: allDuplicates }
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

// Singleton instance
export const duplicateDetection = new DuplicateDetectionService()