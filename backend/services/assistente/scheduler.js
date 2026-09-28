import cron from 'node-cron';
import Empresa from '../models/Empresa.js';
import User from '../models/User.js';
import MensagemAssistente from '../models/MensagemAssistente.js';
import { resumoDoDia } from './ferramentas.js';
import { formatarResumo } from './resumos.js';

let job = null;

export function iniciarScheduler() {
  if (job) return job;

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

  console.log('[Assistente] Scheduler iniciado — resumo diário às 8h (dias úteis)');
  return job;
}

async function _gerarResumoEmpresa(empresa) {
  try {
    const admin = await User.findOne({ empresa: empresa._id, role: 'admin', ativo: true }).select('_id');

    const contexto = { empresaId: String(empresa._id), bypass: true };
    const { runWithTenant } = await import('../middleware/tenantContext.js');

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

export default { iniciarScheduler, pararScheduler };
