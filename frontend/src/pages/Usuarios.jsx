import { useEffect, useState } from 'react';
import api from '../api.js';

const vazio = { nome: '', email: '', role: 'usuario', ativo: true };

export default function Usuarios() {
  const [lista, setLista] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const carregar = async () => {
    try {
      const { data } = await api.get('/usuarios');
      setLista(data);
      setErro('');
    } catch (error) {
      setErro(error.response?.data?.error || 'Nao foi possivel carregar os usuarios.');
    }
  };
  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => { setErro(''); setEditando(null); setForm(vazio); setModal(true); };
  const abrirEdicao = (u) => { setErro(''); setEditando(u._id); setForm({ nome: u.nome, email: u.email, role: u.role, ativo: u.ativo }); setModal(true); };

  const salvar = async (e) => {
    e.preventDefault();
    try {
      if (editando) await api.put(`/usuarios/${editando}`, form);
      else await api.post('/usuarios', form);
      setModal(false);
      await carregar();
    } catch (error) {
      setErro(error.response?.data?.error || 'Nao foi possivel salvar o usuario.');
    }
  };

  const reenviarConvite = async (id) => {
    setErro('');
    setMensagem('');
    try {
      const { data } = await api.post(`/usuarios/${id}/convite`);
      setMensagem(data.message);
    } catch (error) {
      setErro(error.response?.data?.error || 'Nao foi possivel enviar o convite.');
    }
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este usuário?')) return;
    await api.delete(`/usuarios/${id}`); carregar();
  };

  return (
    <div>
      <div className="topbar">
        <h1>Usuários e permissões</h1>
        <button className="btn btn-destaque" onClick={abrirNovo}>+ Novo usuário</button>
      </div>

      {erro && <div className="erro">{erro}</div>}
      {mensagem && <div className="sucesso">{mensagem}</div>}
      <div className="card">
        {lista.length === 0 ? (
          <div className="vazio">Nenhum usuário cadastrado.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Senha</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u._id}>
                  <td>{u.nome}</td>
                  <td>{u.email}</td>
                  <td>{u.role === 'admin' ? 'Administrador' : 'Usuário'}</td>
                  <td>{u.ativo ? 'Ativo' : 'Inativo'}</td>
                  <td>{u.trocarSenha ? 'Troca obrigatória' : 'Atualizada'}</td>
                  <td>
                    <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(u)}>Editar</button>{' '}
                    {u.trocarSenha && <button className="btn btn-linha btn-mini" onClick={() => reenviarConvite(u._id)}>Reenviar convite</button>}{' '}
                    <button className="btn btn-perigo btn-mini" onClick={() => excluir(u._id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editando ? 'Editar usuário' : 'Novo usuário'}</h2>
            {erro && <div className="erro">{erro}</div>}
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Nome *</label><input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                <div className="campo"><label>E-mail *</label><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                {!editando && <p className="sub">Um convite para definir a senha será enviado ao email informado.</p>}
                <div className="campo"><label>Perfil</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="usuario">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="campo"><label>Status</label>
                  <select value={String(form.ativo)} onChange={(e) => setForm({ ...form, ativo: e.target.value === 'true' })}>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primario">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
