import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const arquivoDocumentoSchema = new mongoose.Schema({
  nomeOriginal: { type: String, required: true, trim: true },
  tipoMime: { type: String, required: true, trim: true },
  tamanho: { type: Number, required: true, min: 0 },
  url: { type: String, required: true, trim: true },
  provedor: { type: String, enum: ['local', 's3', 'gcs', 'azure'], default: 'local' },
  caminho: { type: String, trim: true },
  entidadeTipo: { type: String, required: true, trim: true },
  entidadeId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  enviadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'UsuarioWhatsApp' },
  processadoPorIA: { type: Boolean, default: false },
  dadosExtraidos: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

arquivoDocumentoSchema.index({ empresa: 1, entidadeTipo: 1, entidadeId: 1 });
arquivoDocumentoSchema.plugin(tenantPlugin);

export default mongoose.model('ArquivoDocumento', arquivoDocumentoSchema);