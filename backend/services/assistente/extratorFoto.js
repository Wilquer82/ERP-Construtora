import * as ferramentas from './ferramentas.js';

const ft = {
  async extrairDadosNota(base64) {
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
        valor: 280.5,
        dataNota: new Date(),
        nomePosto: 'Auto Posto XYZ (demo)',
        cnpjPosto: 'Não informado',
        isDemo: true
      };
    }

    const prompt = `Você recebe uma foto de nota fiscal de abastecimento. Extraia:
- valor total (número, ex: 280.50)
- data da nota (YYYY-MM-DD)
- nome do posto/razão social
- CNPJ (se aparecer)

Responda JSON apenas:
{ valor, dataNota, nomePosto, cnpjPosto }`;

    if (implementacao.constructor.name === 'OpenAIAssistente') {
      const openai = await implementacao.getCliente();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: prompt },
          { role: 'user', content: [{ type: 'text', text: 'Extraia os dados desta nota fiscal de combustível:' }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }] }
        ],
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });
      const texto = response.choices[0].message.content;
      return JSON.parse(texto);
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
      return { valor: null, dataNota: null, nomePosto: null, cnpjPosto: null, raw: texto };
    }
  }
};

export function obrasAtivas(empresaId) {
  return ferramentas.obrasAtrasadas(empresaId).then((r) => r.itens);
}

export { ft };

// Classifica imagem: comprovante_abastecimento | outro
async function analisarImagem(base64) {
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
Se for outro documento, retorne:
{tipo:'outro', resumo:STRING}
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

export { analisarImagem };
