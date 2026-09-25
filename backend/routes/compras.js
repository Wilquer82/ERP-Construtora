import express from 'express';
import PedidoCompra from '../models/PedidoCompra.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

const normalizeItens = (itens = []) => (itens || []).map((item) => {
  const quantidade = Number(item.quantidade || 0);
  const custoUnitario = Number(item.custoUnitario || 0);
  return {
    ...item,
    quantidade,
    custoUnitario,
    subtotal: quantidade * custoUnitario,
    descricao: (item.descricao || item.material || '').trim() || 'Item sem descrição'
  };
});

router.get('/', async (req, res) => {
  try {
    const docs = await PedidoCompra.find().populate('fornecedor', 'nome razaoSocial').populate('obra', 'nome').sort({ dataPedido: -1 });
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await PedidoCompra.findById(req.params.id).populate('fornecedor', 'nome razaoSocial').populate('obra', 'nome');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const payload = pick(req.body, ['numero', 'fornecedor', 'obra', 'status', 'dataPedido', 'dataEntregaPrevista', 'observacoes', 'itens']);
    const itens = normalizeItens(payload.itens);
    if (!itens.length) return res.status(400).json({ error: 'Pedido deve conter ao menos um item' });
    const doc = await PedidoCompra.create({ ...payload, itens });
    await doc.populate('fornecedor', 'nome razaoSocial');
    await doc.populate('obra', 'nome');
    res.status(201).json(doc);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const payload = pick(req.body, ['numero', 'fornecedor', 'obra', 'status', 'dataPedido', 'dataEntregaPrevista', 'observacoes', 'itens']);
    if (Array.isArray(payload.itens)) payload.itens = normalizeItens(payload.itens);
    const doc = await PedidoCompra.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    await doc.populate('fornecedor', 'nome razaoSocial');
    await doc.populate('obra', 'nome');
    doc.valorTotal = (doc.itens || []).reduce((acc, item) => acc + (Number(item.quantidade || 0) * Number(item.custoUnitario || 0)), 0);
    await doc.save();
    res.json(doc);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const doc = await PedidoCompra.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
