import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const movimentoEmpreiteiroSchema = new mongoose.Schema({
  contratoEmpreiteiro: { type: mongoose.Schema.Types.ObjectId, ref: 'ContratoEmpreiteiro', required: true, index: true },
  empreiteiro: { type: mongoose.Schema.Types.ObjectId, ref: 'Empreiteiro', required: true, index: true },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra', required: true, index: true },
  dataPagamento: { type: Date, required: true },
  valor: { type: Number, required: true, min: 0.01 },
  tipo: {
    type: String,
    enum: ['medição', 'adiantamento', 'alimentação', 'ferramenta', 'outro'],
    required: true
  },
  observacao: { type: String, trim: true },
  empresaPagadora: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  contaBancaria: { type: mongoose.Schema.Types.ObjectId, ref: 'ContaBancaria' },
  comprovante: { type: String, trim: true },
  lancamentoVinculado: { type: mongoose.Schema.Types.ObjectId, ref: 'Lancamento' }
}, { timestamps: true });

movimentoEmpreiteiroSchema.index({ empresa: 1, contratoEmpreiteiro: 1, dataPagamento: 1 });
movimentoEmpreiteiroSchema.plugin(tenantPlugin);

export default mongoose.model('MovimentoEmpreiteiro', movimentoEmpreiteiroSchema);