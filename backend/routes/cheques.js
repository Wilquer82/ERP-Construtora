import express from 'express';
import mongoose from 'mongoose';
import Cheque from '../models/Cheque.js';
import Lancamento from '../models/Lancamento.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

router.get('/cheques', async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.status) filtro.status = req.query.status;
    if (req.query.centroCusto) filtro.centroCusto = req.query.centroCusto;
    if (req.query.inicio || req.query.fim) {
      const inicio = req.query.inicio ? new Date(req.query.inicio) : null;
      const fim = req.query.fim ? new Date(req.query.fim) : null;
      if ((inicio && Number.isNaN(inicio.getTime())) || (fim && Number.isNaN(fim.getTime()))) {
        return res.status(400).json({ error: 'Periodo invalido' });
      }
      if (inicio) inicio.setUTCHours(0, 0, 0, 0);
      if (fim) fim.setUTCHours(23, 59, 59, 999);
      filtro.dataVencimento = {
        ...(inicio ? { $gte: inicio } : {}),
        ...(fim ? { $lte: fim } : {})
      };
    }
    const docs = await Cheque.find(filtro)
      .populate('centroCusto', 'nome codigo')
      .populate('contaBancaria', 'nome banco numeroConta')
      .populate('lancamentoVinculado', '_id descricao valor status')
      .sort({ dataVencimento: 1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/cheques/:id', async (req, res, next) => {
  try {
    const doc = await Cheque.findById(req.params.id)
      .populate('centroCusto', 'nome codigo')
      .populate('contaBancaria', 'nome banco numeroConta')
      .populate('lancamentoVinculado', '_id descricao valor status');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/cheques', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, [
      'numeroFolha', 'banco', 'agencia', 'conta', 'favorecido', 'cpfCnpjFavorecido',
      'centroCusto', 'dataVencimento', 'valor', 'status', 'forma', 'observacao',
      'arquivoFolha', 'contaBancaria'
    ]);
    const doc = await Cheque.create(payload);
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.put('/cheques/:id', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, [
      'numeroFolha', 'banco', 'agencia', 'conta', 'favorecido', 'cpfCnpjFavorecido',
      'centroCusto', 'dataVencimento', 'valor', 'status', 'forma', 'observacao',
      'arquivoFolha', 'contaBancaria'
    ]);
    const doc = await Cheque.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/cheques/:id', adminOnly, async (req, res, next) => {
  try {
    const doc = await Cheque.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// BAIXAR CHEQUE (marcar como pago e criar lancamento)
router.post('/cheques/:id/baixar', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { dataPagamento, contaBancaria, lancamentoId } = req.body;
    
    let resposta;
    await session.withTransaction(async () => {
      const cheque = await Cheque.findById(req.params.id).session(session);
      if (!cheque) throw new Error('Nao encontrado');
      
      if (cheque.status === 'pago') {
        return res.status(409).json({ error: 'Cheque ja baixado' });
      }

      const dataPgto = dataPagamento ? new Date(dataPagamento) : new Date();
      if (Number.isNaN(dataPgto.getTime())) throw new Error('Data de pagamento invalida');

      // Se ja tem lancamento vinculado, apenas atualiza
      if (cheque.lancamentoVinculado) {
        const lancamento = await Lancamento.findById(cheque.lancamentoVinculado).session(session);
        if (lancamento && !lancamento.movimentoBancario && contaBancaria) {
          // Baixa o lancamento
          const conta = await Cheque.db.model('ContaBancaria').findOne({ _id: contaBancaria, ativa: true }).session(session);
          if (!conta) throw new Error('Conta bancaria inexistente ou inativa');
          
          const tipoMovimento = 'debito';
          const saldoAtualizado = await Cheque.db.model('ContaBancaria').findOneAndUpdate(
            { _id: conta._id, saldoAtual: { $gte: cheque.valor } },
            { $inc: { saldoAtual: -cheque.valor } },
            { new: true, runValidators: true, session }
          );
          if (!saldoAtualizado) throw new Error('Saldo bancario insuficiente');

          const MovimentoBancario = Cheque.db.model('MovimentoBancario');
          const movimento = new MovimentoBancario({
            contaBancaria: conta._id,
            lancamento: lancamento._id,
            tipo: tipoMovimento,
            valor: cheque.valor,
            data: dataPgto,
            descricao: lancamento.descricao
          });
          await movimento.save({ session });

          lancamento.status = 'pago';
          lancamento.dataPagamento = dataPgto;
          lancamento.contaBancaria = conta._id;
          lancamento.movimentoBancario = movimento._id;
          await lancamento.save({ session });
        }
        
        cheque.status = 'pago';
        cheque.dataPagamento = dataPgto;
        await cheque.save({ session });
        resposta = cheque;
        return;
      }

      // Criar lancamento se nao existir
      let lancamento;
      if (lancamentoId) {
        lancamento = await Lancamento.findById(lancamentoId).session(session);
        if (!lancamento) throw new Error('Lancamento nao encontrado');
      } else {
        lancamento = new Lancamento({
          tipo: 'pagar',
          descricao: `Cheque ${cheque.numeroFolha} - ${cheque.favorecido}`,
          categoria: 'Cheque',
          valor: cheque.valor,
          dataVencimento: cheque.dataVencimento,
          status: 'pendente',
          obra: cheque.centroCusto || undefined,
          fornecedor: cheque.favorecido,
          formaPagamento: 'cheque',
          observacoes: `Cheque n. ${cheque.numeroFolha} - ${cheque.banco}`
        });
        await lancamento.save({ session });
      }

      cheque.lancamentoVinculado = lancamento._id;
      cheque.status = 'pago';
      cheque.dataPagamento = dataPgto;
      await cheque.save({ session });

      // Baixa o lancamento se conta informada
      if (contaBancaria) {
        const conta = await Cheque.db.model('ContaBancaria').findOne({ _id: contaBancaria, ativa: true }).session(session);
        if (!conta) throw new Error('Conta bancaria inexistente ou inativa');
        
        const tipoMovimento = 'debito';
        const saldoAtualizado = await Cheque.db.model('ContaBancaria').findOneAndUpdate(
          { _id: conta._id, saldoAtual: { $gte: cheque.valor } },
          { $inc: { saldoAtual: -cheque.valor } },
          { new: true, runValidators: true, session }
        );
        if (!saldoAtualizado) throw new Error('Saldo bancario insuficiente');

        const MovimentoBancario = Cheque.db.model('MovimentoBancario');
        const movimento = new MovimentoBancario({
          contaBancaria: conta._id,
          lancamento: lancamento._id,
          tipo: tipoMovimento,
          valor: cheque.valor,
          data: dataPgto,
          descricao: lancamento.descricao
        });
        await movimento.save({ session });

        lancamento.status = 'pago';
        lancamento.dataPagamento = dataPgto;
        lancamento.contaBancaria = conta._id;
        lancamento.movimentoBancario = movimento._id;
        await lancamento.save({ session });
      }

      resposta = cheque;
    });

    await resposta.populate('centroCusto', 'nome codigo');
    await resposta.populate('contaBancaria', 'nome banco numeroConta');
    res.json(resposta);
  } catch (err) {
    if ([400, 404, 409].includes(err?.status)) return res.status(err.status).json({ error: err.message });
    next(err);
  }
  finally { await session.endSession(); }
});

// RESUMO CHEQUES
router.get('/cheques/resumo', async (req, res, next) => {
  try {
    const [emDia, pagos, emAtraso, devolvidos, sustados] = await Promise.all([
      Cheque.aggregate([
        { $match: { status: 'em_dia' } },
        { $group: { _id: null, total: { $sum: '$valor' }, count: { $sum: 1 } } }
      ]),
      Cheque.aggregate([
        { $match: { status: 'pago' } },
        { $group: { _id: null, total: { $sum: '$valor' }, count: { $sum: 1 } } }
      ]),
      Cheque.aggregate([
        { $match: { status: 'em_atraso' } },
        { $group: { _id: null, total: { $sum: '$valor' }, count: { $sum: 1 } } }
      ]),
      Cheque.aggregate([
        { $match: { status: 'devolvido' } },
        { $group: { _id: null, total: { $sum: '$valor' }, count: { $sum: 1 } } }
      ]),
      Cheque.aggregate([
        { $match: { status: 'sustado' } },
        { $group: { _id: null, total: { $sum: '$valor' }, count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      emDia: emDia[0] || { total: 0, count: 0 },
      pagos: pagos[0] || { total: 0, count: 0 },
      emAtraso: emAtraso[0] || { total: 0, count: 0 },
      devolvidos: devolvidos[0] || { total: 0, count: 0 },
      sustados: sustados[0] || { total: 0, count: 0 }
    });
  } catch (err) { next(err); }
});

export default router;