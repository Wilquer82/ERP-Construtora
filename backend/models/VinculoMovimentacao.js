import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const vinculoMovimentacaoSchema = new mongoose.Schema({
  tipoOrigem: {
    type: String,
    enum: ['despesa', 'receita', 'reembolso', 'pagamento_reembolso', 'cheque', 'acordo', 'movimento_empreiteiro'],
    required: true
  },
  origemId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  tipoDestino: {
    type: String,
    enum: ['despesa', 'receita', 'reembolso', 'pagamento_reembolso', 'cheque', 'acordo', 'movimento_empreiteiro'],
    required: true
  },
  destinoId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  descricao: { type: String, trim: true }
}, { timestamps: true });

vinculoMovimentacaoSchema.index({ empresa: 1, tipoOrigem: 1, origemId: 1 }, { unique: true });
vinculoMovimentacaoSchema.index({ empresa: 1, tipoDestino: 1, destinoId: 1 });
vinculoMovimentacaoSchema.plugin(tenantPlugin);

export default mongoose.model('VinculoMovimentacao', vinculoMovimentacaoSchema);