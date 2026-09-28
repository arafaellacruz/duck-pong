import express from 'express';
import cors from 'cors';
import { Score } from './models/Score.js';

export function createApp() {
  const app = express();

  const origins = (process.env.FRONTEND_ORIGIN || '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origins.includes('*') || origins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Origin não autorizada pelo CORS'));
      },
    }),
  );

  app.use(express.json({ limit: '20kb' }));

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'duck-pong-api',
      database: process.env.MONGODB_URI ? 'configured' : 'not-configured',
    });
  });

  app.get('/ranking', async (_req, res, next) => {
    try {
      const ranking = await Score.find({})
        .sort({ pontuacao: -1, createdAt: 1 })
        .limit(10)
        .select({ _id: 0, nome: 1, pontuacao: 1 })
        .lean();

      res.json(ranking);
    } catch (error) {
      next(error);
    }
  });

  app.post('/pontuacao', async (req, res, next) => {
    try {
      const nome = String(req.body?.nome || 'Patinho')
        .trim()
        .slice(0, 18);

      const pontuacao = Number(req.body?.pontuacao);

      if (!nome) {
        return res.status(400).json({ error: 'O nome é obrigatório.' });
      }

      if (!Number.isInteger(pontuacao) || pontuacao < 0) {
        return res.status(400).json({
          error: 'A pontuação deve ser um número inteiro maior ou igual a zero.',
        });
      }

      const score = await Score.create({ nome, pontuacao });

      return res.status(201).json({
        nome: score.nome,
        pontuacao: score.pontuacao,
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    console.error('[API]', error);
    res.status(500).json({
      error: 'Não foi possível processar a solicitação.',
    });
  });

  return app;
}
