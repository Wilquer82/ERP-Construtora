import express from 'express';
import Obra from '../models/Obra.js';
import Lancamento from '../models/Lancamento.js';
import Cliente from '../models/Cliente.js';
import Contrato from '../models/Contrato.js';
import Material from '../models/Material.js';
import { incluirProgressoObras } from '../utils/progressoObra.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

const formatarMes = (date) => new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(date).replace('.', '');

router.get('/fluxo-caixa', async (req, res) => {
  try {
    const inicio = new Date();
    inicio.setDate(1);
    inicio.setHours(0, 0, 0, 0);

    const meses = Array.from({ length: 6 }, (_, indice) => {
      const data = new Date(inicio.getFullYear(), inicio.getMonth() + indice, 1);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      return { chave, label: formatarMes(data), inicio: new Date(data.getFullYear(), data.getMonth(), 1), fim: new Date(data.getFullYear(), data.getMonth() + 1, 0, 23, 59, 59, 999) };
    });

    const lancamentos = await Lancamento.find({
      status: { $ne: 'pago' },
      dataVencimento: {
        $gte: meses[0].inicio,
        $lte: meses[meses.length - 1].fim
      }
    }).select('tipo valor dataVencimento');

    const mapa = Object.fromEntries(meses.map((mes) => [mes.chave, { mes: mes.label, aPagar: 0, aReceber: 0 }]));

    for (const item of lancamentos) {
      const chave = `${item.dataVencimento.getFullYear()}-${String(item.dataVencimento.getMonth() + 1).padStart(2, '0')}`;
      if (!mapa[chave]) continue;
      if (item.tipo === 'pagar') mapa[chave].aPagar += Number(item.valor) || 0;
      if (item.tipo === 'receber') mapa[chave].aReceber += Number(item.valor) || 0;
    }

    res.json(meses.map((mes) => ({
      mes: mes.label,
      aPagar: mapa[mes.chave]?.aPagar || 0,
      aReceber: mapa[mes.chave]?.aReceber || 0
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/resumo -> indicadores para a tela inicial
router.get('/resumo', async (req, res) => {
  try {
    const [totalObras, totalClientes, totalContratos, aPagar, aReceber, materiaisAbaixo, materiaisBaixo, obrasPorStatus, obrasRecentes] = await Promise.all([
      Obra.countDocuments(),
      Cliente.countDocuments(),
      Contrato.countDocuments(),
      Lancamento.aggregate([
        { $match: { tipo: 'pagar', status: { $ne: 'pago' } } },
        { $group: { _id: null, total: { $sum: '$valor' } } }
      ]),
      Lancamento.aggregate([
        { $match: { tipo: 'receber', status: { $ne: 'pago' } } },
        { $group: { _id: null, total: { $sum: '$valor' } } }
      ]),
      Material.find({ $expr: { $lt: ['$estoqueAtual', '$estoqueMinimo'] } }).countDocuments(),
      Material.find({ $expr: { $lt: ['$estoqueAtual', '$estoqueMinimo'] } }).sort({ nome: 1 }).select('nome estoqueAtual estoqueMinimo'),
      Obra.aggregate([
        { $group: { _id: '$status', total: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      incluirProgressoObras(await Obra.find().populate('cliente', 'nome').sort({ createdAt: -1 }).limit(5))
    ]);

    const obrasConclusao = await incluirProgressoObras(await Obra.find().populate('cliente', 'nome').sort({ createdAt: -1 }));

    res.json({
      totalObras,
      totalClientes,
      totalContratos,
      aPagar: aPagar[0]?.total || 0,
      aReceber: aReceber[0]?.total || 0,
      saldoPrevisto: (aReceber[0]?.total || 0) - (aPagar[0]?.total || 0),
      materiaisAbaixo,
      materiaisAbaixoLista: materiaisBaixo.map((item) => ({
        nome: item.nome,
        estoqueAtual: Number(item.estoqueAtual) || 0,
        estoqueMinimo: Number(item.estoqueMinimo) || 0,
        falta: Math.max(0, (Number(item.estoqueMinimo) || 0) - (Number(item.estoqueAtual) || 0))
      })),
      obrasRecentes,
      obrasPorStatus: obrasPorStatus.map((item) => ({
        status: item._id || 'sem_status',
        total: item.total
      })),
      obrasConclusao: obrasConclusao.map((obra) => ({
        _id: obra._id,
        nome: obra.nome,
        percentualConclusao: Number(obra.percentualConclusao) || 0
      }))
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
