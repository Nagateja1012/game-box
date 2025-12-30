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

    playTone(freq, type, duration, vol = 0.1) {
        if (this.muted) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    playClick() {
        this.playTone(600, 'sine', 0.1, 0.05);
    }

    playPick() {
        this.playTone(400, 'triangle', 0.1, 0.05);
    }

    playGameStart() {
        if (this.muted) return;
        const now = this.audioCtx.currentTime;
        [440, 554, 659].forEach((freq, i) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        });
    }

    playGameEnd() {
        if (this.muted) return;
        const now = this.audioCtx.currentTime;
        [523, 659, 783, 1046].forEach((freq, i) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.5);
        });
    }

    playUnoShout() {
        if (this.muted) return;
        // Play a dramatic chord
        this.playTone(300, 'sawtooth', 0.5, 0.1);
        this.playTone(450, 'sawtooth', 0.5, 0.1);

        // Speech
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance("Uno!");
            utterance.rate = 1.2;
            utterance.pitch = 1.2;
            window.speechSynthesis.speak(utterance);
        }
    }
}

export const soundManager = new SoundManager();
