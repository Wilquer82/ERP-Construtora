import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const certidaoSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['municipal', 'estadual', 'federal', 'outro'], required: true },
  numero: String,
  nome: { type: String, required: true, trim: true },
  dataEmissao: Date,
  dataVencimento: { type: Date, required: true, index: true },
  arquivoId: String,
  status: { type: String, enum: ['valida', 'vencida', 'vence_em_breve', 'renovando'], default: 'valida' }
}, { timestamps: true });

certidaoSchema.index({ empresa: 1, dataVencimento: 1 });
certidaoSchema.plugin(tenantPlugin);

export default mongoose.model('Certidao', certidaoSchema);
