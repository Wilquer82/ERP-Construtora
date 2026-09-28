function formatarResumo(resumo) {
  const partes = [];
  const dia = new Date().toLocaleDateString('pt-BR');

  if (resumo.contasPagar?.itens?.length > 0) {
    const hoje = resumo.contasPagar.itens.filter((i) => i.diasVencimento <= 0);
    const semana = resumo.contasPagar.itens.filter((i) => i.diasVencimento > 0 && i.diasVencimento <= 7);

    if (hoje.length > 0) {
      partes.push(`🔴 CRÍTICO — Contas a pagar vencem HOJE:
${hoje.map((i) => `• ${i.fornecedor} — ${i.valor} → PAGAR HOJE`).join('\n')}`);
    }
    if (semana.length > 0) {
      partes.push(`🔴 CRÍTICO — Contas a pagar vencem esta semana:
${semana.map((i) => `• ${i.fornecedor} — ${i.valor} → vence em ${i.diasVencimento} dias`).join('\n')}`);
    }
  }

  if (resumo.contasReceber?.itens?.length > 0) {
    partes.push(`🔴 CRÍTICO — Contas a receber atrasadas:
${resumo.contasReceber.itens.slice(0, 5).map((i) => `• ${i.cliente} — ${i.valor} → ${i.diasAtraso} dias de atraso`).join('\n')}`);
  }

  if (resumo.etapas?.itens?.length > 0) {
    partes.push(`🟠 URGENTE — Etapas vencendo:
${resumo.etapas.itens.map((i) => `• ${i.contrato || 'Contrato'} — ${i.descricao} → vence em ${i.diasRestantes} dias`).join('\n')}`);
  }

  if (resumo.obras?.itens?.length > 0) {
    partes.push(`🟢 Obras:
${resumo.obras.itens.slice(0, 5).map((i) => `• ${i.nome} (${i.codigo}) — ${i.percentualConclusao}% físico, ${i.atrasoDias} dias de atraso`).join('\n')}`);
  }

  if (resumo.certidoes?.itens?.length > 0) {
    partes.push(`🟡 ATENÇÃO — Certidões vencendo:
${resumo.certidoes.itens.map((i) => `• ${i.nome} — ${i.diasRestantes} dias restantes`).join('\n')}`);
  }

  if (resumo.documentos?.itens?.length > 0) {
    partes.push(`🟡 ATENÇÃO — Documentos de RH vencendo:
${resumo.documentos.itens.slice(0, 5).map((i) => `• ${i.colaborador} — ${i.nomeDoc} → ${i.diasRestantes <= 0 ? 'VENCIDO' : `${i.diasRestantes} dias`}`).join('\n')}`);
  }

  if (partes.length === 0) {
    return `📋 **Resumo de hoje — Nenhum alerta crítico**

✅ Tudo em ordem hoje.`;
  }

  return `📋 **Resumo de hoje, ${dia}**

${partes.join('\n\n')}

${resumo.totalAlertas} alerta(s) total.`;
}

export { formatarResumo };
