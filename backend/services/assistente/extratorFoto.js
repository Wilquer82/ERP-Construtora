import * as ferramentas from './ferramentas.js';

async function processarComLLM(base64, prompt, responseFormat = { type: 'json_object' }) {
  const { assistente } = await import('./index.js');
  const OpenAIAssistente = (await import('./OpenAIAssistente.js')).default;
  const GeminiAssistente = (await import('./GeminiAssistente.js')).default;

  let implementacao;
  if (process.env.OPENAI_API_KEY) {
    implementacao = new OpenAIAssistente();
  } else if (process.env.GEMINI_API_KEY) {
    implementacao = new GeminiAssistente();
  } else {
    return { isDemo: true, demo: true };
  }

  if (implementacao.constructor.name === 'OpenAIAssistente') {
    const openai = await implementacao.getCliente();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: prompt },
        { role: 'user', content: [{ type: 'text', text: 'Extraia os dados:' }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }] }
      ],
      max_tokens: 800,
      response_format: responseFormat
    });
    return JSON.parse(response.choices[0].message.content);
  }

  const genAI = await implementacao.getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent([
    prompt,
    { inlineData: { data: base64, mimeType: 'image/jpeg' } }
  ]);
  const texto = await result.response.text();
  try {
    const match = texto.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : texto);
  } catch {
    return { raw: texto };
  }
}

// COMPROVANTE DE DESPESA (genérico)
export async function processarImagemComprovante(base64) {
  const prompt = `Extraia dados deste comprovante de pagamento/despesa:
- valor (número)
- data (YYYY-MM-DD)
- favorecido/fornecedor (nome)
- forma de pagamento (pix, boleto, dinheiro, cheque, cartão)
- número do documento/boleto (se houver)
- banco (se identificável)

Responda JSON: { valor, data, fornecedor, formaPagamento, numeroDocumento, banco }`;

  const result = await processarComLLM(base64, prompt);
  return {
    ...result,
    tipo: 'comprovante_despesa',
    isDemo: result.isDemo || false
  };
}

// BOLETO
export async function processarImagemBoleto(base64) {
  const prompt = `Extraia dados deste boleto bancário:
- valor (número)
- vencimento (YYYY-MM-DD)
- beneficiário/fornecedor (nome)
- linha digitável ou código de barras (se legível)
- número do documento/boleto
- banco emissor
- sacado/pagador (se aparecer)

Responda JSON: { valor, dataVencimento, fornecedor, linhaDigitavel, numeroDocumento, banco, sacado }`;

  const result = await processarComLLM(base64, prompt);
  return {
    ...result,
    tipo: 'boleto',
    isDemo: result.isDemo || false
  };
}

// NOTA FISCAL
export async function processarImagemNF(base64) {
  const prompt = `Extraia dados desta nota fiscal:
- valor total (número)
- valor líquido (número)
- valor retenções (número)
- data emissão (YYYY-MM-DD)
- número da NF
- emitente/fornecedor (nome e CNPJ)
- destinatário/cliente (nome e CNPJ)
- descrição dos serviços/produtos

Responda JSON: { valorTotal, valorLiquido, valorRetencoes, dataEmissao, numeroNF, emitente, emitenteCnpj, destinatario, destinatarioCnpj, descricao }`;

  const result = await processarComLLM(base64, prompt);
  return {
    ...result,
    tipo: 'nota_fiscal',
    isDemo: result.isDemo || false
  };
}

// CHEQUE
export async function processarImagemCheque(base64) {
  const prompt = `Extraia dados deste cheque:
- valor (número)
- data (YYYY-MM-DD)
- favorecido/beneficiário (nome)
- número da folha
- banco emissor
- agência/conta (se legível)

Responda JSON: { valor, data, favorecido, numeroFolha, banco, agencia, conta }`;

  const result = await processarComLLM(base64, prompt);
  return {
    ...result,
    tipo: 'cheque',
    isDemo: result.isDemo || false
  };
}

// PIX
export async function processarImagemPIX(base64) {
  const prompt = `Extraia dados deste comprovante PIX:
- valor (número)
- data/hora (YYYY-MM-DD HH:mm)
- favorecido/recebedor (nome)
- pagador (nome)
- chave PIX (se visível)
- ID da transação (se visível)
- banco

Responda JSON: { valor, data, favorecido, pagador, chavePix, idTransacao, banco }`;

  const result = await processarComLLM(base64, prompt);
  return {
    ...result,
    tipo: 'pix',
    isDemo: result.isDemo || false
  };
}

// GENÉRICO
export async function processarImagemGenerica(base64) {
  const prompt = `Analise esta imagem e extraia qualquer informação financeira relevante:
- tipo de documento (comprovante, boleto, nota, cheque, pix, outro)
- valor (número)
- data (YYYY-MM-DD)
- partes envolvidas (nomes)
- descrição resumida

Responda JSON: { tipoDocumento, valor, data, partes, descricao }`;

  const result = await processarComLLM(base64, prompt);
  return {
    ...result,
    tipo: 'generico',
    isDemo: result.isDemo || false
  };
}

export function obrasAtivas(empresaId) {
  return ferramentas.obrasAtrasadas(empresaId).then((r) => r.itens);
}

// Classifica imagem: comprovante_abastecimento | outro
export async function analisarImagem(base64) {
  const { assistente } = await import('./index.js');
  const OpenAIAssistente = (await import('./OpenAIAssistente.js')).default;
  const GeminiAssistente = (await import('./GeminiAssistente.js')).default;

  let implementacao;
  if (process.env.OPENAI_API_KEY) {
    implementacao = new OpenAIAssistente();
  } else if (process.env.GEMINI_API_KEY) {
    implementacao = new GeminiAssistente();
  } else {
    return {
      tipo: 'comprovante_abastecimento',
      dados: {
        valor: 280.5,
        dataNota: new Date(),
        litros: 42,
        nomePosto: 'Auto Posto XYZ (demo)',
        cnpj: 'Não informado',
        placa: 'Não informado'
      },
      isDemo: true
    };
  }

  const prompt = `Classifique esta imagem.
Se for comprovante de abastecimento/combustível, retorne JSON:
{tipo:'comprovante_abastecimento', dados:{data:YYYY-MM-DD, valor:NUMBER, litros:NUMBER, nomePosto:STRING, cnpj:STRING, placa:STRING}}
Se for boleto: {tipo:'boleto', dados:{valor:NUMBER, vencimento:YYYY-MM-DD, beneficiario:STRING}}
Se for nota fiscal: {tipo:'nota_fiscal', dados:{valor:NUMBER, numeroNF:STRING, emitente:STRING}}
Se for cheque: {tipo:'cheque', dados:{valor:NUMBER, favorecido:STRING, numeroFolha:STRING}}
Se for PIX: {tipo:'pix', dados:{valor:NUMBER, favorecido:STRING}}
Se for outro: {tipo:'outro', resumo:STRING}
Responda APENAS JSON, sem markdown.`;

  if (implementacao.constructor.name === 'OpenAIAssistente') {
    const openai = await implementacao.getCliente();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: prompt },
        { role: 'user', content: [
          { type: 'text', text: 'Classifique esta imagem:' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
        ] }
      ],
      max_tokens: 600,
      response_format: { type: 'json_object' }
    });
    return JSON.parse(response.choices[0].message.content);
  }

  const genAI = await implementacao.getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent([
    prompt,
    { inlineData: { data: base64, mimeType: 'image/jpeg' } }
  ]);
  const texto = await result.response.text();
  try {
    const match = texto.match(/\{[\s\S]*\}/);
    return JSON.parse(match[0]);
  } catch {
    return { tipo: 'outro', resumo: texto };
  }
}
