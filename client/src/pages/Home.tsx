import { useCallback, useEffect, useRef, useState } from 'react';
import { DuckPongEngine } from '@/game/DuckPongEngine';
import { DuckPongAudio } from '@/game/DuckPongAudio';

const PLAYER_ASSET = '/manus-storage/duck-pong-player_3d114f65.png';
const alfredo_ASSET = '/manus-storage/duck-pong-alfredo_94bce14b.png';

type RankItem = { nome: string; pontuacao: number };
type Screen = 'menu' | 'game' | 'over' | 'ranking';

function getApiUrl() {
  return (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DuckPongEngine | null>(null);
  const audioRef = useRef<DuckPongAudio | null>(null);
  const [screen, setScreen] = useState<Screen>('menu');
  const [score, setScore] = useState(0);
  const [alfredoScore, setalfredoScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [finalalfredoScore, setFinalalfredoScore] = useState(0);
  const [pointPause, setPointPause] = useState(false);
  const [pointWinner, setPointWinner] = useState<'player' | 'alfredo'>('player');
  const [matchWinner, setMatchWinner] = useState<'player' | 'alfredo' | 'draw'>('draw');
  const [name, setName] = useState('');
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchRanking = useCallback(async () => {
    const base = getApiUrl();
    setRankingLoading(true); setMessage('');
    if (!base) { setRankingLoading(false); setMessage('O servidor do ranking não está configurado.'); return; }
    try {
      const response = await fetch(`${base}/ranking`);
      if (!response.ok) throw new Error('ranking');
      const data = await response.json();
      setRanking(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch { setMessage('Não foi possível conectar ao servidor. Confira a URL do backend.'); }
    finally { setRankingLoading(false); }
  }, []);

  const saveScore = async () => {
    const base = getApiUrl();
    if (!base) { setMessage('O servidor do ranking não está configurado.'); return; }
    setSaving(true); setMessage('');
    try {
      const response = await fetch(`${base}/pontuacao`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: name.trim() || 'Patinho', pontuacao: finalScore }) });
      if (!response.ok) throw new Error('save');
      await fetchRanking();
      setScreen('ranking');
    } catch { setMessage('Não foi possível conectar ao servidor. A pontuação não foi salva.'); }
    finally { setSaving(false); }
  };

  const startGame = () => {
    audioRef.current ??= new DuckPongAudio();
    audioRef.current.unlock();
    setScore(0); setalfredoScore(0); setMessage(''); setPointPause(false); setScreen('game');
    window.setTimeout(() => {
      const canvas = canvasRef.current; if (!canvas) return;
      engineRef.current?.stop();
      const engine = new DuckPongEngine(canvas, { onHit: () => audioRef.current?.hit(), onPoint: (playerValue, alfredoValue, winner) => { audioRef.current?.point(winner); setScore(playerValue); setalfredoScore(alfredoValue); setPointWinner(winner); setPointPause(true); }, onGameOver: (playerValue, alfredoValue, winner) => { audioRef.current?.finish(winner); setFinalScore(playerValue); setFinalalfredoScore(alfredoValue); setMatchWinner(winner); setPointPause(false); setScreen('over'); } }, { player: PLAYER_ASSET, alfredo: alfredo_ASSET });
      engine.setDemo(new URLSearchParams(window.location.search).has('demo'));
      engineRef.current = engine; engine.start();
    }, 40);
  };

  const resumeAfterPoint = () => {
    setPointPause(false);
    engineRef.current?.resumeAfterPoint();
  };

  useEffect(() => () => { engineRef.current?.stop(); audioRef.current?.dispose(); }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('demo')) startGame();
  }, []);

  useEffect(() => {
    if (screen !== 'game') return;
    const onKey = (event: KeyboardEvent) => {
      if (!engineRef.current) return;
      const x = engineRef.current.getPlayerX();
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') { event.preventDefault(); engineRef.current.setPlayerX(x - 38); }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') { event.preventDefault(); engineRef.current.setPlayerX(x + 38); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [screen]);

  const moveFromPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas || !engineRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1200;
    engineRef.current.setPlayerX(x);
  };

  return (
    <main className="duck-app">
      <div className="sky-glow" />
      <header className="topbar"><button className="brand" onClick={() => { engineRef.current?.stop(); setScreen('menu'); }}><span className="brand-duck">●</span> Duck Pong</button><button className="small-link" onClick={() => { setScreen('ranking'); fetchRanking(); }}>Ranking</button></header>

      {screen === 'menu' && <section className="menu-shell">
        <div className="menu-copy"><span className="eyebrow">LAGOA • ARCADE • 01</span><h1>Duck<br /><em>Pong</em></h1><p className="lead">Um duelo de reflexos, penas e migalhas de pão. Rebata a bolinha e faça o pato rival nadar em círculos.</p><div className="menu-actions"><button className="primary-btn" onClick={startGame}>Jogar agora <span>→</span></button><button className="secondary-btn" onClick={() => { setScreen('ranking'); fetchRanking(); }}>Ver ranking <span>↗</span></button></div><div className="control-hint"><span>← →</span> ou arraste o pato <span>•</span> pare quando quiser</div></div>
        <div className="hero-card"><div className="hero-water"><div className="reed reed-a">♒</div><div className="reed reed-b">♒</div><img src={PLAYER_ASSET} className="hero-player" /><img src={alfredo_ASSET} className="hero-alfredo" /><div className="hero-crumb">✦</div><div className="hero-line" /></div><div className="hero-label"><span><b>VOCÊ</b><small>pato amarelo</small></span><span className="vs">VS</span><span className="alfredo-label"><b>alfredo</b><small>pato mint</small></span></div></div>
      </section>}

      {screen === 'game' && <section className="play-shell"><div className="game-heading"><div><span className="eyebrow">PARTIDA LIVRE</span><h2>Rebata a bolinha!</h2></div><div className="scoreboard"><div className="score-team you"><small>VOCÊ</small><strong>{score}</strong></div><span className="score-dash">—</span><div className="score-team alfredo"><small>alfredo</small><strong>{alfredoScore}</strong></div></div></div><div className="canvas-frame"><canvas ref={canvasRef} onPointerMove={moveFromPointer} onPointerDown={moveFromPointer} />{pointPause && <div className="point-overlay"><div className="point-modal"><span className="point-spark">✦</span><span className="eyebrow">PONTO DA LAGOA</span><h3>{pointWinner === 'player' ? 'Ponto seu!' : 'Ponto do alfredo!'}</h3><p>{pointWinner === 'player' ? 'Boa rebatida! Você abriu vantagem.' : 'O alfredo encontrou um espaço. Ainda dá para virar!'}</p><div className="modal-score">{score} <span>—</span> {alfredoScore}</div><button className="primary-btn" onClick={resumeAfterPoint}>Continuar partida <span>→</span></button></div></div>}</div><div className="game-footer"><span>← → mover • mouse ou touch</span><button className="ghost-btn" onClick={() => engineRef.current?.endMatch()}>Encerrar partida e salvar</button></div></section>}

      {screen === 'over' && <section className="over-shell"><div className="over-card"><span className="eyebrow">PARTIDA ENCERRADA</span><h2>{matchWinner === 'player' ? <>Você <em>está na frente!</em></> : matchWinner === 'alfredo' ? <>O alfredo <em>está na frente.</em></> : <>Partida <em>empatada.</em></>}</h2><div className="final-score"><div><strong>{finalScore}</strong><small>VOCÊ</small></div><span className="final-dash">—</span><div><strong className="alfredo-final">{finalalfredoScore}</strong><small>alfredo</small></div></div><label htmlFor="player-name">Salvar seu progresso no ranking</label><input id="player-name" maxLength={18} value={name} onChange={(event) => setName(event.target.value)} placeholder="Patinho veloz" autoFocus />{message && <p className="error-message">{message}</p>}<button className="primary-btn full" disabled={saving} onClick={saveScore}>{saving ? 'Salvando...' : 'Salvar pontuação  →'}</button><button className="secondary-btn full" onClick={startGame}>Jogar novamente</button><button className="text-btn" onClick={() => setScreen('menu')}>Voltar ao menu</button></div></section>}

      {screen === 'ranking' && <section className="ranking-shell"><div className="ranking-intro"><span className="eyebrow">HALL DA LAGOA</span><h2>Ranking dos<br /><em>patos velozes</em></h2><p>Os melhores rebatedores da margem.</p><button className="secondary-btn" onClick={fetchRanking}>Atualizar ranking ↻</button><button className="text-btn" onClick={() => setScreen('menu')}>← Voltar ao menu</button></div><div className="ranking-card"><div className="ranking-card-head"><span>POSIÇÃO</span><span>PATINHO</span><span>PONTOS</span></div>{rankingLoading ? <div className="loading-state">Carregando a lagoa...</div> : ranking.length === 0 ? <div className="loading-state">Ainda não há pontuações por aqui.</div> : ranking.map((item, index) => <div className={`rank-row rank-${index + 1}`} key={`${item.nome}-${index}`}><strong>{index < 3 ? ['🥇', '🥈', '🥉'][index] : `${String(index + 1).padStart(2, '0')}`}</strong><span>{item.nome}</span><b>{item.pontuacao}</b></div>)}{message && <p className="error-message">{message}</p>}</div></section>}

      <footer className="site-footer"><span>Duck Pong © 2026</span><span>feito com penas &amp; código</span></footer>
    </main>
  );
}
