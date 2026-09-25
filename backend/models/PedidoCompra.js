import mongoose from 'mongoose';

const itemPedidoSchema = new mongoose.Schema({
  material: { type: String, default: '' },
  descricao: { type: String, required: true, trim: true },
  unidade: { type: String, default: 'und' },
  quantidade: { type: Number, required: true, min: 0.0001 },
  custoUnitario: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, default: 0, min: 0 }
}, { _id: true });

const pedidoCompraSchema = new mongoose.Schema({
  numero: { type: String, required: true, trim: true, unique: true },
  fornecedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Fornecedor', required: true },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra', default: null },
  status: { type: String, enum: ['rascunho', 'aprovado', 'em_aberto', 'recebido', 'cancelado'], default: 'rascunho' },
  dataPedido: { type: Date, default: Date.now },
  dataEntregaPrevista: Date,
  observacoes: String,
  itens: [itemPedidoSchema],
  valorTotal: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

pedidoCompraSchema.pre('save', function calcularTotal(next) {
  this.valorTotal = (this.itens || []).reduce((acc, item) => {
    const qty = Number(item.quantidade || 0);
    const unit = Number(item.custoUnitario || 0);
    item.subtotal = qty * unit;
    return acc + item.subtotal;
  }, 0);
  next();
});

export default mongoose.model('PedidoCompra', pedidoCompraSchema);
