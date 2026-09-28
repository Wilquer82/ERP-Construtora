import express from 'express';
import Cliente from '../models/Cliente.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

// GET /api/clientes
router.get('/', async (req, res, next) => {
  try {
    const docs = await Cliente.find().sort({ nome: 1 });
    res.json(docs);
  } catch (err) { next(err); }
});

// GET /api/clientes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Cliente.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

// POST /api/clientes
router.post('/', async (req, res, next) => {
  try {
    const doc = await Cliente.create(pick(req.body, ['nome', 'documento', 'email', 'telefone', 'endereco', 'cidade', 'uf', 'observacoes']));
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res, next) => {
  try {
    const doc = await Cliente.findByIdAndUpdate(req.params.id, pick(req.body, ['nome', 'documento', 'email', 'telefone', 'endereco', 'cidade', 'uf', 'observacoes']), { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

// DELETE /api/clientes/:id
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const doc = await Cliente.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
