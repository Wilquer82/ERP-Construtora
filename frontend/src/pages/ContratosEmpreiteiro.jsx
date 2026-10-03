import { useEffect, useState } from 'react';
import api from '../api.js';
import { fmtMoeda, fmtData } from '../api.js';

const vazioCont = { empreiteiro: '', obra: '', numero: '', objeto: '', valorTotal: 0, dataInicio: '', dataFim: '', dataAssinatura: '', status: 'rascunho', observacoes: '' };

export default function ContratosEmpreiteiro() {
  const [lista, setLista] = useState([]);
  const [empreiteiros, setEmpreiteiros] = useState([]);
  const [obras, setObras] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazioCont);
  const [erro, setErro] = useState('');

  const carregar = async () => {
    try {
      const [contratos, emps, obrs] = await Promise.all([
        api.get('/contratos-empreiteiro'),
        api.get('/empreiteiros'),
        api.get('/obras')
      ]);
      setLista(contratos.data);
      setEmpreiteiros(emps.data);
      setObras(obrs.data);
    } catch (error) {
      setErro('Não foi possível carregar contratos.');
    }
  };
  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => { setEditando(null); setForm(vazioCont); setModal(true); };
  const abrirEdicao = (c) => { 
    setEditando(c._id); 
    setForm({ 
      ...vazioCont, 
      ...c, 
      empreiteiro: c.empreiteiro?._id || c.empreiteiro,
      obra: c.obra?._id || c.obra,
      dataInicio: c.dataInicio?.slice(0, 10) || '',
      dataFim: c.dataFim?.slice(0, 10) || '',
      dataAssinatura: c.dataAssinatura?.slice(0, 10) || ''
    }); 
    setModal(true); 
  };

  const salvar = async (ev) => {
    ev.preventDefault();
    try {
      const payload = { ...form, valorTotal: Number(form.valorTotal) };
      if (editando) await api.put(`/contratos-empreiteiro/${editando}`, payload);
      else await api.post('/contratos-empreiteiro', payload);
      setModal(false); carregar();
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao salvar.');
    }
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este contrato?')) return;
    try { await api.delete(`/contratos-empreiteiro/${id}`); carregar(); }
    catch { setErro('Não foi possível excluir.'); }
  };

  const verMovimentos = async (contrato) => {
    try {
      const resp = await api.get(`/contratos-empreiteiro/${contrato._id}/movimentos`);
      window.open().document.write(`
        <h2>Movimentos - ${contrato.numero}</h2>
        <pre>${JSON.stringify(resp.data, null, 2)}</pre>
      `);
    } catch { setErro('Erro ao carregar movimentos.'); }
  };

  const verResumo = async (contrato) => {
    try {
      const resp = await api.get(`/contratos-empreiteiro/${contrato._id}/resumo`);
      window.open().document.write(`
        <h2>Resumo - ${contrato.numero}</h2>
        <pre>${JSON.stringify(resp.data, null, 2)}</pre>
      `);
    } catch { setErro('Erro ao carregar resumo.'); }
  };

  return (
    <div>
      <div className="topbar">
        <h1>Contratos de Empreiteiros</h1>
        <button className="btn btn-primario" onClick={abrirNovo}>+ Novo contrato</button>
      </div>
      {erro && <div className="erro" role="alert">{erro}</div>}
      {lista.length === 0 ? (
        <div className="vazio">Nenhum contrato cadastrado.</div>
      ) : (
        <table>
          <thead><tr><th>Número</th><th>Empreiteiro</th><th>Obra</th><th>Valor</th><th>Status</th><th>Início</th><th>Fim</th><th>Ações</th></tr></thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c._id}>
                <td>{c.numero}</td>
                <td>{c.empreiteiro?.nome || c.empreiteiro}</td>
                <td>{c.obra?.nome || c.obra?.codigo || '-'}</td>
                <td>{fmtMoeda(c.valorTotal)}</td>
                <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                <td>{fmtData(c.dataInicio)}</td>
                <td>{fmtData(c.dataFim)}</td>
                <td>
                  <button className="btn btn-linha btn-mini" onClick={() => verResumo(c)}>Resumo</button>
                  <button className="btn btn-linha btn-mini" onClick={() => verMovimentos(c)}>Movimentos</button>
                  <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(c)}>Editar</button>
                  <button className="btn btn-perigo btn-mini" onClick={() => excluir(c._id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editando ? 'Editar contrato' : 'Novo contrato'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Empreiteiro *</label>
                  <select required value={form.empreiteiro} onChange={e => setForm({...form, empreiteiro: e.target.value})}>
                    <option value="">Selecione</option>
                    {empreiteiros.map(e => <option key={e._id} value={e._id}>{e.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Obra *</label>
                  <select required value={form.obra} onChange={e => setForm({...form, obra: e.target.value})}>
                    <option value="">Selecione</option>
                    {obras.map(o => <option key={o._id} value={o._id}>{o.nome} ({o.codigo})</option>)}
                  </select>
                </div>
                <div className="campo"><label>Número *</label><input required value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} /></div>
                <div className="campo"><label>Objeto</label><input value={form.objeto} onChange={e => setForm({...form, objeto: e.target.value})} /></div>
                <div className="campo"><label>Valor Total (R$) *</label><input required type="number" step="0.01" value={form.valorTotal} onChange={e => setForm({...form, valorTotal: e.target.value})} /></div>
                <div className="campo"><label>Data Início</label><input type="date" value={form.dataInicio} onChange={e => setForm({...form, dataInicio: e.target.value})} /></div>
                <div className="campo"><label>Data Fim</label><input type="date" value={form.dataFim} onChange={e => setForm({...form, dataFim: e.target.value})} /></div>
                <div className="campo"><label>Data Assinatura</label><input type="date" value={form.dataAssinatura} onChange={e => setForm({...form, dataAssinatura: e.target.value})} /></div>
                <div className="campo"><label>Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="rascunho">Rascunho</option>
                    <option value="ativo">Ativo</option>
                    <option value="suspenso">Suspenso</option>
                    <option value="encerrado">Encerrado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
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