import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const alocacaoSchema = new mongoose.Schema({
  colaborador: { type: mongoose.Schema.Types.ObjectId, ref: 'Colaborador', required: true, index: true },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra', required: true, index: true },
  dataInicio: { type: Date, required: true },
  dataFim: Date,
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

alocacaoSchema.index({ empresa: 1, colaborador: 1, obra: 1, dataInicio: 1 }, { unique: true });
alocacaoSchema.plugin(tenantPlugin);

export default mongoose.model('Alocacao', alocacaoSchema);
