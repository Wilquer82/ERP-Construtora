import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const AssinaturaSchema = new mongoose.Schema({
  arquivoOriginalId: { type: String, required: true },
  arquivoAssinadoId: { type: String },
  signatario: { nome: String, cpf: String },
  ip: String,
  userAgent: String,
  hashOriginal: String,
  metodo: { type: String, default: 'simples_demo' },
  status: { type: String, default: 'assinado' },
  dataHora: { type: Date, default: Date.now }
}, { timestamps: true });

AssinaturaSchema.plugin(tenantPlugin);

export const Assinatura = mongoose.model('Assinatura', AssinaturaSchema);