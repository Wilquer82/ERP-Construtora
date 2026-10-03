import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const itemReembolsoSchema = new mongoose.Schema({
  reembolso: { type: mongoose.Schema.Types.ObjectId, ref: 'Reembolso', required: true, index: true },
  dataDespesa: { type: Date, required: true },
  valor: { type: Number, required: true, min: 0.01 },
  centroCusto: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra' },
  categoria: { type: String, trim: true },
  descricao: { type: String, trim: true },
  comprovante: { type: String, trim: true },
  despesaVinculada: { type: mongoose.Schema.Types.ObjectId, ref: 'Lancamento' }
}, { timestamps: true });

itemReembolsoSchema.index({ empresa: 1, reembolso: 1 });
itemReembolsoSchema.plugin(tenantPlugin);

export default mongoose.model('ItemReembolso', itemReembolsoSchema);