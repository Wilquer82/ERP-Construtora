import Etapa from '../models/Etapa.js';
import Orcamento from '../models/Orcamento.js';
import Lancamento from '../models/Lancamento.js';

export async function incluirProgressoObras(obras) {
  if (!obras.length) return [];
  const ids = obras.map((obra) => obra._id);
  const [totais, orcamentos, consumos] = await Promise.all([
    Etapa.aggregate([
      { $match: { obra: { $in: ids } } },
      {
        $group: {
          _id: '$obra',
          realizado: { $sum: { $multiply: ['$quantidadeMedida', '$precoUnitario'] } },
          previsto: { $sum: { $multiply: ['$quantidadeTotal', '$precoUnitario'] } }
        }
      }
    ]),
    Orcamento.find({ obra: { $in: ids }, status: 'aprovado' })
      .select('obra itens desconto acrescimo updatedAt')
      .sort({ updatedAt: -1 }),
    Lancamento.aggregate([
      { $match: { obra: { $in: ids }, tipo: 'pagar', status: 'pago' } },
      { $group: { _id: '$obra', total: { $sum: '$valor' } } }
    ])
  ]);
  const porObra = new Map(totais.map((total) => [String(total._id), total]));
  const orcamentoPorObra = new Map();
  for (const orcamento of orcamentos) {
    const key = String(orcamento.obra);
    if (orcamentoPorObra.has(key)) continue;
    const totalItens = orcamento.itens.reduce((total, item) => (
      total + Number(item.quantidade || 0) * Number(item.custoUnitario || 0)
    ), 0);
    orcamentoPorObra.set(key, Math.max(0, totalItens - Number(orcamento.desconto || 0) + Number(orcamento.acrescimo || 0)));
  }
  const consumoPorObra = new Map(consumos.map((item) => [String(item._id), Number(item.total) || 0]));
  return obras.map((obra) => {
    const total = porObra.get(String(obra._id));
    const percentualConclusao = total?.previsto
      ? Math.min(100, Math.round((total.realizado / total.previsto) * 10000) / 100)
      : 0;
    const valorOrcamento = orcamentoPorObra.get(String(obra._id)) ?? (Number(obra.valorOrcamento) || 0);
    const valorConsumido = consumoPorObra.get(String(obra._id)) || 0;
    const percentualFinanceiro = valorOrcamento > 0
      ? Math.round((valorConsumido / valorOrcamento) * 10000) / 100
      : 0;
    return {
      ...obra.toObject(),
      percentualConclusao,
      percentualFinanceiro,
      valorOrcamentoComparativo: valorOrcamento,
      valorConsumido
    };
  });
}