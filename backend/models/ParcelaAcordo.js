import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const parcelaAcordoSchema = new mongoose.Schema({
  acordo: { type: mongoose.Schema.Types.ObjectId, ref: 'Acordo', required: true, index: true },
  numeroDocumento: { type: String, trim: true },
  valor: { type: Number, required: true, min: 0.01 },
  dataVencimento: { type: Date, required: true },
  dataPagamento: { type: Date },
  status: {
    type: String,
    enum: ['pendente', 'pago', 'em_dia', 'atrasado'],
    default: 'pendente'
  },
  comprovante: { type: String, trim: true },
  contaBancaria: { type: mongoose.Schema.Types.ObjectId, ref: 'ContaBancaria' },
  lancamentoVinculado: { type: mongoose.Schema.Types.ObjectId, ref: 'Lancamento' }
}, { timestamps: true });

parcelaAcordoSchema.index({ empresa: 1, acordo: 1, dataVencimento: 1 });
parcelaAcordoSchema.plugin(tenantPlugin);

export default mongoose.model('ParcelaAcordo', parcelaAcordoSchema);