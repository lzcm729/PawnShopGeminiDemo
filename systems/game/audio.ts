
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
        createNoiseBuffer('brown', 2); // 2 seconds of brown noise for rumble
    }
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

// --- SYNTHESIS UTILS ---

const createNoiseBuffer = (type: 'white' | 'pink' | 'brown', duration: number) => {
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
    } else if (type === 'brown') {
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; 
        }
    }
    noiseBuffers[type] = buffer;
};

// --- AMBIENCE ENGINE ---

export const startAmbience = () => {
    // Ambience disabled per request.
    return;
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

type SoundType = 'CLICK' | 'HOVER' | 'SUCCESS' | 'FAIL' | 'TYPE' | 'WARNING' | 'BOOT' | 'CASH' | 'STAMP' | 'GLITCH' | 'SHUTTER' | 'DOORBELL' | 'FOOTSTEP';

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
        case 'SHUTTER':
            // Mechanical Rolling Sound
            if (noiseBuffers['brown']) {
                const rumble = ctx.createBufferSource();
                const rumbleGain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                rumble.buffer = noiseBuffers['brown'];
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(100, t);
                filter.frequency.linearRampToValueAtTime(800, t + 0.8);
                filter.frequency.linearRampToValueAtTime(100, t + 1.5);

                rumbleGain.gain.setValueAtTime(0, t);
                rumbleGain.gain.linearRampToValueAtTime(0.5, t + 0.2);
                rumbleGain.gain.linearRampToValueAtTime(0, t + 1.5);

                rumble.connect(filter);
                filter.connect(rumbleGain);
                rumbleGain.connect(masterGain);
                
                rumble.start(t);
                rumble.stop(t + 1.5);
            }
            
            // Metal Clank at end
            const clank = ctx.createOscillator();
            const clankGain = ctx.createGain();
            clank.type = 'square';
            clank.frequency.setValueAtTime(100, t + 1.4);
            clank.frequency.exponentialRampToValueAtTime(50, t + 1.5);
            clankGain.gain.setValueAtTime(0, t + 1.4);
            clankGain.gain.linearRampToValueAtTime(0.2, t + 1.45);
            clankGain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
            
            clank.connect(clankGain);
            clankGain.connect(masterGain);
            clank.start(t + 1.4);
            clank.stop(t + 1.6);
            break;

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

        case 'DOORBELL':
            // Simple Ding Dong
            const ding = ctx.createOscillator();
            const dong = ctx.createOscillator();
            
            ding.type = 'sine';
            ding.frequency.setValueAtTime(800, t);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
            
            ding.connect(gain);
            ding.start(t);
            ding.stop(t + 1.5);

            setTimeout(() => {
                // We need new context reference or manage nodes, but here simple approach:
                // Re-use logic or just play one tone for simplicity in this func pattern
                // Let's just do a dual-tone in one go
                const dongGain = ctx.createGain();
                dong.type = 'sine';
                dong.frequency.setValueAtTime(600, t + 0.4);
                dongGain.gain.setValueAtTime(0.1, t + 0.4);
                dongGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
                dong.connect(dongGain);
                dongGain.connect(masterGain);
                dong.start(t + 0.4);
                dong.stop(t + 2.0);
            }, 0);
            break;

        case 'FOOTSTEP':
            // Low thud noise
            if (noiseBuffers['pink']) {
                const step = ctx.createBufferSource();
                const stepGain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                step.buffer = noiseBuffers['pink'];
                filter.type = 'lowpass';
                filter.frequency.value = 150;
                
                stepGain.gain.setValueAtTime(0.3, t);
                stepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                
                step.connect(filter);
                filter.connect(stepGain);
                stepGain.connect(masterGain);
                
                step.start(t);
            }
            break;
    }
};
