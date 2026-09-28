import express from 'express';
import Lembrete from '../models/Lembrete.js';
import Lancamento from '../models/Lancamento.js';
import Certidao from '../models/Certidao.js';
import Colaborador from '../models/Colaborador.js';
import { protect } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

// GET /api/lembretes?categoria=rh&status=pendente
router.get('/', async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.categoria) filtro.categoria = req.query.categoria;
    if (req.query.status) filtro.status = req.query.status;
    if (req.query.dataInicio && req.query.dataFim) {
      filtro.data = {
        $gte: new Date(req.query.dataInicio),
        $lte: new Date(req.query.dataFim)
      };
    }
    const docs = await Lembrete.find(filtro)
      .populate('responsavel', 'nome')
      .sort({ data: 1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Lembrete.findById(req.params.id).populate('responsavel', 'nome');
    if (!doc) return res.status(404).json({ error: 'Lembrete nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = pick(req.body, ['titulo', 'data', 'categoria', 'prioridade', 'referenciaId', 'referenciaModel', 'responsavel', 'observacoes', 'autoGerado']);
    if (!payload.titulo || !payload.data || !payload.categoria) {
      return res.status(400).json({ error: 'titulo, data e categoria sao obrigatorios' });
    }
    const doc = await Lembrete.create(payload);
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = pick(req.body, ['titulo', 'data', 'categoria', 'prioridade', 'status', 'observacoes']);
    const doc = await Lembrete.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Lembrete nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await Lembrete.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Lembrete nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/lembretes/gerar — gera lembretes automaticos
router.get('/gerar', async (req, res, next) => {
  try {
    const hoje = new Date();
    const daqui30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daqui7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
    const daqui3Dias = new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Contas a pagar vencendo em ate 7 dias ou atrasadas
    const contasVencendo = await Lancamento.find({
      tipo: 'pagar',
      status: 'pendente',
      dataVencimento: { $lte: daqui7Dias }
    }).select('descricao dataVencimento valor');

    for (const conta of contasVencendo) {
      const prioridade = new Date(conta.dataVencimento) <= hoje ? 'critico' : 'atencao';
      const titulo = new Date(conta.dataVencimento) <= hoje
        ? `Conta a pagar VENCIDA: ${conta.descricao}`
        : `Conta a pagar vence em ${Math.ceil((new Date(conta.dataVencimento) - hoje) / (24 * 60 * 60 * 1000))} dia(s): ${conta.descricao}`;
      await Lembrete.updateOne(
        { titulo, categoria: 'financeiro', referenciaId: conta._id, status: 'pendente' },
        {
          $setOnInsert: {
            data: conta.dataVencimento,
            prioridade,
            categoria: 'financeiro',
            referenciaId: conta._id,
            referenciaModel: 'Lancamento',
            autoGerado: true
          }
        },
        { upsert: true }
      );
    }

    // Contas a receber atrasadas
    const contasReceberAtrasadas = await Lancamento.find({
      tipo: 'receber',
      status: 'atrasado',
      dataVencimento: { $lte: hoje }
    }).select('descricao dataVencimento valor');

    for (const conta of contasReceberAtrasadas) {
      await Lembrete.updateOne(
        { titulo: `Conta a receber ATRASADA: ${conta.descricao}`, categoria: 'financeiro', referenciaId: conta._id, status: 'pendente' },
        {
          $setOnInsert: {
            data: conta.dataVencimento,
            prioridade: 'critico',
            categoria: 'financeiro',
            referenciaId: conta._id,
            referenciaModel: 'Lancamento',
            autoGerado: true
          }
        },
        { upsert: true }
      );
    }

    // Certidões vencendo em ate 30 dias
    const certidoesVencendo = await Certidao.find({
      dataVencimento: { $lte: daqui30Dias },
      status: { $in: ['valida', 'vence_em_breve'] }
    }).select('nome dataVencimento tipo');

    for (const certidao of certidoesVencendo) {
      const prioridade = new Date(certidao.dataVencimento) <= hoje ? 'critico' :
        new Date(certidao.dataVencimento) <= daqui3Dias ? 'critico' : 'atencao';
      const titulo = `Certidão ${certidao.tipo}: ${certidao.nome} vence em ${Math.ceil((new Date(certidao.dataVencimento) - hoje) / (24 * 60 * 60 * 1000))} dia(s)`;
      await Lembrete.updateOne(
        { titulo, categoria: 'obras', referenciaId: certidao._id, status: 'pendente' },
        {
          $setOnInsert: {
            data: certidao.dataVencimento,
            prioridade,
            categoria: 'obras',
            referenciaId: certidao._id,
            referenciaModel: 'Certidao',
            autoGerado: true
          }
        },
        { upsert: true }
      );
    }

    res.json({ ok: true, gerados: contasVencendo.length + contasReceberAtrasadas.length + certidoesVencendo.length });
  } catch (err) { next(err); }
});

export default router;
