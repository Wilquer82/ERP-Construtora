import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const empreiteiroSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  cpfCnpj: { type: String, trim: true },
  telefone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  endereco: { type: String, trim: true },
  observacoes: { type: String, trim: true },
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

empreiteiroSchema.index({ empresa: 1, cpfCnpj: 1 }, { unique: true, partialFilterExpression: { cpfCnpj: { $type: 'string' } } });
empreiteiroSchema.index({ empresa: 1, nome: 1 });
empreiteiroSchema.plugin(tenantPlugin);

export default mongoose.model('Empreiteiro', empreiteiroSchema);