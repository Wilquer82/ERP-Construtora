import express from 'express';
import mongoose from 'mongoose';
import ArquivoDocumento from '../models/ArquivoDocumento.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { entidadeTipo, entidadeId, processadoPorIA, limite = 100 } = req.query;
    const filtro = {};
    if (entidadeTipo) filtro.entidadeTipo = entidadeTipo;
    if (entidadeId) filtro.entidadeId = entidadeId;
    if (processadoPorIA !== undefined) filtro.processadoPorIA = processadoPorIA === 'true';
    const docs = await ArquivoDocumento.find(filtro)
      .populate('enviadoPor', 'nome numero')
      .sort({ createdAt: -1 })
      .limit(Number(limite));
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await ArquivoDocumento.findById(req.params.id)
      .populate('enviadoPor', 'nome numero');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, [
      'nomeOriginal', 'tipoMime', 'tamanho', 'url', 'provedor', 'caminho',
      'entidadeTipo', 'entidadeId', 'enviadoPor', 'processadoPorIA', 'dadosExtraidos'
    ]);
    const doc = await ArquivoDocumento.create(payload);
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, [
      'nomeOriginal', 'tipoMime', 'tamanho', 'url', 'provedor', 'caminho',
      'entidadeTipo', 'entidadeId', 'processadoPorIA', 'dadosExtraidos'
    ]);
    const doc = await ArquivoDocumento.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const doc = await ArquivoDocumento.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;