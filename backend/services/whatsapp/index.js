import { createProvider } from './providers.js';
import UsuarioWhatsApp from '../../models/UsuarioWhatsApp.js';
import InteracaoIA from '../../models/InteracaoIA.js';
import ConfirmacaoIA from '../../models/ConfirmacaoIA.js';
import ArquivoDocumento from '../../models/ArquivoDocumento.js';
import { processarMensagemIA } from '../assistente/whatsappProcessor.js';

class WhatsAppService {
  constructor() {
    this.provider = null;
    this.initialized = false;
  }

  init(config) {
    if (this.initialized) return;
    this.provider = createProvider(config);
    this.initialized = true;
  }

  async processWebhook(req, res) {
    if (!this.provider) {
      return res.status(500).json({ error: 'WhatsApp nao configurado' });
    }

    if (!this.provider.verifyWebhook(req, res)) {
      return res.status(401).json({ error: 'Webhook invalido' });
    }

    const parsed = this.provider.parseWebhook(req);
    if (!parsed) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    if (parsed.isFromMe) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    try {
      await this.handleIncomingMessage(parsed);
    } catch (error) {
      console.error('[WhatsApp] Erro ao processar mensagem:', error);
    }

    res.status(200).json({ ok: true });
  }

  async handleIncomingMessage(message) {
    const usuario = await UsuarioWhatsApp.findOne({ 
      numero: message.from, 
      ativo: true 
    }).populate('empresa');

    if (!usuario) {
      console.log(`[WhatsApp] Usuario nao autorizado: ${message.from}`);
      await this.sendMessage(message.from, 'Voce nao esta autorizado a usar este servico. Entre em contato com o administrador.');
      return;
    }

    // Atualiza ultimo acesso
    usuario.ultimoAcesso = new Date();
    await usuario.save();

    // Salva interacao
    const interacao = await InteracaoIA.create({
      empresa: usuario.empresa,
      usuarioWhatsApp: usuario._id,
      mensagemOriginal: message.body,
      intencao: 'pendente',
      status: 'processando'
    });

    try {
      // Processa com IA
      const resultado = await processarMensagemIA({
        empresaId: usuario.empresa._id,
        usuarioWhatsAppId: usuario._id,
        mensagem: message.body,
        perfil: usuario.perfil,
        permissoes: usuario.permissoes,
        anexo: message.mediaUrl ? {
          url: message.mediaUrl,
          type: message.mediaType
        } : null
      });

      interacao.intencao = resultado.intencao || 'desconhecida';
      interacao.resultado = resultado.resposta;
      interacao.ferramentasUsadas = resultado.ferramentasUsadas || [];
      interacao.fontes = resultado.fontes || [];
      interacao.status = resultado.requerConfirmacao ? 'aguardando_confirmacao' : 'concluido';

      if (resultado.requerConfirmacao && resultado.previas) {
        await ConfirmacaoIA.create({
          empresa: usuario.empresa,
          interacaoIA: interacao._id,
          previasApresentadas: resultado.previas.map(p => ({
            modelo: p.modelo,
            dados: p.dados,
            acao: p.acao
          }))
        });
      }

      await interacao.save();

      // Envia resposta
      if (resultado.resposta) {
        await this.sendMessage(message.from, resultado.resposta);
      }

      // Se tem anexos para enviar
      if (resultado.anexos?.length) {
        for (const anexo of resultado.anexos) {
          await this.sendMedia(message.from, anexo.url, anexo.caption || '');
        }
      }

    } catch (error) {
      interacao.status = 'erro';
      interacao.erro = error.message;
      await interacao.save();
      
      await this.sendMessage(message.from, 'Ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.');
      throw error;
    }
  }

  async sendMessage(to, message) {
    if (!this.provider) throw new Error('WhatsApp nao inicializado');
    return this.provider.sendMessage(to, message);
  }

  async sendMedia(to, mediaUrl, caption = '') {
    if (!this.provider) throw new Error('WhatsApp nao inicializado');
    return this.provider.sendMedia(to, mediaUrl, caption);
  }

  async sendProactiveAlert(empresaId, usuariosIds, message) {
    if (!this.provider) throw new Error('WhatsApp nao inicializado');
    
    const usuarios = await UsuarioWhatsApp.find({
      _id: { $in: usuariosIds },
      empresa: empresaId,
      ativo: true
    });

    const results = [];
    for (const usuario of usuarios) {
      try {
        const result = await this.sendMessage(usuario.numero, message);
        results.push({ usuario: usuario._id, success: true, result });
      } catch (error) {
        results.push({ usuario: usuario._id, success: false, error: error.message });
      }
    }
    return results;
  }

  async sendDocument(usuarioId, documentUrl, caption = '') {
    const usuario = await UsuarioWhatsApp.findById(usuarioId);
    if (!usuario) throw new Error('Usuario nao encontrado');
    return this.sendMedia(usuario.numero, documentUrl, caption);
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;