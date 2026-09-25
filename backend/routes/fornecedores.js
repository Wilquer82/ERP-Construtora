import express from 'express';
import Fornecedor from '../models/Fornecedor.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const docs = await Fornecedor.find().sort({ nome: 1 });
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await Fornecedor.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const payload = pick(req.body, ['nome', 'razaoSocial', 'documento', 'categoria', 'email', 'telefone', 'endereco', 'cidade', 'uf', 'status', 'observacoes']);
    const doc = await Fornecedor.create(payload);
    res.status(201).json(doc);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const payload = pick(req.body, ['nome', 'razaoSocial', 'documento', 'categoria', 'email', 'telefone', 'endereco', 'cidade', 'uf', 'status', 'observacoes']);
    const doc = await Fornecedor.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const doc = await Fornecedor.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
