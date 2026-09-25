import { useEffect, useState } from 'react';
import api from '../api.js';

const vazio = {
  nome: '',
  razaoSocial: '',
  documento: '',
  categoria: 'material',
  email: '',
  telefone: '',
  endereco: '',
  cidade: '',
  uf: '',
  status: 'ativo',
  observacoes: ''
};

export default function Fornecedores() {
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);

  const carregar = () => api.get('/fornecedores').then((r) => setLista(r.data));
  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => { setEditando(null); setForm(vazio); setModal(true); };
  const abrirEdicao = (f) => { setEditando(f._id); setForm({ ...vazio, ...f }); setModal(true); };

  const salvar = async (e) => {
    e.preventDefault();
    if (editando) await api.put(`/fornecedores/${editando}`, form);
    else await api.post('/fornecedores', form);
    setModal(false); carregar();
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este fornecedor?')) return;
    await api.delete(`/fornecedores/${id}`); carregar();
  };

  const filtrados = lista.filter((f) =>
    (f.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
    (f.documento || '').toLowerCase().includes(busca.toLowerCase()) ||
    (f.cidade || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <div className="topbar">
        <h1>Fornecedores</h1>
        <button className="btn btn-destaque" onClick={abrirNovo}>+ Novo fornecedor</button>
      </div>

      <div className="card">
        <div className="filtros">
          <div className="campo" style={{ minWidth: 260 }}>
            <label>Buscar</label>
            <input placeholder="Nome, documento ou cidade..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>

        {filtrados.length === 0 ? (
          <div className="vazio">Nenhum fornecedor encontrado.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Categoria</th>
                <th>Contato</th>
                <th>Cidade/UF</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((f) => (
                <tr key={f._id}>
                  <td>{f.nome}</td>
                  <td>{f.documento || '-'}</td>
                  <td>{f.categoria || '-'}</td>
                  <td>{f.email || '-'}<br />{f.telefone || '-'}</td>
                  <td>{f.cidade || '-'}{f.uf ? ` / ${f.uf}` : ''}</td>
                  <td>{f.status || 'ativo'}</td>
                  <td>
                    <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(f)}>Editar</button>{' '}
                    <button className="btn btn-perigo btn-mini" onClick={() => excluir(f._id)}>Excluir</button>
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
            <h2>{editando ? 'Editar fornecedor' : 'Novo fornecedor'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Nome *</label><input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                <div className="campo"><label>Razão social</label><input value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} /></div>
                <div className="campo"><label>CPF/CNPJ</label><input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></div>
                <div className="campo"><label>Categoria</label><select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  <option value="material">Material</option>
                  <option value="servico">Serviço</option>
                  <option value="outros">Outros</option>
                </select></div>
                <div className="campo"><label>E-mail</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="campo"><label>Telefone</label><input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                <div className="campo"><label>Endereço</label><input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
                <div className="campo"><label>Cidade</label><input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
                <div className="campo"><label>UF</label><input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
                <div className="campo"><label>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select></div>
                <div className="campo" style={{ gridColumn: '1 / -1' }}><label>Observações</label><input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
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
