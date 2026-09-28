import mongoose from 'mongoose';
import { createApp } from './app.js';

const port = Number(process.env.PORT || 10000);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGODB_URI não configurada. Defina a variável antes de iniciar o backend.');
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('[Duck Pong API] MongoDB conectado');
  const app = createApp();
  app.listen(port, '0.0.0.0', () => console.log(`[Duck Pong API] ouvindo na porta ${port}`));
} catch (error) {
  console.error('[Duck Pong API] falha ao conectar no MongoDB', error);
  process.exit(1);
}
