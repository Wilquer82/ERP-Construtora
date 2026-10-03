import { useEffect, useState } from 'react';
import api from '../api.js';
import { fmtMoeda, fmtData } from '../api.js';

const vazioAcd = { fornecedor: '', fornecedorVinculado: '', centroCusto: '', observacoes: '' };
const vazioDebito = { valor: 0, vencimento: '', centroCusto: '', situacao: 'atrasado', numeroDocumento: '', documento: '' };
const vazioParcela = { numeroDocumento: '', valor: 0, dataVencimento: '', status: 'pendente' };

export default function Acordos() {
  const [lista, setLista] = useState([]);
  const [obras, setObras] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [modal, setModal] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalDebito, setModalDebito] = useState(false);
  const [modalParcela, setModalParcela] = useState(false);
  const [modalGerarParcelas, setModalGerarParcelas] = useState(false);
  const [editando, setEditando] = useState(null);
  const [acordoAtual, setAcordoAtual] = useState(null);
  const [form, setForm] = useState(vazioAcd);
  const [debitoForm, setDebitoForm] = useState(vazioDebito);
  const [parcelaForm, setParcelaForm] = useState(vazioParcela);
  const [gerarForm, setGerarForm] = useState({ numeroParcelas: 1, dataPrimeiroVencimento: '', valorParcela: 0 });
  const [debitos, setDebitos] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const carregar = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.append('status', filtroStatus);
      const [acordos, obrs, forns] = await Promise.all([
        api.get(`/acordos?${params}`),
        api.get('/obras'),
        api.get('/fornecedores')
      ]);
      setLista(acordos.data);
      setObras(obrs.data);
      setFornecedores(forns.data);
    } catch (error) {
      setErro('Não foi possível carregar acordos.');
    }
  };
  useEffect(() => { carregar(); }, [filtroStatus]);

  const abrirNovo = () => { setEditando(null); setForm(vazioAcd); setModal(true); };
  const abrirEdicao = (a) => { 
    setEditando(a._id); 
    setForm({ 
      ...vazioAcd, 
      ...a, 
      fornecedorVinculado: a.fornecedorVinculado?._id || a.fornecedorVinculado,
      centroCusto: a.centroCusto?._id || a.centroCusto
    }); 
    setModal(true); 
  };

  const verDetalhes = async (a) => {
    try {
      const resp = await api.get(`/acordos/${a._id}/resumo`);
      setAcordoAtual(resp.data);
      setDebitos(resp.data.debitos || []);
      setParcelas(resp.data.parcelas || []);
      setResumo({ valorTotalDebito: resp.data.valorTotalDebito, valorTotalAcordo: resp.data.valorTotalAcordo, valorPago: resp.data.valorPago, saldo: resp.data.saldo });
      setModalDetalhes(true);
    } catch { setErro('Erro ao carregar detalhes.'); }
  };

  const salvar = async (ev) => {
    ev.preventDefault();
    try {
      if (editando) await api.put(`/acordos/${editando}`, form);
      else await api.post('/acordos', form);
      setModal(false); carregar();
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao salvar.');
    }
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este acordo?')) return;
    try { await api.delete(`/acordos/${id}`); carregar(); }
    catch { setErro('Não foi possível excluir.'); }
  };

  // DEBITOS
  const abrirNovoDebito = () => {
    setDebitoForm({ ...vazioDebito, centroCusto: acordoAtual?.acordo?.centroCusto?._id || acordoAtual?.acordo?.centroCusto || '', vencimento: new Date().toISOString().slice(0, 10) });
    setModalDebito(true);
  };

  const salvarDebito = async (ev) => {
    ev.preventDefault();
    try {
      const payload = { ...debitoForm, valor: Number(debitoForm.valor) };
      await api.post(`/acordos/${acordoAtual.acordo._id}/debitos`, payload);
      setModalDebito(false);
      await verDetalhes(acordoAtual.acordo);
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao salvar débito.');
    }
  };

  const excluirDebito = async (id) => {
    if (!window.confirm('Excluir este débito?')) return;
    try { await api.delete(`/debitos-originais/${id}`); await verDetalhes(acordoAtual.acordo); }
    catch { setErro('Não foi possível excluir.'); }
  };

  // PARCELAS
  const abrirNovaParcela = () => {
    setParcelaForm({ ...vazioParcela, dataVencimento: new Date().toISOString().slice(0, 10) });
    setModalParcela(true);
  };

  const salvarParcela = async (ev) => {
    ev.preventDefault();
    try {
      const payload = { ...parcelaForm, valor: Number(parcelaForm.valor) };
      await api.post(`/acordos/${acordoAtual.acordo._id}/parcelas`, payload);
      setModalParcela(false);
      await verDetalhes(acordoAtual.acordo);
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao salvar parcela.');
    }
  };

  const abrirGerarParcelas = () => {
    setGerarForm({ 
      numeroParcelas: 1, 
      dataPrimeiroVencimento: new Date().toISOString().slice(0, 10), 
      valorParcela: (resumo?.valorTotalAcordo || 0) > 0 ? resumo.valorTotalAcordo : 0 
    });
    setModalGerarParcelas(true);
  };

  const gerarParcelas = async (ev) => {
    ev.preventDefault();
    if (!window.confirm('Gerar parcelas automaticamente? Isso substituirá parcelas existentes.')) return;
    try {
      await api.post(`/acordos/${acordoAtual.acordo._id}/gerar-parcelas`, gerarForm);
      setModalGerarParcelas(false);
      await verDetalhes(acordoAtual.acordo);
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao gerar parcelas.');
    }
  };

  const baixarParcela = async (parcela) => {
    const dataPagamento = window.prompt('Data do pagamento (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!dataPagamento) return;
    const contaBancaria = window.prompt('ID da conta bancária (opcional):');
    try {
      await api.post(`/parcelas-acordo/${parcela._id}/baixar`, { dataPagamento, contaBancaria: contaBancaria || undefined });
      await verDetalhes(acordoAtual.acordo);
    } catch { setErro('Erro ao baixar parcela.'); }
  };

  const excluirParcela = async (id) => {
    if (!window.confirm('Excluir esta parcela?')) return;
    try { await api.delete(`/parcelas-acordo/${id}`); await verDetalhes(acordoAtual.acordo); }
    catch { setErro('Não foi possível excluir.'); }
  };

  const formatStatus = (s) => {
    const map = { pendente: 'Pendente', pago: 'Pago', em_dia: 'Em dia', atrasado: 'Atrasado', ativo: 'Ativo', quitado: 'Quitado', cancelado: 'Cancelado', em_atraso: 'Em atraso' };
    return map[s] || s;
  };
  const statusColors = { pendente: 'aviso', pago: 'sucesso', em_dia: 'sucesso', atrasado: 'perigo', ativo: 'primario', quitado: 'sucesso', cancelado: 'neutro', em_atraso: 'perigo' };

  return (
    <div>
      <div className="topbar">
        <h1>Controle de Acordos</h1>
        <button className="btn btn-primario" onClick={abrirNovo}>+ Novo acordo</button>
      </div>
      {erro && <div className="erro" role="alert">{erro}</div>}

      {acordoAtual ? (
        <div>
          <div className="topbar" style={{marginTop: 16}}>
            <h2>Acordo - {acordoAtual.acordo.fornecedor || acordoAtual.acordo.fornecedorVinculado?.nome}</h2>
            <button className="btn btn-linha" onClick={() => { setModalDetalhes(false); setAcordoAtual(null); }}>← Voltar</button>
          </div>

          {resumo && (
            <div className="grid-cards" style={{marginBottom: 16}}>
              <div className="kpi"><div className="rotulo">Total Débitos</div><div className="valor">{fmtMoeda(resumo.valorTotalDebito)}</div></div>
              <div className="kpi"><div className="rotulo">Total Acordo</div><div className="valor">{fmtMoeda(resumo.valorTotalAcordo)}</div></div>
              <div className="kpi"><div className="rotulo">Valor Pago</div><div className="valor">{fmtMoeda(resumo.valorPago)}</div></div>
              <div className="kpi"><div className="rotulo">Saldo</div><div className="valor" style={{color: resumo.saldo > 0 ? 'var(--perigo)' : 'var(--sucesso)'}}>{fmtMoeda(resumo.saldo)}</div></div>
            </div>
          )}

          <div className="card" style={{marginTop: 16}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
              <h3>Débitos Originais</h3>
              <button className="btn btn-primario" onClick={abrirNovoDebito}>+ Adicionar débito</button>
            </div>
            {debitos.length === 0 ? <div className="vazio">Nenhum débito.</div> : (
              <table>
                <thead><tr><th>Valor</th><th>Vencimento</th><th>Obra</th><th>Situação</th><th>Nº Documento</th><th>Doc</th><th>Ações</th></tr></thead>
                <tbody>
                  {debitos.map(d => (
                    <tr key={d._id}>
                      <td>{fmtMoeda(d.valor)}</td>
                      <td>{fmtData(d.vencimento)}</td>
                      <td>{d.centroCusto?.nome || '-'}</td>
                      <td><span className={`badge ${d.situacao}`}>{d.situacao}</span></td>
                      <td>{d.numeroDocumento || '-'}</td>
                      <td>{d.documento ? '✓' : '-'}</td>
                      <td><button className="btn btn-perigo btn-mini" onClick={() => excluirDebito(d._id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{marginTop: 16}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
              <h3>Parcelas do Acordo</h3>
              <div>
                {parcelas.length === 0 && <button className="btn btn-primario" onClick={abrirGerarParcelas}>Gerar parcelas</button>}
                {parcelas.length > 0 && <button className="btn btn-primario" onClick={abrirNovaParcela}>+ Adicionar parcela</button>}
              </div>
            </div>
            {parcelas.length === 0 ? <div className="vazio">Nenhuma parcela gerada.</div> : (
              <table>
                <thead><tr><th>Nº Documento</th><th>Valor</th><th>Vencimento</th><th>Pagamento</th><th>Status</th><th>Conta</th><th>Lançamento</th><th>Ações</th></tr></thead>
                <tbody>
                  {parcelas.map(p => (
                    <tr key={p._id}>
                      <td>{p.numeroDocumento || '-'}</td>
                      <td>{fmtMoeda(p.valor)}</td>
                      <td>{fmtData(p.dataVencimento)}</td>
                      <td>{fmtData(p.dataPagamento)}</td>
                      <td><span className={`badge ${statusColors[p.status] || ''}`}>{formatStatus(p.status)}</span></td>
                      <td>{p.contaBancaria?.nome || '-'}</td>
                      <td>{p.lancamentoVinculado?.descricao || '-'}</td>
                      <td>
                        {p.status !== 'pago' && <button className="btn btn-sucesso btn-mini" onClick={() => baixarParcela(p)}>Baixar</button>}
                        <button className="btn btn-perigo btn-mini" onClick={() => excluirParcela(p._id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="filtros">
            <div className="campo"><label>Status</label>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="quitado">Quitado</option>
                <option value="cancelado">Cancelado</option>
                <option value="em_atraso">Em atraso</option>
              </select>
            </div>
          </div>

          {lista.length === 0 ? (
            <div className="vazio">Nenhum acordo cadastrado.</div>
          ) : (
            <table>
              <thead><tr><th>Fornecedor</th><th>Obra</th><th>Total Débito</th><th>Total Acordo</th><th>Pago</th><th>Saldo</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {lista.map(a => {
                  const saldo = Number(a.valorTotalAcordo) - Number(a.valorPago);
                  return (
                    <tr key={a._id}>
                      <td>{a.fornecedor || a.fornecedorVinculado?.nome || '-'}</td>
                      <td>{a.centroCusto?.nome || '-'}</td>
                      <td>{fmtMoeda(a.valorTotalDebito)}</td>
                      <td>{fmtMoeda(a.valorTotalAcordo)}</td>
                      <td>{fmtMoeda(a.valorPago)}</td>
                      <td style={{color: saldo > 0 ? 'var(--perigo)' : 'var(--sucesso)'}}>{fmtMoeda(saldo)}</td>
                      <td><span className={`badge ${statusColors[a.status] || ''}`}>{formatStatus(a.status)}</span></td>
                      <td>
                        <button className="btn btn-linha btn-mini" onClick={() => verDetalhes(a)}>Ver</button>
                        <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(a)}>Editar</button>
                        <button className="btn btn-perigo btn-mini" onClick={() => excluir(a._id)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editando ? 'Editar acordo' : 'Novo acordo'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Fornecedor *</label><input required value={form.fornecedor} onChange={e => setForm({...form, fornecedor: e.target.value})} placeholder="Nome do fornecedor" /></div>
                <div className="campo"><label>Fornecedor Vinculado</label>
                  <select value={form.fornecedorVinculado} onChange={e => setForm({...form, fornecedorVinculado: e.target.value})}>
                    <option value="">—</option>
                    {fornecedores.map(f => <option key={f._id} value={f._id}>{f.nome} ({f.razaoSocial || f.documento})</option>)}
                  </select>
                </div>
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

      {modalDebito && (
        <div className="modal-fundo" onClick={() => setModalDebito(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Novo débito original</h2>
            <form onSubmit={salvarDebito}>
              <div className="form-grid">
                <div className="campo"><label>Valor *</label><input required type="number" step="0.01" value={debitoForm.valor} onChange={e => setDebitoForm({...debitoForm, valor: e.target.value})} /></div>
                <div className="campo"><label>Vencimento *</label><input required type="date" value={debitoForm.vencimento} onChange={e => setDebitoForm({...debitoForm, vencimento: e.target.value})} /></div>
                <div className="campo"><label>Obra</label>
                  <select value={debitoForm.centroCusto} onChange={e => setDebitoForm({...debitoForm, centroCusto: e.target.value})}>
                    <option value="">—</option>
                    {obras.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Situação</label>
                  <select value={debitoForm.situacao} onChange={e => setDebitoForm({...debitoForm, situacao: e.target.value})}>
                    <option value="atrasado">Atrasado</option>
                    <option value="em_dia">Em dia</option>
                    <option value="cartorio">Cartório</option>
                  </select>
                </div>
                <div className="campo"><label>Nº Documento</label><input value={debitoForm.numeroDocumento} onChange={e => setDebitoForm({...debitoForm, numeroDocumento: e.target.value})} /></div>
                <div className="campo"><label>Documento (URL)</label><input value={debitoForm.documento} onChange={e => setDebitoForm({...debitoForm, documento: e.target.value})} /></div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModalDebito(false)}>Cancelar</button>
                <button className="btn btn-primario" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalParcela && (
        <div className="modal-fundo" onClick={() => setModalParcela(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Nova parcela</h2>
            <form onSubmit={salvarParcela}>
              <div className="form-grid">
                <div className="campo"><label>Nº Documento</label><input value={parcelaForm.numeroDocumento} onChange={e => setParcelaForm({...parcelaForm, numeroDocumento: e.target.value})} /></div>
                <div className="campo"><label>Valor *</label><input required type="number" step="0.01" value={parcelaForm.valor} onChange={e => setParcelaForm({...parcelaForm, valor: e.target.value})} /></div>
                <div className="campo"><label>Vencimento *</label><input required type="date" value={parcelaForm.dataVencimento} onChange={e => setParcelaForm({...parcelaForm, dataVencimento: e.target.value})} /></div>
                <div className="campo"><label>Status</label>
                  <select value={parcelaForm.status} onChange={e => setParcelaForm({...parcelaForm, status: e.target.value})}>
                    <option value="pendente">Pendente</option>
                    <option value="em_dia">Em dia</option>
                    <option value="atrasado">Atrasado</option>
                  </select>
                </div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModalParcela(false)}>Cancelar</button>
                <button className="btn btn-primario" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalGerarParcelas && (
        <div className="modal-fundo" onClick={() => setModalGerarParcelas(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Gerar parcelas automaticamente</h2>
            <form onSubmit={gerarParcelas}>
              <div className="form-grid">
                <div className="campo"><label>Número de Parcelas *</label><input required type="number" min="1" value={gerarForm.numeroParcelas} onChange={e => setGerarForm({...gerarForm, numeroParcelas: Number(e.target.value)})} /></div>
                <div className="campo"><label>Primeiro Vencimento *</label><input required type="date" value={gerarForm.dataPrimeiroVencimento} onChange={e => setGerarForm({...gerarForm, dataPrimeiroVencimento: e.target.value})} /></div>
                <div className="campo"><label>Valor por Parcela (aprox)</label><input type="number" step="0.01" value={gerarForm.valorParcela} onChange={e => setGerarForm({...gerarForm, valorParcela: Number(e.target.value)})} placeholder="Última parcela ajusta o restante" /></div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModalGerarParcelas(false)}>Cancelar</button>
                <button className="btn btn-primario" type="submit">Gerar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}