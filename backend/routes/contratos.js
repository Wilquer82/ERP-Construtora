import express from 'express';
import mongoose from 'mongoose';
import Contrato from '../models/Contrato.js';
import Lancamento from '../models/Lancamento.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';
import { gerarParcelasContrato } from '../services/contractInstallments.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const docs = await Contrato.find()
      .populate('obra', 'nome')
      .populate('cliente', 'nome')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Contrato.findById(req.params.id).populate('obra cliente');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const payload = pick(req.body, ['numero', 'obra', 'cliente', 'valorTotal', 'numeroParcelas', 'dataPrimeiroVencimento', 'objeto', 'dataAssinatura', 'dataInicio', 'dataFim', 'status', 'observacoes', 'orcamento']);
    if (!Number.isInteger(Number(payload.numeroParcelas) || 1) || Number(payload.numeroParcelas || 1) < 1) {
      return res.status(400).json({ error: 'Informe um numero inteiro e positivo de parcelas' });
    }
    let contrato;
    await session.withTransaction(async () => {
      contrato = new Contrato({
        ...payload,
        numeroParcelas: Number(payload.numeroParcelas) || 1,
        valorTotal: Number(payload.valorTotal) || 0
      });
      await contrato.save({ session });
      await gerarParcelasContrato({ contrato, session });
    });
    res.status(201).json(contrato);
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = pick(req.body, ['numero', 'obra', 'cliente', 'valorTotal', 'numeroParcelas', 'dataPrimeiroVencimento', 'objeto', 'dataAssinatura', 'dataInicio', 'dataFim', 'status', 'observacoes', 'orcamento']);
    if (Object.hasOwn(payload, 'numeroParcelas') && (!Number.isInteger(Number(payload.numeroParcelas)) || Number(payload.numeroParcelas) < 1)) {
      return res.status(400).json({ error: 'Informe um numero inteiro e positivo de parcelas' });
    }
    const atual = await Contrato.findById(req.params.id);
    if (!atual) return res.status(404).json({ error: 'Nao encontrado' });
    const parcelasExistentes = await Lancamento.exists({ contrato: req.params.id });
    const dataAtual = atual.dataPrimeiroVencimento ? new Date(atual.dataPrimeiroVencimento).getTime() : null;
    const dataNova = payload.dataPrimeiroVencimento ? new Date(payload.dataPrimeiroVencimento).getTime() : null;
    const alterouParcelamento = (
      (Object.hasOwn(payload, 'valorTotal') && Number(payload.valorTotal) !== Number(atual.valorTotal))
      || (Object.hasOwn(payload, 'numeroParcelas') && Number(payload.numeroParcelas) !== Number(atual.numeroParcelas))
      || (Object.hasOwn(payload, 'dataPrimeiroVencimento') && dataNova !== dataAtual)
      || (Object.hasOwn(payload, 'obra') && String(payload.obra) !== String(atual.obra))
      || (Object.hasOwn(payload, 'cliente') && String(payload.cliente) !== String(atual.cliente))
      || (Object.hasOwn(payload, 'numero') && String(payload.numero) !== String(atual.numero))
    );
    if (parcelasExistentes && alterouParcelamento) {
      return res.status(409).json({ error: 'O contrato possui parcelas geradas; valor, quantidade e vencimentos nao podem ser alterados' });
    }
    const doc = await Contrato.findByIdAndUpdate(req.params.id, {
      ...payload,
      ...(Object.hasOwn(payload, 'numeroParcelas') ? { numeroParcelas: Number(payload.numeroParcelas) || 1 } : {}),
      ...(Object.hasOwn(payload, 'valorTotal') ? { valorTotal: Number(payload.valorTotal) || 0 } : {})
    }, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    if (await Lancamento.exists({ contrato: req.params.id })) {
      return res.status(409).json({ error: 'Contrato com parcelas financeiras vinculadas nao pode ser excluido' });
    }
    const doc = await Contrato.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
