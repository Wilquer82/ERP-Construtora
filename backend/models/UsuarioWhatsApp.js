import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const usuarioWhatsAppSchema = new mongoose.Schema({
  numero: { type: String, required: true, trim: true },
  nome: { type: String, required: true, trim: true },
  perfil: {
    type: String,
    enum: ['consulta', 'financeiro', 'administrador'],
    default: 'consulta'
  },
  permissoes: {
    consultar: { type: Boolean, default: true },
    lancar: { type: Boolean, default: false },
    confirmar: { type: Boolean, default: false },
    verDocumentos: { type: Boolean, default: false }
  },
  ativo: { type: Boolean, default: true },
  ultimoAcesso: { type: Date }
}, { timestamps: true });

usuarioWhatsAppSchema.index({ empresa: 1, numero: 1 }, { unique: true });
usuarioWhatsAppSchema.plugin(tenantPlugin);

export default mongoose.model('UsuarioWhatsApp', usuarioWhatsAppSchema);