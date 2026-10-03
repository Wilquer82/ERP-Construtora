import { useEffect, useState, useRef } from 'react';
import api from '../api.js';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function WhatsApp() {
  const { user } = useAuth();
  const confirmandoRef = useRef(new Set());
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState('');
  const [anexo, setAnexo] = useState(null);
  const [anexoPreview, setAnexoPreview] = useState(null);
  const [status, setStatus] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [confirmando, setConfirmando] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  useEffect(() => {
    carregarStatus();
    carregarHistorico();
  }, []);

  const carregarStatus = async () => {
    try {
      const resp = await api.get('/whatsapp/status');
      setStatus(resp.data);
    } catch { }
  };

  const carregarHistorico = async () => {
    try {
      const resp = await api.get('/assistente/historico?limite=20');
      setHistorico(resp.data);
    } catch { }
  };

  const enviarMensagem = async (e) => {
    e.preventDefault();
    if (!input.trim() && !anexo) return;

    const mensagemUsuario = { tipo: 'usuario', texto: input, anexo: anexoPreview, anexoTipo: anexo?.type, anexoNome: anexo?.name, data: new Date() };
    setMensagens(prev => [...prev, mensagemUsuario]);
    setInput('');
    const anexoAtual = anexo;
    setAnexo(null);
    setAnexoPreview(null);
    setCarregando(true);

    try {
      const resp = await api.post('/assistente/whatsapp/processar', { 
        mensagem: input.trim() || 'Preparar conta a pagar a partir do comprovante anexado.',
        anexo: anexoAtual ? { url: anexoPreview, type: anexoAtual.type } : null 
      });
      
      setMensagens(prev => [...prev, { 
        tipo: 'ia', 
        texto: resp.data.resposta, 
        requerConfirmacao: resp.data.requerConfirmacao,
        interacaoId: resp.data.interacaoId,
        confirmacaoId: resp.data.confirmacaoId,
        previas: resp.data.previas,
        data: new Date() 
      }]);
      
    } catch (error) {
      setMensagens(prev => [...prev, { tipo: 'erro', texto: 'Erro ao processar mensagem.', data: new Date() }]);
    } finally {
      setCarregando(false);
      carregarHistorico();
    }
  };

  const confirmarPrevias = async (interacaoId, confirmacaoId) => {
    if (!interacaoId || !confirmacaoId || confirmandoRef.current.has(confirmacaoId)) return;
    confirmandoRef.current.add(confirmacaoId);
    setConfirmando(confirmacaoId);
    try {
      const resp = await api.post('/assistente/whatsapp/executar-previas', {
        interacaoIAId: interacaoId, confirmacaoId
      });
      const resultados = resp.data.resultados || [];
      const pendencias = resultados.some(resultado => resultado.sucesso === false);
      setMensagens(prev => [
        ...prev.map(msg => msg.confirmacaoId === confirmacaoId ? { ...msg, requerConfirmacao: false } : msg),
        {
          tipo: pendencias ? 'erro' : 'sistema',
          texto: pendencias ? 'Execução concluída com pendências. Consulte os detalhes.' : 'Prévias executadas com sucesso!',
          detalhes: resultados,
          data: new Date()
        }
      ]);
    } catch (error) {
      setMensagens(prev => [...prev, { tipo: 'erro', texto: error.response?.data?.error || 'Erro ao executar prévias.', data: new Date() }]);
    } finally {
      confirmandoRef.current.delete(confirmacaoId);
      setConfirmando(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande (máx 10MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setAnexo(file);
      setAnexoPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removerAnexo = () => {
    setAnexo(null);
    setAnexoPreview(null);
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 280px)'}}>
      <div className="topbar">
        <h2>Lançamentos e comprovantes</h2>
        <div style={{display: 'flex', gap: 8}}>
          {user?.role === 'admin' && <NavLink className="btn btn-linha" to="/assistente/whatsapp">Configurar WhatsApp</NavLink>}
          <button className="btn btn-linha" disabled={carregando || Boolean(confirmando)} onClick={() => setMensagens([])}>Limpar chat</button>
        </div>
      </div>

      {status && <p className="assistente-descricao">WhatsApp: {status.configured ? 'configurado' : 'não configurado'} · Provedor: {status.provider} · Instância: {status.instance || 'Não configurada'}</p>}
      <details style={{marginBottom: 16}}>
        <summary>Histórico de consultas ({historico.length})</summary>
        {historico.length === 0 ? <p>Nenhuma consulta anterior.</p> : historico.map(item => (
          <div className="card" key={item._id} style={{marginTop: 8}}>
            <small>{new Date(item.createdAt).toLocaleString('pt-BR')}</small>
            <p><strong>{item.pergunta}</strong></p>
            <p style={{whiteSpace: 'pre-wrap'}}>{item.resposta}</p>
          </div>
        ))}
      </details>
      <div style={{flex: 1, minHeight: 360, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
        <div style={{flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
          {mensagens.length === 0 ? (
            <div className="vazio" style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
              <div>
                <h3>Assistente financeiro</h3>
                <p>Envie mensagens ou anexe comprovantes para:</p>
                <ul style={{textAlign: 'left', maxWidth: '400px', margin: '16px auto'}}>
                  <li>Consultar contas a pagar/receber</li>
                  <li>Baixar títulos via comprovante</li>
                  <li>Criar despesas a partir de comprovantes</li>
                  <li>Registrar reembolsos (duplo lançamento)</li>
                  <li>Consultar cheques, acordos, recebíveis de obra</li>
                  <li>Ver resumo do dia</li>
                </ul>
                <p style={{color: 'var(--texto-secundario)', fontSize: '14px'}}>
                  A IA prepara prévias e solicita sua confirmação antes de gravar qualquer dado financeiro.
                </p>
              </div>
            </div>
          ) : (
            mensagens.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.tipo === 'usuario' ? 'flex-end' : 'flex-start',
                gap: 8
              }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  background: msg.tipo === 'usuario' ? 'var(--primaria)' : msg.tipo === 'erro' ? 'var(--perigo-claro)' : msg.tipo === 'confirmacao' ? 'var(--aviso-claro)' : 'var(--fundo-card)',
                  color: msg.tipo === 'usuario' ? 'white' : 'inherit',
                  border: msg.tipo === 'confirmacao' ? '2px solid var(--aviso)' : 'none'
                }}>
                  <div style={{fontSize: '12px', opacity: 0.7, marginBottom: 4}}>
                    {msg.tipo === 'usuario' ? 'Você' : msg.tipo === 'ia' ? '🤖 Assistente' : msg.tipo === 'confirmacao' ? '⚠️ Aguardando Confirmação' : 'Sistema'}
                    {' '}• {new Date(msg.data).toLocaleTimeString('pt-BR')}
                  </div>
                  {msg.anexo && (msg.anexoTipo?.startsWith('image/')
                    ? <img src={msg.anexo} alt="Anexo" style={{maxWidth: '200px', borderRadius: 8, marginBottom: 8}} />
                    : <a href={msg.anexo} download={msg.anexoNome} style={{display: 'block', color: 'inherit', textDecoration: 'underline', marginBottom: 8}}>{msg.anexoNome || 'Baixar anexo'}</a>
                  )}
                  <div style={{whiteSpace: 'pre-wrap'}}>{msg.texto}</div>
                  
                  {msg.requerConfirmacao && msg.previas && (
                    <div style={{marginTop: 12, padding: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 8}}>
                      <strong>Prévias para confirmação:</strong>
                      <ul style={{margin: '8px 0', paddingLeft: 20}}>
                        {msg.previas.map((p, idx) => (
                          <li key={idx}><strong>{p.modelo}</strong> - {p.acao}: {JSON.stringify(p.dados).slice(0, 100)}...</li>
                        ))}
                      </ul>
                      <button 
                        className="btn btn-primario btn-mini" 
                        style={{marginTop: 8}}
                        disabled={Boolean(confirmando) || !msg.interacaoId || !msg.confirmacaoId}
                        onClick={() => confirmarPrevias(msg.interacaoId, msg.confirmacaoId)}
                      >
                        {confirmando === msg.confirmacaoId ? 'Executando...' : 'Confirmar e Executar'}
                      </button>
                    </div>
                  )}

                  {msg.detalhes && (
                    <details style={{marginTop: 12}}>
                      <summary>Detalhes da execução</summary>
                      <pre style={{fontSize: '11px', maxHeight: '200px', overflow: 'auto', marginTop: 8}}>{JSON.stringify(msg.detalhes, null, 2)}</pre>
                    </details>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={enviarMensagem} style={{padding: '16px', borderTop: '1px solid var(--borda)', background: 'var(--fundo-card)'}}>
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            {anexoPreview && (
              <div style={{position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--fundo-input)', padding: '4px 8px', borderRadius: 8}}>
                <span>Anexo: {anexo?.name || 'imagem'}</span>
                <button type="button" onClick={removerAnexo} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--perigo)'}}>✕</button>
              </div>
            )}
            <input
              type="file"
              id="anexo-input"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              disabled={carregando}
              style={{display: 'none'}}
            />
            <label htmlFor="anexo-input" className="btn btn-linha" style={{alignSelf: 'center'}}>
              📎 Anexo
            </label>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua mensagem... (ex: 'O que tenho para pagar hoje?', 'Baixar comprovante', 'Reembolso João obra CAPS')"
              style={{flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--borda)', background: 'var(--fundo-input)', color: 'var(--texto)'}}
              disabled={carregando}
            />
            <button type="submit" className="btn btn-primario" disabled={carregando || Boolean(confirmando) || (!input.trim() && !anexo)}>
              {carregando ? 'Processando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
