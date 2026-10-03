import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const chequeSchema = new mongoose.Schema({
  numeroFolha: { type: String, required: true, trim: true },
  banco: { type: String, required: true, trim: true },
  agencia: { type: String, trim: true },
  conta: { type: String, trim: true },
  favorecido: { type: String, required: true, trim: true },
  cpfCnpjFavorecido: { type: String, trim: true },
  centroCusto: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra' },
  dataVencimento: { type: Date, required: true },
  dataPagamento: { type: Date },
  valor: { type: Number, required: true, min: 0.01 },
  status: {
    type: String,
    enum: ['em_dia', 'pago', 'em_atraso', 'devolvido', 'sustado'],
    default: 'em_dia'
  },
  forma: {
    type: String,
    enum: ['pix', 'descontado_em_conta', 'outro'],
    default: 'descontado_em_conta'
  },
  observacao: { type: String, trim: true },
  arquivoFolha: { type: String, trim: true },
  contaBancaria: { type: mongoose.Schema.Types.ObjectId, ref: 'ContaBancaria' },
  lancamentoVinculado: { type: mongoose.Schema.Types.ObjectId, ref: 'Lancamento' }
}, { timestamps: true });

chequeSchema.index({ empresa: 1, numeroFolha: 1 }, { unique: true });
chequeSchema.index({ empresa: 1, status: 1, dataVencimento: 1 });
chequeSchema.plugin(tenantPlugin);

export default mongoose.model('Cheque', chequeSchema);