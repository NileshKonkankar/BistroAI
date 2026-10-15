// Web Audio synthesized sound alerts for BistroAI
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    console.warn('AudioContext not supported or blocked:', e);
    return null;
  }
}

export function isSoundAlertEnabled(): boolean {
  try {
    const val = localStorage.getItem('bistro_staff_sound_alerts');
    return val !== 'false'; // default is true
  } catch {
    return true;
  }
}

export function setSoundAlertEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('bistro_staff_sound_alerts', enabled ? 'true' : 'false');
  } catch {
    // fallback if localstorage is restricted
  }
}

/**
 * Plays a warm, crisp 2-tone restaurant bell chime (G5 784Hz -> C6 1046Hz)
 */
export function playOrderChime(volume = 0.15): void {
  if (!isSoundAlertEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Tone 1: G5
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Tone 2: C6 (pleasant harmonic lift)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.12);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(volume * 1.1, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (e) {
    console.warn('Error playing chime:', e);
  }
}

/**
 * Test chime with guaranteed sound feedback
 */
export function testOrderChime(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => playOrderChime(0.18));
  } else {
    playOrderChime(0.18);
  }
}
