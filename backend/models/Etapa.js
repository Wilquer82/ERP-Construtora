import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const etapaSchema = new mongoose.Schema({
  obra: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra', required: true, index: true },
  descricao: { type: String, required: true, trim: true },
  unidade: { type: String, required: true, trim: true },
  quantidadeTotal: { type: Number, required: true, min: 0.01 },
  quantidadeMedida: { type: Number, default: 0, min: 0 },
  precoUnitario: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['nao_iniciada', 'em_andamento', 'concluida'], default: 'nao_iniciada' }
}, { timestamps: true });

etapaSchema.plugin(tenantPlugin);

export default mongoose.model('Etapa', etapaSchema);