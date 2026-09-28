import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const lancamentoSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['pagar', 'receber'], required: true },
  descricao: { type: String, required: true },
  categoria: String,
  valor: { type: Number, required: true, min: 0.01 },
  dataVencimento: { type: Date, required: true },
  dataPagamento: Date,
  status: { type: String, enum: ['pendente', 'pago', 'atrasado'], default: 'pendente' },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra' },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  fornecedor: String,
  formaPagamento: String,
  observacoes: String
}, { timestamps: true });

lancamentoSchema.plugin(tenantPlugin);

export default mongoose.model('Lancamento', lancamentoSchema);
