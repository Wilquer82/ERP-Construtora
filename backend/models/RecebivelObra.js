import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const recebivelObraSchema = new mongoose.Schema({
  obra: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra', required: true, index: true },
  contrato: { type: mongoose.Schema.Types.ObjectId, ref: 'Contrato' },
  medicao: { type: String, trim: true },
  dataMedicao: { type: Date },
  numeroNF: { type: String, trim: true },
  valorMedicao: { type: Number, default: 0, min: 0 },
  dataRecebimento: { type: Date },
  valorRecebido: { type: Number, default: 0, min: 0 },
  arquivoMedicao: { type: String, trim: true },
  arquivoNF: { type: String, trim: true },
  comprovanteRecebimento: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pendente', 'faturado', 'recebido_parcial', 'recebido_total', 'cancelado'],
    default: 'pendente'
  },
  observacoes: { type: String, trim: true }
}, { timestamps: true });

recebivelObraSchema.index({ empresa: 1, obra: 1, medicao: 1 });
recebivelObraSchema.plugin(tenantPlugin);

export default mongoose.model('RecebivelObra', recebivelObraSchema);