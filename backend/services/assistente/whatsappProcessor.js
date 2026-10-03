import { LLMService, FERRAMENTAS_DISPONIVEIS, SYSTEM_PROMPT } from './LLMService.js';
import * as ferramentas from './ferramentas.js';
import Lancamento from '../../models/Lancamento.js';
import Obra from '../../models/Obra.js';
import Fornecedor from '../../models/Fornecedor.js';
import Cliente from '../../models/Cliente.js';
import Reembolso from '../../models/Reembolso.js';
import ItemReembolso from '../../models/ItemReembolso.js';
import PagamentoReembolso from '../../models/PagamentoReembolso.js';
import VinculoMovimentacao from '../../models/VinculoMovimentacao.js';
import Cheque from '../../models/Cheque.js';
import Acordo from '../../models/Acordo.js';
import ParcelaAcordo from '../../models/ParcelaAcordo.js';
import RecebivelObra from '../../models/RecebivelObra.js';
import ArquivoDocumento from '../../models/ArquivoDocumento.js';
import { processarImagemComprovante, processarImagemBoleto, processarImagemNF, processarImagemCheque, processarImagemPIX, processarImagemGenerica } from './extratorFoto.js';

const SISTEMA_WHATSAPP_PROMPT = `${SYSTEM_PROMPT}

REGRAS ADICIONAIS PARA WHATSAPP:
1. VOCÊ NÃO EXECUTA AÇÕES DIRETAMENTE. Você prepara PRÉVIAS para confirmação humana.
2. Para criar lançamentos, baixar títulos, criar reembolsos, etc. → SEMPRE gere uma PRÉVIA.
3. A PRÉVIA deve conter: modelo, dados que serão gravados, ação (criar/atualizar/baixar/cancelar).
4. Se houver ambiguidade (fornecedor não identificado, obra não clara, valor duvidoso) → PERGUNTE ao usuário.
5. NUNCA assuma dados críticos. Use "Confirmar lançamento?" antes de gravar.
6. Para comprovantes: extraia dados, sugira preenchimento, peça confirmação.
7. Para reembolsos: prepare DOIS lançamentos vinculados (Despesa + Item Reembolso) e peça UMA confirmação para ambos.

FORMATO DE RESPOSTA QUANDO REQUER CONFIRMAÇÃO:
{
  "resposta": "Texto para o usuário explicando o que foi entendido e pedindo confirmação",
  "requerConfirmacao": true,
  "previas": [
    {
      "modelo": "Lancamento",
      "dados": { ... },
      "acao": "criar"
    }
  ],
  "ferramentasUsadas": [],
  "fontes": []
}

FORMATO DE RESPOSTA QUANDO É SÓ CONSULTA:
{
  "resposta": "Texto com a resposta",
  "requerConfirmacao": false,
  "previas": [],
  "ferramentasUsadas": [],
  "fontes": []
}`;

function extrairIntencao(mensagem) {
  const msg = mensagem.toLowerCase();
  if (msg.includes('pagar') || msg.includes('venc') || msg.includes('conta') || msg.includes('boleto')) return 'contas_pagar';
  if (msg.includes('receber') || msg.includes('recebimento') || msg.includes('nf') || msg.includes('nota fiscal')) return 'contas_receber';
  if (msg.includes('reembolso') || msg.includes('reembolsar')) return 'reembolso';
  if (msg.includes('cheque') || msg.includes('folha')) return 'cheque';
  if (msg.includes('acordo') || msg.includes('parcela') || msg.includes('negoci')) return 'acordo';
  if (msg.includes('obra') || msg.includes('medição') || msg.includes('medicao') || msg.includes('recebivel')) return 'recebivel_obra';
  if (msg.includes('resumo') || msg.includes('dia') || msg.includes('hoje') || msg.includes('amanhã') || msg.includes('amanha')) return 'resumo_dia';
  return 'consulta_geral';
}

async function buscarFornecedorPorNome(empresaId, nome) {
  if (!nome) return null;
  return Fornecedor.findOne({ 
    empresa: empresaId, 
    $or: [
      { nome: { $regex: new RegExp(nome, 'i') } },
      { razaoSocial: { $regex: new RegExp(nome, 'i') } }
    ]
  });
}

async function buscarObraPorNome(empresaId, nome) {
  if (!nome) return null;
  return Obra.findOne({ 
    empresa: empresaId, 
    nome: { $regex: new RegExp(nome, 'i') }
  });
}

async function buscarLancamentoPendente(empresaId, valor, fornecedor, obra, diasTolerancia = 3) {
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - diasTolerancia);
  const fim = new Date();
  fim.setDate(fim.getDate() + diasTolerancia);
  
  return Lancamento.findOne({
    empresa: empresaId,
    tipo: 'pagar',
    status: { $ne: 'pago' },
    valor: { $gte: valor * 0.95, $lte: valor * 1.05 },
    ...(fornecedor ? { $or: [{ fornecedor: { $regex: new RegExp(fornecedor, 'i') } }, { fornecedorVinculado: fornecedor._id }] } : {}),
    ...(obra ? { obra: obra._id } : {}),
    dataVencimento: { $gte: inicio, $lte: fim }
  }).populate('obra').populate('fornecedorVinculado');
}

export async function processarMensagemIA({ empresaId, usuarioWhatsAppId, mensagem, perfil, permissoes, anexo }) {
  const intencao = extrairIntencao(mensagem);
  
  // Se tem anexo, processa a imagem primeiro
  let dadosExtraidos = null;
  if (anexo?.url) {
    try {
      if (anexo.type === 'document' || mensagem.includes('boleto')) {
        dadosExtraidos = await processarImagemBoleto(anexo.url);
      } else if (anexo.type === 'image' || mensagem.includes('nota') || mensagem.includes('nf')) {
        dadosExtraidos = await processarImagemNF(anexo.url);
      } else if (mensagem.includes('cheque')) {
        dadosExtraidos = await processarImagemCheque(anexo.url);
      } else if (mensagem.includes('pix')) {
        dadosExtraidos = await processarImagemPIX(anexo.url);
      } else {
        dadosExtraidos = await processarImagemGenerica(anexo.url);
      }
      
      // Salva arquivo
      await ArquivoDocumento.create({
        empresa: empresaId,
        nomeOriginal: `whatsapp-${Date.now()}`,
        tipoMime: anexo.type || 'application/octet-stream',
        tamanho: 0,
        url: anexo.url,
        entidadeTipo: 'interacao_ia',
        entidadeId: usuarioWhatsAppId,
        processadoPorIA: true,
        dadosExtraidos
      });
    } catch (error) {
      console.error('[IA] Erro ao processar anexo:', error);
    }
  }

  // Processa baseado na intenção
  switch (intencao) {
    case 'resumo_dia':
      return processarResumoDia(empresaId);
    
    case 'contas_pagar':
      if (anexo && dadosExtraidos) {
        return processarComprovanteDespesa(empresaId, mensagem, dadosExtraidos, perfil, permissoes);
      }
      return processarConsultaContasPagar(empresaId, mensagem);
    
    case 'contas_receber':
      if (anexo && dadosExtraidos) {
        return processarComprovanteRecebimento(empresaId, mensagem, dadosExtraidos, perfil, permissoes);
      }
      return processarConsultaContasReceber(empresaId, mensagem);
    
    case 'reembolso':
      if (anexo && dadosExtraidos) {
        return processarComprovanteReembolso(empresaId, mensagem, dadosExtraidos, perfil, permissoes);
      }
      return processarConsultaReembolsos(empresaId, mensagem);
    
    case 'cheque':
      return processarConsultaCheques(empresaId, mensagem);
    
    case 'acordo':
      return processarConsultaAcordos(empresaId, mensagem);
    
    case 'recebivel_obra':
      return processarConsultaRecebiveisObra(empresaId, mensagem);
    
    default:
      return processarConsultaGeral(empresaId, mensagem);
  }
}

async function processarResumoDia(empresaId) {
  const resumo = await ferramentas.resumoDoDia();
  
  let texto = '📋 **Resumo do Dia**\n\n';
  
  if (resumo.contasPagar.itens.length > 0) {
    texto += '🔴 **CRÍTICO — Contas a pagar:**\n';
    for (const item of resumo.contasPagar.itens.slice(0, 5)) {
      texto += `• ${item.fornecedor} — ${item.valor} → vence ${item.dataVencimento.toLocaleDateString('pt-BR')} (${item.diasVencimento}d)\n`;
    }
    texto += `Total: ${resumo.contasPagar.itens.reduce((a, b) => a + parseFloat(b.valor.replace(/[^0-9.,]/g, '').replace(',', '.')), 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}\n\n`;
  }
  
  if (resumo.etapas.itens.length > 0) {
    texto += '🟠 **URGENTE — Etapas vencendo:**\n';
    for (const item of resumo.etapas.itens.slice(0, 3)) {
      texto += `• ${item.obra} — ${item.descricao} → ${item.diasRestantes}d\n`;
    }
    texto += '\n';
  }
  
  if (resumo.certidoes.itens.length > 0) {
    texto += '🟡 **ATENÇÃO — Certidões:**\n';
    for (const item of resumo.certidoes.itens.slice(0, 3)) {
      texto += `• ${item.nome} (${item.tipo}) → ${item.diasRestantes}d\n`;
    }
    texto += '\n';
  }
  
  if (resumo.obras.itens.length > 0) {
    texto += '🟢 **Obras com atraso:**\n';
    for (const item of resumo.obras.itens.slice(0, 3)) {
      texto += `• ${item.nome} — ${item.percentualConclusao}% físico / ${item.percentualFinanceiro}% financeiro\n`;
    }
  }

  return {
    resposta: texto,
    requerConfirmacao: false,
    previas: [],
    ferramentasUsadas: ['resumoDoDia'],
    fontes: resumo.contasPagar.fontes.concat(resumo.etapas.fontes, resumo.certidoes.fontes, resumo.obras.fontes)
  };
}

async function processarConsultaContasPagar(empresaId, mensagem) {
  const msg = mensagem.toLowerCase();
  let dias = 7;
  const matchDias = msg.match(/(\d+)\s*dias?/);
  if (matchDias) dias = parseInt(matchDias[1]);
  
  let fornecedor = null;
  const matchFornecedor = msg.match(/(?:fornecedor|do|da)\s+([a-zA-ZÀ-ÿ\s]+)/i);
  if (matchFornecedor) {
    fornecedor = await buscarFornecedorPorNome(empresaId, matchFornecedor[1].trim());
  }
  
  let obra = null;
  const matchObra = msg.match(/(?:obra|na|no)\s+([a-zA-ZÀ-ÿ\s]+)/i);
  if (matchObra) {
    obra = await buscarObraPorNome(empresaId, matchObra[1].trim());
  }

  const resultado = await ferramentas.contasAPagarVencendo(dias);
  
  let itens = resultado.itens;
  if (fornecedor) {
    itens = itens.filter(i => i.fornecedor.toLowerCase().includes(fornecedor.nome.toLowerCase()));
  }
  if (obra) {
    itens = itens.filter(i => i.obra && i.obra.toLowerCase().includes(obra.nome.toLowerCase()));
  }

  if (itens.length === 0) {
    return {
      resposta: 'Não encontrei contas a pagar com esses critérios.',
      requerConfirmacao: false,
      previas: [],
      ferramentasUsadas: ['contasAPagarVencendo'],
      fontes: []
    };
  }

  let texto = `🔴 **Contas a pagar${dias <= 1 ? ' (hoje)' : ` (próximos ${dias} dias)`}:**\n\n`;
  let total = 0;
  for (const item of itens.slice(0, 10)) {
    texto += `• ${item.fornecedor} — ${item.valor}`;
    if (item.obra) texto += ` (${item.obra})`;
    texto += ` → vence ${new Date(item.dataVencimento).toLocaleDateString('pt-BR')}\n`;
    total += parseFloat(item.valor.replace(/[^0-9.,]/g, '').replace(',', '.'));
  }
  texto += `\n**Total: ${total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}**`;

  return {
    resposta: texto,
    requerConfirmacao: false,
    previas: [],
    ferramentasUsadas: ['contasAPagarVencendo'],
    fontes: resultado.fontes
  };
}

async function processarComprovanteDespesa(empresaId, mensagem, dadosExtraidos, perfil, permissoes) {
  const valor = dadosExtraidos.valor || 0;
  const dataPagamento = dadosExtraidos.data ? new Date(dadosExtraidos.data) : new Date();
  const fornecedorNome = dadosExtraidos.fornecedor || '';
  
  let fornecedor = null;
  if (fornecedorNome) {
    fornecedor = await buscarFornecedorPorNome(empresaId, fornecedorNome);
  }
  
  let obra = null;
  const matchObra = mensagem.match(/(?:obra|na|no)\s+([a-zA-ZÀ-ÿ\s]+)/i);
  if (matchObra) {
    obra = await buscarObraPorNome(empresaId, matchObra[1].trim());
  }

  // Tenta encontrar lançamento correspondente
  let lancamento = await buscarLancamentoPendente(empresaId, valor, fornecedorNome, obra);
  
  if (lancamento) {
    // Prévia de baixa
    const previa = {
      modelo: 'Lancamento',
      dados: {
        _id: lancamento._id,
        status: 'pago',
        dataPagamento: dataPagamento,
        valorPago: valor,
        formaPagamento: dadosExtraidos.formaPagamento || 'pix',
        observacoes: `Baixa via WhatsApp - Comprovante: ${dadosExtraidos.numeroDocumento || 'N/A'}`
      },
      acao: 'baixar'
    };

    return {
      resposta: `Encontrei um lançamento correspondente:\n\n📋 **${lancamento.descricao}**\n💰 Valor: ${valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}\n📅 Vencimento: ${new Date(lancamento.dataVencimento).toLocaleDateString('pt-BR')}\n🏗️ Obra: ${lancamento.obra?.nome || 'Não informada'}\n👤 Fornecedor: ${lancamento.fornecedor || lancamento.fornecedorVinculado?.nome || 'Não informado'}\n\n**Dados do comprovante:**\n• Valor pago: ${valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}\n• Data: ${dataPagamento.toLocaleDateString('pt-BR')}\n• Forma: ${dadosExtraidos.formaPagamento || 'PIX'}\n\nConfirmar baixa deste lançamento?`,
      requerConfirmacao: true,
      previas: [previa],
      ferramentasUsadas: [],
      fontes: [{ tipo: 'lancamento', referenciaId: lancamento._id, nome: lancamento.descricao }]
    };
  } else {
    // Prévia de novo lançamento
    const categoria = inferirCategoria(mensagem, dadosExtraidos);
    
    const previa = {
      modelo: 'Lancamento',
      dados: {
        tipo: 'pagar',
        descricao: dadosExtraidos.descricao || `Pagamento ${fornecedorNome || 'Fornecedor'}`,
        categoria,
        valor,
        dataVencimento: dataPagamento,
        status: 'pago',
        dataPagamento,
        obra: obra?._id,
        fornecedor: fornecedorNome,
        fornecedorVinculado: fornecedor?._id,
        formaPagamento: dadosExtraidos.formaPagamento || 'pix',
        observacoes: `Lançamento criado via WhatsApp - Comprovante: ${dadosExtraidos.numeroDocumento || 'N/A'}\nComentário: ${mensagem}`
      },
      acao: 'criar'
    };

    return {
      resposta: `Não encontrei lançamento correspondente. Vou criar um novo:\n\n📋 **Novo lançamento a pagar**\n💰 Valor: ${valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}\n📅 Data pagamento: ${dataPagamento.toLocaleDateString('pt-BR')}\n🏗️ Obra: ${obra?.nome || 'Não informada (precisa confirmar)'}\n👤 Fornecedor: ${fornecedorNome || 'Não identificado (precisa confirmar)'}\n🏷️ Categoria: ${categoria}\n💳 Forma: ${dadosExtraidos.formaPagamento || 'PIX'}\n\n⚠️ **Campos que precisam de confirmação:**\n${!obra ? '• Obra/centro de custo\n' : ''}${!fornecedor ? '• Fornecedor\n' : ''}Confirmar criação deste lançamento?`,
      requerConfirmacao: true,
      previas: [previa],
      ferramentasUsadas: [],
      fontes: []
    };
  }
}

async function processarComprovanteRecebimento(empresaId, mensagem, dadosExtraidos, perfil, permissoes) {
  const valor = dadosExtraidos.valor || 0;
  const dataRecebimento = dadosExtraidos.data ? new Date(dadosExtraidos.data) : new Date();
  
  let obra = null;
  const matchObra = mensagem.match(/(?:obra|na|no)\s+([a-zA-ZÀ-ÿ\s]+)/i);
  if (matchObra) {
    obra = await buscarObraPorNome(empresaId, matchObra[1].trim());
  }

  // Busca receitas em aberto da obra
  let filtroReceita = { empresa: empresaId, tipo: 'receber', status: { $ne: 'pago' } };
  if (obra) filtroReceita.obra = obra._id;
  
  const receitasAbertas = await Lancamento.find(filtroReceita)
    .populate('obra', 'nome')
    .populate('cliente', 'nome')
    .sort({ dataVencimento: 1 });

  let receitaEncontrada = null;
  for (const r of receitasAbertas) {
    if (Math.abs(Number(r.valor) - valor) < 0.01) {
      receitaEncontrada = r;
      break;
    }
  }

  if (receitaEncontrada) {
    const previa = {
      modelo: 'Lancamento',
      dados: {
        _id: receitaEncontrada._id,
        status: 'pago',
        dataPagamento: dataRecebimento,
        valorRecebido: valor,
        formaPagamento: dadosExtraidos.formaPagamento || 'pix',
        observacoes: `Baixa via WhatsApp - Comprovante recebimento`
      },
      acao: 'baixar'
    };

    return {
      resposta: `Encontrei uma receita correspondente:\n\n📋 **${receitaEncontrada.descricao}**\n💰 Valor: ${valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}\n📅 Vencimento: ${new Date(receitaEncontrada.dataVencimento).toLocaleDateString('pt-BR')}\n🏗️ Obra: ${receitaEncontrada.obra?.nome || 'Não informada'}\n👤 Cliente: ${receitaEncontrada.cliente?.nome || 'Não informado'}\n\n**Dados do comprovante:**\n• Valor recebido: ${valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}\n• Data: ${dataRecebimento.toLocaleDateString('pt-BR')}\n\nConfirmar baixa desta receita?`,
      requerConfirmacao: true,
      previas: [previa],
      ferramentasUsadas: [],
      fontes: [{ tipo: 'lancamento', referenciaId: receitaEncontrada._id, nome: receitaEncontrada.descricao }]
    };
  } else if (obra) {
    // Prévia de novo recebimento
    const previa = {
      modelo: 'RecebivelObra',
      dados: {
        obra: obra._id,
        medicao: `Recebimento ${new Date().toLocaleDateString('pt-BR')}`,
        dataMedicao: dataRecebimento,
        valorMedicao: valor,
        dataRecebimento,
        valorRecebido: valor,
        status: 'recebido_total',
        comprovanteRecebimento: 'whatsapp',
        observacoes: `Recebimento via WhatsApp - ${mensagem}`
      },
      acao: 'criar'
    };

    return {
      resposta: `Não encontrei NF/receita em aberto correspondente. Vou criar um novo recebível:\n\n📋 **Novo recebimento de obra**\n💰 Valor: ${valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}\n📅 Data recebimento: ${dataRecebimento.toLocaleDateString('pt-BR')}\n🏗️ Obra: ${obra.nome}\n\nConfirmar criação deste recebimento?`,
      requerConfirmacao: true,
      previas: [previa],
      ferramentasUsadas: [],
      fontes: []
    };
  } else {
    return {
      resposta: 'Não consegui identificar a obra para este recebimento. Por favor, informe: "Obra [nome da obra]"',
      requerConfirmacao: false,
      previas: [],
      ferramentasUsadas: [],
      fontes: []
    };
  }
}

async function processarComprovanteReembolso(empresaId, mensagem, dadosExtraidos, perfil, permissoes) {
  const valor = dadosExtraidos.valor || 0;
  const dataDespesa = dadosExtraidos.data ? new Date(dadosExtraidos.data) : new Date();
  const beneficiario = extrairBeneficiario(mensagem);
  
  let obra = null;
  const matchObra = mensagem.match(/(?:obra|na|no)\s+([a-zA-ZÀ-ÿ\s]+)/i);
  if (matchObra) {
    obra = await buscarObraPorNome(empresaId, matchObra[1].trim());
  }

  const categoria = inferirCategoria(mensagem, dadosExtraidos);
  
  // Prévia 1: Despesa
  const previaDespesa = {
    modelo: 'Lancamento',
    dados: {
      tipo: 'pagar',
      descricao: `Reembolso - ${beneficiario || 'Beneficiário'} - ${categoria}`,
      categoria,
      valor,
      dataVencimento: dataDespesa,
      status: 'pago',
      dataPagamento: dataDespesa,
      obra: obra?._id,
      fornecedor: beneficiario || 'Reembolso',
      formaPagamento: dadosExtraidos.formaPagamento || 'pix',
      observacoes: `Despesa de reembolso via WhatsApp - ${mensagem}`
    },
    acao: 'criar'
  };

  // Prévia 2: Item Reembolso
  const previaReembolso = {
    modelo: 'ItemReembolso',
    dados: {
      reembolso: 'NOVO_REEMBOLSO', // placeholder
      dataDespesa,
      valor,
      centroCusto: obra?._id,
      categoria,
      descricao: `Reembolso ${beneficiario || ''} - ${categoria}`,
      comprovante: 'whatsapp'
    },
    acao: 'criar'
  };

  return {
    resposta: `Vou criar um reembolso com lançamento duplo vinculado:\n\n📋 **1. Despesa (Módulo 01)**\n💰 Valor: ${valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}\n📅 Data: ${dataDespesa.toLocaleDateString('pt-BR')}\n🏗️ Obra: ${obra?.nome || 'Não informada'}\n👤 Beneficiário: ${beneficiario || 'Não identificado'}\n🏷️ Categoria: ${categoria}\n\n📋 **2. Controle de Reembolso (Módulo 05)**\n• Mesmo valor, mesma data, mesma obra\n• Vinculado à despesa acima\n\n⚠️ Ambos serão criados juntos com vínculo técnico.\n\nConfirmar criação dos dois registros?`,
    requerConfirmacao: true,
    previas: [previaDespesa, previaReembolso],
    ferramentasUsadas: [],
    fontes: []
  };
}

async function processarConsultaContasReceber(empresaId, mensagem) {
  const resultado = await ferramentas.contasAReceberAtrasadas();
  
  if (resultado.itens.length === 0) {
    return {
      resposta: 'Não há contas a receber atrasadas.',
      requerConfirmacao: false,
      previas: [],
      ferramentasUsadas: ['contasAReceberAtrasadas'],
      fontes: []
    };
  }

  let texto = '🔴 **Contas a receber atrasadas:**\n\n';
  for (const item of resultado.itens.slice(0, 10)) {
    texto += `• ${item.cliente} — ${item.valor} → ${item.diasAtraso}d de atraso\n`;
  }

  return {
    resposta: texto,
    requerConfirmacao: false,
    previas: [],
    ferramentasUsadas: ['contasAReceberAtrasadas'],
    fontes: resultado.fontes
  };
}

async function processarConsultaReembolsos(empresaId, mensagem) {
  const reembolsos = await Reembolso.find({ empresa: empresaId, status: { $ne: 'quitado' } })
    .populate('centroCusto', 'nome')
    .sort({ createdAt: -1 })
    .limit(10);

  if (reembolsos.length === 0) {
    return {
      resposta: 'Não há reembolsos em aberto.',
      requerConfirmacao: false,
      previas: [],
      ferramentasUsadas: [],
      fontes: []
    };
  }

  let texto = '📋 **Reembolsos em aberto:**\n\n';
  for (const r of reembolsos) {
    const saldo = Number(r.valorTotal) - Number(r.valorPago);
    texto += `• ${r.beneficiario} — ${saldo.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} (${r.status})\n`;
    if (r.centroCusto) texto += `  Obra: ${r.centroCusto.nome}\n`;
  }

  return {
    resposta: texto,
    requerConfirmacao: false,
    previas: [],
    ferramentasUsadas: [],
    fontes: reembolsos.map(r => ({ tipo: 'reembolso', referenciaId: r._id, nome: r.beneficiario }))
  };
}

async function processarConsultaCheques(empresaId, mensagem) {
  const msg = mensagem.toLowerCase();
  let filtro = { empresa: empresaId };
  if (msg.includes('atraso') || msg.includes('vencid')) filtro.status = 'em_atraso';
  if (msg.includes('devolv')) filtro.status = 'devolvido';
  
  const cheques = await Cheque.find(filtro)
    .populate('centroCusto', 'nome')
    .sort({ dataVencimento: 1 })
    .limit(20);

  if (cheques.length === 0) {
    return { resposta: 'Nenhum cheque encontrado.', requerConfirmacao: false, previas: [], ferramentasUsadas: [], fontes: [] };
  }

  let texto = '📋 **Cheques:**\n\n';
  for (const c of cheques) {
    texto += `• Folha ${c.numeroFolha} — ${c.favorecido} — ${c.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} → ${c.status} (venc: ${new Date(c.dataVencimento).toLocaleDateString('pt-BR')})\n`;
    if (c.centroCusto) texto += `  Obra: ${c.centroCusto.nome}\n`;
  }

  return { resposta: texto, requerConfirmacao: false, previas: [], ferramentasUsadas: [], fontes: cheques.map(c => ({ tipo: 'cheque', referenciaId: c._id, nome: `Folha ${c.numeroFolha}` })) };
}

async function processarConsultaAcordos(empresaId, mensagem) {
  const acordos = await Acordo.find({ empresa: empresaId, status: { $ne: 'quitado' } })
    .populate('fornecedorVinculado', 'nome')
    .populate('centroCusto', 'nome')
    .sort({ createdAt: -1 })
    .limit(10);

  if (acordos.length === 0) {
    return { resposta: 'Nenhum acordo em aberto.', requerConfirmacao: false, previas: [], ferramentasUsadas: [], fontes: [] };
  }

  let texto = '📋 **Acordos em aberto:**\n\n';
  for (const a of acordos) {
    const saldo = Number(a.valorTotalAcordo) - Number(a.valorPago);
    texto += `• ${a.fornecedor || a.fornecedorVinculado?.nome} — ${saldo.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} (${a.status})\n`;
  }

  return { resposta: texto, requerConfirmacao: false, previas: [], ferramentasUsadas: [], fontes: acordos.map(a => ({ tipo: 'acordo', referenciaId: a._id, nome: a.fornecedor })) };
}

async function processarConsultaRecebiveisObra(empresaId, mensagem) {
  let obra = null;
  const matchObra = mensagem.match(/(?:obra|na|no)\s+([a-zA-ZÀ-ÿ\s]+)/i);
  if (matchObra) {
    obra = await buscarObraPorNome(empresaId, matchObra[1].trim());
  }

  let filtro = { empresa: empresaId };
  if (obra) filtro.obra = obra._id;
  
  const recebiveis = await RecebivelObra.find(filtro)
    .populate('obra', 'nome codigo')
    .populate('contrato', 'numero')
    .sort({ dataMedicao: -1 })
    .limit(20);

  if (recebiveis.length === 0) {
    return { resposta: obra ? `Nenhum recebível para a obra ${obra.nome}.` : 'Nenhum recebível encontrado.', requerConfirmacao: false, previas: [], ferramentasUsadas: [], fontes: [] };
  }

  let texto = `📋 **Recebíveis${obra ? ` da obra ${obra.nome}` : ''}:**\n\n`;
  for (const r of recebiveis) {
    const status = r.status === 'recebido_total' ? '✅' : r.status === 'recebido_parcial' ? '⏳' : '⏰';
    texto += `${status} Medição ${r.medicao} — ${r.valorMedicao.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} | Recebido: ${r.valorRecebido.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} | ${r.status}\n`;
  }

  return { resposta: texto, requerConfirmacao: false, previas: [], ferramentasUsadas: [], fontes: recebiveis.map(r => ({ tipo: 'recebivel_obra', referenciaId: r._id, nome: r.medicao })) };
}

async function processarConsultaGeral(empresaId, mensagem) {
  // Usa ferramentas disponíveis para responder
  const resumo = await ferramentas.resumoDoDia();
  
  let texto = '🤖 **Assistente Financeiro**\n\n';
  texto += 'Posso ajudar com:\n';
  texto += '• "O que tenho para pagar hoje/esta semana?"\n';
  texto += '• "Contas atrasadas"\n';
  texto += '• "Etapas vencendo"\n';
  texto += '• "Obras atrasadas"\n';
  texto += '• "Certidões vencendo"\n';
  texto += '• "Documentos RH"\n';
  texto += '• Enviar comprovante para baixa\n';
  texto += '• Criar reembolso com comprovante\n\n';
  texto += 'Como posso ajudar?';

  return {
    resposta: texto,
    requerConfirmacao: false,
    previas: [],
    ferramentasUsadas: ['resumoDoDia'],
    fontes: []
  };
}

function inferirCategoria(mensagem, dadosExtraidos) {
  const msg = (mensagem + ' ' + (dadosExtraidos?.descricao || '')).toLowerCase();
  if (msg.includes('combust') || msg.includes('posto') || msg.includes('gasol') || msg.includes('etanol') || msg.includes('diesel')) return 'Combustível';
  if (msg.includes('material') || msg.includes('insumo') || msg.includes('cimento') || msg.includes('areia') || msg.includes('brita')) return 'Insumo';
  if (msg.includes('mão de obra') || msg.includes('mao de obra') || msg.includes('pedreiro') || msg.includes('servente')) return 'Mão de obra';
  if (msg.includes('aliment') || msg.includes('refei') || msg.includes('lanche') || msg.includes('marmit')) return 'Alimentação';
  if (msg.includes('ferrament') || msg.includes('equipament') || msg.includes('elevador') || msg.includes('betoneira')) return 'Ferramentas/Equipamentos';
  if (msg.includes('epi') || msg.includes('capacete') || msg.includes('bot') || msg.includes('luva') || msg.includes('oculos')) return 'EPI';
  if (msg.includes('imposto') || msg.includes('taxa') || msg.includes('multa') || msg.includes('cartório') || msg.includes('cartorio')) return 'Impostos/Taxas/Multas';
  return 'Outros';
}

function extrairBeneficiario(mensagem) {
  const match = mensagem.match(/(?:reembolso|para|do|da)\s+([a-zA-ZÀ-ÿ\s]+?)(?:\s*,|\s+obra|\s+conta|\s+$)/i);
  return match ? match[1].trim() : null;
}

export async function executarPreviasConfirmadas(empresaId, previas, usuarioId) {
  const resultados = [];
  
  for (const previa of previas) {
    try {
      let resultado = null;
      
      switch (previa.acao) {
        case 'criar':
          switch (previa.modelo) {
            case 'Lancamento':
              resultado = await Lancamento.create({ ...previa.dados, empresa: empresaId, criadoPor: usuarioId });
              break;
            case 'ItemReembolso':
              // Se tem reembolso placeholder, cria o reembolso primeiro
              if (previa.dados.reembolso === 'NOVO_REEMBOLSO') {
                const reembolso = await Reembolso.create({
                  empresa: empresaId,
                  beneficiario: previa.dados.beneficiario || 'Beneficiário',
                  centroCusto: previa.dados.centroCusto,
                  valorTotal: previa.dados.valor,
                  criadoPor: usuarioId
                });
                previa.dados.reembolso = reembolso._id;
              }
              resultado = await ItemReembolso.create({ ...previa.dados, empresa: empresaId });
              break;
            case 'RecebivelObra':
              resultado = await RecebivelObra.create({ ...previa.dados, empresa: empresaId });
              break;
            // Add more models as needed
          }
          break;
          
        case 'baixar':
          if (previa.modelo === 'Lancamento' && previa.dados._id) {
            const lancamento = await Lancamento.findById(previa.dados._id);
            if (lancamento) {
              Object.assign(lancamento, previa.dados);
              await lancamento.save();
              resultado = lancamento;
            }
          }
          break;
          
        case 'atualizar':
          // Handle updates
          break;
      }
      
      resultados.push({
        modelo: previa.modelo,
        documentoId: resultado?._id,
        sucesso: !!resultado,
        erro: resultado ? null : 'Falha ao executar'
      });
    } catch (error) {
      resultados.push({
        modelo: previa.modelo,
        documentoId: null,
        sucesso: false,
        erro: error.message
      });
    }
  }
  
  // Se criou despesa e reembolso juntos, cria vínculo
  const despesaCriada = resultados.find(r => r.modelo === 'Lancamento' && r.sucesso);
  const reembolsoCriado = resultados.find(r => r.modelo === 'ItemReembolso' && r.sucesso);
  
  if (despesaCriada && reembolsoCriado) {
    await VinculoMovimentacao.create({
      empresa: empresaId,
      tipoOrigem: 'reembolso',
      origemId: reembolsoCriado.documentoId,
      tipoDestino: 'despesa',
      destinoId: despesaCriada.documentoId,
      descricao: 'Despesa e reembolso criados via WhatsApp'
    });
  }
  
  return resultados;
}

export { SISTEMA_WHATSAPP_PROMPT };