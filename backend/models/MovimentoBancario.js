import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const movimentoBancarioSchema = new mongoose.Schema({
  contaBancaria: { type: mongoose.Schema.Types.ObjectId, ref: 'ContaBancaria', required: true, index: true },
  lancamento: { type: mongoose.Schema.Types.ObjectId, ref: 'Lancamento', required: true },
  tipo: { type: String, enum: ['credito', 'debito'], required: true },
  valor: { type: Number, required: true, min: 0.01 },
  data: { type: Date, required: true },
  descricao: { type: String, required: true }
}, { timestamps: true });

movimentoBancarioSchema.index({ empresa: 1, lancamento: 1 }, { unique: true });
movimentoBancarioSchema.plugin(tenantPlugin);

export default mongoose.model('MovimentoBancario', movimentoBancarioSchema);
