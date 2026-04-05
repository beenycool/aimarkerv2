import type { Options } from 'canvas-confetti';

const defaults: Partial<Options> = {
    spread: 72,
    origin: { y: 0.68 },
    ticks: 140,
    particleCount: 90,
    scalar: 0.95,
};

/**
 * Lightweight celebration burst (dynamic import keeps canvas-confetti off the critical path).
 */
export async function burstConfetti(overrides?: Partial<Options>): Promise<void> {
    if (typeof window === 'undefined') return;
    const confetti = (await import('canvas-confetti')).default;
    await confetti({ ...defaults, ...overrides });
}
