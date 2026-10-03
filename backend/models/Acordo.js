import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const acordoSchema = new mongoose.Schema({
  fornecedor: { type: String, required: true, trim: true },
  fornecedorVinculado: { type: mongoose.Schema.Types.ObjectId, ref: 'Fornecedor' },
  centroCusto: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra' },
  valorTotalDebito: { type: Number, default: 0, min: 0 },
  valorTotalAcordo: { type: Number, default: 0, min: 0 },
  valorPago: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['ativo', 'quitado', 'cancelado', 'em_atraso'],
    default: 'ativo'
  },
  observacoes: { type: String, trim: true }
}, { timestamps: true });

acordoSchema.index({ empresa: 1, fornecedor: 1 });
acordoSchema.plugin(tenantPlugin);

export default mongoose.model('Acordo', acordoSchema);