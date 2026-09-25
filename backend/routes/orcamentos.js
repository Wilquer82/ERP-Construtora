import express from 'express';
import Orcamento from '../models/Orcamento.js';
import Contrato from '../models/Contrato.js';
import Lancamento from '../models/Lancamento.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

const gerarParcelasContrato = async ({ contrato, valorTotal, numeroParcelas, obra, cliente }) => {
  if (!Number(numeroParcelas) || Number(numeroParcelas) < 1) return [];
  const parcelas = Number(numeroParcelas);
  const total = Number(valorTotal) || 0;
  const base = total / parcelas;
  const criadas = [];

  for (let i = 0; i < parcelas; i += 1) {
    const vencimento = new Date();
    vencimento.setMonth(vencimento.getMonth() + i + 1, 1);
    const valorParcela = i === parcelas - 1
      ? Number((total - (base * (parcelas - 1))).toFixed(2))
      : Number(base.toFixed(2));

    const lancamento = await Lancamento.create({
      tipo: 'receber',
      descricao: `Parcela ${i + 1}/${parcelas} - ${contrato.numero || 'Contrato'}`,
      categoria: 'Contrato',
      valor: valorParcela,
      dataVencimento: vencimento,
      status: 'pendente',
      obra,
      cliente,
      formaPagamento: 'Parcelamento',
      observacoes: `Contrato ${contrato.numero || contrato._id}`
    });
    criadas.push(lancamento);
  }
  return criadas;
};

router.get('/', async (req, res) => {
  try {
    const docs = await Orcamento.find()
      .populate('obra', 'nome')
      .populate('cliente', 'nome')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await Orcamento.findById(req.params.id).populate('obra cliente');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const doc = await Orcamento.create(pick(req.body, ['obra', 'cliente', 'descricao', 'itens', 'desconto', 'acrescimo', 'status', 'dataCriacao', 'validadeDias']));
    res.status(201).json(doc);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/:id/gerar-contrato', async (req, res) => {
  try {
    const orcamento = await Orcamento.findById(req.params.id).populate('obra cliente');
    if (!orcamento) return res.status(404).json({ error: 'Orcamento nao encontrado' });
    if (orcamento.status !== 'aprovado') return res.status(400).json({ error: 'Apenas orcamentos aprovados podem gerar contrato' });

    const baseValor = Number(orcamento.total || 0);
    const numeroParcelas = Math.max(1, Number(req.body.numeroParcelas) || 1);
    const contrato = await Contrato.create({
      numero: req.body.numero || `CTR-${Date.now()}`,
      obra: orcamento.obra?._id || orcamento.obra,
      cliente: orcamento.cliente?._id || orcamento.cliente,
      orcamento: orcamento._id,
      valorTotal: baseValor,
      numeroParcelas,
      objeto: orcamento.descricao || 'Contrato gerado a partir do orçamento',
      dataAssinatura: new Date(),
      status: 'rascunho'
    });

    if (baseValor > 0 && numeroParcelas > 1) {
      await gerarParcelasContrato({
        contrato,
        valorTotal: baseValor,
        numeroParcelas,
        obra: contrato.obra,
        cliente: contrato.cliente
      });
    }

    res.status(201).json(contrato);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const atual = await Orcamento.findById(req.params.id);
    if (!atual) return res.status(404).json({ error: 'Nao encontrado' });

    const payload = pick(req.body, ['obra', 'cliente', 'descricao', 'itens', 'desconto', 'acrescimo', 'status', 'dataCriacao', 'validadeDias']);
    if (atual.status === 'aprovado' && payload.itens) {
      delete payload.itens;
    }

    const doc = await Orcamento.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const doc = await Orcamento.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
