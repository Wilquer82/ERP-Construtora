import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const reembolsoSchema = new mongoose.Schema({
  beneficiario: { type: String, required: true, trim: true },
  documento: { type: String, trim: true },
  centroCusto: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra' },
  valorTotal: { type: Number, default: 0, min: 0 },
  valorPago: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['aberto', 'parcial', 'quitado', 'cancelado'],
    default: 'aberto'
  },
  observacoes: { type: String, trim: true }
}, { timestamps: true });

reembolsoSchema.index({ empresa: 1, beneficiario: 1 });
reembolsoSchema.plugin(tenantPlugin);

export default mongoose.model('Reembolso', reembolsoSchema);