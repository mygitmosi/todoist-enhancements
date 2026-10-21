/**
 * The little sound that crosses a task off (#282).
 *
 * Synthesised with Web Audio, so there is no file to download and nothing to
 * license. Every sound is two beats, a tic and a tic-tic, and the person
 * picks theirs in Settings. It is only ever played from a tick, which is a
 * click or a key, so the browser always lets the audio context start.
 */
export const COMPLETION_SOUNDS = ['pop', 'marimba', 'glass', 'octave', 'fall'] as const;
export type CompletionSound = typeof COMPLETION_SOUNDS[number];
/** What the setting holds: one of the sounds, or none, which is the default. */
export type CompletionChoice = CompletionSound | 'none';
export const DEFAULT_COMPLETION_CHOICE: CompletionChoice = 'none';
const FALLBACK_SOUND: CompletionSound = 'pop';

export const isCompletionChoice = (value: unknown): value is CompletionChoice =>
  value === 'none' || (COMPLETION_SOUNDS as readonly unknown[]).includes(value);

export const isCompletionSound = (value: unknown): value is CompletionSound =>
  (COMPLETION_SOUNDS as readonly unknown[]).includes(value);

let context: AudioContext | null = null;

interface Voice { at: number; hz: number; to?: number; type?: OscillatorType; attack: number; length: number; gain: number }
type Beat = (at: number) => Voice[];

/** A soft pop: a sine that falls fast. */
const pop = (at: number, hz: number, gain = 0.3): Voice[] =>
  [{ at, hz, to: hz / 3.9, attack: 0.004, length: 0.09, gain }];
/** A marimba note: a wooden fundamental with a short high partial. */
const marimba = (at: number, hz: number): Voice[] => [
  { at, hz, attack: 0.003, length: 0.3, gain: 0.25 },
  { at, hz: hz * 4, attack: 0.002, length: 0.06, gain: 0.05 },
];
/** A glass ping: a clear sine with a quiet inharmonic partial. */
const glass = (at: number, hz: number): Voice[] => [
  { at, hz, attack: 0.004, length: 0.7, gain: 0.1 },
  { at, hz: hz * 2.76, attack: 0.003, length: 0.2, gain: 0.033 },
];

const SOUNDS: Record<CompletionSound, Beat> = {
  pop: (t) => [...pop(t, 560), ...pop(t + 0.1, 760)],
  marimba: (t) => [...marimba(t, 784), ...marimba(t + 0.1, 1046.5)],
  glass: (t) => [...glass(t, 1568), ...glass(t + 0.1, 2093)],
  octave: (t) => [...marimba(t, 523.25), ...marimba(t + 0.1, 1046.5)],
  fall: (t) => [...glass(t, 2093), ...glass(t + 0.1, 1568)],
};

export function playCompletionSound(sound: CompletionSound = FALLBACK_SOUND): void {
  if (typeof window === 'undefined') return;
  try {
    const Audio = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio();
    if (context.state === 'suspended') void context.resume();
    const start = context.currentTime;
    for (const voice of SOUNDS[isCompletionSound(sound) ? sound : FALLBACK_SOUND](start)) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = voice.type ?? 'sine';
      oscillator.frequency.setValueAtTime(voice.hz, voice.at);
      if (voice.to) oscillator.frequency.exponentialRampToValueAtTime(voice.to, voice.at + Math.min(voice.length, 0.18));
      gain.gain.setValueAtTime(0.0001, voice.at);
      gain.gain.exponentialRampToValueAtTime(voice.gain, voice.at + voice.attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, voice.at + voice.attack + voice.length);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(voice.at);
      oscillator.stop(voice.at + voice.attack + voice.length + 0.05);
    }
  } catch {
    /* No sound is never worth an error: ticking the task is what matters. */
  }
}
