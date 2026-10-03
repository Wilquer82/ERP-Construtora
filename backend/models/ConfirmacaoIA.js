import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const confirmacaoIASchema = new mongoose.Schema({
  interacaoIA: { type: mongoose.Schema.Types.ObjectId, ref: 'InteracaoIA', required: true, index: true },
  previasApresentadas: [{
    modelo: { type: String, required: true, trim: true },
    dados: { type: mongoose.Schema.Types.Mixed, required: true },
    acao: { type: String, enum: ['criar', 'atualizar', 'baixar', 'cancelar'], required: true }
  }],
  confirmado: { type: Boolean, default: false },
  confirmadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'UsuarioWhatsApp' },
  dataConfirmacao: { type: Date },
  respostaUsuario: { type: String, trim: true },
  acoesExecutadas: [{
    modelo: { type: String, trim: true },
    documentoId: { type: mongoose.Schema.Types.ObjectId },
    sucesso: { type: Boolean, default: true },
    erro: { type: String, trim: true }
  }]
}, { timestamps: true });

confirmacaoIASchema.index({ empresa: 1, interacaoIA: 1 });
confirmacaoIASchema.plugin(tenantPlugin);

export default mongoose.model('ConfirmacaoIA', confirmacaoIASchema);