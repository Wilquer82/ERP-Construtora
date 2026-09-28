import express from 'express';
import Fornecedor from '../models/Fornecedor.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const docs = await Fornecedor.find().sort({ nome: 1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Fornecedor.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['nome', 'razaoSocial', 'documento', 'categoria', 'email', 'telefone', 'endereco', 'cidade', 'uf', 'status', 'observacoes']);
    const doc = await Fornecedor.create(payload);
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['nome', 'razaoSocial', 'documento', 'categoria', 'email', 'telefone', 'endereco', 'cidade', 'uf', 'status', 'observacoes']);
    const doc = await Fornecedor.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const doc = await Fornecedor.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
