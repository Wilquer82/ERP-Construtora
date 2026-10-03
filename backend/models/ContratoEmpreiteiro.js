import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const contratoEmpreiteiroSchema = new mongoose.Schema({
  empreiteiro: { type: mongoose.Schema.Types.ObjectId, ref: 'Empreiteiro', required: true, index: true },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra', required: true, index: true },
  numero: { type: String, required: true, trim: true },
  objeto: { type: String, trim: true },
  valorTotal: { type: Number, required: true, min: 0.01 },
  dataInicio: { type: Date },
  dataFim: { type: Date },
  dataAssinatura: { type: Date },
  status: {
    type: String,
    enum: ['rascunho', 'ativo', 'suspenso', 'encerrado', 'cancelado'],
    default: 'rascunho'
  },
  observacoes: { type: String, trim: true }
}, { timestamps: true });

contratoEmpreiteiroSchema.index({ empresa: 1, numero: 1 }, { unique: true });
contratoEmpreiteiroSchema.plugin(tenantPlugin);

export default mongoose.model('ContratoEmpreiteiro', contratoEmpreiteiroSchema);