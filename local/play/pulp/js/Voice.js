var VoiceType = {
	Sine: 0,
	Square: 1,
	Sawtooth: 2,
	Triangle: 3,
	Noise: 4,
};
var VoiceName = [];
for (var type in VoiceType) {
	VoiceName[VoiceType[type]] = type;
}
var Playhead = new (function() {
	var resetTime = 0;
	
	this.isReady = true;
	
	var context = new (window.AudioContext || window.webkitAudioContext)();
	if (context.audioWorklet) {
		this.isReady = false;
		context.audioWorklet.addModule('pulp/js/Voice-noise-processor.js').then(function(){
			Playhead.isReady = true;
		});
	}
	
	// sigh, context can only be started by user input
	function resume() {
		if (context.state!='running') context.resume();
		document.removeEventListener('click', resume);
		document.removeEventListener('keydown', resume);
	}
	document.addEventListener('click', resume);
	document.addEventListener('keydown', resume);
	
	this.context = context;
	this.getAbsoluteTime = function() {
		return context.currentTime;
	};
	this.resetTime = function() {
		resetTime = context.currentTime;
	};
	this.getResetTime = function() {
		return resetTime;
	};
	this.getCurrentTime = function() {
		return context.currentTime - resetTime;
	};
	
	// based on https://github.com/sebpiq/AudioParam
	var CustomAudioParam = function(context, defaultValue) {
		var scriptNode = context.createScriptProcessor(0, 0, 1);
		scriptNode.onaudioprocess = function(event) {}; // required even if empty

		var gainNode = context.createGain();
		scriptNode.connect(gainNode);

		var audioParam = gainNode.gain;
		audioParam.value = defaultValue;
		audioParam.connect = function(destination, input) {
			gainNode.connect(destination, 0, input);
		};
		audioParam.disconnect = function(destination) {
			gainNode.disconnect(destination);
		};
		return audioParam;
	};
	
	var noiseBuffer = new Float32Array(2 * context.sampleRate);
	for (var i=0; i<noiseBuffer.length; i++) {
		noiseBuffer[i] = (Math.random() - 0.5);
	}
	
	this.createOscillator = function(type) { // :tada: adds support for a Noise-type "oscillator"
		var osc;
		if (type=='noise') {
			if (context.audioWorklet) {
				osc = new AudioWorkletNode(context, 'Voice-noise-processor');
				osc.frequency = osc.parameters.get('frequency');
				osc.ondisconnect = function() {
					const playing = osc.parameters.get('playing');
					playing.setValueAtTime(0,Playhead.getAbsoluteTime());
				};
			}
			else {
				osc = context.createScriptProcessor(0, 1, 1);
				osc.frequency = new CustomAudioParam(context, 0);
				osc.frequency.connect(osc);

				osc._frequency = -1;
				osc._offset = 0;
				osc._phase = 0;
				osc.onaudioprocess = function(event) {
					if (this._frequency!=this.frequency.value) {
						this._frequency = this.frequency.value;
						var NOISE_SHIFT = 4;
						this._phase = (this.frequency.value << NOISE_SHIFT) / context.sampleRate;
						while (this._phase>1) this._phase -= 1;
					}
			
					var output = event.outputBuffer.getChannelData(0);
					for (let i=0; i<output.length; i++) {
						output[i] = noiseBuffer[Math.floor(this._offset)];
						this._offset += this._phase;
						if (this._offset>=noiseBuffer.length) this._offset -= noiseBuffer.length;
					}
				};
				osc.ondisconnect = function() {
					osc.frequency.disconnect(osc);
				};
			}
			
			osc.stopped = false;
			osc.stop = function(when) {
				if (osc.stopped) return;
				setTimeout(function(){
					if (osc.stopped) return;
					osc.stopped = true;
					osc.onended();
				}, (when-Playhead.getAbsoluteTime())*1000);
			};
		}
		else {
			osc = context.createOscillator();
			osc.ondisconnect = function() {};
			osc.start(0);
		}
		osc.type = type;
		return osc;
	};
	
	var wave = context.createOscillator()
	wave.frequency.value = 0;
	var gain = context.createGain();
	gain.gain.value = 0;
	wave.connect(gain);
	gain.connect(context.destination);
	wave.start(0);
	
	var channel = context.createGain();
	channel.connect(context.destination);
	this.channel = channel;
	
	this.setVolume = function(volume) {
		this.channel.gain.value = volume;
	}
	
	var tick = 0;
	var isPlaying = false;
	this.play = function() {
		this.resetTime();
		tick = 0;
		isPlaying = true;
	}
	this.stop = function() {
		isPlaying = false;
	}
	this.togglePause = function(flag) {
		if (flag) context.suspend();
		else context.resume();
	}
	
	this.interval = 0.5 * 0.25; // 16th at 120bpm
	this.setInterval = function(interval) {
		var oldInterval = this.interval;
		if (interval!=oldInterval && tick>0) {
			var elapsed = tick * oldInterval;
			tick = Math.floor(elapsed / interval);
			this.interval = interval;
		}
	};
	
	var onTick = function(){};
	// simply fires off a message 20 times a second but
	// continues while browser or tab is in background
	// unlike setInterval() on the main thread
	var ticker = URL.createObjectURL(new Blob(['setInterval(postMessage, 50, 0)'], {type: 'application/javascript'}));
	(new Worker(ticker)).onmessage = function() {
		if (Playhead.getCurrentTime()>=(tick-1)*Playhead.interval) {
			onTick();
			tick += 1;
		}
	};
	
	this.scheduleRepeat = function(callback, interval) {
		this.resetTime();
		tick = 0;
		this.setInterval(interval);
		onTick = callback;
		
		onTick();
		tick += 1;
	};
})();

function Voice(typeId, envelope) {
	if (envelope==null) envelope = {};
	for (var key in Voice.defaultEnvelope) {
		if (typeof envelope[key]==='undefined') {
			envelope[key] = Voice.defaultEnvelope[key];
		}
	}
	this.type = typeId;
	this.typeString = VoiceName[typeId || 0].toLowerCase();
	this.envelope = envelope;
	this.wave = null;
	this.mute = null;
	this.gain = null;
	this.volume = null;
	this.hasScheduledStop = false;
	this.masterVolume = 1;
}
Voice.defaultEnvelope = {
	attack: 0.005,
	decay: 0.1,
	sustain: 0.5,
	release: 0.1,
	volume: 1.0,
};
Voice.prototype.generateWave = function() {
	this.wave = Playhead.createOscillator(this.typeString);
	this.mute = Playhead.context.createGain();
	this.mute.gain.value = this.masterVolume;
	this.gain = Playhead.context.createGain();
	this.volume = this.gain.gain;
	this.volume.value = 0;
	
	this.wave.connect(this.gain);
	this.gain.connect(this.mute);
	this.mute.connect(Playhead.channel);
	
	var myWave = this.wave;
	var myGain = this.gain;
	var myMute = this.mute
	myWave.onended = function() {
		// TODO: onended randomly just doesn't fire
		myWave.ondisconnect();
		myWave.disconnect(myGain);
		myGain.disconnect(myMute);
		myMute.disconnect(Playhead.channel);
	};
	
	this.hasScheduledStop = false;
}
Voice.prototype.setVolume = function(volume) {
	if (this.mute) this.mute.gain.value = volume;
	this.masterVolume = volume;
}
Voice.prototype.noteOn = function(pitch) {
	this.generateWave();
	
	var when = Playhead.getAbsoluteTime();
	this.wave.frequency.setValueAtTime(pitch, when);
	this.volume.cancelScheduledValues(when);
	this.volume.setValueAtTime(0, when);
	when += this.envelope.attack;
	this.volume.linearRampToValueAtTime(this.envelope.volume, when);
	when += this.envelope.decay;
	this.volume.linearRampToValueAtTime(this.envelope.volume * this.envelope.sustain, when);
};
Voice.prototype.noteOff = function() {
	if (!this.wave || this.wave.playbackState==3) return;
	
	var when = Playhead.getAbsoluteTime();
	var volume = this.volume.value;
	this.volume.cancelScheduledValues(when);
	this.volume.setValueAtTime(volume, when);
	when += this.envelope.release;
	this.volume.linearRampToValueAtTime(0, when);
	try {
		this.wave.stop(when);
		this.hasScheduledStop = true;
	}
	catch (error) {}; // stop might have already been called?
};
Voice.prototype.playNote = function(pitch, dur, when) {
	this.generateWave();
	
	when += Playhead.getResetTime();
	
	var noteStart = when;
	var noteDuration = dur;
	var noteVolume = 0;
	var noteEnd = noteStart + noteDuration;

	// set pitch
	this.wave.frequency.setValueAtTime(pitch, noteStart);
	this.volume.cancelScheduledValues(noteStart);
	this.volume.setValueAtTime(noteVolume, noteStart);

	var releaseDuration = this.envelope.release;
	var releaseStart = noteEnd;
	var releaseEnd = releaseStart + releaseDuration;

	var attackDuration = this.envelope.attack;
	var attackStart = noteStart;
	var attackEnd = attackStart + attackDuration;
	var attackVolume = this.envelope.volume;

	if (attackEnd>noteEnd) {
		attackVolume = noteDuration / attackDuration;
		noteVolume = attackVolume;
		attackDuration = noteDuration;
		attackEnd = noteEnd;
	}

	// schedule attack to max volume
	this.volume.linearRampToValueAtTime(attackVolume, attackEnd);

	var decayDuration = this.envelope.decay;
	var decayStart = attackEnd;
	var decayEnd = decayStart + decayDuration;
	var sustainVolume = this.envelope.volume * this.envelope.sustain;

	if (decayEnd>noteEnd) {
		decayDuration = noteEnd - decayStart;
		sustainVolume = attackVolume + decayDuration * (sustainVolume - attackVolume) / this.envelope.decay;
		decayEnd = noteEnd;
	}

	if (decayDuration>0) {
		// schedule decay to sustain volume
		this.volume.linearRampToValueAtTime(sustainVolume, decayEnd);
	}

	var sustainStart = decayEnd;
	var sustainEnd = releaseStart - sustainStart;
	var sustainDuration = sustainEnd - sustainStart;

	// set sustain volume
	this.volume.setValueAtTime(sustainVolume, sustainStart);

	// finally schedule release to zero volume
	this.volume.setValueAtTime(sustainVolume, releaseStart);
	this.volume.linearRampToValueAtTime(0, releaseEnd);
	this.wave.stop(releaseEnd);
	this.hasScheduledStop = true;	
};
Voice.prototype.stop = function() {
	if (!this.wave) return;

	var when = Playhead.getAbsoluteTime();
	this.volume.cancelScheduledValues(when);
	this.volume.setValueAtTime(0, when);
	if (!this.hasScheduledStop) this.wave.stop(when);
	
	// print('STOP', when);
};