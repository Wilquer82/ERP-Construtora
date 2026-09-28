import { useState, useEffect, useRef } from 'react';
import api, { fmtMoeda } from '../../api.js';

const PERGUNTAS_RAPIDAS = [
  'Quais contas vencem essa semana?',
  'O que está atrasado?',
  'Resumo do dia',
  'Como estão as obras?',
  'RH precisa de atenção?'
];

function MarcaDemo() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(245, 185, 66, .15)',
      border: '1px solid var(--aviso)',
      borderRadius: 6,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 600,
      color: '#fbbf24',
      marginBottom: 8
    }}>
      🔬 MODO DEMONSTRAÇÃO
    </div>
  );
}

function BubbleAssistente({ mensagem, fontes, acaoSugerida, demo }) {
  const linhas = mensagem.split('\n');
  return (
    <div style={{
      maxWidth: '80%',
      background: 'var(--fundo-card)',
      border: demo ? '1px solid var(--aviso)' : '1px solid var(--borda)',
      borderTopLeftRadius: 4,
      borderTopRightRadius: 16,
      borderBottomRightRadius: 16,
      borderBottomLeftRadius: 16,
      padding: 12,
      lineHeight: 1.5,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word'
    }}>
      {demo && <MarcaDemo />}
      {linhas.map((linha, i) => {
        const ehCritico = linha.startsWith('🔴');
        const ehUrgente = linha.startsWith('🟠');
        const ehAtencao = linha.startsWith('🟡');
        const ehVerde = linha.startsWith('🟢');
        const ehResumo = linha.startsWith('📋');
        let bgExtra = null;
        if (ehCritico) bgExtra = 'rgba(239, 68, 68, .12)';
        else if (ehUrgente) bgExtra = 'rgba(245, 185, 66, .08)';
        else if (ehAtencao) bgExtra = 'rgba(245, 185, 66, .05)';
        else if (ehVerde) bgExtra = 'rgba(53, 209, 138, .05)';
        else if (ehResumo) bgExtra = 'rgba(33, 199, 168, .05)';
        return (
          <div
            key={i}
            style={{
              margin: '-4px 0',
              padding: bgExtra ? '6px 10px' : '2px 0',
              borderRadius: 4,
              background: bgExtra,
              fontWeight: (ehCritico || ehUrgente) ? 500 : 400
            }}
          >
            {linha || <br />}
          </div>
        );
      })}
      {fontes && fontes.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
          {fontes.slice(0, 8).map((f, i) => (
            <span key={i} style={{ fontSize: 11, color: '#91a4b2' }}>
              📄 {f.nome}
            </span>
          ))}
        </div>
      )}
      {acaoSugerida && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#fbbf24' }}>
          💡 {acaoSugerida}
        </div>
      )}
    </div>
  );
}

function BubbleUsuario({ mensagem }) {
  return (
    <div style={{
      maxWidth: '70%',
      background: 'var(--primaria-escuro)',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 4,
      borderBottomRightRadius: 16,
      borderBottomLeftRadius: 16,
      padding: 10,
      lineHeight: 1.5,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      alignSelf: 'flex-end'
    }}>
      {mensagem}
    </div>
  );
}

function ConfiguracaoAPI({ provider, apiKey, apiKeyValid, checking, onProvider, onApiKey, onValidar, onSalvar, onLimpar }) {
  return (
    <div className="card" style={{
      marginTop: 16,
      padding: 16,
      border: '1px solid var(--borda)'
    }}>
      <h3 style={{ margin: '0 0 12px', color: 'var(--primaria-escura)' }}>
        {apiKeyValid ? '✅ API conectada' : '🔑 Configurar API (opcional)'}
      </h3>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select
          value={provider}
          onChange={onProvider}
          style={{
            flex: 1,
            background: 'var(--fundo-input)',
            border: '1px solid var(--borda)',
            borderRadius: 8,
            padding: '8px 12px',
            color: 'var(--texto)',
            fontSize: 14
          }}
        >
          <option value="openai">OpenAI (gpt-4o-mini)</option>
          <option value="gemini">Gemini (gemini-1.5-flash)</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="password"
          value={apiKey}
          onChange={onApiKey}
          placeholder={provider === 'openai' ? 'sk-...' : 'AI...'}
          style={{
            flex: 1,
            background: 'var(--fundo-input)',
            border: '1px solid var(--borda)',
            borderRadius: 8,
            padding: '8px 12px',
            color: 'var(--texto)',
            fontSize: 14
          }}
        />
        <button
          type="button"
          onClick={onValidar}
          disabled={checking || !apiKey.trim()}
          style={{
            padding: '8px 16px',
            background: 'var(--primaria)',
            color: '#0c171c',
            border: 'none',
            borderRadius: 8,
            cursor: checking || !apiKey.trim() ? 'default' : 'pointer',
            fontWeight: 600,
            fontSize: 13,
            minWidth: 80
          }}
        >
          {checking ? 'Validando…' : 'Validar'}
        </button>
      </div>

      {apiKeyValid && (
        <div style={{ marginBottom: 12, color: '#35d18a', fontSize: 13 }}>
          ✓ Chave validada com sucesso. As respostas passarão a usar a API real.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'right' }}>
        {apiKeyValid && (
          <button
            type="button"
            onClick={onLimpar}
            className="btn btn-linha btn-mini"
          >
            Limpar chave
          </button>
        )}
        <button
          type="button"
          onClick={onSalvar}
          disabled={checking || !apiKeyValid}
          style={{
            padding: '6px 14px',
            background: apiKeyValid ? 'var(--sucesso)' : 'var(--borda)',
            color: '#0c171c',
            border: 'none',
            borderRadius: 6,
            cursor: apiKeyValid ? 'pointer' : 'default',
            fontWeight: 600,
            fontSize: 12
          }}
        >
          Salvar e usar
        </button>
      </div>
    </div>
  );
}

export default function Assistente() {
  const [mensagem, setMensagem] = useState('');
  const [chat, setChat] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [demo, setDemo] = useState(true);
  const [alertasCriticos, setAlertasCriticos] = useState(0);
  const fimRef = useRef(null);

  // API key management
  const [showConfig, setShowConfig] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyValid, setApiKeyValid] = useState(false);
  const [checking, setChecking] = useState(false);

  // Load saved API key on mount
  useEffect(() => {
    const saved = localStorage.getItem('assistenteApiKey');
    const savedProvider = localStorage.getItem('assistenteProvider');
    const savedValid = localStorage.getItem('assistenteApiKeyValid') === 'true';
    if (saved && savedProvider) {
      setApiKey(saved);
      setProvider(savedProvider);
      setApiKeyValid(savedValid);
      setDemo(!savedValid);
    }
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, carregando]);

  const enviarMensagem = async (texto) => {
    const pergunta = (texto || mensagem).trim();
    if (!pergunta) return;
    setMensagem('');
    setErro('');
    const novaChat = [...chat, { tipo: 'user', texto: pergunta }];
    setChat(novaChat);
    setCarregando(true);

    try {
      const payload = { mensagem: pergunta };
      if (apiKeyValid && apiKey) {
        payload.provider = provider;
        payload.apiKey = apiKey;
      }

      const { data } = await api.post('/assistente/chat', payload);
      const isDemo = data.demo !== undefined ? data.demo : !apiKeyValid;
      setDemo(isDemo);

      setChat((prev) => [...prev, {
        tipo: 'assistant',
        texto: data.resposta,
        fontes: data.fontes,
        acaoSugerida: data.acaoSugerida
      }]);
    } catch (err) {
      const msg = err.response?.data?.error || 'Não foi possível conectar ao assistente.';
      setErro(msg);
      setChat((prev) => [...prev, {
        tipo: 'assistant',
        texto: msg,
        fontes: [],
        acaoSugerida: ''
      }]);
    } finally {
      setCarregando(false);
    }
  };

  const validarChave = async () => {
    if (!apiKey.trim() || !provider) return;
    setChecking(true);
    setApiKeyValid(false);
    try {
      const { data } = await api.post('/assistente/validar-chave', {
        provider,
        apiKey: apiKey.trim()
      });
      setApiKeyValid(data.valido);
      setDemo(!data.valido);
    } catch (err) {
      setApiKeyValid(false);
      setDemo(true);
    } finally {
      setChecking(false);
    }
  };

  const salvarChave = () => {
    if (apiKeyValid) {
      localStorage.setItem('assistenteApiKey', apiKey.trim());
      localStorage.setItem('assistenteProvider', provider);
      localStorage.setItem('assistenteApiKeyValid', 'true');
      setShowConfig(false);
      setDemo(false);
    }
  };

  const limparChave = () => {
    localStorage.removeItem('assistenteApiKey');
    localStorage.removeItem('assistenteProvider');
    localStorage.removeItem('assistenteApiKeyValid');
    setApiKey('');
    setApiKeyValid(false);
    setDemo(true);
    setShowConfig(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  const carregarAlertasIniciais = async () => {
    try {
      const payload = {};
      if (apiKeyValid && apiKey) {
        payload.provider = provider;
        payload.apiKey = apiKey;
      }
      payload.mensagem = 'Resumo do dia';

      const { data } = await api.post('/assistente/chat', payload);
      const isDemo = data.demo !== undefined ? data.demo : !apiKeyValid;
      setDemo(isDemo);
      setAlertasCriticos(
        (data.fontes?.length || 0) +
        (data.resposta?.includes('🔴') ? 1 : 0)
      );
      setChat([{
        tipo: 'assistant',
        texto: data.resposta,
        fontes: data.fontes,
        acaoSugerida: data.acaoSugerida
      }]);
    } catch {
      setChat([]);
    }
  };

  useEffect(() => {
    if (chat.length === 0) {
      carregarAlertasIniciais();
    }
  }, []);

  const criticos = chat.filter(
    (m) => m.tipo === 'assistant' && m.texto.includes('🔴')
  ).length;

  return (
    <div>
      <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Assistente do Proprietário</h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Monitoramento autônomo de prazos, contas e obras
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="btn btn-linha btn-mini"
            title={apiKeyValid ? 'Gerenciar API' : 'Configurar API (opcional)'}
            style={{ fontSize: 11 }}
          >
            {apiKeyValid ? '🔑 API conectada' : '🔑 Conectar API'}
          </button>
          <span style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32, height: 32,
            background: 'var(--ativo-primario)',
            border: '1px solid var(--primaria)',
            borderRadius: 8
          }}>
            <BellIcon />
            {criticos > 0 && (
              <span style={{
                position: 'absolute',
                top: -2, right: -2,
                background: 'var(--perigo)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '999px',
                minWidth: 18,
                textAlign: 'center'
              }}>{criticos}</span>
            )}
          </span>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            {chat.filter((m) => m.tipo === 'assistant').length} alertas
          </span>
        </div>
      </div>

      {showConfig && (
        <ConfiguracaoAPI
          provider={provider}
          apiKey={apiKey}
          apiKeyValid={apiKeyValid}
          checking={checking}
          onProvider={(e) => setProvider(e.target.value)}
          onApiKey={(e) => setApiKey(e.target.value)}
          onValidar={validarChave}
          onSalvar={salvarChave}
          onLimpar={limparChave}
        />
      )}

      <div className="card" style={{
        marginTop: 16,
        padding: 16,
        height: '60vh',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto'
      }}>
        {chat.length === 0 && !carregando && (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
            <p>Olá! Sou sua assistente virtual do proprietário.</p>
            <p>Pergunte sobre contas, etapas, obras, certidões ou documentos de RH.</p>
            {!apiKeyValid && (
              <p style={{ fontSize: 12, marginTop: 8 }}>
                🔑 Conecte sua API (OpenAI ou Gemini) para respostas com dados reais do sistema.
              </p>
            )}
          </div>
        )}

        {chat.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: msg.tipo === 'user' ? 'row-reverse' : 'row',
            marginBottom: 12,
            gap: 8
          }}>
            {msg.tipo === 'assistant' && (
              <div style={{
                width: 32, height: 32,
                background: 'var(--primaria-escuro)',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                <span style={{ fontSize: 16 }}>🤖</span>
              </div>
            )}
            {msg.tipo === 'user' ? (
              <BubbleUsuario mensagem={msg.texto} />
            ) : (
              <BubbleAssistente
                mensagem={msg.texto}
                fontes={msg.fontes}
                acaoSugerida={msg.acaoSugerida}
                demo={demo}
              />
            )}
          </div>
        ))}

        {carregando && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#64748b' }}>
            <div style={{
              width: 32, height: 32,
              background: 'var(--primaria-escuro)',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0
            }}>
              <span style={{ fontSize: 16 }}>🤖</span>
            </div>
            <div>
              <span>Analisando...</span>
            </div>
          </div>
        )}

        <div ref={fimRef} />
      </div>

      {erro && <div className="erro" role="alert" style={{ marginTop: 8 }}>{erro}</div>}

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PERGUNTAS_RAPIDAS.map((p) => (
            <button
              key={p}
              type="button"
              className="btn btn-linha btn-mini"
              onClick={() => enviarMensagem(p)}
              disabled={carregando}
              style={{ fontSize: 11, whiteSpace: 'nowrap' }}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre prazos, contas, obras, documentos..."
            disabled={carregando}
            rows={2}
            style={{
              flex: 1,
              background: 'var(--fundo-input)',
              border: '1px solid var(--borda)',
              borderRadius: 8,
              padding: '8px 12px',
              color: 'var(--texto)',
              fontSize: 14,
              resize: 'vertical'
            }}
          />
          <button
            type="button"
            onClick={() => enviarMensagem()}
            disabled={carregando || !mensagem.trim()}
            title="Enviar"
            style={{
              padding: '0 16px',
              background: carregando ? 'var(--borda)' : 'var(--primaria)',
              color: carregando ? '#64748b' : '#0c171c',
              border: 'none',
              borderRadius: 8,
              cursor: carregando ? 'default' : 'pointer',
              fontWeight: 700,
              fontSize: 13
            }}
          >
            {carregando ? '…' : '→'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.266 21a2 2 0 0 0 3.464 0" />
      <path d="M 1 11.25a9 9 0 0 1 15.9-6.35 1 1 0 0 1 .65.85v3.75a2 2 0 0 0 2 2h1.5a1 1 0 0 1 .7.7l.3 1.5a1 1 0 0 1-.7 1.2L4.5 22a1 1 0 0 1-1.2-.7l-.3-1.5a1 1 0 0 1 .7-1.2l10.5-.5a1 1 0 0 0 1-.7V8a7 7 0 0 0-13.95.5v2.25a1 1 0 0 0 1 1Z" />
    </svg>
  );
}
