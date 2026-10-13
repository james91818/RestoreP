// Distinct WebAudio-generated sounds per notification type.
// No external assets — synthesized chimes so each type is recognizable.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

type Tone = {
  freq: number;
  duration: number;
  delay?: number;
  type?: OscillatorType;
  volume?: number;
};

function playSequence(tones: Tone[]) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  let offset = 0;
  tones.forEach((t) => {
    const start = now + offset + (t.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = t.type ?? "sine";
    osc.frequency.setValueAtTime(t.freq, start);
    const vol = t.volume ?? 0.3;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + t.duration + 0.05);
    offset += t.duration + (t.delay ?? 0);
  });
}

// === Per-type signature sounds ===

// Lead — bright ascending three-tone chime (D5, G5, C6)
export function playNewLeadSound() {
  playSequence([
    { freq: 587.33, duration: 0.15, volume: 0.35 },
    { freq: 783.99, duration: 0.15, volume: 0.35 },
    { freq: 1046.5, duration: 0.3, volume: 0.35 },
  ]);
}

// Deposit / payment — rich "cha-ching" cash register style (two bright bells)
export function playDepositSound() {
  playSequence([
    { freq: 1318.51, duration: 0.18, volume: 0.4, type: "triangle" }, // E6
    { freq: 1567.98, duration: 0.45, volume: 0.4, type: "triangle" }, // G6
  ]);
  // Layered sparkle
  setTimeout(() => playSequence([{ freq: 2093, duration: 0.35, volume: 0.18, type: "sine" }]), 80);
}

// Wallet received — warm two-tone (C5 → E5)
export function playWalletReceivedSound() {
  playSequence([
    { freq: 523.25, duration: 0.18, volume: 0.32, type: "triangle" },
    { freq: 659.25, duration: 0.35, volume: 0.32, type: "triangle" },
  ]);
}

// Chat message — soft "pop" (short single mid tone)
export function playChatSound() {
  playSequence([
    { freq: 880, duration: 0.08, volume: 0.28, type: "sine" },
    { freq: 1174.66, duration: 0.12, volume: 0.28, type: "sine" },
  ]);
}

// Client online — gentle blip (single short low-mid tone)
export function playClientOnlineSound() {
  playSequence([
    { freq: 523.25, duration: 0.1, volume: 0.22, type: "sine" },
    { freq: 698.46, duration: 0.18, volume: 0.22, type: "sine" },
  ]);
}

// Appointment — calm calendar bell (G5, D6)
export function playAppointmentSound() {
  playSequence([
    { freq: 783.99, duration: 0.22, volume: 0.3, type: "triangle" },
    { freq: 1174.66, duration: 0.4, volume: 0.3, type: "triangle" },
  ]);
}

// Warning — descending two-tone alert (square wave)
export function playWarningSound() {
  playSequence([
    { freq: 880, duration: 0.18, volume: 0.32, type: "square" },
    { freq: 587.33, duration: 0.28, volume: 0.32, type: "square" },
  ]);
}

// Info — neutral single tone
export function playInfoSound() {
  playSequence([{ freq: 659.25, duration: 0.18, volume: 0.25, type: "sine" }]);
}

// Payment link — playful four-note arpeggio
export function playPaymentLinkSound() {
  playSequence([
    { freq: 523.25, duration: 0.1, volume: 0.3, type: "triangle" },
    { freq: 659.25, duration: 0.1, volume: 0.3, type: "triangle" },
    { freq: 783.99, duration: 0.1, volume: 0.3, type: "triangle" },
    { freq: 1046.5, duration: 0.25, volume: 0.3, type: "triangle" },
  ]);
}

// Generic fallback
export function playGenericSound() {
  playSequence([
    { freq: 740, duration: 0.12, volume: 0.25 },
    { freq: 988, duration: 0.18, volume: 0.25 },
  ]);
}

/**
 * Play the sound matching a notification type.
 * Falls back to a generic chime for unknown types.
 */
export function playNotificationSound(type?: string | null, priority?: number) {
  switch ((type || "").toLowerCase()) {
    case "deposit":
      return playDepositSound();
    case "wallet_received":
      return playWalletReceivedSound();
    case "lead":
      return playNewLeadSound();
    case "chat":
      return playChatSound();
    case "client_online":
      return playClientOnlineSound();
    case "appointment":
      return playAppointmentSound();
    case "warning":
      return playWarningSound();
    case "info":
      return playInfoSound();
    case "payment_link":
      return playPaymentLinkSound();
    default:
      if ((priority ?? 0) >= 3) return playDepositSound();
      if ((priority ?? 0) >= 2) return playWarningSound();
      return playGenericSound();
  }
}
