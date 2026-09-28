import express from 'express';
import Obra from '../models/Obra.js';
import Etapa from '../models/Etapa.js';
import Medicao from '../models/Medicao.js';
import Material from '../models/Material.js';
import Lancamento from '../models/Lancamento.js';
import Orcamento from '../models/Orcamento.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';
import { incluirProgressoObras } from '../utils/progressoObra.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const docs = await Obra.find().populate('cliente', 'nome').sort({ createdAt: -1 });
    res.json(await incluirProgressoObras(docs));
  } catch (err) { next(err); }
});

router.get('/:id/etapas', async (req, res, next) => {
  try {
    const etapas = await Etapa.find({ obra: req.params.id }).sort({ createdAt: 1 });
    res.json(etapas);
  } catch (err) { next(err); }
});

router.post('/:id/etapas', async (req, res, next) => {
  try {
    const obraExiste = await Obra.exists({ _id: req.params.id });
    if (!obraExiste) return res.status(404).json({ error: 'Obra nao encontrada' });
    const etapa = await Etapa.create({ ...pick(req.body, ['descricao', 'unidade', 'quantidadeTotal', 'precoUnitario']), obra: req.params.id });
    res.status(201).json(etapa);
  } catch (err) { next(err); }
});

router.put('/:id/etapas/:etapaId', async (req, res, next) => {
  try {
    const etapa = await Etapa.findOneAndUpdate(
      { _id: req.params.etapaId, obra: req.params.id, quantidadeMedida: 0 },
      pick(req.body, ['descricao', 'unidade', 'quantidadeTotal', 'precoUnitario']),
      { new: true, runValidators: true }
    );
    if (!etapa) return res.status(404).json({ error: 'Etapa nao encontrada ou ja medida' });
    res.json(etapa);
  } catch (err) { next(err); }
});

router.delete('/:id/etapas/:etapaId', async (req, res, next) => {
  try {
    const etapa = await Etapa.findOne({ _id: req.params.etapaId, obra: req.params.id });
    if (!etapa) return res.status(404).json({ error: 'Etapa nao encontrada' });
    if (etapa.quantidadeMedida > 0 || await Medicao.exists({ etapa: etapa._id })) {
      return res.status(400).json({ error: 'Etapas com medicao nao podem ser excluidas' });
    }
    await etapa.deleteOne();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/:id/evolucao', async (req, res, next) => {
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
  } catch (err) { next(err); }
});

router.get('/:id/relatorio', async (req, res, next) => {
  try {
    const inicio = new Date(req.query.inicio);
    const fim = new Date(req.query.fim);
    if (!req.query.inicio || !req.query.fim || Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || inicio > fim) {
      return res.status(400).json({ error: 'Informe um periodo valido com inicio e fim' });
    }
    inicio.setUTCHours(0, 0, 0, 0);
    fim.setUTCHours(23, 59, 59, 999);
    const obra = await Obra.findById(req.params.id).populate('cliente', 'nome');
    if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });

    const [obraIndicadores, medicoes, lancamentos, orcamentos] = await Promise.all([
      incluirProgressoObras([obra]),
      Medicao.find({ obra: obra._id, data: { $gte: inicio, $lte: fim } })
        .populate('etapa', 'descricao unidade precoUnitario')
        .sort({ data: 1 }),
      Lancamento.find({ obra: obra._id, dataVencimento: { $gte: inicio, $lte: fim } })
        .populate('contaBancaria', 'nome banco')
        .sort({ dataVencimento: 1 }),
      Orcamento.find({ obra: obra._id, status: 'aprovado' }).select('itens.materialVinculado')
    ]);
    const materiaisOrcados = orcamentos.flatMap((orcamento) => orcamento.itens.map((item) => item.materialVinculado).filter(Boolean));
    const materiais = await Material.find({
      $or: [
        { 'movimentos.obra': obra._id },
        ...(materiaisOrcados.length ? [{ _id: { $in: materiaisOrcados } }] : [])
      ]
    }).sort({ nome: 1 });

    res.json({
      obra: obraIndicadores[0],
      periodo: { inicio, fim },
      medicoes,
      lancamentos,
      estoque: materiais.map((material) => ({
        _id: material._id,
        nome: material.nome,
        unidade: material.unidade,
        estoqueAtual: material.estoqueAtual,
        estoqueMinimo: material.estoqueMinimo,
        movimentosPeriodo: material.movimentos.filter((movimento) => (
          String(movimento.obra) === String(obra._id)
          && movimento.data >= inicio
          && movimento.data <= fim
        ))
      }))
    });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Obra.findById(req.params.id).populate('cliente');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json((await incluirProgressoObras([doc]))[0]);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const doc = await Obra.create(pick(req.body, ['codigo', 'nome', 'descricao', 'endereco', 'cidade', 'uf', 'cliente', 'status', 'valorOrcamento', 'dataInicio', 'dataPrevisaoFim', 'dataConclusao', 'responsavel']));
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const doc = await Obra.findByIdAndUpdate(req.params.id, pick(req.body, ['codigo', 'nome', 'descricao', 'endereco', 'cidade', 'uf', 'cliente', 'status', 'valorOrcamento', 'dataInicio', 'dataPrevisaoFim', 'dataConclusao', 'responsavel']), { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const doc = await Obra.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
