import { useEffect, useState } from 'react';
import api from '../api.js';
import { fmtMoeda, fmtData } from '../api.js';

const vazioUser = { numero: '', nome: '', perfil: 'consulta', permissoes: { consultar: true, lancar: false, confirmar: false, verDocumentos: false }, ativo: true };

export default function UsuarioWhatsApp() {
  const [lista, setLista] = useState([]);
  const [modal, setModal] = useState(false);
  const [modalTeste, setModalTeste] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazioUser);
  const [testeForm, setTesteForm] = useState({ numero: '', mensagem: 'Mensagem de teste do ERP Construtora' });
  const [status, setStatus] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = async () => {
    try {
      const [users, st] = await Promise.all([
        api.get('/usuario-whatsapp'),
        api.get('/whatsapp/status')
      ]);
      setLista(users.data);
      setStatus(st.data);
    } catch (error) {
      setErro('Não foi possível carregar usuários WhatsApp.');
    }
  };
  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => { setEditando(null); setForm(vazioUser); setModal(true); };
  const abrirEdicao = (u) => { 
    setEditando(u._id); 
    setForm({ 
      ...vazioUser, 
      ...u, 
      permissoes: { ...vazioUser.permissoes, ...u.permissoes }
    }); 
    setModal(true); 
  };

  const salvar = async (ev) => {
    ev.preventDefault();
    try {
      if (editando) await api.put(`/usuario-whatsapp/${editando}`, form);
      else await api.post('/usuario-whatsapp', form);
      setModal(false); carregar();
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao salvar.');
    }
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este usuário?')) return;
    try { await api.delete(`/usuario-whatsapp/${id}`); carregar(); }
    catch { setErro('Não foi possível excluir.'); }
  };

  const abrirTeste = () => {
    setTesteForm({ numero: '', mensagem: 'Mensagem de teste do ERP Construtora' });
    setModalTeste(true);
  };

  const enviarTeste = async (ev) => {
    ev.preventDefault();
    try {
      await api.post('/whatsapp/testar', testeForm);
      setModalTeste(false);
      alert('Mensagem de teste enviada!');
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao enviar teste.');
    }
  };

  const perfilLabels = {
    consulta: 'Apenas Consulta',
    financeiro: 'Financeiro (pode lançar)',
    administrador: 'Administrador (pode confirmar)'
  };

  return (
    <div>
      <div className="topbar">
        <h1>Usuários WhatsApp Autorizados</h1>
        <div style={{display: 'flex', gap: 8}}>
          <button className="btn btn-primario" onClick={abrirNovo}>+ Novo usuário</button>
          <button className="btn btn-linha" onClick={abrirTeste}>Testar envio</button>
        </div>
      </div>

      {status && (
        <div className="card" style={{marginBottom: 16, borderColor: status.configured ? 'var(--sucesso)' : 'var(--aviso)'}}>
          <h3>Status da Integração WhatsApp</h3>
          <p><strong>Provedor:</strong> {status.provider}</p>
          <p><strong>Instância:</strong> {status.instance || 'Não configurada'}</p>
          <p><strong>Configurado:</strong> {status.configured ? '✅ Sim' : '❌ Não'}</p>
          {!status.configured && (
            <div className="erro" style={{marginTop: 8}}>
              Configure as variáveis de ambiente: WHATSAPP_PROVIDER, WHATSAPP_BASE_URL, WHATSAPP_API_KEY, WHATSAPP_INSTANCE, WHATSAPP_VERIFY_TOKEN
            </div>
          )}
        </div>
      )}

      {erro && <div className="erro" role="alert">{erro}</div>}

      {lista.length === 0 ? (
        <div className="vazio">Nenhum usuário WhatsApp cadastrado.</div>
      ) : (
        <table>
          <thead><tr><th>Nome</th><th>Número</th><th>Perfil</th><th>Permissões</th><th>Status</th><th>Último Acesso</th><th>Ações</th></tr></thead>
          <tbody>
            {lista.map(u => (
              <tr key={u._id}>
                <td>{u.nome}</td>
                <td>{u.numero}</td>
                <td><span className="badge">{perfilLabels[u.perfil] || u.perfil}</span></td>
                <td>
                  {u.permissoes.consultar && '👁️ '}
                  {u.permissoes.lancar && '✏️ '}
                  {u.permissoes.confirmar && '✅ '}
                  {u.permissoes.verDocumentos && '📄 '}
                </td>
                <td><span className={`badge ${u.ativo ? 'sucesso' : 'perigo'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td>{fmtData(u.ultimoAcesso)}</td>
                <td>
                  <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(u)}>Editar</button>
                  <button className="btn btn-perigo btn-mini" onClick={() => excluir(u._id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editando ? 'Editar usuário WhatsApp' : 'Novo usuário WhatsApp'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Número WhatsApp *</label><input required value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} placeholder="5511999999999" /></div>
                <div className="campo"><label>Nome *</label><input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div>
                <div className="campo"><label>Perfil *</label>
                  <select value={form.perfil} onChange={e => setForm({...form, perfil: e.target.value})}>
                    <option value="consulta">Apenas Consulta</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>
                <div className="campo"><label>Permissões</label>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                    <label><input type="checkbox" checked={form.permissoes.consultar} onChange={e => setForm({...form, permissoes: {...form.permissoes, consultar: e.target.checked}})} /> Consultar dados</label>
                    <label><input type="checkbox" checked={form.permissoes.lancar} onChange={e => setForm({...form, permissoes: {...form.permissoes, lancar: e.target.checked}})} /> Lançar/Preparar movimentações</label>
                    <label><input type="checkbox" checked={form.permissoes.confirmar} onChange={e => setForm({...form, permissoes: {...form.permissoes, confirmar: e.target.checked}})} /> Confirmar gravações</label>
                    <label><input type="checkbox" checked={form.permissoes.verDocumentos} onChange={e => setForm({...form, permissoes: {...form.permissoes, verDocumentos: e.target.checked}})} /> Ver documentos/comprovantes</label>
                  </div>
                </div>
                <div className="campo"><label>Ativo</label>
                  <select value={form.ativo.toString()} onChange={e => setForm({...form, ativo: e.target.value === 'true'})}>
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-primario" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalTeste && (
        <div className="modal-fundo" onClick={() => setModalTeste(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Enviar mensagem de teste</h2>
            <form onSubmit={enviarTeste}>
              <div className="form-grid">
                <div className="campo"><label>Número *</label><input required value={testeForm.numero} onChange={e => setTesteForm({...testeForm, numero: e.target.value})} placeholder="5511999999999" /></div>
                <div className="campo"><label>Mensagem *</label><textarea required value={testeForm.mensagem} onChange={e => setTesteForm({...testeForm, mensagem: e.target.value})} /></div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModalTeste(false)}>Cancelar</button>
                <button className="btn btn-primario" type="submit">Enviar teste</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}