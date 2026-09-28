import express from 'express';
import ContaBancaria from '../models/ContaBancaria.js';
import MovimentoBancario from '../models/MovimentoBancario.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const contas = await ContaBancaria.find().sort({ nome: 1 });
    const totais = await MovimentoBancario.aggregate([
      { $group: { _id: '$tipo', total: { $sum: '$valor' } } }
    ]);
    const porTipo = new Map(totais.map((item) => [item._id, item.total]));
    res.json({
      contas,
      saldoTotal: contas.reduce((total, conta) => total + Number(conta.saldoAtual || 0), 0),
      movimentos: {
        creditos: Number(porTipo.get('credito') || 0),
        debitos: Number(porTipo.get('debito') || 0)
      }
    });
  } catch (err) { next(err); }
});

router.get('/:id/movimentos', async (req, res, next) => {
  try {
    const conta = await ContaBancaria.findById(req.params.id);
    if (!conta) return res.status(404).json({ error: 'Conta bancaria nao encontrada' });
    const movimentos = await MovimentoBancario.find({ contaBancaria: conta._id })
      .populate('lancamento', 'tipo descricao')
      .sort({ data: -1, createdAt: -1 });
    res.json(movimentos);
  } catch (err) { next(err); }
});

router.post('/', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['nome', 'banco', 'agencia', 'numeroConta', 'tipo', 'saldoInicial']);
    if (!payload.nome || !payload.banco || !payload.numeroConta || !Number.isFinite(Number(payload.saldoInicial || 0))) {
      return res.status(400).json({ error: 'Informe nome, banco, conta e saldo inicial valido' });
    }
    const saldoInicial = Number(payload.saldoInicial || 0);
    const conta = await ContaBancaria.create({
      ...payload,
      saldoInicial,
      saldoAtual: saldoInicial
    });
    res.status(201).json(conta);
  } catch (err) { next(err); }
});

router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const payload = pick(req.body, ['nome', 'banco', 'agencia', 'numeroConta', 'tipo', 'ativa']);
    const conta = await ContaBancaria.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!conta) return res.status(404).json({ error: 'Conta bancaria nao encontrada' });
    res.json(conta);
  } catch (err) { next(err); }
});

export default router;
