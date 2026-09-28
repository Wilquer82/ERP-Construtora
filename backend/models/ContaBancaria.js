import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const contaBancariaSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  banco: { type: String, required: true, trim: true },
  agencia: { type: String, trim: true },
  numeroConta: { type: String, required: true, trim: true },
  tipo: { type: String, enum: ['corrente', 'poupanca', 'pagamento'], default: 'corrente' },
  saldoInicial: { type: Number, default: 0 },
  saldoAtual: { type: Number, default: 0 },
  ativa: { type: Boolean, default: true }
}, { timestamps: true });

contaBancariaSchema.index(
  { empresa: 1, banco: 1, agencia: 1, numeroConta: 1 },
  { unique: true }
);
contaBancariaSchema.plugin(tenantPlugin);

export default mongoose.model('ContaBancaria', contaBancariaSchema);
