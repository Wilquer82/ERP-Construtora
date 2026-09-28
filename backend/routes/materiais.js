import express from 'express';
import Material from '../models/Material.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick, isPositiveNumber } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const docs = await Material.find().sort({ nome: 1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Material.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/', adminOnly, async (req, res, next) => {
  try {
    const doc = await Material.create(pick(req.body, ['codigo', 'nome', 'categoria', 'unidade', 'estoqueAtual', 'estoqueMinimo', 'custoUnitario', 'fornecedor']));
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// POST /api/materiais/:id/movimento  -> entrada ou saida de estoque
router.post('/:id/movimento', adminOnly, async (req, res, next) => {
  try {
    const { tipo, quantidade, obra, observacao } = req.body;
    if (!['entrada', 'saida'].includes(tipo)) return res.status(400).json({ error: 'Tipo invalido' });
    if (!isPositiveNumber(quantidade)) return res.status(400).json({ error: 'Quantidade deve ser maior que zero' });
    const qtd = Number(quantidade);
    const filtro = { _id: req.params.id };
    if (tipo === 'saida') filtro.estoqueAtual = { $gte: qtd };
    const doc = await Material.findOneAndUpdate(
      filtro,
      { $inc: { estoqueAtual: tipo === 'entrada' ? qtd : -qtd }, $push: { movimentos: { tipo, quantidade: qtd, obra, observacao } } },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(tipo === 'saida' ? 409 : 404).json({ error: tipo === 'saida' ? 'Estoque insuficiente' : 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const doc = await Material.findByIdAndUpdate(req.params.id, pick(req.body, ['codigo', 'nome', 'categoria', 'unidade', 'estoqueMinimo', 'custoUnitario', 'fornecedor']), { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const doc = await Material.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
