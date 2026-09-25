import express from 'express';
import Contrato from '../models/Contrato.js';
import Lancamento from '../models/Lancamento.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

const gerarParcelas = async ({ contrato, valorTotal, numeroParcelas, obra, cliente }) => {
  if (!Number(numeroParcelas) || Number(numeroParcelas) < 1) return [];
  const total = Number(valorTotal) || 0;
  const parcelas = Number(numeroParcelas);
  const base = total / parcelas;
  const lancamentos = [];

  for (let i = 0; i < parcelas; i += 1) {
    const dataVencimento = new Date();
    dataVencimento.setMonth(dataVencimento.getMonth() + i + 1, 1);
    const valorParcela = i === parcelas - 1
      ? Number((total - (base * (parcelas - 1))).toFixed(2))
      : Number(base.toFixed(2));

    const lancamento = await Lancamento.create({
      tipo: 'receber',
      descricao: `Parcela ${i + 1}/${parcelas} - ${contrato.numero || 'Contrato'}`,
      categoria: 'Contrato',
      valor: valorParcela,
      dataVencimento,
      status: 'pendente',
      obra,
      cliente,
      formaPagamento: 'Parcelamento',
      observacoes: `Contrato ${contrato.numero || contrato._id}`
    });
    lancamentos.push(lancamento);
  }
  return lancamentos;
};

router.get('/', async (req, res) => {
  try {
    const docs = await Contrato.find()
      .populate('obra', 'nome')
      .populate('cliente', 'nome')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await Contrato.findById(req.params.id).populate('obra cliente');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const payload = pick(req.body, ['numero', 'obra', 'cliente', 'valorTotal', 'numeroParcelas', 'objeto', 'dataAssinatura', 'dataInicio', 'dataFim', 'status', 'observacoes', 'orcamento']);
    const contrato = await Contrato.create({
      ...payload,
      numeroParcelas: Number(payload.numeroParcelas) || 1,
      valorTotal: Number(payload.valorTotal) || 0
    });

    if (contrato.valorTotal > 0 && Number(payload.numeroParcelas) > 1) {
      await gerarParcelas({
        contrato,
        valorTotal: contrato.valorTotal,
        numeroParcelas: contrato.numeroParcelas,
        obra: contrato.obra,
        cliente: contrato.cliente
      });
    }

    res.status(201).json(contrato);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const payload = pick(req.body, ['numero', 'obra', 'cliente', 'valorTotal', 'numeroParcelas', 'objeto', 'dataAssinatura', 'dataInicio', 'dataFim', 'status', 'observacoes', 'orcamento']);
    const doc = await Contrato.findByIdAndUpdate(req.params.id, {
      ...payload,
      numeroParcelas: Number(payload.numeroParcelas) || 1,
      valorTotal: Number(payload.valorTotal) || 0
    }, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const doc = await Contrato.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
