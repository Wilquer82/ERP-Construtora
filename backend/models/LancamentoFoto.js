import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const lancamentoFotoSchema = new mongoose.Schema({
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  enviadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  arquivoId: { type: String, required: true },

  dataNota: { type: Date },
  nomePosto: { type: String },
  cnpjPosto: { type: String },
  valor: { type: Number, required: true },

  nomeObraInformado: { type: String, required: true },
  obraSugerida: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra' },
  obraConfirmada: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra' },

  status: {
    type: String,
    enum: ['extraindo', 'aguardando_obra', 'pendente_gestor', 'confirmado', 'rejeitado'],
    default: 'extraindo',
    index: true
  },
  lancamentoFinanceiroId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lancamento' },
  observacaoGestor: String,
  isDemo: { type: Boolean, default: false },
  arquivoBase64: String
}, { timestamps: true });

lancamentoFotoSchema.plugin(tenantPlugin);

export default mongoose.model('LancamentoFoto', lancamentoFotoSchema);
