
// A simple Web Audio API wrapper for Cyber-Noir UI sounds
// No external assets required.

let audioCtx: AudioContext | null = null;
let isMuted = localStorage.getItem('pawn_audio_muted') === 'true';

const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

export const toggleMute = () => {
    isMuted = !isMuted;
    localStorage.setItem('pawn_audio_muted', String(isMuted));
    return isMuted;
};

export const getMuteState = () => isMuted;

type SoundType = 'CLICK' | 'HOVER' | 'SUCCESS' | 'FAIL' | 'TYPE' | 'WARNING' | 'BOOT';

export const playSfx = (type: SoundType) => {
    if (isMuted) return;

    const ctx = initAudio();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
        case 'CLICK':
            // High pitched short blip
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;

        case 'HOVER':
            // Very subtle low click
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.02);
            osc.start(now);
            osc.stop(now + 0.02);
            break;

        case 'SUCCESS':
            // Cash register / Positive chime
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.1);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;

        case 'FAIL':
            // Low error buzz
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
            
        case 'WARNING':
            // Alarm pulse
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(0, now + 0.1);
            osc.frequency.setValueAtTime(440, now + 0.2);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;

        case 'BOOT':
            // Startup swell
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(1000, now + 1.5);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.5);
            gain.gain.linearRampToValueAtTime(0, now + 1.5);
            osc.start(now);
            osc.stop(now + 1.5);
            break;
    }
};
