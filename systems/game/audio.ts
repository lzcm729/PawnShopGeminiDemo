
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
    | 'BOOT' | 'CASH' | 'STAMP' | 'GLITCH' | 'SHUTTER' | 'DOORBELL' | 'FOOTSTEP';

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
        files: [
            '/audio/sfx/switch_001.ogg',
            '/audio/sfx/switch_002.ogg',
            '/audio/sfx/switch_003.ogg',
        ],
        gain: 0.3,
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

// --- Ambience stubs (kept for API compatibility) ---

export const startAmbience = () => {
    // Ambience disabled
};

export const stopAmbience = () => {
    // Ambience disabled
};

// --- Mute controls ---

export const toggleMute = () => {
    isMuted = !isMuted;
    localStorage.setItem('pawn_audio_muted', String(isMuted));
    if (masterGain && audioCtx) {
        masterGain.gain.setTargetAtTime(isMuted ? 0 : 1.0, audioCtx.currentTime, 0.1);
    }
    return isMuted;
};

export const getMuteState = () => isMuted;

// --- SFX playback ---

export const playSfx = (type: SoundType) => {
    if (isMuted) return;

    const ctx = initAudio();
    if (!ctx || !masterGain) return;

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
