import express from 'express';
import Obra from '../models/Obra.js';
import Etapa from '../models/Etapa.js';
import Medicao from '../models/Medicao.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';
import { incluirProgressoObras } from '../utils/progressoObra.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const docs = await Obra.find().populate('cliente', 'nome').sort({ createdAt: -1 });
    res.json(await incluirProgressoObras(docs));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/etapas', async (req, res) => {
  try {
    const etapas = await Etapa.find({ obra: req.params.id }).sort({ createdAt: 1 });
    res.json(etapas);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/:id/etapas', async (req, res) => {
  try {
    const obraExiste = await Obra.exists({ _id: req.params.id });
    if (!obraExiste) return res.status(404).json({ error: 'Obra nao encontrada' });
    const etapa = await Etapa.create({ ...pick(req.body, ['descricao', 'unidade', 'quantidadeTotal', 'precoUnitario']), obra: req.params.id });
    res.status(201).json(etapa);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id/etapas/:etapaId', async (req, res) => {
  try {
    const etapa = await Etapa.findOneAndUpdate(
      { _id: req.params.etapaId, obra: req.params.id, quantidadeMedida: 0 },
      pick(req.body, ['descricao', 'unidade', 'quantidadeTotal', 'precoUnitario']),
      { new: true, runValidators: true }
    );
    if (!etapa) return res.status(404).json({ error: 'Etapa nao encontrada ou ja medida' });
    res.json(etapa);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id/etapas/:etapaId', async (req, res) => {
  try {
    const etapa = await Etapa.findOne({ _id: req.params.etapaId, obra: req.params.id });
    if (!etapa) return res.status(404).json({ error: 'Etapa nao encontrada' });
    if (etapa.quantidadeMedida > 0 || await Medicao.exists({ etapa: etapa._id })) {
      return res.status(400).json({ error: 'Etapas com medicao nao podem ser excluidas' });
    }
    await etapa.deleteOne();
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/:id/evolucao', async (req, res) => {
  try {
    const obra = await Obra.findById(req.params.id);
    if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });
    const [etapas, meses] = await Promise.all([
      Etapa.aggregate([
        { $match: { obra: obra._id } },
        { $group: { _id: null, previsto: { $sum: { $multiply: ['$quantidadeTotal', '$precoUnitario'] } } } }
      ]),
      Medicao.aggregate([
        { $match: { obra: obra._id } },
        { $lookup: { from: Etapa.collection.name, localField: 'etapa', foreignField: '_id', as: 'etapaDoc' } },
        { $unwind: '$etapaDoc' },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$data' } },
          valorMedido: { $sum: { $multiply: ['$quantidade', '$etapaDoc.precoUnitario'] } }
        } },
        { $sort: { _id: 1 } }
      ])
    ]);
    const previsto = etapas[0]?.previsto || 0;
    let acumulado = 0;
    res.json(meses.map((mes) => {
      acumulado += mes.valorMedido;
      return { mes: mes._id, valorMedido: mes.valorMedido, percentualConclusao: previsto ? Math.min(100, Math.round((acumulado / previsto) * 10000) / 100) : 0 };
    }));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await Obra.findById(req.params.id).populate('cliente');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json((await incluirProgressoObras([doc]))[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const doc = await Obra.create(pick(req.body, ['codigo', 'nome', 'descricao', 'endereco', 'cidade', 'uf', 'cliente', 'status', 'valorOrcamento', 'dataInicio', 'dataPrevisaoFim', 'dataConclusao', 'responsavel']));
    res.status(201).json(doc);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const doc = await Obra.findByIdAndUpdate(req.params.id, pick(req.body, ['codigo', 'nome', 'descricao', 'endereco', 'cidade', 'uf', 'cliente', 'status', 'valorOrcamento', 'dataInicio', 'dataPrevisaoFim', 'dataConclusao', 'responsavel']), { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const doc = await Obra.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
