import express from 'express';
import mongoose from 'mongoose';
import RecebivelObra from '../models/RecebivelObra.js';
import Lancamento from '../models/Lancamento.js'
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

router.get('/recebiveis-obra', async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.obra) filtro.obra = req.query.obra;
    if (req.query.contrato) filtro.contrato = req.query.contrato;
    if (req.query.status) filtro.status = req.query.status;
    if (req.query.inicio || req.query.fim) {
      const inicio = req.query.inicio ? new Date(req.query.inicio) : null;
      const fim = req.query.fim ? new Date(req.query.fim) : null;
      if ((inicio && Number.isNaN(inicio.getTime())) || (fim && Number.isNaN(fim.getTime()))) {
        return res.status(400).json({ error: 'Periodo invalido' });
      }
      if (inicio) inicio.setUTCHours(0, 0, 0, 0);
      if (fim) fim.setUTCHours(23, 59, 59, 999);
      filtro.dataMedicao = {
        ...(inicio ? { $gte: inicio } : {}),
        ...(fim ? { $lte: fim } : {})
      };
    }
    const docs = await RecebivelObra.find(filtro)
      .populate('obra', 'nome codigo')
      .populate('contrato', 'numero valorTotal')
      .sort({ dataMedicao: -1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/recebiveis-obra/:id', async (req, res, next) => {
  try {
    const doc = await RecebivelObra.findById(req.params.id)
      .populate('obra', 'nome codigo')
      .populate('contrato', 'numero valorTotal cliente');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/recebiveis-obra', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, [
      'obra', 'contrato', 'medicao', 'dataMedicao', 'numeroNF',
      'valorMedicao', 'dataRecebimento', 'valorRecebido',
      'arquivoMedicao', 'arquivoNF', 'comprovanteRecebimento',
      'status', 'observacoes'
    ]);
    const doc = await RecebivelObra.create(payload);
    await doc.populate('obra', 'nome codigo');
    await doc.populate('contrato', 'numero');
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.put('/recebiveis-obra/:id', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, [
      'obra', 'contrato', 'medicao', 'dataMedicao', 'numeroNF',
      'valorMedicao', 'dataRecebimento', 'valorRecebido',
      'arquivoMedicao', 'arquivoNF', 'comprovanteRecebimento',
      'status', 'observacoes'
    ]);
    const doc = await RecebivelObra.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    await doc.populate('obra', 'nome codigo');
    await doc.populate('contrato', 'numero');
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/recebiveis-obra/:id', adminOnly, async (req, res, next) => {
  try {
    const doc = await RecebivelObra.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// RECEBER (baixa de recebivel)
router.post('/recebiveis-obra/:id/receber', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { dataRecebimento, valorRecebido, contaBancaria, comprovante } = req.body;
    
    let resposta;
    await session.withTransaction(async () => {
      const recebivel = await RecebivelObra.findById(req.params.id).session(session);
      if (!recebivel) throw new Error('Nao encontrado');
      
      if (recebivel.status === 'recebido_total') {
        return res.status(409).json({ error: 'Recebivel ja totalmente recebido' });
      }

      const dataRec = dataRecebimento ? new Date(dataRecebimento) : new Date();
      if (Number.isNaN(dataRec.getTime())) throw new Error('Data de recebimento invalida');

      const valor = Number(valorRecebido) || Number(recebivel.valorMedicao) - Number(recebivel.valorRecebido);
      if (valor <= 0) throw new Error('Valor invalido para recebimento');

      const novoValorRecebido = Number(recebivel.valorRecebido) + valor;
      if (novoValorRecebido > Number(recebivel.valorMedicao) + 0.01) {
        throw new Error('Valor recebido excede valor da medicao');
      }

      // Criar lancamento a receber se nao existir
      let lancamento;
      const LancamentoModel = RecebivelObra.db.model('Lancamento');
      const lancamentosExistentes = await LancamentoModel.find({ 
        tipo: 'receber', 
        descricao: { $regex: `Medicao.*${recebivel.medicao}.*${recebivel.obra}` }
      }).session(session);
      
      if (lancamentosExistentes.length > 0) {
        lancamento = lancamentosExistentes[0];
      } else {
        const obra = await RecebivelObra.db.model('Obra').findById(recebivel.obra).session(session);
        const contrato = recebivel.contrato ? await RecebivelObra.db.model('Contrato').findById(recebivel.contrato).session(session) : null;
        const cliente = contrato?.cliente || obra?.cliente;
        
        lancamento = new LancamentoModel({
          tipo: 'receber',
          descricao: `Medicao ${recebivel.medicao} - ${obra?.nome || 'Obra'}`,
          categoria: 'Recebimento Obra',
          valor: recebivel.valorMedicao,
          dataVencimento: recebivel.dataMedicao || new Date(),
          status: 'pendente',
          obra: recebivel.obra,
          cliente: cliente || undefined,
          observacoes: `Recebivel obra - Medicao ${recebivel.medicao}`
        });
        await lancamento.save({ session });
      }

      // Baixar lancamento
      if (contaBancaria) {
        const ContaBancaria = RecebivelObra.db.model('ContaBancaria');
        const MovimentoBancario = RecebivelObra.db.model('MovimentoBancario');
        
        const conta = await ContaBancaria.findOne({ _id: contaBancaria, ativa: true }).session(session);
        if (!conta) throw new Error('Conta bancaria inexistente ou inativa');
        
        const tipoMovimento = 'credito';
        const saldoAtualizado = await ContaBancaria.findOneAndUpdate(
          { _id: conta._id },
          { $inc: { saldoAtual: valor } },
          { new: true, runValidators: true, session }
        );
        if (!saldoAtualizado) throw new Error('Erro ao atualizar saldo bancario');

        const movimento = new MovimentoBancario({
          contaBancaria: conta._id,
          lancamento: lancamento._id,
          tipo: tipoMovimento,
          valor: valor,
          data: dataRec,
          descricao: lancamento.descricao
        });
        await movimento.save({ session });

        if (lancamento.status !== 'pago') {
          lancamento.status = novoValorRecebido >= Number(lancamento.valor) ? 'pago' : 'pendente';
          lancamento.dataPagamento = dataRec;
          lancamento.contaBancaria = conta._id;
          lancamento.movimentoBancario = movimento._id;
          await lancamento.save({ session });
        }
      }

      // Atualiza recebivel
      recebivel.valorRecebido = novoValorRecebido;
      recebivel.dataRecebimento = dataRec;
      recebivel.comprovanteRecebimento = comprovante || recebivel.comprovanteRecebimento;
      recebivel.status = novoValorRecebido >= Number(recebivel.valorMedicao) ? 'recebido_total' : 'recebido_parcial';
      await recebivel.save({ session });

      resposta = recebivel;
    });

    await resposta.populate('obra', 'nome codigo');
    await resposta.populate('contrato', 'numero');
    res.json(resposta);
  } catch (err) {
    if ([400, 404, 409].includes(err?.status)) return res.status(err.status).json({ error: err.message });
    next(err);
  }
  finally { await session.endSession(); }
});

// RESUMO POR OBRA
router.get('/recebiveis-obra/obra/:obraId/resumo', async (req, res, next) => {
  try {
    const { obraId } = req.params;
    const obra = await RecebivelObra.db.model('Obra').findById(obraId);
    if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });

    const [recebiveis, contrato] = await Promise.all([
      RecebivelObra.find({ obra: obraId }).sort({ dataMedicao: 1 }),
      RecebivelObra.db.model('Contrato').findOne({ obra: obraId }).sort({ createdAt: -1 })
    ]);

    const valorOriginalContrato = contrato?.valorTotal || 0;
    const aditivos = 0; // Poderia ser calculado de contratos adicionais
    const valorTotalContrato = valorOriginalContrato + aditivos;
    
    const totalMedido = recebiveis.reduce((acc, r) => acc + Number(r.valorMedicao || 0), 0);
    const totalRecebido = recebiveis.reduce((acc, r) => acc + Number(r.valorRecebido || 0), 0);
    const saldoContrato = valorTotalContrato - totalRecebido;

    res.json({
      obra: { _id: obra._id, nome: obra.nome, codigo: obra.codigo },
      contrato: contrato ? { _id: contrato._id, numero: contrato.numero, valorTotal: contrato.valorTotal } : null,
      valorOriginalContrato,
      aditivos,
      valorTotalContrato,
      totalMedido,
      totalRecebido,
      saldoContrato,
      recebiveis
    });
  } catch (err) { next(err); }
});

export default router;