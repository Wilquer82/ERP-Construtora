import express from 'express';
import Certidao from '../models/Certidao.js';
import { protect } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const docs = await Certidao.find().sort({ dataVencimento: 1 });
    const hoje = new Date();
    const daqui3Dias = new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000);
    docs.forEach((certidao) => {
      if (certidao.status === 'vencida' || certidao.dataVencimento <= hoje) {
        certidao.status = 'vencida';
      } else if (certidao.dataVencimento <= daqui3Dias) {
        certidao.status = 'vence_em_breve';
      }
    });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Certidao.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Certidao nao encontrada' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = pick(req.body, ['tipo', 'numero', 'nome', 'dataEmissao', 'dataVencimento', 'arquivoId', 'status']);
    if (!payload.nome || !payload.dataVencimento) {
      return res.status(400).json({ error: 'nome e dataVencimento sao obrigatorios' });
    }
    const doc = await Certidao.create(payload);
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = pick(req.body, ['tipo', 'numero', 'nome', 'dataEmissao', 'dataVencimento', 'arquivoId', 'status']);
    const doc = await Certidao.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Certidao nao encontrada' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await Certidao.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Certidao nao encontrada' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
