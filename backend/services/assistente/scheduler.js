import cron from 'node-cron';
import Empresa from '../../models/Empresa.js';
import User from '../../models/User.js';
import MensagemAssistente from '../../models/MensagemAssistente.js';
import UsuarioWhatsApp from '../../models/UsuarioWhatsApp.js';
import { resumoDoDia, contasAPagarVencendo, obrasAtrasadas, certidoesVencendo, documentosRHVencendo } from './ferramentas.js';
import { formatarResumo } from './resumos.js';
import { whatsappService } from '../whatsapp/index.js';

let job = null;

export function iniciarScheduler() {
  if (job) return job;

  // Resumo diário às 8h (dias úteis)
  job = cron.schedule('0 8 * * 1-5', async () => {
    console.log('[Assistente] Scheduler: gerando resumo diário...');
    try {
      const empresas = await Empresa.find({ ativo: true });
      for (const empresa of empresas) {
        await _gerarResumoEmpresa(empresa);
      }
    } catch (err) {
      console.error('[Assistente] Scheduler: erro global:', err);
    }
  }, {
    timezone: 'America/Sao_Paulo',
    scheduled: true
  });

  // Alertas proativos a cada hora (9h-18h, dias úteis)
  const alertaJob = cron.schedule('0 9-18 * * 1-5', async () => {
    console.log('[Assistente] Scheduler: verificando alertas proativos...');
    try {
      const empresas = await Empresa.find({ ativo: true });
      for (const empresa of empresas) {
        await _enviarAlertasProativos(empresa);
      }
    } catch (err) {
      console.error('[Assistente] Scheduler alertas: erro global:', err);
    }
  }, {
    timezone: 'America/Sao_Paulo',
    scheduled: true
  });

  console.log('[Assistente] Scheduler iniciado — resumo diário às 8h, alertas a cada hora (9h-18h, dias úteis)');
  return job;
}

async function _gerarResumoEmpresa(empresa) {
  try {
    const admin = await User.findOne({ empresa: empresa._id, role: 'admin', ativo: true }).select('_id');

    const contexto = { empresaId: String(empresa._id), bypass: true };
    const { runWithTenant } = await import('../../middleware/tenantContext.js');

    await runWithTenant(contexto, async () => {
      const resumoData = await resumoDoDia();
      const texto = formatarResumo(resumoData);

      await MensagemAssistente.create({
        empresa: empresa._id,
        usuario: admin?._id || null,
        pergunta: '[Resumo diário automático]',
        resposta: texto,
        ferramentasUsadas: ['resumoDoDia'],
        fontes: resumoData.totalAlertas > 0
          ? [{ tipo: 'sistema', referenciaId: empresa._id, nome: empresa.nome }]
          : [],
        acaoSugerida: ''
      });

      console.log(`[Assistente] Resumo diário gerado para ${empresa.nome} (${resumoData.totalAlertas} alertas)`);
    });
  } catch (err) {
    console.error(`[Assistente] Falha no resumo para empresa ${String(empresa._id)}:`, err.message);
  }
}

export function pararScheduler() {
  if (job) {
    cron.cancelJob(job);
    job = null;
    console.log('[Assistente] Scheduler parado');
  }
}

async function _enviarAlertasProativos(empresa) {
  try {
    const usuariosWhatsApp = await UsuarioWhatsApp.find({ 
      empresa: empresa._id, 
      ativo: true,
      perfil: { $in: ['financeiro', 'administrador'] }
    });
    
    if (!usuariosWhatsApp.length) return;

    const usuarioIds = usuariosWhatsApp.map(u => u._id);
    const numeros = usuariosWhatsApp.map(u => u.numero);

    const contexto = { empresaId: String(empresa._id), bypass: true };
    const { runWithTenant } = await import('../../middleware/tenantContext.js');

    await runWithTenant(contexto, async () => {
      // 1. Contas a pagar vencendo hoje/amanhã
      const contasHoje = await contasAPagarVencendo(2);
      if (contasHoje.itens.length > 0) {
        let msg = '🚨 *ALERTA: Contas a pagar vencendo*\n\n';
        for (const item of contasHoje.itens.slice(0, 5)) {
          msg += `• ${item.fornecedor} — ${item.valor} → vence ${new Date(item.dataVencimento).toLocaleDateString('pt-BR')} (${item.diasVencimento}d)\n`;
        }
        msg += `\nTotal: ${contasHoje.itens.reduce((a, b) => a + parseFloat(b.valor.replace(/[^0-9.,]/g, '').replace(',', '.')), 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`;
        
        await whatsappService.sendProactiveAlert(empresa._id, usuarioIds, msg);
      }

      // 2. Obras com atraso > 10%
      const obrasAtras = await obrasAtrasadas();
      const obrasMuitoAtrasadas = obrasAtras.itens.filter(o => o.atrasoDias > 10 || (o.percentualPrevisto - o.percentualConclusao) > 10);
      if (obrasMuitoAtrasadas.length > 0) {
        let msg = '🏗️ *ALERTA: Obras com atraso significativo*\n\n';
        for (const item of obrasMuitoAtrasadas.slice(0, 3)) {
          msg += `• ${item.nome} — ${item.percentualConclusao}% físico / ${item.percentualPrevisto}% esperado (atraso: ${item.atrasoDias}d)\n`;
        }
        await whatsappService.sendProactiveAlert(empresa._id, usuarioIds, msg);
      }

      // 3. Certidões vencendo em até 5 dias
      const certidoes = await certidoesVencendo(5);
      if (certidoes.itens.length > 0) {
        let msg = '📋 *ALERTA: Certidões vencendo*\n\n';
        for (const item of certidoes.itens.slice(0, 3)) {
          msg += `• ${item.nome} (${item.tipo}) → ${item.diasRestantes}d\n`;
        }
        await whatsappService.sendProactiveAlert(empresa._id, usuarioIds, msg);
      }

      // 4. Documentos RH vencendo hoje/amanhã
      const docsRH = await documentosRHVencendo();
      const docsCriticos = docsRH.itens.filter(d => d.diasRestantes <= 2);
      if (docsCriticos.length > 0) {
        let msg = '👷 *ALERTA: Documentos RH críticos*\n\n';
        for (const item of docsCriticos.slice(0, 3)) {
          msg += `• ${item.colaborador} — ${item.nomeDoc} (${item.tipoDoc}) → ${item.diasRestantes}d\n`;
        }
        await whatsappService.sendProactiveAlert(empresa._id, usuarioIds, msg);
      }
    });
  } catch (err) {
    console.error(`[Assistente] Falha alertas proativos para ${empresa.nome}:`, err.message);
  }
}

export default { iniciarScheduler, pararScheduler };
