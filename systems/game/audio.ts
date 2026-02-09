
// Sample-based Audio Engine using Kenney CC0 sound assets
// All sounds are preloaded as AudioBuffers for low-latency playback

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isMuted = localStorage.getItem('pawn_audio_muted') === 'true';
let userHasInteracted = false;
let buffersLoaded = false;

// Preloaded AudioBuffer cache: key = file path, value = decoded buffer
const bufferCache = new Map<string, AudioBuffer>();

// --- Sound type definitions ---

type BaseSoundType =
    | 'CLICK' | 'HOVER' | 'SUCCESS' | 'FAIL' | 'TYPE' | 'WARNING'
    | 'BOOT' | 'CASH' | 'STAMP' | 'GLITCH' | 'SHUTTER' | 'DOORBELL' | 'FOOTSTEP'
    | 'EPIPHANY';

type ExtendedSoundType =
    | 'JINGLE_SUCCESS' | 'JINGLE_FAIL'
    | 'COIN_STACK' | 'CARD_SLIDE' | 'BOOK_OPEN' | 'DOOR_CLOSE' | 'METAL_LATCH';

export type SoundType = BaseSoundType | ExtendedSoundType;

// Per-type volume and file mappings
interface SoundDef {
    files: string[];
    gain: number;
}

const SOUND_DEFS: Record<SoundType, SoundDef> = {
    CLICK: {
        files: [
            '/audio/sfx/click_001.ogg',
            '/audio/sfx/click_002.ogg',
            '/audio/sfx/click_003.ogg',
            '/audio/sfx/click_004.ogg',
            '/audio/sfx/click_005.ogg',
        ],
        gain: 0.5,
    },
    HOVER: {
        files: [
            '/audio/sfx/tick_001.ogg',
            '/audio/sfx/tick_002.ogg',
            '/audio/sfx/tick_004.ogg',
        ],
        gain: 0.2,
    },
    SUCCESS: {
        files: [
            '/audio/sfx/confirmation_001.ogg',
            '/audio/sfx/confirmation_002.ogg',
            '/audio/sfx/confirmation_003.ogg',
            '/audio/sfx/confirmation_004.ogg',
        ],
        gain: 0.5,
    },
    FAIL: {
        files: [
            '/audio/sfx/error_004.ogg',
            '/audio/sfx/error_005.ogg',
            '/audio/sfx/error_006.ogg',
        ],
        gain: 0.5,
    },
    WARNING: {
        files: [
            '/audio/sfx/question_001.ogg',
            '/audio/sfx/question_002.ogg',
            '/audio/sfx/question_003.ogg',
        ],
        gain: 0.45,
    },
    TYPE: {
        files: [],  // Uses synthesized sound (see playSynthType)
        gain: 0.3,
    },
    EPIPHANY: {
        files: [],  // Uses synthesized sound (see playSynthEpiphany)
        gain: 0.4,
    },
    BOOT: {
        files: ['/audio/sfx/maximize_008.ogg'],
        gain: 0.6,
    },
    GLITCH: {
        files: [
            '/audio/sfx/glitch_001.ogg',
            '/audio/sfx/glitch_002.ogg',
            '/audio/sfx/glitch_003.ogg',
            '/audio/sfx/glitch_004.ogg',
        ],
        gain: 0.4,
    },
    CASH: {
        files: [
            '/audio/sfx/handleCoins.ogg',
            '/audio/sfx/handleCoins2.ogg',
        ],
        gain: 0.6,
    },
    STAMP: {
        files: [
            '/audio/sfx/impactWood_heavy_000.ogg',
            '/audio/sfx/impactWood_heavy_001.ogg',
            '/audio/sfx/impactWood_heavy_002.ogg',
        ],
        gain: 0.5,
    },
    DOORBELL: {
        files: [
            '/audio/sfx/doorOpen_1.ogg',
            '/audio/sfx/doorOpen_2.ogg',
        ],
        gain: 0.5,
    },
    FOOTSTEP: {
        files: [
            '/audio/sfx/footstep_wood_000.ogg',
            '/audio/sfx/footstep_wood_001.ogg',
            '/audio/sfx/footstep_wood_002.ogg',
            '/audio/sfx/footstep_wood_003.ogg',
            '/audio/sfx/footstep_wood_004.ogg',
        ],
        gain: 0.4,
    },
    SHUTTER: {
        files: [
            '/audio/sfx/impactMetal_heavy_000.ogg',
            '/audio/sfx/impactMetal_heavy_001.ogg',
            '/audio/sfx/impactMetal_heavy_002.ogg',
            '/audio/sfx/impactMetal_heavy_003.ogg',
        ],
        gain: 0.55,
    },

    // Extended types
    JINGLE_SUCCESS: {
        files: [
            '/audio/jingles/jingles_SAX03.ogg',
            '/audio/jingles/jingles_SAX05.ogg',
        ],
        gain: 0.45,
    },
    JINGLE_FAIL: {
        files: [
            '/audio/jingles/jingles_STEEL02.ogg',
            '/audio/jingles/jingles_STEEL04.ogg',
        ],
        gain: 0.45,
    },
    COIN_STACK: {
        files: [
            '/audio/sfx/chips-stack-1.ogg',
            '/audio/sfx/chips-stack-2.ogg',
            '/audio/sfx/chips-stack-3.ogg',
        ],
        gain: 0.5,
    },
    CARD_SLIDE: {
        files: [
            '/audio/sfx/card-slide-1.ogg',
            '/audio/sfx/card-slide-2.ogg',
            '/audio/sfx/card-slide-3.ogg',
        ],
        gain: 0.45,
    },
    BOOK_OPEN: {
        files: ['/audio/sfx/bookOpen.ogg'],
        gain: 0.5,
    },
    DOOR_CLOSE: {
        files: [
            '/audio/sfx/doorClose_1.ogg',
            '/audio/sfx/doorClose_2.ogg',
        ],
        gain: 0.5,
    },
    METAL_LATCH: {
        files: ['/audio/sfx/metalLatch.ogg'],
        gain: 0.5,
    },
};

// --- User interaction detection ---

const enableAudioOnInteraction = () => {
    if (userHasInteracted) return;
    userHasInteracted = true;

    if (!audioCtx) {
        initAudioContext();
    } else if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    // Preload all audio buffers after first interaction
    preloadAllBuffers();

    document.removeEventListener('click', enableAudioOnInteraction);
    document.removeEventListener('keydown', enableAudioOnInteraction);
    document.removeEventListener('touchstart', enableAudioOnInteraction);
};

if (typeof document !== 'undefined') {
    document.addEventListener('click', enableAudioOnInteraction, { once: true });
    document.addEventListener('keydown', enableAudioOnInteraction, { once: true });
    document.addEventListener('touchstart', enableAudioOnInteraction, { once: true });
}

// --- Audio context initialization ---

const initAudioContext = () => {
    if (audioCtx) return audioCtx;

    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = isMuted ? 0 : 1.0;
    masterGain.connect(audioCtx.destination);

    return audioCtx;
};

export const initAudio = () => {
    if (!userHasInteracted) {
        return null;
    }

    if (!audioCtx) {
        initAudioContext();
    }

    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

// --- Buffer preloading ---

const loadBuffer = async (url: string): Promise<AudioBuffer | null> => {
    if (!audioCtx) return null;
    if (bufferCache.has(url)) return bufferCache.get(url)!;

    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        bufferCache.set(url, audioBuffer);
        return audioBuffer;
    } catch {
        // Silently fail - the sound just won't play
        return null;
    }
};

const preloadAllBuffers = async () => {
    if (buffersLoaded || !audioCtx) return;
    buffersLoaded = true;

    // Collect all unique file paths
    const allFiles = new Set<string>();
    for (const def of Object.values(SOUND_DEFS)) {
        for (const file of def.files) {
            allFiles.add(file);
        }
    }

    // Load all in parallel (non-blocking, failures are silent)
    await Promise.allSettled([...allFiles].map(loadBuffer));
};

// =============================================================================
// Ambience System - Web Audio API synthesized environmental sounds
// =============================================================================

let ambienceGain: GainNode | null = null;
let ambienceNodes: AudioNode[] = [];
let ambienceTimers: ReturnType<typeof setTimeout>[] = [];
let currentAmbiencePhase: 'DAY' | 'NIGHT' | null = null;

const createBrownNoiseBuffer = (ctx: AudioContext, durationSec: number): AudioBuffer => {
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
    }
    return buffer;
};

const createPinkNoiseBuffer = (ctx: AudioContext, durationSec: number): AudioBuffer => {
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
    }
    return buffer;
};

const scheduleBirdChirp = (ctx: AudioContext, dest: AudioNode) => {
    const chirp = () => {
        if (!audioCtx || currentAmbiencePhase !== 'DAY') return;
        const t = ctx.currentTime;
        const baseFreq = 2000 + Math.random() * 2000;
        const osc = ctx.createOscillator();
        const chirpGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, t + 0.05);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, t + 0.1);
        chirpGain.gain.setValueAtTime(0, t);
        chirpGain.gain.linearRampToValueAtTime(0.015, t + 0.01);
        chirpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(chirpGain);
        chirpGain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.15);
        if (Math.random() > 0.4) {
            const osc2 = ctx.createOscillator();
            const chirpGain2 = ctx.createGain();
            osc2.type = 'sine';
            const freq2 = baseFreq * (1.1 + Math.random() * 0.3);
            osc2.frequency.setValueAtTime(freq2, t + 0.15);
            osc2.frequency.exponentialRampToValueAtTime(freq2 * 1.2, t + 0.2);
            chirpGain2.gain.setValueAtTime(0, t + 0.15);
            chirpGain2.gain.linearRampToValueAtTime(0.012, t + 0.16);
            chirpGain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc2.connect(chirpGain2);
            chirpGain2.connect(dest);
            osc2.start(t + 0.15);
            osc2.stop(t + 0.28);
        }
        ambienceTimers.push(setTimeout(chirp, 5000 + Math.random() * 10000));
    };
    ambienceTimers.push(setTimeout(chirp, 2000 + Math.random() * 5000));
};

const createDayAmbience = (ctx: AudioContext, dest: AudioNode) => {
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = createBrownNoiseBuffer(ctx, 4);
    noiseSource.loop = true;
    const lpFilter = ctx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.value = 200;
    lpFilter.Q.value = 0.7;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.8;
    noiseSource.connect(lpFilter);
    lpFilter.connect(noiseGain);
    noiseGain.connect(dest);
    noiseSource.start();
    ambienceNodes.push(noiseSource, lpFilter, noiseGain);
    scheduleBirdChirp(ctx, dest);
};

const createNightJazzHint = (ctx: AudioContext, dest: AudioNode) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 55;
    const bpFilter = ctx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.Q.value = 5;
    bpFilter.frequency.value = 150;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.3;
    lfoGain.gain.value = 60;
    lfo.connect(lfoGain);
    lfoGain.connect(bpFilter.frequency);
    const jazzGain = ctx.createGain();
    jazzGain.gain.value = 0.4;
    osc.connect(bpFilter);
    bpFilter.connect(jazzGain);
    jazzGain.connect(dest);
    osc.start();
    lfo.start();
    ambienceNodes.push(osc, bpFilter, lfo, lfoGain, jazzGain);
};

const createNightAmbience = (ctx: AudioContext, dest: AudioNode) => {
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = createPinkNoiseBuffer(ctx, 4);
    noiseSource.loop = true;
    const lpFilter = ctx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.value = 800;
    lpFilter.Q.value = 0.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.6;
    noiseSource.connect(lpFilter);
    lpFilter.connect(noiseGain);
    noiseGain.connect(dest);
    noiseSource.start();
    ambienceNodes.push(noiseSource, lpFilter, noiseGain);
    createNightJazzHint(ctx, dest);
};

/**
 * Start ambient sound for the given phase.
 * When called without arguments (backwards compat), defaults to 'DAY'.
 */
export const startAmbience = (phase?: 'DAY' | 'NIGHT') => {
    const targetPhase = phase ?? 'DAY';
    if (isMuted) return;
    if (currentAmbiencePhase === targetPhase && ambienceGain) return;
    const ctx = initAudio();
    if (!ctx || !masterGain) return;
    cleanupAmbienceNodes(ctx, 0.5);
    currentAmbiencePhase = targetPhase;
    ambienceGain = ctx.createGain();
    ambienceGain.gain.setValueAtTime(0, ctx.currentTime);
    ambienceGain.gain.linearRampToValueAtTime(
        targetPhase === 'DAY' ? 0.04 : 0.035,
        ctx.currentTime + 2
    );
    ambienceGain.connect(masterGain);
    if (targetPhase === 'DAY') {
        createDayAmbience(ctx, ambienceGain);
    } else {
        createNightAmbience(ctx, ambienceGain);
    }
};

/** Stop ambience with a smooth fade-out. */
export const stopAmbience = () => {
    if (!audioCtx) {
        currentAmbiencePhase = null;
        return;
    }
    cleanupAmbienceNodes(audioCtx, 1.5);
    currentAmbiencePhase = null;
};

const cleanupAmbienceNodes = (ctx: AudioContext, fadeOutSec: number) => {
    for (const timer of ambienceTimers) clearTimeout(timer);
    ambienceTimers = [];
    if (ambienceGain) {
        const t = ctx.currentTime;
        ambienceGain.gain.cancelScheduledValues(t);
        ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, t);
        ambienceGain.gain.linearRampToValueAtTime(0, t + fadeOutSec);
        const nodesToClean = [...ambienceNodes];
        const gainToClean = ambienceGain;
        setTimeout(() => {
            for (const node of nodesToClean) {
                try {
                    if (node instanceof AudioScheduledSourceNode) node.stop();
                    node.disconnect();
                } catch { /* already stopped/disconnected */ }
            }
            try { gainToClean.disconnect(); } catch { /* ignore */ }
        }, fadeOutSec * 1000 + 100);
    }
    ambienceNodes = [];
    ambienceGain = null;
};

// --- Mute controls ---

export const toggleMute = () => {
    isMuted = !isMuted;
    localStorage.setItem('pawn_audio_muted', String(isMuted));
    if (masterGain && audioCtx) {
        masterGain.gain.setTargetAtTime(isMuted ? 0 : 1.0, audioCtx.currentTime, 0.1);
    }
    if (isMuted) {
        stopAmbience();
    }
    return isMuted;
};

export const getMuteState = () => isMuted;

// --- Synthesized TYPE sound (mechanical keyboard click) ---

const playSynthType = (ctx: AudioContext, master: GainNode) => {
    const t = ctx.currentTime;

    // Square wave key click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2000, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.03);

    // White noise burst for texture
    const bufferSize = ctx.sampleRate * 0.02;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    noise.buffer = noiseBuffer;
    noiseGain.gain.setValueAtTime(0.05, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    noise.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(t);
};

// --- Synthesized EPIPHANY sound (ascending clarity tone) ---

const playSynthEpiphany = (ctx: AudioContext, master: GainNode) => {
    const t = ctx.currentTime;

    // Layer 1: Rising sine sweep (200Hz -> 800Hz over 0.3s)
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(200, t);
    sweep.frequency.exponentialRampToValueAtTime(800, t + 0.3);
    sweepGain.gain.setValueAtTime(0.12, t);
    sweepGain.gain.setValueAtTime(0.12, t + 0.2);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    sweep.connect(sweepGain);
    sweepGain.connect(master);
    sweep.start(t);
    sweep.stop(t + 0.5);

    // Layer 2: Shimmer (high-frequency granular texture)
    const shimmerFreqs = [3200, 4800, 6400];
    for (let i = 0; i < shimmerFreqs.length; i++) {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(shimmerFreqs[i], t + 0.1 + i * 0.04);
        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(0.04, t + 0.12 + i * 0.04);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4 + i * 0.05);
        osc.connect(oscGain);
        oscGain.connect(master);
        osc.start(t + 0.1 + i * 0.04);
        osc.stop(t + 0.45 + i * 0.05);
    }

    // Layer 3: Resonant ring at the peak (harmonic fifth)
    const ring = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(1200, t + 0.25);
    ringGain.gain.setValueAtTime(0, t);
    ringGain.gain.linearRampToValueAtTime(0.08, t + 0.28);
    ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    ring.connect(ringGain);
    ringGain.connect(master);
    ring.start(t + 0.25);
    ring.stop(t + 0.75);
};

// --- SFX playback ---

export const playSfx = (type: SoundType) => {
    if (isMuted) return;

    const ctx = initAudio();
    if (!ctx || !masterGain) return;

    // TYPE uses original synthesized sound
    if (type === 'TYPE') {
        playSynthType(ctx, masterGain);
        return;
    }

    // EPIPHANY uses synthesized ascending clarity tone
    if (type === 'EPIPHANY') {
        playSynthEpiphany(ctx, masterGain);
        return;
    }

    const def = SOUND_DEFS[type];
    if (!def) return;

    // Pick a random variant
    const file = def.files[Math.floor(Math.random() * def.files.length)];
    const buffer = bufferCache.get(file);

    if (!buffer) {
        // Buffer not yet loaded - try loading on-demand (will play next time)
        loadBuffer(file);
        return;
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();

    source.buffer = buffer;
    gain.gain.value = def.gain;

    source.connect(gain);
    gain.connect(masterGain);

    source.start(0);
};
