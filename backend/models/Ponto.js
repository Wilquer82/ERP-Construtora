import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const pontoSchema = new mongoose.Schema({
  colaborador: { type: mongoose.Schema.Types.ObjectId, ref: 'Colaborador', required: true, index: true },
  data: { type: Date, required: true, index: true },
  entrada: Date,
  saida: Date,
  observacao: String
}, { timestamps: true });

pontoSchema.index({ empresa: 1, colaborador: 1, data: 1 }, { unique: true });
pontoSchema.plugin(tenantPlugin);

export default mongoose.model('Ponto', pontoSchema);
