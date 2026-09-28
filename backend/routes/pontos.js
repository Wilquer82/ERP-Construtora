import express from 'express';
import Ponto from '../models/Ponto.js';
import Colaborador from '../models/Colaborador.js';
import { protect } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

// GET /api/pontos?colaborador=xxx&inicio=2025-01-01&fim=2025-01-31
router.get('/', async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.colaborador) filtro.colaborador = req.query.colaborador;
    if (req.query.inicio && req.query.fim) {
      filtro.data = {
        $gte: new Date(req.query.inicio),
        $lte: new Date(req.query.fim)
      };
    }
    const docs = await Ponto.find(filtro)
      .populate('colaborador', 'nome')
      .sort({ data: -1 });
    res.json(docs);
  } catch (err) { next(err); }
});

// POST /api/pontos/registro — registro de ponto (entrada/saída)
router.post('/registro', async (req, res, next) => {
  try {
    const { colaborador, data, entrada, saida, observacao } = req.body;
    if (!colaborador || !data) {
      return res.status(400).json({ error: 'colaborador e data sao obrigatorios' });
    }
    if (!await Colaborador.exists({ _id: colaborador })) {
      return res.status(404).json({ error: 'Colaborador nao encontrado' });
    }
    const doc = await Ponto.findOneAndUpdate(
      { colaborador, data: new Date(data) },
      {
        $set: {
          ...(entrada ? { entrada: new Date(entrada) } : {}),
          ...(saida ? { saida: new Date(saida) } : {}),
          ...(observacao ? { observacao } : {})
        }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await doc.populate('colaborador', 'nome');
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await Ponto.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Ponto nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
