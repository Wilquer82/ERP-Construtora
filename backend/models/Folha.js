import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const folhaSchema = new mongoose.Schema({
  colaborador: { type: mongoose.Schema.Types.ObjectId, ref: 'Colaborador', required: true },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra' },
  mes: { type: Number, required: true },
  ano: { type: Number, required: true },
  diasTrabalhados: { type: Number, default: 0 },
  valorDiaria: { type: Number, default: 0 },
  totalBruto: { type: Number, default: 0 },
  adiantamentos: { type: Number, default: 0 },
  totalLiquido: { type: Number, default: 0 },
  status: { type: String, enum: ['aberto', 'fechado', 'pago'], default: 'aberto' }
}, { timestamps: true });

folhaSchema.index({ empresa: 1, colaborador: 1, mes: 1, ano: 1 }, { unique: true });
folhaSchema.plugin(tenantPlugin);

export default mongoose.model('Folha', folhaSchema);
