import express from 'express';
import Lancamento from '../models/Lancamento.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

// GET /api/financeiro?tipo=pagar&status=pago
router.get('/', async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.tipo) filtro.tipo = req.query.tipo;
    if (req.query.status) filtro.status = req.query.status;
    if (req.query.obra) filtro.obra = req.query.obra;
    const docs = await Lancamento.find(filtro)
      .populate('obra', 'nome')
      .populate('cliente', 'nome')
      .sort({ dataVencimento: 1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Lancamento.findById(req.params.id).populate('obra cliente');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/', adminOnly, async (req, res, next) => {
  try {
    const doc = await Lancamento.create(pick(req.body, ['tipo', 'descricao', 'categoria', 'valor', 'dataVencimento', 'dataPagamento', 'status', 'obra', 'cliente', 'fornecedor', 'formaPagamento', 'observacoes']));
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// Marcar como pago / baixar titulo
router.post('/:id/baixar', adminOnly, async (req, res, next) => {
  try {
    const doc = await Lancamento.findByIdAndUpdate(
      req.params.id,
      { status: 'pago', dataPagamento: req.body.dataPagamento || Date.now() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const doc = await Lancamento.findByIdAndUpdate(req.params.id, pick(req.body, ['tipo', 'descricao', 'categoria', 'valor', 'dataVencimento', 'dataPagamento', 'status', 'obra', 'cliente', 'fornecedor', 'formaPagamento', 'observacoes']), { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const doc = await Lancamento.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
