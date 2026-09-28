import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const lembreteSchema = new mongoose.Schema({
  titulo: { type: String, required: true, trim: true },
  data: { type: Date, required: true, index: true },
  categoria: {
    type: String,
    enum: ['rh', 'contratos', 'financeiro', 'obras', 'estoque'],
    required: true,
    index: true
  },
  prioridade: { type: String, enum: ['atencao', 'critico'], default: 'atencao', index: true },
  referenciaId: mongoose.Schema.Types.ObjectId,
  referenciaModel: { type: String, enum: ['Lancamento', 'Contrato', 'Colaborador', 'DocumentoColaborador', 'Certidao'] },
  status: { type: String, enum: ['pendente', 'concluido'], default: 'pendente', index: true },
  responsavel: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  observacoes: String,
  autoGerado: { type: Boolean, default: false }
}, { timestamps: true });

lembreteSchema.index({ empresa: 1, data: -1 });
lembreteSchema.plugin(tenantPlugin);

export default mongoose.model('Lembrete', lembreteSchema);
