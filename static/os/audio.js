// PRASAD DESKTOP — generated UI sounds and user-supplied looping background music.
// The music is the local Guitar-Lofi.Mp3 file; no external or copyrighted streams.

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const MUSIC_SRC = '/audio/music/Guitar-Lofi.Mp3';

function createContext() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        return AudioContextClass ? new AudioContextClass() : null;
    } catch (error) {
        return null;
    }
}

function connectTone(ctx, destination, options) {
    const {
        frequency,
        type = 'sine',
        start,
        duration = 0.12,
        volume = 0.02,
        attack = 0.006,
        endFrequency,
        filterFrequency,
    } = options;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    let tail = gain;
    if (filterFrequency) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFrequency;
        gain.connect(filter);
        tail = filter;
    }
    oscillator.connect(gain);
    tail.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
}

/* ------------------------------ UI SOUNDS ------------------------------ */
export function createSfxEngine(isEnabled) {
    let ctx = null;

    const ensureContext = () => {
        if (!isEnabled()) return null;
        try {
            ctx = ctx || createContext();
            return ctx;
        } catch (error) {
            return null;
        }
    };

    const play = (type = 'click') => {
        const audio = ensureContext();
        if (!audio) return;

        const schedule = () => {
            if (!isEnabled()) return;
            const now = audio.currentTime + 0.005;
            try {
                if (type === 'open') {
                    connectTone(audio, audio.destination, { frequency: 520, endFrequency: 760, type: 'square', start: now, duration: 0.07, volume: 0.022, filterFrequency: 2600 });
                    connectTone(audio, audio.destination, { frequency: 780, type: 'sine', start: now + 0.045, duration: 0.07, volume: 0.016 });
                } else if (type === 'close') {
                    connectTone(audio, audio.destination, { frequency: 360, endFrequency: 180, type: 'triangle', start: now, duration: 0.11, volume: 0.022, filterFrequency: 1800 });
                } else if (type === 'search') {
                    connectTone(audio, audio.destination, { frequency: 920, endFrequency: 1180, type: 'square', start: now, duration: 0.045, volume: 0.014, filterFrequency: 3200 });
                } else if (type === 'error') {
                    connectTone(audio, audio.destination, { frequency: 190, endFrequency: 140, type: 'sawtooth', start: now, duration: 0.1, volume: 0.016, filterFrequency: 900 });
                    connectTone(audio, audio.destination, { frequency: 150, endFrequency: 110, type: 'sawtooth', start: now + 0.11, duration: 0.1, volume: 0.014, filterFrequency: 800 });
                } else if (type === 'victory') {
                    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
                        connectTone(audio, audio.destination, { frequency, type: 'square', start: now + index * 0.085, duration: 0.12, volume: 0.018, filterFrequency: 3000 });
                    });
                } else if (type === 'easter') {
                    [720, 540, 360].forEach((frequency, index) => {
                        connectTone(audio, audio.destination, { frequency, endFrequency: frequency * 0.82, type: 'triangle', start: now + index * 0.07, duration: 0.1, volume: 0.017 });
                    });
                } else {
                    connectTone(audio, audio.destination, { frequency: 420, type: 'square', start: now, duration: 0.035, volume: 0.014, filterFrequency: 2400 });
                }
            } catch (error) { /* audio is best effort */ }
        };

        try {
            if (audio.state === 'suspended' && typeof audio.resume === 'function') {
                audio.resume().then(schedule).catch(() => {});
            } else {
                schedule();
            }
        } catch (error) {
            schedule();
        }
    };

    return { play };
}

/* -------------------------- LOCAL MP3 MUSIC -------------------------- */
export function createMusicEngine({ onStateChange = () => {}, src = MUSIC_SRC } = {}) {
    let media = null;
    let playing = false;
    let starting = false;
    let muted = false;
    let volume = 0.35;
    let failed = false;
    let startToken = 0;

    const setPlaying = (value) => {
        if (playing === value) return;
        playing = value;
        onStateChange();
    };

    const syncVolume = () => {
        if (!media) return;
        try { media.volume = muted ? 0 : volume; } catch (error) { /* ignore */ }
    };

    const onPlaying = () => {
        starting = false;
        setPlaying(true);
    };

    const onPause = () => {
        if (!starting) setPlaying(false);
    };

    const onError = () => {
        starting = false;
        failed = true;
        setPlaying(false);
    };

    const ensureMedia = () => {
        if (media) return media;
        try {
            if (typeof Audio === 'undefined') return null;
            media = new Audio(src);
            media.loop = true;
            media.preload = 'metadata';
            syncVolume();
            media.addEventListener('playing', onPlaying);
            media.addEventListener('pause', onPause);
            media.addEventListener('error', onError);
            return media;
        } catch (error) {
            failed = true;
            return null;
        }
    };

    const start = async () => {
        if (playing || starting) return true;
        if (failed) return false;
        const element = ensureMedia();
        if (!element) {
            onStateChange();
            return false;
        }

        const token = ++startToken;
        starting = true;
        try {
            syncVolume();
            await element.play();
            if (token !== startToken) return false;
            setPlaying(true);
            return true;
        } catch (error) {
            // NotAllowedError is retryable on the next real user gesture.
            if (token === startToken) setPlaying(false);
            return false;
        } finally {
            if (token === startToken) starting = false;
        }
    };

    const pause = () => {
        startToken += 1;
        starting = false;
        setPlaying(false);
        if (!media) return;
        try { media.pause(); } catch (error) { /* ignore */ }
    };

    return {
        start,
        pause,
        toggle() {
            return playing ? (pause(), Promise.resolve(true)) : start();
        },
        isPlaying: () => playing,
        isMuted: () => muted,
        getVolume: () => volume,
        getSource: () => src,
        setVolume(value) {
            volume = clamp(Number(value) || 0, 0, 1);
            syncVolume();
            onStateChange();
        },
        setMuted(value) {
            muted = !!value;
            syncVolume();
            onStateChange();
        },
        dispose() {
            pause();
            if (!media) return;
            try { media.removeEventListener('playing', onPlaying); } catch (error) { /* ignore */ }
            try { media.removeEventListener('pause', onPause); } catch (error) { /* ignore */ }
            try { media.removeEventListener('error', onError); } catch (error) { /* ignore */ }
            media = null;
        },
    };
}
