import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const pagamentoReembolsoSchema = new mongoose.Schema({
  reembolso: { type: mongoose.Schema.Types.ObjectId, ref: 'Reembolso', required: true, index: true },
  itemReembolso: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemReembolso' },
  dataPagamento: { type: Date, required: true },
  valor: { type: Number, required: true, min: 0.01 },
  empresaPagadora: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  contaBancaria: { type: mongoose.Schema.Types.ObjectId, ref: 'ContaBancaria' },
  comprovante: { type: String, trim: true },
  observacao: { type: String, trim: true },
  lancamentoVinculado: { type: mongoose.Schema.Types.ObjectId, ref: 'Lancamento' }
}, { timestamps: true });

pagamentoReembolsoSchema.index({ empresa: 1, reembolso: 1, dataPagamento: 1 });
pagamentoReembolsoSchema.plugin(tenantPlugin);

export default mongoose.model('PagamentoReembolso', pagamentoReembolsoSchema);