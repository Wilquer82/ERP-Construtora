import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const clienteSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  documento: { type: String },
  email: String,
  telefone: String,
  endereco: String,
  cidade: String,
  uf: String,
  observacoes: String
}, { timestamps: true });

clienteSchema.index({ empresa: 1, documento: 1 }, { unique: true, partialFilterExpression: { documento: { $type: 'string' } } });
clienteSchema.plugin(tenantPlugin);

export default mongoose.model('Cliente', clienteSchema);
