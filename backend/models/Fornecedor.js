import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const fornecedorSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  razaoSocial: String,
  documento: String,
  categoria: { type: String, default: 'material' },
  email: String,
  telefone: String,
  endereco: String,
  cidade: String,
  uf: String,
  status: { type: String, enum: ['ativo', 'inativo'], default: 'ativo' },
  observacoes: String
}, { timestamps: true });

fornecedorSchema.plugin(tenantPlugin);

export default mongoose.model('Fornecedor', fornecedorSchema);
