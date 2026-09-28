import * as ferramentas from './ferramentas.js';

const SYSTEM_PROMPT = `Você é a assistente do PROPRIETÁRIO da Construtora. Foco: prefeituras, prazos, fluxo de caixa, não perder dinheiro.

REGRAS OBRIGATÓRIAS:
1. NUNCA invente valores, datas ou fatos. Use SEMPRE as ferramentas.
2. CITE SEMPRE a fonte: "Prefeitura X — vence em 3 dias".
3. Fale DIRETO e CLARO. No máximo 3 parágrafos.
4. PRIORIDADE (sempre nesta ordem):
   🔴 CRÍTICO → Conta a pagar vence HOJE/amanhã (risco de protesto)
   🟠 URGENTE → Etapa vence em até 5 dias (multa da prefeitura)
   🟡 ATENÇÃO → Certidão vence em até 15 dias (bloqueia pagamento)
   🟢 ACOMPANHAR → Demais itens
5. SEMPRE indique a AÇÃO: "Pagar até dia 29", "Enviar medição até dia 30".
6. NUNCA execute ações. Apenas avise e indique onde resolver.
7. Se não encontrar dado → "Não encontrei essa informação cadastrada no sistema."`;

export const FERRAMENTAS_DISPONIVEIS = {
  resumoDoDia: { fn: ferramentas.resumoDoDia, descricao: 'Resumo completo do dia: contas, etapas, obras, certidões e documentos' },
  contasAPagarVencendo: { fn: ferramentas.contasAPagarVencendo, descricao: 'Contas a pagar vencendo em até N dias (parâmetro: dias, padrão 7)' },
  contasAReceberAtrasadas: { fn: ferramentas.contasAReceberAtrasadas, descricao: 'Contas a receber atrasadas' },
  etapasVencendo: { fn: ferramentas.etapasVencendo, descricao: 'Etapas/contratos vencendo em até N dias (parâmetro: dias, padrão 15)' },
  obrasAtrasadas: { fn: ferramentas.obrasAtrasadas, descricao: 'Obras com andamento abaixo do esperado' },
  certidoesVencendo: { fn: ferramentas.certidoesVencendo, descricao: 'Certidões vencendo em até N dias (parâmetro: dias, padrão 30)' },
  documentosRHVencendo: { fn: ferramentas.documentosRHVencendo, descricao: 'Documentos de RH vencendo (ASO, EPI, contrato)' },
  medicoesPendentes: { fn: ferramentas.medicoesPendentes, descricao: 'Medições/etapas pendentes de serem registradas' }
};

export class LLMService {
  async conversar({ historico, mensagemAtual, ferramentasDisponiveis }) {
    throw new Error('Método conversar() deve ser implementado pela subclasse');
  }
}

export { SYSTEM_PROMPT };

export default LLMService;
