export class WhatsAppProvider {
  constructor(config) {
    this.config = config;
  }

  async sendMessage(to, message, options = {}) {
    throw new Error('sendMessage must be implemented by provider');
  }

  async sendMedia(to, mediaUrl, caption = '', options = {}) {
    throw new Error('sendMedia must be implemented by provider');
  }

  async markAsRead(messageId) {
    throw new Error('markAsRead must be implemented by provider');
  }

  verifyWebhook(req, res) {
    throw new Error('verifyWebhook must be implemented by provider');
  }

  parseWebhook(req) {
    throw new Error('parseWebhook must be implemented by provider');
  }
}

export class EvolutionAPIProvider extends WhatsAppProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.instance = config.instance;
  }

  async sendMessage(to, message, options = {}) {
    const url = `${this.baseUrl}/message/sendText/${this.instance}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey
      },
      body: JSON.stringify({
        number: this.formatNumber(to),
        text: message,
        delay: options.delay || 1000,
        linkPreview: options.linkPreview !== false
      })
    });
    return response.json();
  }

  async sendMedia(to, mediaUrl, caption = '', options = {}) {
    const url = `${this.baseUrl}/message/sendMedia/${this.instance}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey
      },
      body: JSON.stringify({
        number: this.formatNumber(to),
        mediatype: options.mediaType || 'document',
        media: mediaUrl,
        caption: caption,
        fileName: options.fileName || 'documento.pdf',
        delay: options.delay || 1000
      })
    });
    return response.json();
  }

  async markAsRead(messageId) {
    const url = `${this.baseUrl}/chat/markAsRead/${this.instance}`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey
      },
      body: JSON.stringify({ messageId })
    });
  }

  verifyWebhook(req, res) {
    // Evolution API sends webhook directly
    return true;
  }

  parseWebhook(req) {
    const body = req.body;
    if (!body || !body.data) return null;

    const message = body.data;
    return {
      messageId: message.key?.id,
      from: message.key?.remoteJid?.replace('@s.whatsapp.net', ''),
      to: message.key?.fromMe ? 'me' : undefined,
      body: message.message?.conversation || 
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.documentMessage?.caption ||
            '',
      type: this.getMessageType(message.message),
      mediaUrl: this.getMediaUrl(message.message),
      mediaType: this.getMediaType(message.message),
      timestamp: message.messageTimestamp,
      pushName: message.pushName,
      isFromMe: message.key?.fromMe || false,
      raw: body
    };
  }

  getMessageType(message) {
    if (!message) return 'unknown';
    if (message.conversation) return 'text';
    if (message.extendedTextMessage) return 'text';
    if (message.imageMessage) return 'image';
    if (message.documentMessage) return 'document';
    if (message.audioMessage) return 'audio';
    if (message.videoMessage) return 'video';
    return 'unknown';
  }

  getMediaUrl(message) {
    if (!message) return null;
    if (message.imageMessage) return message.imageMessage.url;
    if (message.documentMessage) return message.documentMessage.url;
    if (message.audioMessage) return message.audioMessage.url;
    if (message.videoMessage) return message.videoMessage.url;
    return null;
  }

  getMediaType(message) {
    if (!message) return null;
    if (message.imageMessage) return 'image';
    if (message.documentMessage) return 'document';
    if (message.audioMessage) return 'audio';
    if (message.videoMessage) return 'video';
    return null;
  }

  formatNumber(number) {
    let cleaned = number.replace(/\D/g, '');
    if (!cleaned.startsWith('55')) cleaned = '55' + cleaned;
    return cleaned;
  }
}

export class ZAPIProvider extends WhatsAppProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl;
    this.clientToken = config.clientToken;
    this.instanceId = config.instanceId;
  }

  async sendMessage(to, message, options = {}) {
    const url = `${this.baseUrl}/instances/${this.instanceId}/token/${this.clientToken}/send-text`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: this.formatNumber(to),
        message: message,
        delayMessage: options.delay || 1000
      })
    });
    return response.json();
  }

  async sendMedia(to, mediaUrl, caption = '', options = {}) {
    const url = `${this.baseUrl}/instances/${this.instanceId}/token/${this.clientToken}/send-document`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: this.formatNumber(to),
        document: mediaUrl,
        fileName: options.fileName || 'documento.pdf',
        caption: caption,
        delayMessage: options.delay || 1000
      })
    });
    return response.json();
  }

  verifyWebhook(req, res) {
    return true;
  }

  parseWebhook(req) {
    const body = req.body;
    if (!body || !body.message) return null;

    const message = body.message;
    return {
      messageId: message.id,
      from: message.from?.replace('@s.whatsapp.net', ''),
      body: message.body || message.caption || '',
      type: message.type || 'text',
      mediaUrl: message.mediaUrl,
      mediaType: message.type,
      timestamp: message.timestamp,
      pushName: message.senderName,
      isFromMe: message.fromMe || false,
      raw: body
    };
  }

  formatNumber(number) {
    let cleaned = number.replace(/\D/g, '');
    if (!cleaned.startsWith('55')) cleaned = '55' + cleaned;
    return cleaned;
  }
}

export function createProvider(config) {
  const providerType = (config?.provider || 'evolution').toLowerCase();
  switch (providerType) {
    case 'evolution':
      return new EvolutionAPIProvider(config);
    case 'zapi':
      return new ZAPIProvider(config);
    default:
      throw new Error(`Provedor WhatsApp desconhecido: ${providerType}`);
  }
}