import mongoose from 'mongoose';

const contratoSchema = new mongoose.Schema({
  numero: { type: String, unique: true, sparse: true },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra', required: true },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
  orcamento: { type: mongoose.Schema.Types.ObjectId, ref: 'Orcamento' },
  valorTotal: { type: Number, required: true, min: 0.01 },
  numeroParcelas: { type: Number, default: 1, min: 1 },
  objeto: String, // descricao do objeto contratual
  dataAssinatura: Date,
  dataInicio: Date,
  dataFim: Date,
  status: {
    type: String,
    enum: ['rascunho', 'ativo', 'suspenso', 'encerrado'],
    default: 'rascunho'
  },
  observacoes: String
}, { timestamps: true });

export default mongoose.model('Contrato', contratoSchema);
