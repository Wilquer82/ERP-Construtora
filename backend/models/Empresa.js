import mongoose from 'mongoose';

const empresaSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  plano: { type: String, enum: ['trial', 'pago'], default: 'trial' },
  trialAte: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  ativo: { type: Boolean, default: true },
  criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  alteradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Empresa', empresaSchema);
