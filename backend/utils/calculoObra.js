import mongoose from 'mongoose';
import { runWithTenant } from '../middleware/tenantContext.js';
import { currentTenant } from '../middleware/tenantContext.js';

const Obra = mongoose.model('Obra');
const Lancamento = mongoose.model('Lancamento');
const Ponto = mongoose.model('Ponto');
const Material = mongoose.model('Material');
const Etapa = mongoose.model('Etapa');

async function recalcularObraInternal(obraId) {
  const obra = await Obra.findById(obraId).select('empresa nome codigo valorOrcamento custoRealizado.receitaRealizada receitaRealizada receitaAReceber lucroReal margemPercentual percentualFisico percentualFinanceiro');
  if (!obra) return null;

  const empresaId = String(obra.empresa);

  // 1. MÃO DE OBRA = soma do ponto CONFIRMADO vinculado à obra
  const pontoResult = await Ponto.aggregate([
    { $match: { obra: obra._id, status: 'confirmado', empresa: mongoose.Types.ObjectId(empresaId) } },
    { $group: { _id: null, total: { $sum: '$valorCalculado' } } }
  ]);
  obra.custoRealizado.maoDeObra = pontoResult[0]?.total || 0;

  // 2. MATERIAIS = soma das SAÍDAS de estoque para esta obra
  const materialResult = await Material.aggregate([
    { $match: { empresa: mongoose.Types.ObjectId(empresaId) } },
    { $unwind: '$movimentos' },
    { $match: { 'movimentos.obra': obra._id, 'movimentos.tipo': 'saida' } },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$movimentos.valorTotal', 0] } } } }
  ]);
  obra.custoRealizado.materiais = materialResult[0]?.total || 0;

  // 3. VEÍCULOS = 0 (implementado na PARTE 2 — Abastecimento)
  obra.custoRealizado.veiculos = 0;

  // 4. INDIRETOS = lançamentos de categoria 'indireto' pagos
  const indiretosResult = await Lancamento.aggregate([
    { $match: { obra: obra._id, empresa: mongoose.Types.ObjectId(empresaId), categoria: 'indireto', status: 'pago' } },
    { $group: { _id: null, total: { $sum: '$valor' } } }
  ]);
  obra.custoRealizado.indiretos = indiretosResult[0]?.total || 0;

  // 5. COMBUSTÍVEL = soma dos LancamentoFoto confirmados
  const LancamentoFoto = mongoose.model('LancamentoFoto');
  const combustivelResult = await LancamentoFoto.aggregate([
    { $match: { obraConfirmada: obra._id, empresa: mongoose.Types.ObjectId(empresaId), status: 'confirmado' } },
    { $group: { _id: null, total: { $sum: '$valor' } } }
  ]);
  obra.custoRealizado.combustivel = combustivelResult[0]?.total || 0;

  // Total de custos
  const c = obra.custoRealizado;
  obra.custoRealizado.total =
    Number(c.maoDeObra) + Number(c.materiais) + Number(c.veiculos) +
    Number(c.combustivel) + Number(c.indiretos);

  // Receita
  const receitaPagasResult = await Lancamento.aggregate([
    { $match: { obra: obra._id, empresa: mongoose.Types.ObjectId(empresaId), tipo: 'receber', status: 'pago' } },
    { $group: { _id: null, total: { $sum: '$valor' } } }
  ]);
  obra.receitaRealizada = receitaPagasResult[0]?.total || 0;

  const receitaPendentesResult = await Lancamento.aggregate([
    { $match: { obra: obra._id, empresa: mongoose.Types.ObjectId(empresaId), tipo: 'receber', status: { $in: ['pendente', 'atrasado'] } } },
    { $group: { _id: null, total: { $sum: '$valor' } } }
  ]);
  obra.receitaAReceber = receitaPendentesResult[0]?.total || 0;

  // Lucro e margem
  obra.lucroReal = Number(obra.receitaRealizada) - Number(obra.custoRealizado.total);
  obra.margemPercentual = obra.receitaRealizada > 0
    ? Math.round((obra.lucroReal / obra.receitaRealizada) * 100)
    : 0;

  // % Financeiro (recebido / valorOrcamento)
  obra.percentualFinanceiro = obra.valorOrcamento > 0
    ? Math.round((obra.receitaRealizada / obra.valorOrcamento) * 100)
    : 0;

  // % Físico — soma do pesoFisicoPercent das etapas concluídas
  const etapas = await Etapa.find({ obra: obra._id, empresa: mongoose.Types.ObjectId(empresaId) });
  let pesoTotal = 0;
  for (const etapa of etapas) {
    if (etapa.status === 'concluida') {
      const peso = Number(etapa.pesoFisicoPercent) || 0;
      if (peso > 0) {
        pesoTotal += peso;
      } else {
        const total = Number(etapa.quantidadeTotal) || 0;
        if (total > 0) {
          pesoTotal += Math.min(100, Math.round((Number(etapa.quantidadeMedida) / total) * 100));
        }
      }
    }
  }
  obra.percentualFisico = Math.min(100, pesoTotal);

  await obra.save();
  return obra;
}

export function recalcularObra(obraId) {
  return async () => {
    const ctx = currentTenant();
    if (ctx && !ctx.bypass && ctx.empresaId) {
      return recalcularObraInternal(obraId);
    }

    // Busca empresa e usa bypass para recalcular fora de contexto de rota
    const obra = await Obra.findById(obraId).select('empresa');
    if (!obra) return null;
    return runWithTenant({ empresaId: String(obra.empresa), bypass: true }, () =>
      recalcularObraInternal(obraId)
    );
  };
}

export { recalcularObraInternal };
