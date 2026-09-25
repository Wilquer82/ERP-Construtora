import express from 'express';
import Obra from '../models/Obra.js';
import Etapa from '../models/Etapa.js';
import Medicao from '../models/Medicao.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.post('/', async (req, res) => {
  try {
    const { obra, etapa, quantidade, data, observacao } = req.body;
    const quantidadeNumerica = Number(quantidade);
    if (!obra || !etapa || !Number.isFinite(quantidadeNumerica) || quantidadeNumerica <= 0) {
      return res.status(400).json({ error: 'Informe obra, etapa e quantidade positiva' });
    }
    if (!await Obra.exists({ _id: obra })) return res.status(404).json({ error: 'Obra nao encontrada' });

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
      return res.status(201).json({ medicao, etapa: etapaAtualizada });
    } catch (err) {
      await Etapa.updateOne({ _id: etapa }, {
        $inc: { quantidadeMedida: -quantidadeNumerica },
        $set: { status: etapaAtualizada.quantidadeMedida === quantidadeNumerica ? 'nao_iniciada' : 'em_andamento' }
      });
      throw err;
    }
  } catch (err) { res.status(400).json({ error: err.message }); }
});

export default router;