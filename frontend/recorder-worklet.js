/**
 * AudioWorkletProcessor running in the audio rendering thread.
 * Converts microphone Float32 audio samples into Int16 PCM samples (16-bit mono 16kHz).
 */
class RecorderWorklet extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048;
        this.buffer = new Int16Array(this.bufferSize);
        this.writeIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        // Single-channel (mono) input from the microphone
        const channelData = input[0];
        const length = channelData.length;

        for (let i = 0; i < length; i++) {
            let sample = channelData[i];

            // Clamp to float range [-1.0, 1.0] to prevent audio clipping distortion
            if (sample > 1.0) sample = 1.0;
            else if (sample < -1.0) sample = -1.0;

            // Convert Float32 (-1.0 to 1.0) to Int16 PCM (-32768 to 32767)
            const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            this.buffer[this.writeIndex++] = int16Sample;

            // When the buffer is full, post it to the main thread and allocate a new buffer
            if (this.writeIndex >= this.bufferSize) {
                // Transfer the raw array buffer memory directly for low latency
                this.port.postMessage(this.buffer.buffer, [this.buffer.buffer]);
                this.buffer = new Int16Array(this.bufferSize);
                this.writeIndex = 0;
            }
        }

        return true;
    }
}

// Register the processor so the browser can instantiate it by name
registerProcessor("recorder-worklet", RecorderWorklet);
