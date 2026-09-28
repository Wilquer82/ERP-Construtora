import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const obraSchema = new mongoose.Schema({
  codigo: { type: String },
  nome: { type: String, required: true },
  descricao: String,
  endereco: String,
  cidade: String,
  uf: String,
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  status: {
    type: String,
    enum: ['planejamento', 'em_andamento', 'pausada', 'concluida'],
    default: 'planejamento'
  },
  valorOrcamento: { type: Number, default: 0, min: 0 },
  dataInicio: Date,
  dataPrevisaoFim: Date,
  dataConclusao: Date,
  responsavel: String
}, { timestamps: true });

obraSchema.index({ empresa: 1, codigo: 1 }, { unique: true, partialFilterExpression: { codigo: { $type: 'string' } } });
obraSchema.plugin(tenantPlugin);

export default mongoose.model('Obra', obraSchema);
