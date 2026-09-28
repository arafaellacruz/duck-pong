import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true, maxlength: 18 },
    pontuacao: { type: Number, required: true, min: 0, max: 999999 },
  },
  { timestamps: true },
);

export const Score = mongoose.model('Score', scoreSchema);
