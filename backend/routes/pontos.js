import express from 'express';
import Ponto from '../models/Ponto.js';
import Colaborador from '../models/Colaborador.js';
import Obra from '../models/Obra.js';
import { protect } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';
import { recalcularObra } from '../utils/calculoObra.js';

const router = express.Router();
router.use(protect);

async function dispararCalculo(ponto) {
  if (ponto.obra && ponto.status === 'confirmado') {
    setImmediate(async () => {
      try {
        await recalcularObra(ponto.obra)();
      } catch (err) {
        console.error('[calculoObra] Falha ao recalcular obra do ponto:', err.message);
      }
    });
  }
}

// GET /api/pontos?colaborador=xxx&inicio=2025-01-01&fim=2025-01-31
router.get('/', async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.colaborador) filtro.colaborador = req.query.colaborador;
    if (req.query.obra) filtro.obra = req.query.obra;
    if (req.query.inicio && req.query.fim) {
      filtro.data = {
        $gte: new Date(req.query.inicio),
        $lte: new Date(req.query.fim)
      };
    }
    if (req.query.status) filtro.status = req.query.status;
    const docs = await Ponto.find(filtro)
      .populate('colaborador', 'nome')
      .populate('obra', 'nome codigo')
      .sort({ data: -1 });
    res.json(docs);
  } catch (err) { next(err); }
});

// POST /api/pontos/registro — registro de ponto (entrada/saída) ou confirmação com valor
router.post('/registro', async (req, res, next) => {
  try {
    const { colaborador, data, entrada, saida, observacao, obra, status, valorCalculado } = req.body;
    if (!colaborador || !data) {
      return res.status(400).json({ error: 'colaborador e data sao obrigatorios' });
    }
    if (!await Colaborador.exists({ _id: colaborador })) {
      return res.status(404).json({ error: 'Colaborador nao encontrado' });
    }
    const campos = pick(
      { colaborador, data: new Date(data), entrada: entrada ? new Date(entrada) : undefined, saida: saida ? new Date(saida) : undefined, observacao, obra, status, valorCalculado },
      ['colaborador', 'data', 'entrada', 'saida', 'observacao', 'obra', 'status', 'valorCalculado']
    );

    const doc = await Ponto.findOneAndUpdate(
      { colaborador, data: new Date(data) },
      { $set: campos },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await doc.populate('colaborador', 'nome');

    if (status === 'confirmado' && obra) {
      dispararCalculo({ obra, status: 'confirmado' });
    }

    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// PATCH /api/pontos/:id/confirmar — confirma um ponto e dispara recálculo
router.patch('/:id/confirmar', async (req, res, next) => {
  try {
    const ponto = await Ponto.findById(req.params.id);
    if (!ponto) return res.status(404).json({ error: 'Ponto nao encontrado' });

    const antes = ponto.status;
    ponto.status = 'confirmado';
    if (req.body.valorCalculado !== undefined) ponto.valorCalculado = Number(req.body.valorCalculado);
    await ponto.save();

    if (antes !== 'confirmado' && ponto.obra) {
      dispararCalculo(ponto);
    }

    await ponto.populate('colaborador', 'nome obra').execPopulate();
    res.json(ponto);
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
