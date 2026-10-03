import express from 'express';
import mongoose from 'mongoose';
import Acordo from '../models/Acordo.js';
import DebitoOriginal from '../models/DebitoOriginal.js';
import ParcelaAcordo from '../models/ParcelaAcordo.js';
import Lancamento from '../models/Lancamento.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

// ACORDOS
router.get('/acordos', async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.status) filtro.status = req.query.status;
    if (req.query.fornecedor) filtro.fornecedor = { $regex: req.query.fornecedor, $options: 'i' };
    const docs = await Acordo.find(filtro)
      .populate('fornecedorVinculado', 'nome razaoSocial')
      .populate('centroCusto', 'nome codigo')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/acordos/:id', async (req, res, next) => {
  try {
    const doc = await Acordo.findById(req.params.id)
      .populate('fornecedorVinculado', 'nome razaoSocial')
      .populate('centroCusto', 'nome codigo');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/acordos', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['fornecedor', 'fornecedorVinculado', 'centroCusto', 'observacoes']);
    const doc = await Acordo.create(payload);
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.put('/acordos/:id', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['fornecedor', 'fornecedorVinculado', 'centroCusto', 'observacoes']);
    const doc = await Acordo.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/acordos/:id', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const acordo = await Acordo.findById(req.params.id).session(session);
    if (!acordo) return res.status(404).json({ error: 'Nao encontrado' });

    const [temDebitos, temParcelas] = await Promise.all([
      DebitoOriginal.exists({ acordo: acordo._id }).session(session),
      ParcelaAcordo.exists({ acordo: acordo._id }).session(session)
    ]);

    if (temDebitos || temParcelas) {
      return res.status(409).json({ error: 'Acordo possui debitos ou parcelas, nao pode ser excluido' });
    }

    await acordo.deleteOne({ session });
    res.json({ ok: true });
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

// DEBITOS ORIGINAIS
router.get('/acordos/:acordoId/debitos', async (req, res, next) => {
  try {
    const docs = await DebitoOriginal.find({ acordo: req.params.acordoId })
      .populate('centroCusto', 'nome codigo')
      .sort({ vencimento: 1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.post('/acordos/:acordoId/debitos', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { acordoId } = req.params;
    const acordo = await Acordo.findById(acordoId).session(session);
    if (!acordo) return res.status(404).json({ error: 'Acordo nao encontrado' });

    const payload = pick(req.body, ['valor', 'vencimento', 'centroCusto', 'situacao', 'numeroDocumento', 'documento']);

    let resposta;
    await session.withTransaction(async () => {
      const debito = new DebitoOriginal({
        ...payload,
        acordo: acordoId
      });
      await debito.save({ session });

      // Atualiza valor total do debito do acordo
      const debitos = await DebitoOriginal.find({ acordo: acordoId }).session(session);
      const valorTotal = debitos.reduce((acc, d) => acc + Number(d.valor || 0), 0);
      acordo.valorTotalDebito = valorTotal;
      await acordo.save({ session });

      resposta = debito;
    });

    res.status(201).json(resposta);
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

router.put('/debitos-originais/:id', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['valor', 'vencimento', 'centroCusto', 'situacao', 'numeroDocumento', 'documento']);
    const doc = await DebitoOriginal.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/debitos-originais/:id', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const debito = await DebitoOriginal.findById(req.params.id).session(session);
    if (!debito) return res.status(404).json({ error: 'Nao encontrado' });

    const acordoId = debito.acordo;
    await debito.deleteOne({ session });

    const acordo = await Acordo.findById(acordoId).session(session);
    if (acordo) {
      const debitos = await DebitoOriginal.find({ acordo: acordoId }).session(session);
      const valorTotal = debitos.reduce((acc, d) => acc + Number(d.valor || 0), 0);
      acordo.valorTotalDebito = valorTotal;
      await acordo.save({ session });
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

// PARCELAS ACORDO
router.get('/acordos/:acordoId/parcelas', async (req, res, next) => {
  try {
    const docs = await ParcelaAcordo.find({ acordo: req.params.acordoId })
      .populate('contaBancaria', 'nome banco numeroConta')
      .populate('lancamentoVinculado', '_id descricao valor status')
      .sort({ dataVencimento: 1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.post('/acordos/:acordoId/parcelas', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { acordoId } = req.params;
    const acordo = await Acordo.findById(acordoId).session(session);
    if (!acordo) return res.status(404).json({ error: 'Acordo nao encontrado' });

    const payload = pick(req.body, ['numeroDocumento', 'valor', 'dataVencimento', 'status']);

    let resposta;
    await session.withTransaction(async () => {
      const parcela = new ParcelaAcordo({
        ...payload,
        acordo: acordoId
      });
      await parcela.save({ session });

      // Atualiza valor total do acordo
      const parcelas = await ParcelaAcordo.find({ acordo: acordoId }).session(session);
      const valorTotal = parcelas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
      acordo.valorTotalAcordo = valorTotal;
      await acordo.save({ session });

      resposta = parcela;
    });

    res.status(201).json(resposta);
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

// GERAR PARCELAS AUTOMATICAMENTE
router.post('/acordos/:acordoId/gerar-parcelas', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { acordoId } = req.params;
    const { numeroParcelas, dataPrimeiroVencimento, valorParcela } = req.body;
    
    const acordo = await Acordo.findById(acordoId).session(session);
    if (!acordo) return res.status(404).json({ error: 'Acordo nao encontrado' });

    const parcelasExistentes = await ParcelaAcordo.countDocuments({ acordo: acordoId }).session(session);
    if (parcelasExistentes > 0) {
      return res.status(409).json({ error: 'Acordo ja possui parcelas geradas' });
    }

    const parcelas = [];
    const valor = Number(valorParcela) || Math.ceil(Number(acordo.valorTotalAcordo) / Number(numeroParcelas));
    let dataVenc = new Date(dataPrimeiroVencimento);
    if (Number.isNaN(dataVenc.getTime())) throw new Error('Data de primeiro vencimento invalida');

    await session.withTransaction(async () => {
      for (let i = 0; i < Number(numeroParcelas); i++) {
        const parcela = new ParcelaAcordo({
          acordo: acordoId,
          numeroDocumento: `${acordoId}-${String(i + 1).padStart(3, '0')}`,
          valor: i === Number(numeroParcelas) - 1 
            ? Number(acordo.valorTotalAcordo) - (valor * (Number(numeroParcelas) - 1))
            : valor,
          dataVencimento: new Date(dataVenc),
          status: 'pendente'
        });
        await parcela.save({ session });
        parcelas.push(parcela);
        
        // Proximo mes
        dataVenc.setMonth(dataVenc.getMonth() + 1);
        // Ajustar se o dia nao existir no mes
        const diasNoMes = new Date(dataVenc.getFullYear(), dataVenc.getMonth() + 1, 0).getDate();
        if (dataVenc.getDate() > diasNoMes) {
          dataVenc.setDate(diasNoMes);
        }
      }

      acordo.valorTotalAcordo = parcelas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
      await acordo.save({ session });
    });

    res.status(201).json({ parcelas, acordo });
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

router.put('/parcelas-acordo/:id', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['numeroDocumento', 'valor', 'dataVencimento', 'status', 'dataPagamento', 'comprovante', 'contaBancaria']);
    const doc = await ParcelaAcordo.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

// BAIXAR PARCELA
router.post('/parcelas-acordo/:id/baixar', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { dataPagamento, contaBancaria, lancamentoId } = req.body;
    
    let resposta;
    await session.withTransaction(async () => {
      const parcela = await ParcelaAcordo.findById(req.params.id).session(session);
      if (!parcela) throw new Error('Nao encontrado');
      
      if (parcela.status === 'pago') {
        return res.status(409).json({ error: 'Parcela ja baixada' });
      }

      const dataPgto = dataPagamento ? new Date(dataPagamento) : new Date();
      if (Number.isNaN(dataPgto.getTime())) throw new Error('Data de pagamento invalida');

      // Se ja tem lancamento vinculado, apenas baixa
      if (parcela.lancamentoVinculado) {
        const lancamento = await Lancamento.findById(parcela.lancamentoVinculado).session(session);
        if (lancamento && !lancamento.movimentoBancario && contaBancaria) {
          const conta = await ParcelaAcordo.db.model('ContaBancaria').findOne({ _id: contaBancaria, ativa: true }).session(session);
          if (!conta) throw new Error('Conta bancaria inexistente ou inativa');
          
          const tipoMovimento = 'debito';
          const saldoAtualizado = await ParcelaAcordo.db.model('ContaBancaria').findOneAndUpdate(
            { _id: conta._id, saldoAtual: { $gte: parcela.valor } },
            { $inc: { saldoAtual: -parcela.valor } },
            { new: true, runValidators: true, session }
          );
          if (!saldoAtualizado) throw new Error('Saldo bancario insuficiente');

          const MovimentoBancario = ParcelaAcordo.db.model('MovimentoBancario');
          const movimento = new MovimentoBancario({
            contaBancaria: conta._id,
            lancamento: lancamento._id,
            tipo: tipoMovimento,
            valor: parcela.valor,
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
        
        parcela.status = 'pago';
        parcela.dataPagamento = dataPgto;
        await parcela.save({ session });
        resposta = parcela;
        
        // Atualiza valor pago do acordo
        const acordo = await Acordo.findById(parcela.acordo).session(session);
        if (acordo) {
          const parcelasPagas = await ParcelaAcordo.find({ acordo: parcela.acordo, status: 'pago' }).session(session);
          const valorPago = parcelasPagas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
          acordo.valorPago = valorPago;
          acordo.status = valorPago >= acordo.valorTotalAcordo ? 'quitado' : 'ativo';
          await acordo.save({ session });
        }
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
          descricao: `Parcela acordo ${parcela.acordo} - Parcela ${parcela.numeroDocumento}`,
          categoria: 'Acordo',
          valor: parcela.valor,
          dataVencimento: parcela.dataVencimento,
          status: 'pendente',
          obra: acordo.centroCusto || undefined,
          fornecedor: acordo.fornecedor,
          formaPagamento: 'boleto',
          observacoes: `Parcela de acordo - ${parcela.numeroDocumento}`
        });
        await lancamento.save({ session });
      }

      parcela.lancamentoVinculado = lancamento._id;
      parcela.status = 'pago';
      parcela.dataPagamento = dataPgto;
      await parcela.save({ session });

      // Baixa o lancamento se conta informada
      if (contaBancaria) {
        const conta = await ParcelaAcordo.db.model('ContaBancaria').findOne({ _id: contaBancaria, ativa: true }).session(session);
        if (!conta) throw new Error('Conta bancaria inexistente ou inativa');
        
        const tipoMovimento = 'debito';
        const saldoAtualizado = await ParcelaAcordo.db.model('ContaBancaria').findOneAndUpdate(
          { _id: conta._id, saldoAtual: { $gte: parcela.valor } },
          { $inc: { saldoAtual: -parcela.valor } },
          { new: true, runValidators: true, session }
        );
        if (!saldoAtualizado) throw new Error('Saldo bancario insuficiente');

        const MovimentoBancario = ParcelaAcordo.db.model('MovimentoBancario');
        const movimento = new MovimentoBancario({
          contaBancaria: conta._id,
          lancamento: lancamento._id,
          tipo: tipoMovimento,
          valor: parcela.valor,
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

      resposta = parcela;

      // Atualiza valor pago do acordo
      const acordo = await Acordo.findById(parcela.acordo).session(session);
      if (acordo) {
        const parcelasPagas = await ParcelaAcordo.find({ acordo: parcela.acordo, status: 'pago' }).session(session);
        const valorPago = parcelasPagas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
        acordo.valorPago = valorPago;
        acordo.status = valorPago >= acordo.valorTotalAcordo ? 'quitado' : 'ativo';
        await acordo.save({ session });
      }
    });

    await resposta.populate('contaBancaria', 'nome banco numeroConta');
    res.json(resposta);
  } catch (err) {
    if ([400, 404, 409].includes(err?.status)) return res.status(err.status).json({ error: err.message });
    next(err);
  }
  finally { await session.endSession(); }
});

router.delete('/parcelas-acordo/:id', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const parcela = await ParcelaAcordo.findById(req.params.id).session(session);
    if (!parcela) return res.status(404).json({ error: 'Nao encontrado' });

    const acordoId = parcela.acordo;
    await parcela.deleteOne({ session });

    const acordo = await Acordo.findById(acordoId).session(session);
    if (acordo) {
      const parcelas = await ParcelaAcordo.find({ acordo: acordoId }).session(session);
      const valorTotal = parcelas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
      acordo.valorTotalAcordo = valorTotal;
      await acordo.save({ session });
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

// RESUMO ACORDO
router.get('/acordos/:id/resumo', async (req, res, next) => {
  try {
    const acordo = await Acordo.findById(req.params.id)
      .populate('fornecedorVinculado', 'nome razaoSocial')
      .populate('centroCusto', 'nome codigo');
    if (!acordo) return res.status(404).json({ error: 'Nao encontrado' });

    const [debitos, parcelas] = await Promise.all([
      DebitoOriginal.find({ acordo: acordo._id }).populate('centroCusto', 'nome codigo'),
      ParcelaAcordo.find({ acordo: acordo._id })
        .populate('contaBancaria', 'nome banco')
        .populate('lancamentoVinculado', '_id descricao valor status')
    ]);

    res.json({
      acordo,
      debitos,
      parcelas,
      valorTotalDebito: acordo.valorTotalDebito,
      valorTotalAcordo: acordo.valorTotalAcordo,
      valorPago: acordo.valorPago,
      saldo: Number(acordo.valorTotalAcordo) - Number(acordo.valorPago)
    });
  } catch (err) { next(err); }
});

export default router;