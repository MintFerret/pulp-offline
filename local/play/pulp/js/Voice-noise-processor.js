class NoiseProcessor extends AudioWorkletProcessor {
	static noiseBuffer = null;
    static get parameterDescriptors() {
      return [
		  {name: 'frequency', defaultValue:0, minValue:0, maxValue:8000},
		  {name: 'playing', defaultValue:1, minValue:0, maxValue:1},
	  ];
    }

	constructor(context) {
		super(context);
		
		this._frequency = -1;
		this._offset = 0;
		this._phase = 0;
		this._sampleRate = 44100;
		
		if (NoiseProcessor.noiseBuffer==null) { // one time
			const noiseBuffer = new Float32Array(2 * this._sampleRate);
			for (var i=0; i<noiseBuffer.length; i++) {
				noiseBuffer[i] = (Math.random() - 0.5);
			}
			NoiseProcessor.noiseBuffer = noiseBuffer;
		}
	}

    process(inputs, outputs, parameters) {
		const frequency = parameters.frequency[0];
		const playing = parameters.playing[0];

		if (this._frequency!=frequency) {
			this._frequency = frequency;
			var NOISE_SHIFT = 4;
			this._phase = (frequency << NOISE_SHIFT) / this._sampleRate;
			while (this._phase>1) this._phase -= 1;
		}
		
		const output = outputs[0][0];
		const noiseBuffer = NoiseProcessor.noiseBuffer;
		for (let i=0; i<output.length; i++) {
			output[i] = noiseBuffer[Math.floor(this._offset)];
			this._offset += this._phase;
			if (this._offset>=noiseBuffer.length) this._offset -= noiseBuffer.length;
		}
		return playing>0;
    }
}

registerProcessor('Voice-noise-processor', NoiseProcessor);