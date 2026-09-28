import { describe, expect, it, vi } from 'vitest';
import { DuckPongAudio } from './DuckPongAudio';

describe('DuckPongAudio', () => {
  it('falha silenciosamente em navegadores sem Web Audio', () => {
    vi.stubGlobal('window', {});
    const audio = new DuckPongAudio();
    expect(() => {
      audio.unlock();
      audio.hit();
      audio.quack();
      audio.point('player');
      audio.finish('draw');
      audio.dispose();
    }).not.toThrow();
  });
});
