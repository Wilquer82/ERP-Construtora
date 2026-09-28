import express from 'express';
import Folha from '../models/Folha.js';
import Colaborador from '../models/Colaborador.js';
import Ponto from '../models/Ponto.js';
import { protect } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

// GET /api/folhas?mes=9&ano=2025
router.get('/', async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.mes) filtro.mes = Number(req.query.mes);
    if (req.query.ano) filtro.ano = Number(req.query.ano);
    const docs = await Folha.find(filtro)
      .populate('colaborador', 'nome cpf funcao')
      .populate('obra', 'nome')
      .sort({ 'colaborador.nome': 1 });
    res.json(docs);
  } catch (err) { next(err); }
});

// POST /api/folhas/gerar — gera folha para o mes corrente
router.post('/gerar', async (req, res, next) => {
  try {
    const hoje = new Date();
    const mes = req.body.mes || hoje.getMonth() + 1;
    const ano = req.body.ano || hoje.getFullYear();

    const colaboradores = await Colaborador.find({ status: 'ativo' });
    const folhasCriadas = [];

    for (const colaborador of colaboradores) {
      const valorDiaria = colaborador.tipo === 'diarista'
        ? Number(colaborador.valorDiaria) || 0
        : Math.round((Number(colaborador.salarioMensal) || 0) / 22 * 100) / 100;

      const pontos = await Ponto.find({
        colaborador: colaborador._id,
        data: {
          $gte: new Date(Date.UTC(ano, mes - 1, 1)),
          $lte: new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999))
        }
      }).select('data entrada saida');

      const diasTrabalhados = pontos.filter((p) => p.entrada && p.saida).length;
      const totalBruto = Math.round(diasTrabalhados * valorDiaria * 100) / 100;
      const adiantamentos = Number(req.body.adiantamentos?.[String(colaborador._id)] || 0);
      const totalLiquido = totalBruto - adiantamentos;

      const folha = await Folha.findOneAndUpdate(
        { colaborador: colaborador._id, mes, ano },
        {
          obra: colaborador.obraAtual,
          diasTrabalhados,
          valorDiaria,
          totalBruto,
          adiantamentos,
          totalLiquido,
          status: 'aberto'
        },
        { upsert: true, new: true, runValidators: true }
      );
      folhasCriadas.push(folha);
    }

    const populated = await Folha.find({ mes, ano })
      .populate('colaborador', 'nome cpf funcao')
      .populate('obra', 'nome');

    res.json({ mes, ano, total: populated.length, folhas: populated });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = pick(req.body, ['diasTrabalhados', 'valorDiaria', 'totalBruto', 'adiantamentos', 'totalLiquido', 'status']);
    const doc = await Folha.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Folha nao encontrada' });
    res.json(doc);
  } catch (err) { next(err); }
});

// GET /api/folhas/:mes/:ano/csv — export CSV
router.get('/:mes/:ano/csv', async (req, res, next) => {
  try {
    const mes = Number(req.params.mes);
    const ano = Number(req.params.ano);
    const folhas = await Folha.find({ mes, ano })
      .populate('colaborador', 'nome cpf funcao tipo valorDiaria salarioMensal')
      .populate('obra', 'nome')
      .sort({ 'colaborador.nome': 1 });

    const header = 'Nome,CPF,Funcao,Tipo,Diaria,Dias Trabalhados,Bruto,Adiantamentos,Liquido,Obra,Status';
    const rows = folhas.map((f) => [
      f.colaborador?.nome || '',
      f.colaborador?.cpf || '',
      f.colaborador?.funcao || '',
      f.colaborador?.tipo || '',
      (f.valorDiaria || 0).toFixed(2),
      f.diasTrabalhados || 0,
      (f.totalBruto || 0).toFixed(2),
      (f.adiantamentos || 0).toFixed(2),
      (f.totalLiquido || 0).toFixed(2),
      f.obra?.nome || '',
      f.status
    ].join(';'));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="folha-${mes}-${ano}.csv"`);
    res.send([header, ...rows].join('\n'));
  } catch (err) { next(err); }
});

// POST /api/folhas/:mes/:ano/pagar — marca todas como pagas
router.post('/:mes/:ano/pagar', async (req, res, next) => {
  try {
    const mes = Number(req.params.mes);
    const ano = Number(req.params.ano);
    const result = await Folha.updateMany(
      { mes, ano, status: 'aberto' },
      { status: 'pago' }
    );
    res.json({ ok: true, modificados: result.modifiedCount });
  } catch (err) { next(err); }
});

export default router;
