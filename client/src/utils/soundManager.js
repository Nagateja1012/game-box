class SoundManager {
    constructor() {
        this.muted = localStorage.getItem('global_mute') === 'true';
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    setMuted(muted) {
        this.muted = muted;
        localStorage.setItem('global_mute', muted.toString());
        if (!muted && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    // --- Core Sound Synthesis ---

    playTone(freq, type, duration, vol = 0.1, ramp = 'exponential') {
        if (this.muted) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            const now = this.audioCtx.currentTime;

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(vol, now);
            if (ramp === 'exponential') {
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            } else {
                gain.gain.linearRampToValueAtTime(0.001, now + duration);
            }

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(now + duration);
        } catch (e) {
            console.warn('AudioContext error:', e);
        }
    }

    playChord(freqs, type, duration, vol = 0.1, stagger = 0) {
        if (this.muted) return;
        freqs.forEach((f, i) => {
            setTimeout(() => this.playTone(f, type, duration, vol), i * stagger * 1000);
        });
    }

    // --- Game Actions ---

    playClick() {
        // Crisp UI click
        this.playTone(800, 'sine', 0.05, 0.05);
    }

    playHover() {
        // Very subtle hover
        this.playTone(400, 'sine', 0.05, 0.02);
    }

    playInvalid() {
        // Error buzz
        this.playTone(150, 'sawtooth', 0.3, 0.15, 'linear');
        setTimeout(() => this.playTone(100, 'sawtooth', 0.3, 0.15, 'linear'), 100);
    }

    playPick() {
        // Card pickup / slight interaction
        this.playTone(600, 'triangle', 0.1, 0.05);
    }

    playPop() {
        // Bubble pop sound
        this.playTone(500, 'sine', 0.1, 0.1);
    }

    // --- Game Events ---

    playGameStart() {
        if (this.muted) return;
        // Rising upbeat arpeggio
        this.playChord([440, 554, 659, 880], 'sine', 0.4, 0.1, 0.08);
    }

    playGameEnd() {
        // Neutral/Generic end
        this.playChord([523, 659, 783, 1046], 'triangle', 0.6, 0.1, 0.1);
    }

    playWin() {
        if (this.muted) return;
        // Victory Fanfare (Major Chord + decorative high notes)
        const now = this.audioCtx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => { // C Major
            setTimeout(() => this.playTone(f, 'square', 0.6, 0.1), i * 100);
        });
        setTimeout(() => this.playTone(1318.51, 'sine', 0.8, 0.15), 600); // High E
        setTimeout(() => this.playTone(1567.98, 'sine', 1.0, 0.15), 800); // High G
    }

    playLose() {
        if (this.muted) return;
        // Defeat (Descending minor tones)
        this.playTone(440, 'triangle', 0.5, 0.15, 'linear'); // A
        setTimeout(() => this.playTone(415.30, 'triangle', 0.5, 0.15, 'linear'), 400); // G#
        setTimeout(() => this.playTone(369.99, 'triangle', 0.8, 0.15, 'linear'), 800); // F#
    }

    playSmallWin() {
        // Example: Completing a row in Bingo, or UNO shout
        this.playChord([523, 659, 1046], 'sine', 0.3, 0.1, 0.05);
    }

    playSkipped() {
        if (this.muted) return;
        // descending "whomp" sound
        this.playTone(300, 'sawtooth', 0.2, 0.1, 'linear');
        setTimeout(() => this.playTone(200, 'sawtooth', 0.4, 0.1, 'linear'), 150);
    }

    playTimeEnd() {
        // Timber expiry / Alarm
        this.playTone(880, 'square', 0.1, 0.1);
        setTimeout(() => this.playTone(880, 'square', 0.1, 0.1), 150);
        setTimeout(() => this.playTone(440, 'square', 0.4, 0.1), 300);
    }

    playUnoShout() {
        if (this.muted) return;
        // Dramatic chord
        this.playChord([300, 450, 600], 'sawtooth', 0.5, 0.1);
        this.playSpeech("Uno!", 1.2);
    }

    // --- Speech ---

    playSpeech(text, rate = 1.0, pitch = 1.0) {
        if (this.muted || !('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel(); // meaningful interruption
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;
        window.speechSynthesis.speak(utterance);
    }
}

export const soundManager = new SoundManager();
