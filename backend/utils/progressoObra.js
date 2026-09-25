import Etapa from '../models/Etapa.js';

export async function incluirProgressoObras(obras) {
  if (!obras.length) return [];
  const totais = await Etapa.aggregate([
    { $match: { obra: { $in: obras.map((obra) => obra._id) } } },
    {
      $group: {
        _id: '$obra',
        realizado: { $sum: { $multiply: ['$quantidadeMedida', '$precoUnitario'] } },
        previsto: { $sum: { $multiply: ['$quantidadeTotal', '$precoUnitario'] } }
      }
    }
  ]);
  const porObra = new Map(totais.map((total) => [String(total._id), total]));
  return obras.map((obra) => {
    const total = porObra.get(String(obra._id));
    const percentualConclusao = total?.previsto
      ? Math.min(100, Math.round((total.realizado / total.previsto) * 10000) / 100)
      : 0;
    return { ...obra.toObject(), percentualConclusao };
  });
}