import express from 'express';
import mongoose from 'mongoose';
import Empreiteiro from '../models/Empreiteiro.js';
import ContratoEmpreiteiro from '../models/ContratoEmpreiteiro.js';
import MovimentoEmpreiteiro from '../models/MovimentoEmpreiteiro.js';
import Lancamento from '../models/Lancamento.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

// EMPREITEIROS
router.get('/empreiteiros', async (req, res, next) => {
  try {
    const docs = await Empreiteiro.find().sort({ nome: 1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/empreiteiros/:id', async (req, res, next) => {
  try {
    const doc = await Empreiteiro.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/empreiteiros', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['nome', 'cpfCnpj', 'telefone', 'email', 'endereco', 'observacoes', 'ativo']);
    const doc = await Empreiteiro.create(payload);
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.put('/empreiteiros/:id', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['nome', 'cpfCnpj', 'telefone', 'email', 'endereco', 'observacoes', 'ativo']);
    const doc = await Empreiteiro.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/empreiteiros/:id', adminOnly, async (req, res, next) => {
  try {
    const doc = await Empreiteiro.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// CONTRATOS EMPREITEIRO
router.get('/empreiteiros/:empreiteiroId/contratos', async (req, res, next) => {
  try {
    const { empreiteiroId } = req.params;
    const docs = await ContratoEmpreiteiro.find({ empreiteiro: empreiteiroId })
      .populate('obra', 'nome codigo')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/contratos-empreiteiro', async (req, res, next) => {
  try {
    const docs = await ContratoEmpreiteiro.find()
      .populate('empreiteiro', 'nome')
      .populate('obra', 'nome codigo')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/contratos-empreiteiro/:id', async (req, res, next) => {
  try {
    const doc = await ContratoEmpreiteiro.findById(req.params.id)
      .populate('empreiteiro', 'nome cpfCnpj')
      .populate('obra', 'nome codigo');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/contratos-empreiteiro', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['empreiteiro', 'obra', 'numero', 'objeto', 'valorTotal', 'dataInicio', 'dataFim', 'dataAssinatura', 'status', 'observacoes']);
    const doc = await ContratoEmpreiteiro.create(payload);
    await doc.populate('empreiteiro', 'nome');
    await doc.populate('obra', 'nome codigo');
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.put('/contratos-empreiteiro/:id', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['empreiteiro', 'obra', 'numero', 'objeto', 'valorTotal', 'dataInicio', 'dataFim', 'dataAssinatura', 'status', 'observacoes']);
    const doc = await ContratoEmpreiteiro.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    await doc.populate('empreiteiro', 'nome');
    await doc.populate('obra', 'nome codigo');
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/contratos-empreiteiro/:id', adminOnly, async (req, res, next) => {
  try {
    const contrato = await ContratoEmpreiteiro.findById(req.params.id);
    if (!contrato) return res.status(404).json({ error: 'Nao encontrado' });
    const temMovimentos = await MovimentoEmpreiteiro.exists({ contratoEmpreiteiro: contrato._id });
    if (temMovimentos) return res.status(409).json({ error: 'Contrato possui movimentos, nao pode ser excluido' });
    await contrato.deleteOne();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// MOVIMENTOS EMPREITEIRO
router.get('/contratos-empreiteiro/:contratoId/movimentos', async (req, res, next) => {
  try {
    const { contratoId } = req.params;
    const docs = await MovimentoEmpreiteiro.find({ contratoEmpreiteiro: contratoId })
      .populate('contaBancaria', 'nome banco numeroConta')
      .populate('lancamentoVinculado', '_id descricao valor status')
      .sort({ dataPagamento: -1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.post('/contratos-empreiteiro/:contratoId/movimentos', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { contratoId } = req.params;
    const contrato = await ContratoEmpreiteiro.findById(contratoId);
    if (!contrato) return res.status(404).json({ error: 'Contrato nao encontrado' });

    const payload = pick(req.body, ['tipo', 'valor', 'dataPagamento', 'observacao', 'empresaPagadora', 'contaBancaria', 'comprovante']);

    let resposta;
    await session.withTransaction(async () => {
      const movimento = new MovimentoEmpreiteiro({
        ...payload,
        contratoEmpreiteiro: contratoId,
        empreiteiro: contrato.empreiteiro,
        obra: contrato.obra
      });
      await movimento.save({ session });

      // Atualiza resumo do contrato (valor pago)
      // O resumo e calculado on-the-fly via agregacao

      resposta = movimento;
    });

    await resposta.populate('contaBancaria', 'nome banco numeroConta');
    res.status(201).json(resposta);
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

router.put('/movimentos-empreiteiro/:id', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['tipo', 'valor', 'dataPagamento', 'observacao', 'contaBancaria', 'comprovante']);
    const doc = await MovimentoEmpreiteiro.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    await doc.populate('contaBancaria', 'nome banco numeroConta');
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/movimentos-empreiteiro/:id', adminOnly, async (req, res, next) => {
  try {
    const doc = await MovimentoEmpreiteiro.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// RESUMO CONTRATO EMPREITEIRO
router.get('/contratos-empreiteiro/:id/resumo', async (req, res, next) => {
  try {
    const { id } = req.params;
    const contrato = await ContratoEmpreiteiro.findById(id);
    if (!contrato) return res.status(404).json({ error: 'Nao encontrado' });

    const [movimentos] = await Promise.all([
      MovimentoEmpreiteiro.aggregate([
        { $match: { contratoEmpreiteiro: contrato._id } },
        { $group: { _id: null, totalPago: { $sum: '$valor' }, count: { $sum: 1 } } }
      ])
    ]);

    const totalPago = movimentos[0]?.totalPago || 0;
    const saldo = Number(contrato.valorTotal) - totalPago;

    res.json({
      contrato: {
        _id: contrato._id,
        numero: contrato.numero,
        empreiteiro: contrato.empreiteiro,
        obra: contrato.obra,
        valorTotal: contrato.valorTotal,
        status: contrato.status
      },
      totalPago,
      saldo,
      valorTotal: contrato.valorTotal
    });
  } catch (err) { next(err); }
});

export default router;