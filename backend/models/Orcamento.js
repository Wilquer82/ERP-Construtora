import mongoose from 'mongoose';

const itemOrcamentoSchema = new mongoose.Schema({
  descricao: { type: String, required: true },
  unidade: { type: String, default: 'und' },
  quantidade: { type: Number, default: 1, min: 0.0001 },
  custoUnitario: { type: Number, default: 0, min: 0 },
  materialVinculado: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', default: null },
  // total = quantidade * custoUnitario (calculado no frontend/backend)
}, { _id: true });

const orcamentoSchema = new mongoose.Schema({
  obra: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra', required: true },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  descricao: String,
  itens: [itemOrcamentoSchema],
  desconto: { type: Number, default: 0, min: 0 },
  acrescimo: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['rascunho', 'aprovado', 'rejeitado', 'cancelado'], default: 'rascunho' },
  dataCriacao: { type: Date, default: Date.now },
  validadeDias: { type: Number, default: 30, min: 1 }
}, { timestamps: true });

// Campo virtual: total do orcamento
orcamentoSchema.virtual('total').get(function () {
  const somaItens = this.itens.reduce((acc, it) => acc + (it.quantidade * it.custoUnitario), 0);
  return somaItens - this.desconto + this.acrescimo;
});

orcamentoSchema.pre('validate', function (next) {
  if (this.total < 0) return next(new Error('O total do orcamento nao pode ser negativo'));
  next();
});

orcamentoSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Orcamento', orcamentoSchema);
