
// A robust Procedural Audio Engine for Cyber-Noir atmosphere
// No external assets required. Pure Math & Physics.

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let ambienceGain: GainNode | null = null;
let isMuted = localStorage.getItem('pawn_audio_muted') === 'true';

// Track references for loops
const activeLoops: { [key: string]: AudioScheduledSourceNode } = {};
const noiseBuffers: { [key: string]: AudioBuffer } = {};

export const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = isMuted ? 0 : 1.0;
        masterGain.connect(audioCtx.destination);

        ambienceGain = audioCtx.createGain();
        ambienceGain.gain.value = 0; // Disabled ambience volume by default
        ambienceGain.connect(masterGain);

        // Pre-generate noise buffers for performance
        createNoiseBuffer('pink', 2); // 2 seconds of pink noise
        createNoiseBuffer('white', 0.5); // 0.5 seconds of white noise
    }
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

// --- SYNTHESIS UTILS ---

const createNoiseBuffer = (type: 'white' | 'pink', duration: number) => {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    } else if (type === 'pink') {
        // Paul Kellett's refined method for Pink Noise
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            data[i] *= 0.11; // Compensate for gain
            b6 = white * 0.115926;
        }
    }
    noiseBuffers[type] = buffer;
};

// --- AMBIENCE ENGINE ---

export const startAmbience = () => {
    // Ambience disabled per request.
    return;

    /*
    const ctx = initAudio();
    if (!ctx || !ambienceGain) return;

    // 1. Rain Layer (Pink Noise + Lowpass)
    if (!activeLoops['rain'] && noiseBuffers['pink']) {
        const rainSource = ctx.createBufferSource();
        rainSource.buffer = noiseBuffers['pink'];
        rainSource.loop = true;

        const rainFilter = ctx.createBiquadFilter();
        rainFilter.type = 'lowpass';
        rainFilter.frequency.value = 800; // Muffled rain sound

        rainSource.connect(rainFilter);
        rainFilter.connect(ambienceGain);
        rainSource.start();
        activeLoops['rain'] = rainSource;
    }

    // 2. City Drone (Detuned Sines)
    if (!activeLoops['drone']) {
        const droneOsc1 = ctx.createOscillator();
        const droneOsc2 = ctx.createOscillator();
        const droneGain = ctx.createGain();
        
        droneOsc1.frequency.value = 55; // Low A
        droneOsc2.frequency.value = 57; // Slight detune for "beating" effect
        
        droneGain.gain.value = 0.15;

        droneOsc1.connect(droneGain);
        droneOsc2.connect(droneGain);
        droneGain.connect(ambienceGain);

        droneOsc1.start();
        droneOsc2.start();
        
        activeLoops['drone'] = droneOsc1; // Store one as reference
    }
    */
};

export const stopAmbience = () => {
    Object.values(activeLoops).forEach(node => {
        try { node.stop(); } catch(e) {}
    });
    // Clear references
    for (const key in activeLoops) delete activeLoops[key];
};

// --- SFX ENGINE ---

export const toggleMute = () => {
    isMuted = !isMuted;
    localStorage.setItem('pawn_audio_muted', String(isMuted));
    if (masterGain) {
        masterGain.gain.setTargetAtTime(isMuted ? 0 : 1.0, audioCtx!.currentTime, 0.1);
    }
    return isMuted;
};

export const getMuteState = () => isMuted;

type SoundType = 'CLICK' | 'HOVER' | 'SUCCESS' | 'FAIL' | 'TYPE' | 'WARNING' | 'BOOT' | 'CASH' | 'STAMP' | 'GLITCH';

export const playSfx = (type: SoundType) => {
    // If muted, do nothing
    if (isMuted) return;

    const ctx = initAudio();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(masterGain);

    switch (type) {
        case 'CLICK':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            osc.start(t);
            osc.stop(t + 0.05);
            break;

        case 'HOVER':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, t);
            gain.gain.setValueAtTime(0.01, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.015);
            osc.start(t);
            osc.stop(t + 0.02);
            break;

        case 'TYPE':
            // Mechanical switch sound
            osc.type = 'square';
            osc.frequency.setValueAtTime(2000, t);
            gain.gain.setValueAtTime(0.05, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
            
            // Add a little noise burst for the "click" texture
            if (noiseBuffers['white']) {
                const noise = ctx.createBufferSource();
                const noiseGain = ctx.createGain();
                noise.buffer = noiseBuffers['white'];
                noiseGain.gain.setValueAtTime(0.05, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
                noise.connect(noiseGain);
                noiseGain.connect(masterGain);
                noise.start(t);
            }
            
            osc.start(t);
            osc.stop(t + 0.03);
            break;

        case 'CASH':
            // "Ka-ching" - Two tones rapidly
            const coin1 = ctx.createOscillator();
            const coin2 = ctx.createOscillator();
            const coinGain = ctx.createGain();
            
            coin1.type = 'sine';
            coin2.type = 'sine';
            
            coin1.frequency.setValueAtTime(1200, t);
            coin2.frequency.setValueAtTime(2000, t + 0.05);
            
            coinGain.gain.setValueAtTime(0.1, t);
            coinGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
            
            coin1.connect(coinGain);
            coin2.connect(coinGain);
            coinGain.connect(masterGain);
            
            coin1.start(t);
            coin1.stop(t + 0.6);
            coin2.start(t + 0.05);
            coin2.stop(t + 0.6);
            break;

        case 'STAMP':
            // Low thud
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.2);
            
            // Paper noise
            if (noiseBuffers['pink']) {
                const impact = ctx.createBufferSource();
                const impactGain = ctx.createGain();
                impact.buffer = noiseBuffers['pink'];
                impactGain.gain.setValueAtTime(0.2, t);
                impactGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                impact.connect(impactGain);
                impactGain.connect(masterGain);
                impact.start(t);
            }
            break;

        case 'SUCCESS':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.linearRampToValueAtTime(880, t + 0.1);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc.start(t);
            osc.stop(t + 0.4);
            break;

        case 'FAIL':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, t);
            osc.frequency.linearRampToValueAtTime(50, t + 0.3);
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);
            break;
            
        case 'WARNING':
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, t);
            gain.gain.setValueAtTime(0.05, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.1); // Short blip
            osc.start(t);
            osc.stop(t + 0.1);
            
            // Second blip
            const warn2 = ctx.createOscillator();
            const warn2Gain = ctx.createGain();
            warn2.type = 'square';
            warn2.frequency.setValueAtTime(800, t + 0.15);
            warn2Gain.gain.setValueAtTime(0.05, t + 0.15);
            warn2Gain.gain.linearRampToValueAtTime(0, t + 0.25);
            warn2.connect(warn2Gain);
            warn2Gain.connect(masterGain);
            warn2.start(t + 0.15);
            warn2.stop(t + 0.25);
            break;

        case 'GLITCH':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, t);
            // Random freq modulation
            osc.frequency.linearRampToValueAtTime(Math.random() * 1000 + 200, t + 0.05);
            osc.frequency.linearRampToValueAtTime(Math.random() * 500 + 100, t + 0.1);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
            break;

        case 'BOOT':
            // THX-style swell (miniature)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(50, t);
            osc.frequency.exponentialRampToValueAtTime(400, t + 1.5);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.1, t + 0.5);
            gain.gain.linearRampToValueAtTime(0, t + 2.0);
            
            // Add a sub bass
            const sub = ctx.createOscillator();
            const subGain = ctx.createGain();
            sub.frequency.setValueAtTime(30, t);
            sub.frequency.linearRampToValueAtTime(60, t + 2.0);
            subGain.gain.setValueAtTime(0.2, t);
            subGain.gain.linearRampToValueAtTime(0, t + 2.0);
            
            sub.connect(subGain);
            subGain.connect(masterGain);
            
            osc.start(t);
            osc.stop(t + 2.0);
            sub.start(t);
            sub.stop(t + 2.0);
            break;
    }
};
