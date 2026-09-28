export type DuckPongCallbacks = {
  onHit?: () => void;
  onPoint: (playerScore: number, alfredoScore: number, pointWinner: 'player' | 'alfredo') => void;
  onGameOver: (playerScore: number, alfredoScore: number, winner: 'player' | 'alfredo' | 'draw') => void;
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };

const W = 1200;
const H = 760;
const COURT = { left: 110, right: 1090, top: 95, alfredotom: 665, mid: 380 };

export class DuckPongEngine {
  private ctx: CanvasRenderingContext2D;
  private frame = 0;
  private lastTime = 0;
  private running = false;
  private raf = 0;
  private playerX = 600;
  private alfredoX = 600;
  private ball = { x: 600, y: 382, vx: 230, vy: 305, r: 18 };
  private playerScore = 0;
  private alfredoScore = 0;
  private rally = 0;
  private particles: Particle[] = [];
  private playerImage: HTMLImageElement;
  private alfredoImage: HTMLImageElement;
  private demo = false;
  private awaitingResume = false;
  private callbacks: DuckPongCallbacks;

  constructor(canvas: HTMLCanvasElement, callbacks: DuckPongCallbacks, assets: { player: string; alfredo: string }) {
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.playerImage = new Image();
    this.alfredoImage = new Image();
    this.playerImage.src = assets.player;
    this.alfredoImage.src = assets.alfredo;
    this.callbacks = callbacks;
    this.resizeCanvas(canvas);
    window.addEventListener('resize', () => this.resizeCanvas(canvas));
  }

  setDemo(value: boolean) { this.demo = value; }
  setPlayerX(value: number) { this.playerX = Math.max(COURT.left + 86, Math.min(COURT.right - 86, value)); }
  getPlayerX() { return this.playerX; }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resumeAfterPoint() {
    if (!this.awaitingResume) return;
    this.awaitingResume = false;
    this.resetBall(1);
    this.start();
  }

  endMatch() {
    this.awaitingResume = false;
    this.stop();
    const winner = this.playerScore === this.alfredoScore ? 'draw' : this.playerScore > this.alfredoScore ? 'player' : 'alfredo';
    this.callbacks.onGameOver(this.playerScore, this.alfredoScore, winner);
  }

  private resizeCanvas(canvas: HTMLCanvasElement) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.aspectRatio = `${W}/${H}`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private loop = (time: number) => {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.032);
    this.lastTime = time;
    this.update(dt);
    this.draw(time);
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.frame += 1;
    if (this.demo) this.setPlayerX(this.ball.x + Math.sin(this.frame / 45) * 30);

    const alfredoTarget = this.ball.vy < 0 ? this.ball.x : COURT.mid;
    const reaction = this.ball.vy < 0 ? 0.82 : 0.1;
    const alfredoSpeed = 260;
    const error = Math.sin(this.frame / 70) * (this.ball.vy < 0 ? 42 : 18);
    const desired = alfredoTarget + error;
    this.alfredoX += Math.max(-alfredoSpeed * dt, Math.min(alfredoSpeed * dt, (desired - this.alfredoX) * reaction));
    this.alfredoX = Math.max(COURT.left + 86, Math.min(COURT.right - 86, this.alfredoX));

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;
    if (this.demo && this.frame === 90) this.ball.y = COURT.top - 60;
    if (this.ball.x < COURT.left + this.ball.r || this.ball.x > COURT.right - this.ball.r) {
      this.ball.x = Math.max(COURT.left + this.ball.r, Math.min(COURT.right - this.ball.r, this.ball.x));
      this.ball.vx *= -1;
      this.burst(this.ball.x, this.ball.y, '#ffffff');
    }

    const playerY = COURT.alfredotom - 40;
    const alfredoY = COURT.top + 40;
    if (this.ball.vy > 0 && this.ball.y + this.ball.r >= playerY - 28 && this.ball.y < playerY + 34 && Math.abs(this.ball.x - this.playerX) < 105) {
      this.hitPaddle(this.playerX, playerY, -1);
    }
    if (this.ball.vy < 0 && this.ball.y - this.ball.r <= alfredoY + 28 && this.ball.y > alfredoY - 34 && Math.abs(this.ball.x - this.alfredoX) < 105) {
      this.hitPaddle(this.alfredoX, alfredoY, 1);
    }

    if (this.ball.y < COURT.top - 48) {
      this.playerScore += 1;
      this.rally += 1;
      this.burst(this.ball.x, COURT.top + 10, '#b9ff79');
      this.awaitingResume = true;
      this.stop();
      this.callbacks.onPoint(this.playerScore, this.alfredoScore, 'player');
      return;
    }
    if (this.ball.y > COURT.alfredotom + 48) {
      this.alfredoScore += 1;
      this.stop();
      this.awaitingResume = true;
      this.burst(this.ball.x, COURT.alfredotom - 10, '#ffb3a2');
      this.callbacks.onPoint(this.playerScore, this.alfredoScore, 'alfredo');
      return;
    }

    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 35 * dt; p.life -= dt;
      return p.life > 0;
    });
  }

  private hitPaddle(x: number, y: number, direction: number) {
    const offset = Math.max(-0.8, Math.min(0.8, (this.ball.x - x) / 100));
    const speed = Math.min(540, 330 + this.rally * 14);
    this.ball.vx = offset * 290;
    this.ball.vy = direction * speed;
    this.ball.y = y + direction * 42;
    this.rally += 1;
    this.burst(this.ball.x, y, '#fff6a6');
    this.callbacks.onHit?.();
  }

  private resetBall(direction: number) {
    const speed = Math.min(520, 300 + this.rally * 10);
    this.ball = { x: COURT.mid + (Math.random() - 0.5) * 180, y: COURT.mid, vx: (Math.random() > 0.5 ? 1 : -1) * (170 + Math.random() * 80), vy: direction * speed, r: 18 };
  }

  private burst(x: number, y: number, color: string) {
    for (let i = 0; i < 11; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 120;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.35 + Math.random() * 0.35, color, size: 3 + Math.random() * 5 });
    }
  }

  private draw(time: number) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#18b9c5'; ctx.fillRect(0, 0, W, H);
    this.drawWater(ctx, time);
    this.drawBanks(ctx);
    this.drawCourt(ctx);
    this.drawPaddle(ctx, this.alfredoX, COURT.top + 20, this.alfredoImage, false);
    this.drawPaddle(ctx, this.playerX, COURT.alfredotom - 20, this.playerImage, true);
    this.drawBall(ctx);
    this.drawParticles(ctx);
  }

  private drawWater(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#e1ffff'; ctx.lineWidth = 3;
    for (let row = 0; row < 11; row += 1) {
      const y = COURT.top + 30 + row * 51;
      ctx.beginPath();
      for (let x = COURT.left + 18; x <= COURT.right - 18; x += 34) {
        const wave = Math.sin(x / 38 + time / 900 + row) * 7;
        if (x === COURT.left + 18) ctx.moveTo(x, y + wave); else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBanks(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#79d34b'; ctx.fillRect(0, 0, 70, H); ctx.fillRect(W - 70, 0, 70, H);
    ctx.fillStyle = '#45b83a';
    for (const x of [18, 46, W - 46, W - 18]) for (let y = 46; y < H; y += 120) {
      ctx.fillRect(x, y, 6, 32); ctx.beginPath(); ctx.arc(x + 4, y - 5, 10, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#116b68'; ctx.lineWidth = 8; ctx.strokeRect(70, 25, W - 140, H - 50);
  }

  private drawCourt(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.roundRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.alfredotom - COURT.top, 44); ctx.stroke();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(COURT.left + 14, COURT.mid); ctx.lineTo(COURT.right - 14, COURT.mid); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.font = '700 18px Nunito, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('alfredo', COURT.left + 25, COURT.top + 31); ctx.fillText('VOCÊ', COURT.left + 25, COURT.alfredotom - 24);
  }

  private drawPaddle(ctx: CanvasRenderingContext2D, x: number, y: number, image: HTMLImageElement, player: boolean) {
    const bob = Math.sin(this.frame / 10 + (player ? 0 : 1)) * 3;
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#0b5b68'; ctx.beginPath(); ctx.ellipse(x, y + 39, 68, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (image.complete && image.naturalWidth > 0) ctx.drawImage(image, x - 70, y - 75 + bob, 140, 140);
    else { ctx.fillStyle = player ? '#ffe32f' : '#f4fff2'; ctx.beginPath(); ctx.arc(x, y, 45, 0, Math.PI * 2); ctx.fill(); }
  }

  private drawBall(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (let i = 4; i >= 1; i -= 1) { ctx.globalAlpha = 0.06 * i; ctx.fillStyle = '#fff7be'; ctx.beginPath(); ctx.arc(this.ball.x - this.ball.vx * i * 0.018, this.ball.y - this.ball.vy * i * 0.018, this.ball.r + i * 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#f4b52b'; ctx.strokeStyle = '#8c5315'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff1a7'; ctx.beginPath(); ctx.arc(this.ball.x - 5, this.ball.y - 6, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
