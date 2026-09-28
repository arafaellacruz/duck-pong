import { describe, expect, it, vi } from 'vitest';
import { DuckPongEngine } from './DuckPongEngine';

function makeCanvas() {
  const context = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  return {
    width: 0,
    height: 0,
    style: {} as CSSStyleDeclaration,
    getContext: vi.fn(() => context),
  } as unknown as HTMLCanvasElement;
}

class MockImage {
  complete = false;
  naturalWidth = 0;
  src = '';
}

vi.stubGlobal('Image', MockImage);
vi.stubGlobal('window', { devicePixelRatio: 1, addEventListener: vi.fn() });
vi.stubGlobal('cancelAnimationFrame', vi.fn());

describe('DuckPongEngine', () => {
  it('cria a engine e limita o pato dentro da quadra', () => {
    const engine = new DuckPongEngine(makeCanvas(), { onPoint: vi.fn(), onGameOver: vi.fn() }, { player: '/player.png', alfredo: '/alfredo.png' });
    engine.setPlayerX(-500);
    expect(engine.getPlayerX()).toBe(196);
    engine.setPlayerX(5000);
    expect(engine.getPlayerX()).toBe(1004);
  });

  it('aceita uma posição válida do ponteiro sem deslocar a engine para fora da quadra', () => {
    const engine = new DuckPongEngine(makeCanvas(), { onPoint: vi.fn(), onGameOver: vi.fn() }, { player: '/player.png', alfredo: '/alfredo.png' });
    engine.setPlayerX(600);
    expect(engine.getPlayerX()).toBe(600);
  });

  it('permite encerrar manualmente e retorna o placar parcial', () => {
    const onGameOver = vi.fn();
    const engine = new DuckPongEngine(makeCanvas(), { onPoint: vi.fn(), onGameOver }, { player: '/player.png', alfredo: '/alfredo.png' });
    engine.endMatch();
    expect(onGameOver).toHaveBeenCalledWith(0, 0, 'draw');
  });
});
