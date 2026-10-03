import { useEffect, useState } from 'react';
import api from '../api.js';
import { fmtMoeda, fmtData } from '../api.js';

const vazioRemb = { beneficiario: '', documento: '', centroCusto: '', observacoes: '' };
const vazioItem = { dataDespesa: '', valor: 0, centroCusto: '', categoria: '', descricao: '', comprovante: '' };

export default function Reembolsos() {
  const [lista, setLista] = useState([]);
  const [obras, setObras] = useState([]);
  const [modal, setModal] = useState(false);
  const [modalItem, setModalItem] = useState(false);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [editando, setEditando] = useState(null);
  const [itemEditando, setItemEditando] = useState(null);
  const [reembolsoAtual, setReembolsoAtual] = useState(null);
  const [form, setForm] = useState(vazioRemb);
  const [itemForm, setItemForm] = useState(vazioItem);
  const [pagamentoForm, setPagamentoForm] = useState({ itemReembolso: '', dataPagamento: '', valor: 0, empresaPagadora: '', contaBancaria: '', comprovante: '', observacao: '' });
  const [erro, setErro] = useState('');
  const [itens, setItens] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [empresas, setEmpresas] = useState([]);

  const carregar = async () => {
    try {
      const [reembolsos, obrs, contas, emps] = await Promise.all([
        api.get('/reembolsos'),
        api.get('/obras'),
        api.get('/contas-bancarias'),
        api.get('/empresas')
      ]);
      setLista(reembolsos.data);
      setObras(obrs.data);
      setContasBancarias(contas.data.contas || []);
      setEmpresas(emps.data);
    } catch (error) {
      setErro('Não foi possível carregar reembolsos.');
    }
  };
  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => { setEditando(null); setForm(vazioRemb); setModal(true); };
  const abrirEdicao = (r) => { 
    setEditando(r._id); 
    setForm({ ...vazioRemb, ...r, centroCusto: r.centroCusto?._id || r.centroCusto || '' }); 
    setModal(true); 
  };

  const verDetalhes = async (r) => {
    try {
      const resp = await api.get(`/reembolsos/${r._id}/resumo`);
      setReembolsoAtual(resp.data);
      setItens(resp.data.itens || []);
      setPagamentos(resp.data.pagamentos || []);
    } catch { setErro('Erro ao carregar detalhes.'); }
  };

  const salvar = async (ev) => {
    ev.preventDefault();
    try {
      if (editando) await api.put(`/reembolsos/${editando}`, form);
      else await api.post('/reembolsos', form);
      setModal(false); carregar();
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao salvar.');
    }
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este reembolso?')) return;
    try { await api.delete(`/reembolsos/${id}`); carregar(); }
    catch { setErro('Não foi possível excluir.'); }
  };

  // ITENS
  const abrirNovoItem = (reembolso) => {
    setReembolsoAtual(reembolso);
    setItemEditando(null);
    setItemForm({ ...vazioItem, centroCusto: reembolso.centroCusto?._id || reembolso.centroCusto || '', dataDespesa: new Date().toISOString().slice(0, 10) });
    setModalItem(true);
  };

  const abrirEdicaoItem = (item) => {
    setItemEditando(item._id);
    setItemForm({ ...vazioItem, ...item, centroCusto: item.centroCusto?._id || item.centroCusto || '', dataDespesa: item.dataDespesa?.slice(0, 10) || '' });
    setModalItem(true);
  };

  const salvarItem = async (ev) => {
    ev.preventDefault();
    try {
      const payload = { ...itemForm, valor: Number(itemForm.valor) };
      if (itemEditando) {
        await api.put(`/itens-reembolso/${itemEditando}`, payload);
      } else {
        await api.post(`/reembolsos/${reembolsoAtual._id}/itens`, payload);
      }
      setModalItem(false);
      await verDetalhes(reembolsoAtual);
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao salvar item.');
    }
  };

  const excluirItem = async (id) => {
    if (!window.confirm('Excluir este item?')) return;
    try { 
      await api.delete(`/itens-reembolso/${id}`); 
      await verDetalhes(reembolsoAtual);
    } catch { setErro('Não foi possível excluir.'); }
  };

  const criarDespesa = async (item) => {
    if (!window.confirm('Criar despesa vinculada a este item?')) return;
    try {
      await api.post(`/itens-reembolso/${item._id}/criar-despesa`, {});
      await verDetalhes(reembolsoAtual);
    } catch { setErro('Erro ao criar despesa.'); }
  };

  // PAGAMENTOS
  const abrirNovoPagamento = (reembolso) => {
    setReembolsoAtual(reembolso);
    setPagamentoForm({ 
      itemReembolso: '', 
      dataPagamento: new Date().toISOString().slice(0, 10), 
      valor: 0, 
      empresaPagadora: empresas[0]?._id || '', 
      contaBancaria: contasBancarias.find(c => c.ativa)?._id || '', 
      comprovante: '', 
      observacao: '' 
    });
    setModalPagamento(true);
  };

  const salvarPagamento = async (ev) => {
    ev.preventDefault();
    try {
      const payload = { ...pagamentoForm, valor: Number(pagamentoForm.valor) };
      await api.post(`/reembolsos/${reembolsoAtual._id}/pagamentos`, payload);
      setModalPagamento(false);
      await verDetalhes(reembolsoAtual);
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao salvar pagamento.');
    }
  };

  const excluirPagamento = async (id) => {
    if (!window.confirm('Excluir este pagamento?')) return;
    try { 
      await api.delete(`/pagamentos-reembolso/${id}`); 
      await verDetalhes(reembolsoAtual);
    } catch { setErro('Não foi possível excluir.'); }
  };

  return (
    <div>
      <div className="topbar">
        <h1>Controle de Reembolsos</h1>
        <button className="btn btn-primario" onClick={abrirNovo}>+ Novo reembolso</button>
      </div>
      {erro && <div className="erro" role="alert">{erro}</div>}
      
      {reembolsoAtual ? (
        <div>
          <div className="topbar" style={{marginTop: 16}}>
            <h2>Detalhes - {reembolsoAtual.reembolso.beneficiario}</h2>
            <button className="btn btn-linha" onClick={() => setReembolsoAtual(null)}>← Voltar</button>
          </div>
          
          <div className="grid-cards">
            <div className="kpi"><div className="rotulo">Valor Total</div><div className="valor">{fmtMoeda(reembolsoAtual.valorTotal)}</div></div>
            <div className="kpi"><div className="rotulo">Valor Pago</div><div className="valor">{fmtMoeda(reembolsoAtual.valorPago)}</div></div>
            <div className="kpi"><div className="rotulo">Saldo</div><div className="valor" style={{color: reembolsoAtual.saldo >= 0 ? 'var(--sucesso)' : 'var(--perigo)'}}>{fmtMoeda(reembolsoAtual.saldo)}</div></div>
          </div>

          <div className="card" style={{marginTop: 16}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
              <h3>Itens do Reembolso</h3>
              <button className="btn btn-primario" onClick={() => abrirNovoItem(reembolsoAtual.reembolso)}>+ Adicionar item</button>
            </div>
            {itens.length === 0 ? <div className="vazio">Nenhum item.</div> : (
              <table>
                <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Obra</th><th>Despesa Vinculada</th><th>Ações</th></tr></thead>
                <tbody>
                  {itens.map(i => (
                    <tr key={i._id}>
                      <td>{fmtData(i.dataDespesa)}</td>
                      <td>{i.descricao || '-'}</td>
                      <td>{i.categoria || '-'}</td>
                      <td>{fmtMoeda(i.valor)}</td>
                      <td>{i.centroCusto?.nome || '-'}</td>
                      <td>{i.despesaVinculada?.descricao || (i.despesaVinculada ? 'Vinculado' : '-')}</td>
                      <td>
                        {!i.despesaVinculada && <button className="btn btn-sucesso btn-mini" onClick={() => criarDespesa(i)}>Criar Despesa</button>}
                        <button className="btn btn-linha btn-mini" onClick={() => abrirEdicaoItem(i)}>Editar</button>
                        <button className="btn btn-perigo btn-mini" onClick={() => excluirItem(i._id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{marginTop: 16}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
              <h3>Pagamentos</h3>
              <button className="btn btn-primario" onClick={() => abrirNovoPagamento(reembolsoAtual.reembolso)}>+ Registrar pagamento</button>
            </div>
            {pagamentos.length === 0 ? <div className="vazio">Nenhum pagamento.</div> : (
              <table>
                <thead><tr><th>Data</th><th>Valor</th><th>Empresa</th><th>Conta</th><th>Lançamento</th><th>Ações</th></tr></thead>
                <tbody>
                  {pagamentos.map(p => (
                    <tr key={p._id}>
                      <td>{fmtData(p.dataPagamento)}</td>
                      <td>{fmtMoeda(p.valor)}</td>
                      <td>{p.empresaPagadora?.nome || '-'}</td>
                      <td>{p.contaBancaria?.nome || '-'}</td>
                      <td>{p.lancamentoVinculado?.descricao || '-'}</td>
                      <td><button className="btn btn-perigo btn-mini" onClick={() => excluirPagamento(p._id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        lista.length === 0 ? (
          <div className="vazio">Nenhum reembolso cadastrado.</div>
        ) : (
          <table>
            <thead><tr><th>Beneficiário</th><th>Documento</th><th>Obra</th><th>Valor Total</th><th>Valor Pago</th><th>Saldo</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {lista.map(r => (
                <tr key={r._id}>
                  <td>{r.beneficiario}</td>
                  <td>{r.documento || '-'}</td>
                  <td>{r.centroCusto?.nome || '-'}</td>
                  <td>{fmtMoeda(r.valorTotal)}</td>
                  <td>{fmtMoeda(r.valorPago)}</td>
                  <td style={{color: Number(r.valorTotal) - Number(r.valorPago) > 0 ? 'var(--perigo)' : 'var(--sucesso)'}}>{fmtMoeda(Number(r.valorTotal) - Number(r.valorPago))}</td>
                  <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                  <td>
                    <button className="btn btn-linha btn-mini" onClick={() => verDetalhes(r)}>Ver</button>
                    <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(r)}>Editar</button>
                    <button className="btn btn-perigo btn-mini" onClick={() => excluir(r._id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editando ? 'Editar reembolso' : 'Novo reembolso'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Beneficiário *</label><input required value={form.beneficiario} onChange={e => setForm({...form, beneficiario: e.target.value})} /></div>
                <div className="campo"><label>Documento</label><input value={form.documento} onChange={e => setForm({...form, documento: e.target.value})} /></div>
                <div className="campo"><label>Obra/Centro de Custo</label>
                  <select value={form.centroCusto} onChange={e => setForm({...form, centroCusto: e.target.value})}>
                    <option value="">—</option>
                    {obras.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
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

      {modalItem && (
        <div className="modal-fundo" onClick={() => setModalItem(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{itemEditando ? 'Editar item' : 'Novo item de reembolso'}</h2>
            <form onSubmit={salvarItem}>
              <div className="form-grid">
                <div className="campo"><label>Data da Despesa *</label><input required type="date" value={itemForm.dataDespesa} onChange={e => setItemForm({...itemForm, dataDespesa: e.target.value})} /></div>
                <div className="campo"><label>Valor (R$) *</label><input required type="number" step="0.01" value={itemForm.valor} onChange={e => setItemForm({...itemForm, valor: e.target.value})} /></div>
                <div className="campo"><label>Obra/Centro de Custo</label>
                  <select value={itemForm.centroCusto} onChange={e => setItemForm({...itemForm, centroCusto: e.target.value})}>
                    <option value="">—</option>
                    {obras.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Categoria</label><input value={itemForm.categoria} onChange={e => setItemForm({...itemForm, categoria: e.target.value})} /></div>
                <div className="campo"><label>Descrição</label><input value={itemForm.descricao} onChange={e => setItemForm({...itemForm, descricao: e.target.value})} /></div>
                <div className="campo"><label>Comprovante</label><input value={itemForm.comprovante} onChange={e => setItemForm({...itemForm, comprovante: e.target.value})} /></div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModalItem(false)}>Cancelar</button>
                <button className="btn btn-primario" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalPagamento && (
        <div className="modal-fundo" onClick={() => setModalPagamento(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Registrar pagamento de reembolso</h2>
            <form onSubmit={salvarPagamento}>
              <div className="form-grid">
                <div className="campo"><label>Item do Reembolso</label>
                  <select value={pagamentoForm.itemReembolso} onChange={e => setPagamentoForm({...pagamentoForm, itemReembolso: e.target.value})}>
                    <option value="">— (pagamento geral)</option>
                    {itens.map(i => <option key={i._id} value={i._id}>{i.descricao} - {fmtMoeda(i.valor)}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Data Pagamento *</label><input required type="date" value={pagamentoForm.dataPagamento} onChange={e => setPagamentoForm({...pagamentoForm, dataPagamento: e.target.value})} /></div>
                <div className="campo"><label>Valor (R$) *</label><input required type="number" step="0.01" value={pagamentoForm.valor} onChange={e => setPagamentoForm({...pagamentoForm, valor: e.target.value})} /></div>
                <div className="campo"><label>Empresa Pagadora *</label>
                  <select required value={pagamentoForm.empresaPagadora} onChange={e => setPagamentoForm({...pagamentoForm, empresaPagadora: e.target.value})}>
                    <option value="">Selecione</option>
                    {empresas.map(e => <option key={e._id} value={e._id}>{e.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Conta Bancária *</label>
                  <select required value={pagamentoForm.contaBancaria} onChange={e => setPagamentoForm({...pagamentoForm, contaBancaria: e.target.value})}>
                    <option value="">Selecione</option>
                    {contasBancarias.filter(c => c.ativa).map(c => <option key={c._id} value={c._id}>{c.nome} — {fmtMoeda(c.saldoAtual)}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Comprovante</label><input value={pagamentoForm.comprovante} onChange={e => setPagamentoForm({...pagamentoForm, comprovante: e.target.value})} /></div>
                <div className="campo"><label>Observação</label><textarea value={pagamentoForm.observacao} onChange={e => setPagamentoForm({...pagamentoForm, observacao: e.target.value})} /></div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModalPagamento(false)}>Cancelar</button>
                <button className="btn btn-primario" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}