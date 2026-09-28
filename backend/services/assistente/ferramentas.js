import Lancamento from '../../models/Lancamento.js';
import Obra from '../../models/Obra.js';
import Contrato from '../../models/Contrato.js';
import Certidao from '../../models/Certidao.js';
import Colaborador from '../../models/Colaborador.js';
import Etapa from '../../models/Etapa.js';
import { incluirProgressoObras } from '../../utils/progressoObra.js';

const fmtMoeda = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

export async function resumoDoDia() {
  const [contasPagar, contasReceber, etapas, obras, certidoes, documentos] = await Promise.all([
    contasAPagarVencendo(7),
    contasAReceberAtrasadas(),
    etapasVencendo(5),
    obrasAtrasadas(),
    certidoesVencendo(15),
    documentosRHVencendo()
  ]);

  return {
    contasPagar,
    contasReceber,
    etapas,
    obras,
    certidoes,
    documentos,
    totalAlertas: contasPagar.itens.length + contasReceber.itens.length + etapas.itens.length + obras.itens.length + certidoes.itens.length + documentos.itens.length
  };
}

export async function contasAPagarVencendo(dias = 7) {
  const hoje = new Date();
  const limite = new Date();
  limite.setUTCDate(limite.getUTCDate() + dias);
  limite.setUTCHours(23, 59, 59, 999);

  const lancamentos = await Lancamento.find({
    tipo: 'pagar',
    status: { $ne: 'pago' },
    dataVencimento: { $gte: hoje, $lte: limite }
  })
    .populate('obra', 'nome codigo')
    .populate('fornecedorVinculado', 'nome')
    .select('descricao valor dataVencimento status categoria obra fornecedor fornecedorVinculado')
    .sort({ dataVencimento: 1 });

  const fontes = lancamentos.map((l) => ({
    tipo: 'lancamento',
    referenciaId: l._id,
    nome: l.descricao
  }));

  return {
    fontes,
    itens: lancamentos.map((l) => ({
      _id: l._id,
      fornecedor: l.fornecedor || l.fornecedorVinculado?.nome || 'Não informado',
      valor: fmtMoeda(l.valor),
      dataVencimento: l.dataVencimento,
      diasVencimento: Math.ceil((l.dataVencimento - hoje) / 86400000),
      status: l.status,
      obra: l.obra?.nome || '',
      categoria: l.categoria || ''
    }))
  };
}

export async function contasAReceberAtrasadas() {
  const hoje = new Date();

  const lancamentos = await Lancamento.find({
    tipo: 'receber',
    status: { $in: ['pendente', 'atrasado'] },
    dataVencimento: { $lt: hoje }
  })
    .populate('obra', 'nome codigo')
    .populate('cliente', 'nome')
    .select('descricao valor dataVencimento status categoria obra cliente')
    .sort({ dataVencimento: 1 });

  const fontes = lancamentos.map((l) => ({
    tipo: 'lancamento',
    referenciaId: l._id,
    nome: l.descricao
  }));

  return {
    fontes,
    itens: lancamentos.map((l) => ({
      _id: l._id,
      cliente: l.cliente?.nome || l.obra?.nome || 'Não informado',
      valor: fmtMoeda(l.valor),
      dataVencimento: l.dataVencimento,
      diasAtraso: Math.abs(Math.floor((hoje - l.dataVencimento) / 86400000)),
      status: l.status
    }))
  };
}

export async function etapasVencendo(dias = 15) {
  const hoje = new Date();
  const limite = new Date();
  limite.setUTCDate(limite.getUTCDate() + dias);
  limite.setUTCHours(23, 59, 59, 999);

  const etapas = await Etapa.find({
    status: { $ne: 'concluida' },
    prazoEntrega: { $gte: hoje, $lte: limite }
  })
    .populate('obra', 'nome codigo')
    .populate('contrato', 'numero')
    .select('descricao unidade quantidadeTotal quantidadeMedida precoUnitario status')
    .sort({ prazoEntrega: 1 });

  const fontes = etapas.map((e) => ({
    tipo: 'etapa',
    referenciaId: e._id,
    nome: e.descricao
  }));

  return {
    fontes,
    itens: etapas.map((e) => ({
      _id: e._id,
      contrato: e.contrato?.numero || '',
      obra: e.obra?.nome || '',
      descricao: e.descricao,
      dataPrevista: e.prazoEntrega,
      valor: fmtMoeda(e.precoUnitario * e.quantidadeTotal),
      diasRestantes: Math.ceil((e.prazoEntrega - hoje) / 86400000)
    }))
  };
}

export async function obrasAtrasadas() {
  const hoje = new Date();

  const obras = await Obra.find({
    status: 'em_andamento',
    dataPrevisaoFim: { $exists: true, $ne: null }
  }).select('nome codigo status valorOrcamento dataInicio dataPrevisaoFim');

  const obrasProgresso = await incluirProgressoObras(obras);

  const atrasadas = obrasProgresso.filter((obra) => {
    const fim = obra.dataPrevisaoFim ? new Date(obra.dataPrevisaoFim).getTime() : 0;
    if (!fim || fim >= Date.now()) return false;
    const inicio = obra.dataInicio ? new Date(obra.dataInicio).getTime() : 0;
    if (!inicio || Date.now() <= inicio) return false;
    const esperado = Math.min(100, ((Date.now() - inicio) / (fim - inicio)) * 100);
    const atraso = esperado - (Number(obra.percentualConclusao) || 0);
    return atraso > 5;
  });

  const fontes = atrasadas.map((o) => ({
    tipo: 'obra',
    referenciaId: o._id,
    nome: o.nome
  }));

  return {
    fontes,
    itens: atrasadas.map((o) => ({
      _id: o._id,
      nome: o.nome,
      codigo: o.codigo,
      percentualConclusao: o.percentualConclusao || 0,
      percentualFinanceiro: o.percentualFinanceiro || 0,
      dataPrevisaoFim: o.dataPrevisaoFim,
      atrasoDias: Math.ceil((hoje - new Date(o.dataPrevisaoFim)) / 86400000)
    }))
  };
}

export async function certidoesVencendo(dias = 30) {
  const hoje = new Date();
  const limite = new Date();
  limite.setUTCDate(limite.getUTCDate() + dias);

  const certidoes = await Certidao.find({
    dataVencimento: { $gte: hoje, $lte: limite }
  }).sort({ dataVencimento: 1 });

  const fontes = certidoes.map((c) => ({
    tipo: 'certidao',
    referenciaId: c._id,
    nome: c.nome
  }));

  return {
    fontes,
    itens: certidoes.map((c) => ({
      _id: c._id,
      tipo: c.tipo,
      nome: c.nome,
      dataVencimento: c.dataVencimento,
      diasRestantes: Math.ceil((c.dataVencimento - hoje) / 86400000)
    }))
  };
}

export async function documentosRHVencendo() {
  const hoje = new Date();
  const limite = new Date();
  limite.setUTCDate(limite.getUTCDate() + 30);

  const colaboradores = await Colaborador.find({ status: 'ativo' })
    .select('nome funcao documentos')
    .sort({ nome: 1 });

  const itens = [];
  const fontes = [];

  for (const col of colaboradores) {
    for (const doc of (col.documentos || [])) {
      if (!doc.validade) continue;
      const validade = new Date(doc.validade);
      const diff = Math.ceil((validade - hoje) / 86400000);
      if (diff <= 30) {
        const status = doc.status || (diff < 0 ? 'vencido' : diff <= 7 ? 'vence_em_breve' : 'atencao');
        itens.push({
          _id: col._id,
          colaborador: col.nome,
          funcao: col.funcao,
          tipoDoc: doc.tipo,
          nomeDoc: doc.nome,
          dataValidade: doc.validade,
          status,
          diasRestantes: diff
        });
        fontes.push({
          tipo: 'colaborador',
          referenciaId: col._id,
          nome: `${col.nome} — ${doc.nome}`
        });
      }
    }
  }

  itens.sort((a, b) => a.diasRestantes - b.diasRestantes);

  return { fontes, itens };
}

export async function medicoesPendentes() {
  const etapas = await Etapa.find({ status: { $in: ['nao_iniciada', 'em_andamento'] } })
    .populate('obra', 'nome codigo')
    .select('descricao quantidadeTotal quantidadeMedida unidade')
    .sort({ createdAt: 1 });

  const fontes = etapas.map((e) => ({
    tipo: 'etapa',
    referenciaId: e._id,
    nome: `${e.obra?.nome || ''} — ${e.descricao}`
  }));

  return {
    fontes,
    itens: etapas.map((e) => ({
      _id: e._id,
      obra: e.obra?.nome || '',
      etapa: e.descricao,
      unidade: e.unidade,
      total: e.quantidadeTotal,
      medido: e.quantidadeMedida,
      faltando: Number(e.quantidadeTotal) - Number(e.quantidadeMedida),
      percentual: Number(e.quantidadeTotal) > 0 ? Math.round((e.quantidadeMedida / e.quantidadeTotal) * 100) : 0
    }))
  };
}
