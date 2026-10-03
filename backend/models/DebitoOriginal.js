import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const debitoOriginalSchema = new mongoose.Schema({
  acordo: { type: mongoose.Schema.Types.ObjectId, ref: 'Acordo', required: true, index: true },
  valor: { type: Number, required: true, min: 0.01 },
  vencimento: { type: Date, required: true },
  centroCusto: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra' },
  situacao: {
    type: String,
    enum: ['atrasado', 'em_dia', 'cartorio'],
    default: 'atrasado'
  },
  numeroDocumento: { type: String, trim: true },
  documento: { type: String, trim: true }
}, { timestamps: true });

debitoOriginalSchema.index({ empresa: 1, acordo: 1 });
debitoOriginalSchema.plugin(tenantPlugin);

export default mongoose.model('DebitoOriginal', debitoOriginalSchema);