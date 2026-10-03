import express from 'express';
import mongoose from 'mongoose';
import Reembolso from '../models/Reembolso.js';
import ItemReembolso from '../models/ItemReembolso.js';
import PagamentoReembolso from '../models/PagamentoReembolso.js';
import Lancamento from '../models/Lancamento.js';
import VinculoMovimentacao from '../models/VinculoMovimentacao.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

// REEMBOLSOS
router.get('/reembolsos', async (req, res, next) => {
  try {
    const docs = await Reembolso.find()
      .populate('centroCusto', 'nome')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/reembolsos/:id', async (req, res, next) => {
  try {
    const doc = await Reembolso.findById(req.params.id)
      .populate('centroCusto', 'nome');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/reembolsos', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['beneficiario', 'documento', 'centroCusto', 'observacoes']);
    const doc = await Reembolso.create(payload);
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.put('/reembolsos/:id', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['beneficiario', 'documento', 'centroCusto', 'observacoes']);
    const doc = await Reembolso.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/reembolsos/:id', adminOnly, async (req, res, next) => {
  try {
    const reembolso = await Reembolso.findById(req.params.id);
    if (!reembolso) return res.status(404).json({ error: 'Nao encontrado' });
    
    const temItens = await ItemReembolso.exists({ reembolso: reembolso._id });
    if (temItens) return res.status(409).json({ error: 'Reembolso possui itens, nao pode ser excluido' });
    
    await reembolso.deleteOne();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ITENS REEMBOLSO
router.get('/reembolsos/:reembolsoId/itens', async (req, res, next) => {
  try {
    const { reembolsoId } = req.params;
    const docs = await ItemReembolso.find({ reembolso: reembolsoId })
      .populate('centroCusto', 'nome')
      .populate('despesaVinculada', '_id descricao valor status')
      .sort({ dataDespesa: -1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.post('/reembolsos/:reembolsoId/itens', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { reembolsoId } = req.params;
    const reembolso = await Reembolso.findById(reembolsoId);
    if (!reembolso) return res.status(404).json({ error: 'Reembolso nao encontrado' });

    const payload = pick(req.body, ['dataDespesa', 'valor', 'centroCusto', 'categoria', 'descricao', 'comprovante']);

    let resposta;
    await session.withTransaction(async () => {
      const item = new ItemReembolso({
        ...payload,
        reembolso: reembolsoId
      });
      await item.save({ session });

      // Atualiza valor total do reembolso
      const itens = await ItemReembolso.find({ reembolso: reembolsoId }).session(session);
      const valorTotal = itens.reduce((acc, i) => acc + Number(i.valor || 0), 0);
      reembolso.valorTotal = valorTotal;
      await reembolso.save({ session });

      resposta = item;
    });

    res.status(201).json(resposta);
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

router.put('/itens-reembolso/:id', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const payload = pick(req.body, ['dataDespesa', 'valor', 'centroCusto', 'categoria', 'descricao', 'comprovante']);
    const item = await ItemReembolso.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true, session });
    if (!item) return res.status(404).json({ error: 'Nao encontrado' });

    // Atualiza valor total do reembolso
    const reembolso = await Reembolso.findById(item.reembolso).session(session);
    if (reembolso) {
      const itens = await ItemReembolso.find({ reembolso: reembolso._id }).session(session);
      const valorTotal = itens.reduce((acc, i) => acc + Number(i.valor || 0), 0);
      reembolso.valorTotal = valorTotal;
      await reembolso.save({ session });
    }

    res.json(item);
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

router.delete('/itens-reembolso/:id', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const item = await ItemReembolso.findById(req.params.id).session(session);
    if (!item) return res.status(404).json({ error: 'Nao encontrado' });

    const reembolsoId = item.reembolso;
    await item.deleteOne({ session });

    // Atualiza valor total do reembolso
    const reembolso = await Reembolso.findById(reembolsoId).session(session);
    if (reembolso) {
      const itens = await ItemReembolso.find({ reembolso: reembolsoId }).session(session);
      const valorTotal = itens.reduce((acc, i) => acc + Number(i.valor || 0), 0);
      reembolso.valorTotal = valorTotal;
      await reembolso.save({ session });
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

// PAGAMENTOS REEMBOLSO
router.get('/reembolsos/:reembolsoId/pagamentos', async (req, res, next) => {
  try {
    const { reembolsoId } = req.params;
    const docs = await PagamentoReembolso.find({ reembolso: reembolsoId })
      .populate('contaBancaria', 'nome banco numeroConta')
      .populate('lancamentoVinculado', '_id descricao valor status')
      .populate('empresaPagadora', 'nome')
      .sort({ dataPagamento: -1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.post('/reembolsos/:reembolsoId/pagamentos', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { reembolsoId } = req.params;
    const reembolso = await Reembolso.findById(reembolsoId);
    if (!reembolso) return res.status(404).json({ error: 'Reembolso nao encontrado' });

    const payload = pick(req.body, ['itemReembolso', 'dataPagamento', 'valor', 'empresaPagadora', 'contaBancaria', 'comprovante', 'observacao']);

    let resposta;
    await session.withTransaction(async () => {
      const pagamento = new PagamentoReembolso({
        ...payload,
        reembolso: reembolsoId
      });
      await pagamento.save({ session });

      // Atualiza valor pago do reembolso
      const pagamentos = await PagamentoReembolso.find({ reembolso: reembolsoId }).session(session);
      const valorPago = pagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0);
      reembolso.valorPago = valorPago;
      reembolso.status = valorPago >= reembolso.valorTotal ? 'quitado' : valorPago > 0 ? 'parcial' : 'aberto';
      await reembolso.save({ session });

      resposta = pagamento;
    });

    await resposta.populate('contaBancaria', 'nome banco numeroConta');
    res.status(201).json(resposta);
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

router.put('/pagamentos-reembolso/:id', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['dataPagamento', 'valor', 'contaBancaria', 'comprovante', 'observacao']);
    const doc = await PagamentoReembolso.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    await doc.populate('contaBancaria', 'nome banco numeroConta');
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/pagamentos-reembolso/:id', adminOnly, async (req, res, next) => {
  try {
    const doc = await PagamentoReembolso.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// CRIAR DESPESA VINCULADA AO ITEM DE REEMBOLSO (duplo lancamento)
router.post('/itens-reembolso/:id/criar-despesa', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const item = await ItemReembolso.findById(req.params.id).session(session);
    if (!item) return res.status(404).json({ error: 'Item nao encontrado' });
    if (item.despesaVinculada) return res.status(409).json({ error: 'Item ja possui despesa vinculada' });

    const { descricao, categoria, formaPagamento, observacoes } = req.body;
    
    let resposta;
    await session.withTransaction(async () => {
      const despesa = new Lancamento({
        tipo: 'pagar',
        descricao: descricao || `Reembolso - ${item.descricao || item.beneficiario || 'Despesa'}`,
        categoria: categoria || 'Reembolso',
        valor: item.valor,
        dataVencimento: item.dataDespesa,
        status: 'pendente',
        obra: item.centroCusto || undefined,
        fornecedor: item.beneficiario || 'Reembolso',
        formaPagamento,
        observacoes: observacoes || `Despesa vinculada a reembolso de ${item.beneficiario || item.reembolso}`
      });
      await despesa.save({ session });

      item.despesaVinculada = despesa._id;
      await item.save({ session });

      // Cria vinculo
      await VinculoMovimentacao.create([{
        tipoOrigem: 'reembolso',
        origemId: item._id,
        tipoDestino: 'despesa',
        destinoId: despesa._id,
        descricao: 'Despesa criada a partir de item de reembolso'
      }], { session });

      resposta = { item, despesa };
    });

    res.status(201).json(resposta);
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

// RESUMO REEMBOLSO
router.get('/reembolsos/:id/resumo', async (req, res, next) => {
  try {
    const reembolso = await Reembolso.findById(req.params.id)
      .populate('centroCusto', 'nome');
    if (!reembolso) return res.status(404).json({ error: 'Nao encontrado' });

    const [itens, pagamentos] = await Promise.all([
      ItemReembolso.find({ reembolso: reembolso._id }).populate('centroCusto', 'nome').populate('despesaVinculada', '_id descricao valor status'),
      PagamentoReembolso.find({ reembolso: reembolso._id }).populate('contaBancaria', 'nome banco').populate('empresaPagadora', 'nome')
    ]);

    res.json({
      reembolso,
      itens,
      pagamentos,
      valorTotal: reembolso.valorTotal,
      valorPago: reembolso.valorPago,
      saldo: Number(reembolso.valorTotal) - Number(reembolso.valorPago)
    });
  } catch (err) { next(err); }
});

export default router;