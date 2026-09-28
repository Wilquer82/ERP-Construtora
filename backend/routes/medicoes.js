import express from 'express';
import Obra from '../models/Obra.js';
import Etapa from '../models/Etapa.js';
import Medicao from '../models/Medicao.js';
import Orcamento from '../models/Orcamento.js';
import Material from '../models/Material.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

async function sugerirBaixasEstoque(obraId, etapa, quantidadeMedida) {
  const orcamentos = await Orcamento.find({ obra: obraId, status: 'aprovado' })
    .sort({ updatedAt: -1 })
    .limit(1)
    .populate('itens.materialVinculado', 'nome unidade');
  const sugestoes = new Map();
  for (const orcamento of orcamentos) {
    for (const item of orcamento.itens) {
      const material = item.materialVinculado;
      if (!material || String(item.etapa?._id || item.etapa) !== String(etapa._id)) continue;
      const quantidade = Number(item.quantidade) * quantidadeMedida / Number(etapa.quantidadeTotal);
      if (!Number.isFinite(quantidade) || quantidade < 0.0001) continue;
      const atual = sugestoes.get(String(material._id)) || {
        material: material._id,
        nome: material.nome,
        unidade: material.unidade,
        quantidade: 0
      };
      atual.quantidade += quantidade;
      sugestoes.set(String(material._id), atual);
    }
  }
  return [...sugestoes.values()].map((item) => ({
    ...item,
    quantidade: Math.round(item.quantidade * 10000) / 10000
  }));
}

router.get('/', async (req, res, next) => {
  try {
    if (!req.query.obra) return res.status(400).json({ error: 'Informe a obra para listar medicoes' });
    const docs = await Medicao.find({ obra: req.query.obra })
      .populate('etapa', 'descricao unidade')
      .sort({ data: -1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { obra, etapa, quantidade, data, observacao } = req.body;
    const quantidadeNumerica = Number(quantidade);
    if (!obra || !etapa || !Number.isFinite(quantidadeNumerica) || quantidadeNumerica <= 0) {
      return res.status(400).json({ error: 'Informe obra, etapa e quantidade positiva' });
    }
    if (!await Obra.exists({ _id: obra })) return res.status(404).json({ error: 'Obra nao encontrada' });

    const etapaAtual = await Etapa.findOne({ _id: etapa, obra });
    if (!etapaAtual) return res.status(400).json({ error: 'Etapa inexistente para esta obra' });
    const sugestoesEstoque = await sugerirBaixasEstoque(obra, etapaAtual, quantidadeNumerica);

    const etapaAtualizada = await Etapa.findOneAndUpdate(
      {
        _id: etapa,
        obra,
        $expr: { $lte: [{ $add: ['$quantidadeMedida', quantidadeNumerica] }, '$quantidadeTotal'] }
      },
      [
        { $set: {
          quantidadeMedida: { $add: ['$quantidadeMedida', quantidadeNumerica] },
          status: { $cond: [
            { $gte: [{ $add: ['$quantidadeMedida', quantidadeNumerica] }, '$quantidadeTotal'] },
            'concluida',
            'em_andamento'
          ] }
        } }
      ],
      { new: true }
    );
    if (!etapaAtualizada) return res.status(400).json({ error: 'Etapa inexistente ou quantidade acima do saldo' });

    try {
      const medicao = await Medicao.create({
        obra,
        etapa,
        quantidade: quantidadeNumerica,
        data: data || new Date(),
        responsavel: String(req.body.responsavel || req.user.nome).trim(),
        observacao: observacao ? String(observacao).trim() : undefined
      });
      await medicao.populate('etapa', 'descricao unidade');
      return res.status(201).json({ medicao, etapa: etapaAtualizada, sugestoesEstoque });
    } catch (err) {
      await Etapa.updateOne({ _id: etapa }, {
        $inc: { quantidadeMedida: -quantidadeNumerica },
        $set: { status: etapaAtualizada.quantidadeMedida === quantidadeNumerica ? 'nao_iniciada' : 'em_andamento' }
      });
      throw err;
    }
  } catch (err) { next(err); }
});

router.post('/:id/baixa-estoque', async (req, res, next) => {
  try {
    const medicao = await Medicao.findById(req.params.id);
    if (!medicao) return res.status(404).json({ error: 'Medicao nao encontrada' });
    const etapa = await Etapa.findOne({ _id: medicao.etapa, obra: medicao.obra });
    if (!etapa) return res.status(404).json({ error: 'Etapa da medicao nao encontrada' });

    const sugestoes = await sugerirBaixasEstoque(medicao.obra, etapa, medicao.quantidade);
    const sugestao = sugestoes.find((item) => String(item.material) === String(req.body.material));
    if (!sugestao) return res.status(400).json({ error: 'Material sem sugestao de baixa para esta medicao' });

    const filtro = {
      _id: sugestao.material,
      estoqueAtual: { $gte: sugestao.quantidade },
      'movimentos.medicao': { $ne: medicao._id }
    };
    const material = await Material.findOneAndUpdate(
      filtro,
      {
        $inc: { estoqueAtual: -sugestao.quantidade },
        $push: {
          movimentos: {
            tipo: 'saida',
            quantidade: sugestao.quantidade,
            obra: medicao.obra,
            medicao: medicao._id,
            observacao: `Baixa sugerida pela medicao ${medicao._id}`
          }
        }
      },
      { new: true, runValidators: true }
    );
    if (material) return res.json({ material, quantidade: sugestao.quantidade });

    const materialAtual = await Material.findById(sugestao.material);
    if (!materialAtual) return res.status(404).json({ error: 'Material nao encontrado' });
    if (materialAtual.movimentos.some((movimento) => String(movimento.medicao) === String(medicao._id))) {
      return res.json({ material: materialAtual, quantidade: sugestao.quantidade, jaBaixado: true });
    }
    return res.status(409).json({ error: 'Estoque insuficiente para a baixa sugerida' });
  } catch (err) { next(err); }
});

export default router;