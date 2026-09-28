import { LLMService, FERRAMENTAS_DISPONIVEIS, SYSTEM_PROMPT } from './LLMService.js';

const DEMO_RESPOSTAS = {
  resumo: `📋 **Resumo de hoje**

🔴 CRÍTICO — Conta a pagar vence hoje:
• Fornecedor de EPIs — R$ 12.500 → PAGAR HOJE (hoje é último dia)

🟠 URGENTE — Etapas vencendo esta semana:
• Prefeitura — Etapa 2 — vence em 3 dias
  Ação: Enviar documentação até ${new Date(Date.now() + 3 * 86400000).toLocaleDateString('pt-BR')}

🟡 ATENÇÃO:
• Certidão municipal — vence em 12 dias → Renovar até ${(new Date(Date.now() + 12 * 86400000)).toLocaleDateString('pt-BR')}

🟢 Obras:
• Reforma Escola Municipal — 65% físico / 70% financeiro → no prazo`,
  contas: `🔴 Contas a pagar vencendo:

• Fornecedor de EPIs — R$ 12.500 → vence HOJE
  Ação: pagar até hoje para evitar protesto

• Aluguel de andaime — R$ 8.000 → vence em 15 dias
  Acao: aguardar procurar fornecedor até 5 dias antes`,
  atrasado: `🔴 Contas a receber atrasadas:

• Prefeitura — Parcela 1/3 Contrato Escola — R$ 140.000 → 3 dias de atraso
  Ação: entrar em contato urgente (multa da prefeitura acumulando)`,
  etapas: `🟠 Etapas/contratos vencendo:

• Contrato CT-2025-001 — Etapa "Estrutura de concreto" — vence em 5 dias
  Ação: verificar andamento e enviar medição`,
  obras: `🟢 Obras sob acompanhamento:

• OBR-001 — Reforma Escola Municipal — 65% físico / 70% financeiro — no prazo
• OBR-002 — Pavimentação Rua das Flores — 30% físico / 25% financeiro — no prazo`,
  rh: `🟡 Documentos de RH vencendo:

• Carlos Silva — ASO vencido (0 dias restantes)
  Ação: suspender do serviço até novo ASO
• João Mendes — ASO vence em 10 dias
  Ação: marcar exame até 5 dias antes
• Maria Santos — EPI (Capacete) — recibo não assinado
  Ação: solicitar recibo assinado`,
  default: 'Olá! Sou sua assistente virtual do proprietário. Posso ajudar com contas a pagar/receber, etapas de contrato, obras atrasadas, certidões e documentos de RH. Pergunte algo!'
};

function responderDemo(mensagemAtual) {
  const msg = mensagemAtual.toLowerCase();
  let texto = DEMO_RESPOSTAS.default;
  let ferramentasUsadas = [];
  let fontes = [];

  if (msg.includes('resumo') || msg.includes('dia') || msg.includes('hoje')) {
    texto = DEMO_RESPOSTAS.resumo;
    ferramentasUsadas = ['resumoDoDia'];
    fontes = [{ tipo: 'lancamento', referenciaId: 'lan-002', nome: 'Saldo EPIs' }];
  } else if (msg.includes('pagar') || msg.includes('venc') || msg.includes('contas')) {
    texto = DEMO_RESPOSTAS.contas;
    ferramentasUsadas = ['contasAPagarVencendo'];
    fontes = [{ tipo: 'lancamento', referenciaId: 'lan-001', nome: 'Cimento' }];
  } else if (msg.includes('receber') || msg.includes('atrasad')) {
    texto = DEMO_RESPOSTAS.atrasado;
    ferramentasUsadas = ['contasAReceberAtrasadas'];
    fontes = [{ tipo: 'lancamento', referenciaId: 'lan-004', nome: 'Parcela 1/3 Contrato' }];
  } else if (msg.includes('etap') || msg.includes('contrato')) {
    texto = DEMO_RESPOSTAS.etapas;
    ferramentasUsadas = ['etapasVencendo'];
    fontes = [{ tipo: 'etapa ', referenciaId: 'etp-002', nome: 'Estrutura de concreto' }];
  } else if (msg.includes('obra')) {
    texto = DEMO_RESPOSTAS.obras;
    ferramentasUsadas = ['obrasAtrasadas'];
    fontes = [{ tipo: 'obra', referenciaId: 'obra-001', nome: 'Reforma Escola' }];
  } else if (msg.includes('rh') || msg.includes('documento')) {
    texto = DEMO_RESPOSTAS.rh;
    ferramentasUsadas = ['documentosRHVencendo'];
    fontes = [{ tipo: 'colaborador', referenciaId: 'col-001', nome: 'Carlos Silva' }];
  }

  return {
    resposta: `🔬 MODO DEMONSTRAÇÃO\n\n${texto}`,
    fontes,
    acaoSugerida: texto.includes('Ação:') ? texto.match(/Ação:.*$/m)?.[0] || texto.match(/Acao:.*$/m)?.[0] || '' : ''
  };
}

export default class MockAssistente extends LLMService {
  async conversar({ historico, mensagemAtual }) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(responderDemo(mensagemAtual)), 800);
    });
  }

  get modoEmissao() {
    return 'demo';
  }
}
