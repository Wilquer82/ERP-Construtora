import { useEffect, useState } from 'react';
import api from '../api.js';
import { fmtMoeda, fmtData } from '../api.js';

const vazioEmp = { nome: '', cpfCnpj: '', telefone: '', email: '', endereco: '', observacoes: '', ativo: true };

export default function Empreiteiros() {
  const [lista, setLista] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazioEmp);
  const [erro, setErro] = useState('');

  const carregar = async () => {
    try {
      const resp = await api.get('/empreiteiros');
      setLista(resp.data);
    } catch (error) {
      setErro('Não foi possível carregar empreiteiros.');
    }
  };
  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => { setEditando(null); setForm(vazioEmp); setModal(true); };
  const abrirEdicao = (e) => { setEditando(e._id); setForm(e); setModal(true); };

  const salvar = async (ev) => {
    ev.preventDefault();
    try {
      if (editando) await api.put(`/empreiteiros/${editando}`, form);
      else await api.post('/empreiteiros', form);
      setModal(false); carregar();
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao salvar.');
    }
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este empreiteiro?')) return;
    try { await api.delete(`/empreiteiros/${id}`); carregar(); }
    catch { setErro('Não foi possível excluir.'); }
  };

  return (
    <div>
      <div className="topbar">
        <h1>Empreiteiros</h1>
        <button className="btn btn-primario" onClick={abrirNovo}>+ Novo empreiteiro</button>
      </div>
      {erro && <div className="erro" role="alert">{erro}</div>}
      {lista.length === 0 ? (
        <div className="vazio">Nenhum empreiteiro cadastrado.</div>
      ) : (
        <table>
          <thead><tr><th>Nome</th><th>CPF/CNPJ</th><th>Telefone</th><th>Email</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {lista.map((e) => (
              <tr key={e._id}>
                <td>{e.nome}</td>
                <td>{e.cpfCnpj || '-'}</td>
                <td>{e.telefone || '-'}</td>
                <td>{e.email || '-'}</td>
                <td><span className={`badge ${e.ativo ? 'sucesso' : 'perigo'}`}>{e.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td>
                  <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(e)}>Editar</button>
                  <button className="btn btn-perigo btn-mini" onClick={() => excluir(e._id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editando ? 'Editar empreiteiro' : 'Novo empreiteiro'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Nome *</label><input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div>
                <div className="campo"><label>CPF/CNPJ</label><input value={form.cpfCnpj} onChange={e => setForm({...form, cpfCnpj: e.target.value})} /></div>
                <div className="campo"><label>Telefone</label><input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} /></div>
                <div className="campo"><label>Email</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div className="campo"><label>Endereço</label><input value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})} /></div>
                <div className="campo"><label>Observações</label><textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} /></div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-primario" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}