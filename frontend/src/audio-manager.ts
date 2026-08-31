/**
 * AudioManager handles recording (16kHz mono capture via AudioWorklet)
 * and playback (24kHz mono queue scheduling via Web Audio API) with instant interruption support.
 */
export class AudioManager {
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  
  // Analysers for waveform visualisation
  public micAnalyser: AnalyserNode | null = null;
  public speakerAnalyser: AnalyserNode | null = null;
  
  // Playback scheduler variables
  private nextPlaybackTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  
  private onAudioCallback: ((data: Uint8Array) => void) | null = null;

  constructor(onAudioCallback: (data: Uint8Array) => void) {
    this.onAudioCallback = onAudioCallback;
  }

  /**
   * Initializes the AudioContext and loads the recording worklet.
   */
  public async initialize(): Promise<void> {
    if (this.audioContext) return;

    // Create audio context at 16000Hz. This downsamples the input mic natively.
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });
    
    // Create analysers
    this.micAnalyser = this.audioContext.createAnalyser();
    this.micAnalyser.fftSize = 256;
    
    this.speakerAnalyser = this.audioContext.createAnalyser();
    this.speakerAnalyser.fftSize = 256;

    // Load Audio Worklet (relies on being inside the public/ folder)
    try {
      await this.audioContext.audioWorklet.addModule("/recorder-worklet.js");
    } catch (err) {
      console.error("Failed to load recorder-worklet.js worklet module:", err);
      throw new Error("Could not load recording audio worklet.");
    }
  }

  /**
   * Starts capturing microphone audio and streaming it to the callback.
   */
  public async startRecording(): Promise<void> {
    await this.initialize();
    
    if (!this.audioContext) return;
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.micSource = this.audioContext.createMediaStreamSource(this.micStream);
      
      // Setup AudioWorklet Node
      this.workletNode = new AudioWorkletNode(this.audioContext, "recorder-worklet");
      
      // Route microphone through analyzer to the worklet
      this.micSource.connect(this.micAnalyser!);
      this.workletNode.connect(this.audioContext.destination); // Required for processing in Chrome

      // Capture messages from worklet
      this.workletNode.port.onmessage = (event: MessageEvent) => {
        if (!this.onAudioCallback) return;
        const pcm16Buffer = event.data; // ArrayBuffer of Int16Array
        const uint8Array = new Uint8Array(pcm16Buffer);
        this.onAudioCallback(uint8Array);
      };

      // Connect source to worklet
      this.micSource.connect(this.workletNode);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      throw new Error("Microphone permission denied or source unavailable.");
    }
  }

  /**
   * Stops microphone capture.
   */
  public stopRecording(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode.port.onmessage = null;
      this.workletNode = null;
    }
  }

  /**
   * Schedules base64 PCM16 24kHz audio chunks for gap-free playback.
   */
  public playAudioChunk(base64Data: string): void {
    if (!this.audioContext) return;
    
    // Decode base64 to binary buffer
    const binaryString = window.atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert Int16 bytes back to Float32 Array
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    // Create AudioBuffer at 24000Hz for playback rendering
    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;

    // Connect to speaker analyzer and then to output destination
    sourceNode.connect(this.speakerAnalyser!);
    this.speakerAnalyser!.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    if (this.nextPlaybackTime < now) {
      this.nextPlaybackTime = now + 0.05; // 50ms scheduling buffer to prevent gaps
    }

    sourceNode.start(this.nextPlaybackTime);
    this.activeSources.push(sourceNode);

    sourceNode.onended = () => {
      this.activeSources = this.activeSources.filter((src) => src !== sourceNode);
    };

    this.nextPlaybackTime += audioBuffer.duration;
  }

  /**
   * Interrupts playback instantly. Clears the queue and stops all active audio nodes.
   */
  public interruptPlayback(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (err) {
        // Suppress errors for sources already completed
      }
    });
    this.activeSources = [];
    this.nextPlaybackTime = 0;
  }

  /**
   * Cleans up all audio assets and closes AudioContext.
   */
  public async close(): Promise<void> {
    this.stopRecording();
    this.interruptPlayback();

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.micAnalyser = null;
    this.speakerAnalyser = null;
  }
}
