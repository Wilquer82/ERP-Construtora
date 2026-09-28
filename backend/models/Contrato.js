import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const contratoSchema = new mongoose.Schema({
  numero: { type: String },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra', required: true },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
  orcamento: { type: mongoose.Schema.Types.ObjectId, ref: 'Orcamento' },
  valorTotal: { type: Number, required: true, min: 0.01 },
  numeroParcelas: { type: Number, default: 1, min: 1 },
  objeto: String,
  dataAssinatura: Date,
  dataInicio: Date,
  dataFim: Date,
  status: {
    type: String,
    enum: ['rascunho', 'ativo', 'suspenso', 'encerrado'],
    default: 'rascunho'
  },
  observacoes: String
}, { timestamps: true });

contratoSchema.index({ empresa: 1, numero: 1 }, { unique: true, partialFilterExpression: { numero: { $type: 'string' } } });
contratoSchema.plugin(tenantPlugin);

export default mongoose.model('Contrato', contratoSchema);
