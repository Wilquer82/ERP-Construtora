import { useEffect, useState } from 'react';
import api, { fmtMoeda, fmtData } from '../api.js';
import { exportarFinanceiroCsv, exportarFinanceiroExcel } from '../utils/exporters.js';

const vazio = { tipo: 'pagar', descricao: '', categoria: '', valor: 0, dataVencimento: '', status: 'pendente', obra: '', cliente: '', fornecedor: '', formaPagamento: '', observacoes: '' };

export default function Financeiro() {
  const [lista, setLista] = useState([]);
  const [obras, setObras] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);
  const [bancos, setBancos] = useState({ contas: [], saldoTotal: 0 });
  const [modalConta, setModalConta] = useState(false);
  const [contaForm, setContaForm] = useState({ nome: '', banco: '', agencia: '', numeroConta: '', tipo: 'corrente', saldoInicial: 0 });
  const [extrato, setExtrato] = useState(null);
  const [baixaAtual, setBaixaAtual] = useState(null);
  const [contaBaixa, setContaBaixa] = useState('');
  const [dataBaixa, setDataBaixa] = useState(new Date().toISOString().slice(0, 10));
  const [mesExportacao, setMesExportacao] = useState(new Date().toISOString().slice(0, 7));
  const [erro, setErro] = useState('');

  const carregar = async () => {
    const params = new URLSearchParams();
    if (filtroTipo) params.append('tipo', filtroTipo);
    if (filtroStatus) params.append('status', filtroStatus);
    try {
      const [financeiro, obrasResponse, clientesResponse, bancosResponse] = await Promise.all([
        api.get(`/financeiro?${params}`),
        api.get('/obras'),
        api.get('/clientes'),
        api.get('/contas-bancarias')
      ]);
      setLista(financeiro.data);
      setObras(obrasResponse.data);
      setClientes(clientesResponse.data);
      setBancos(bancosResponse.data);
      setContaBaixa((atual) => atual || bancosResponse.data.contas.find((conta) => conta.ativa)?._id || '');
      setErro('');
    } catch (error) {
      setErro(error.response?.data?.error || 'Não foi possível carregar o financeiro e as contas bancárias.');
    }
  };
  useEffect(() => { carregar(); }, [filtroTipo, filtroStatus]);

  const totalPendente = lista.filter((l) => l.status !== 'pago').reduce((acc, l) => acc + (l.tipo === 'receber' ? l.valor : -l.valor), 0);

  const abrirNovo = () => { setEditando(null); setForm(vazio); setModal(true); };
  const abrirEdicao = (l) => {
    setEditando(l._id);
    setForm({ ...vazio, ...l, obra: l.obra?._id || '', cliente: l.cliente?._id || '', dataVencimento: l.dataVencimento?.slice(0, 10) || '' });
    setModal(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, valor: Number(form.valor) };
      delete payload.status;
      if (editando) await api.put(`/financeiro/${editando}`, payload);
      else await api.post('/financeiro', payload);
      setModal(false); carregar();
    } catch (error) {
      setErro(error.response?.data?.error || 'Não foi possível salvar o lançamento.');
    }
  };

  const baixar = (lancamento) => {
    setBaixaAtual(lancamento);
    setDataBaixa(new Date().toISOString().slice(0, 10));
    setContaBaixa(bancos.contas.find((conta) => conta.ativa)?._id || '');
  };

  const confirmarBaixa = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/financeiro/${baixaAtual._id}/baixar`, { contaBancaria: contaBaixa, dataPagamento: dataBaixa });
      setBaixaAtual(null);
      await carregar();
    } catch (error) {
      setErro(error.response?.data?.error || 'Não foi possível conciliar a baixa.');
    }
  };

  const criarConta = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contas-bancarias', { ...contaForm, saldoInicial: Number(contaForm.saldoInicial) });
      setContaForm({ nome: '', banco: '', agencia: '', numeroConta: '', tipo: 'corrente', saldoInicial: 0 });
      setModalConta(false);
      await carregar();
    } catch (error) {
      setErro(error.response?.data?.error || 'Não foi possível cadastrar a conta bancária.');
    }
  };

  const abrirExtrato = async (conta) => {
    try {
      const resposta = await api.get(`/contas-bancarias/${conta._id}/movimentos`);
      setExtrato({ conta, movimentos: resposta.data });
    } catch (error) {
      setErro(error.response?.data?.error || 'Não foi possível carregar o extrato bancário.');
    }
  };

  const exportarMes = async (excel) => {
    if (!/^\d{4}-\d{2}$/.test(mesExportacao)) {
      setErro('Selecione um mês válido para exportar.');
      return;
    }
    const [ano, mes] = mesExportacao.split('-').map(Number);
    const fim = new Date(ano, mes, 0).getDate();
    const params = new URLSearchParams({ inicio: `${mesExportacao}-01`, fim: `${mesExportacao}-${String(fim).padStart(2, '0')}` });
    if (filtroTipo) params.append('tipo', filtroTipo);
    if (filtroStatus) params.append('status', filtroStatus);
    try {
      const resposta = await api.get(`/financeiro?${params}`);
      if (excel) await exportarFinanceiroExcel(resposta.data, mesExportacao);
      else exportarFinanceiroCsv(resposta.data);
      setErro('');
    } catch (error) {
      setErro(error.response?.data?.error || 'Não foi possível exportar o financeiro do mês.');
    }
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este lançamento?')) return;
    await api.delete(`/financeiro/${id}`); carregar();
  };

  return (
    <div>
      <div className="topbar">
        <h1>Financeiro (Contas a pagar / receber)</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="campo"><span>Mês para exportar</span><input type="month" value={mesExportacao} onChange={(e) => setMesExportacao(e.target.value)} /></label>
          <button className="btn btn-linha" onClick={() => exportarMes(false)}>CSV do mês</button>
          <button className="btn btn-linha" onClick={() => exportarMes(true)}>Excel do mês</button>
          <button className="btn btn-destaque" onClick={abrirNovo}>+ Novo lançamento</button>
        </div>
      </div>
      {erro && <div className="erro" role="alert">{erro}</div>}

      <div className="topbar" style={{ marginTop: 18 }}>
        <h2 style={{ margin: 0 }}>Contas bancárias</h2>
        <button className="btn btn-linha" onClick={() => setModalConta(true)}>+ Cadastrar conta</button>
      </div>
      <div className="grid-cards">
        <div className="kpi positivo"><div className="rotulo">Saldo bancário conciliado</div><div className="valor">{fmtMoeda(bancos.saldoTotal)}</div></div>
        {bancos.contas.map((conta) => (
          <div className="kpi" key={conta._id}>
            <div className="rotulo">{conta.nome} — {conta.banco} •••• {conta.numeroConta.slice(-4)}</div>
            <div className="valor">{fmtMoeda(conta.saldoAtual)}</div>
            <button className="btn btn-linha btn-mini" onClick={() => abrirExtrato(conta)}>Ver conciliações</button>
          </div>
        ))}
      </div>

      <div className="grid-cards">
        <div className="kpi"><div className="rotulo">Saldo pendente (receber - pagar)</div><div className="valor" style={{ color: totalPendente >= 0 ? 'var(--sucesso)' : 'var(--perigo)' }}>{fmtMoeda(totalPendente)}</div></div>
        <div className="kpi positivo"><div className="rotulo">A receber em aberto</div><div className="valor">{fmtMoeda(lista.filter((l) => l.tipo === 'receber' && l.status !== 'pago').reduce((a, l) => a + l.valor, 0))}</div></div>
        <div className="kpi negativo"><div className="rotulo">A pagar em aberto</div><div className="valor">{fmtMoeda(lista.filter((l) => l.tipo === 'pagar' && l.status !== 'pago').reduce((a, l) => a + l.valor, 0))}</div></div>
      </div>

      <div className="card">
        <div className="filtros">
          <div className="campo"><label>Tipo</label>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="pagar">A pagar</option>
              <option value="receber">A receber</option>
            </select>
          </div>
          <div className="campo"><label>Status</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="vazio">Nenhum lançamento encontrado.</div>
        ) : (
          <table>
            <thead><tr><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Vencimento</th><th>Pagamento</th><th>Obra</th><th>Conta conciliada</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l._id}>
                  <td><span className="badge" style={{ background: l.tipo === 'receber' ? '#d5f0e0' : '#fadbd8', color: l.tipo === 'receber' ? '#1e7e45' : '#b03a2e' }}>{l.tipo}</span></td>
                  <td>{l.descricao}</td>
                  <td>{l.categoria || '-'}</td>
                  <td style={{ color: l.tipo === 'receber' ? 'var(--sucesso)' : 'var(--perigo)', fontWeight: 600 }}>{l.tipo === 'receber' ? '+' : '-'}{fmtMoeda(l.valor)}</td>
                  <td>{fmtData(l.dataVencimento)}</td>
                  <td>{fmtData(l.dataPagamento)}</td>
                  <td>{l.obra?.nome || '-'}</td>
                  <td>{l.contaBancaria?.nome || (l.status === 'pago' ? 'Não conciliado' : '-')}</td>
                  <td><span className={`badge ${l.status}`}>{l.status}</span></td>
                  <td>
                    {(!l.movimentoBancario) && <button className="btn btn-sucesso btn-mini" onClick={() => baixar(l)} disabled={!bancos.contas.some((conta) => conta.ativa)}>{l.status === 'pago' ? 'Conciliar baixa' : 'Baixar / conciliar'}</button>}{' '}
                    {l.status !== 'pago' && <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(l)}>Editar</button>}{' '}
                    {l.status !== 'pago' && <button className="btn btn-perigo btn-mini" onClick={() => excluir(l._id)}>✕</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {modalConta && (
          <div className="modal-fundo" onClick={() => setModalConta(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Cadastrar conta bancária</h2>
              <form onSubmit={criarConta}>
                <div className="form-grid">
                  <div className="campo"><label>Nome da conta *</label><input required value={contaForm.nome} onChange={(e) => setContaForm({ ...contaForm, nome: e.target.value })} /></div>
                  <div className="campo"><label>Banco *</label><input required value={contaForm.banco} onChange={(e) => setContaForm({ ...contaForm, banco: e.target.value })} /></div>
                  <div className="campo"><label>Agência</label><input value={contaForm.agencia} onChange={(e) => setContaForm({ ...contaForm, agencia: e.target.value })} /></div>
                  <div className="campo"><label>Número da conta *</label><input required value={contaForm.numeroConta} onChange={(e) => setContaForm({ ...contaForm, numeroConta: e.target.value })} /></div>
                  <div className="campo"><label>Tipo</label><select value={contaForm.tipo} onChange={(e) => setContaForm({ ...contaForm, tipo: e.target.value })}><option value="corrente">Corrente</option><option value="poupanca">Poupança</option><option value="pagamento">Pagamento</option></select></div>
                  <div className="campo"><label>Saldo inicial conciliado (R$)</label><input type="number" step="0.01" value={contaForm.saldoInicial} onChange={(e) => setContaForm({ ...contaForm, saldoInicial: e.target.value })} /></div>
                </div>
                <div className="modal-acoes"><button type="button" className="btn btn-linha" onClick={() => setModalConta(false)}>Cancelar</button><button className="btn btn-primario" type="submit">Salvar conta</button></div>
              </form>
            </div>
          </div>
        )}
        {baixaAtual && (
          <div className="modal-fundo" onClick={() => setBaixaAtual(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Baixar e conciliar lançamento</h2>
              <p>{baixaAtual.descricao} — {fmtMoeda(baixaAtual.valor)}</p>
              <form onSubmit={confirmarBaixa}>
                <div className="form-grid">
                  <div className="campo"><label>Conta bancária *</label>
                    <select required value={contaBaixa} onChange={(e) => setContaBaixa(e.target.value)}>
                      <option value="">Selecione uma conta</option>
                      {bancos.contas.filter((conta) => conta.ativa).map((conta) => <option key={conta._id} value={conta._id}>{conta.nome} — saldo {fmtMoeda(conta.saldoAtual)}</option>)}
                    </select>
                  </div>
                  <div className="campo"><label>Data efetiva *</label><input required type="date" value={dataBaixa} onChange={(e) => setDataBaixa(e.target.value)} /></div>
                </div>
                <div className="modal-acoes"><button type="button" className="btn btn-linha" onClick={() => setBaixaAtual(null)}>Cancelar</button><button className="btn btn-primario" type="submit">Confirmar conciliação</button></div>
              </form>
            </div>
          </div>
        )}
        {extrato && (
          <div className="modal-fundo" onClick={() => setExtrato(null)}>
            <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
              <h2>Movimentos conciliados — {extrato.conta.nome}</h2>
              {extrato.movimentos.length === 0 ? <div className="vazio">Nenhuma conciliação registrada.</div> : (
                <table>
                  <thead><tr><th>Data</th><th>Descrição</th><th>Lançamento</th><th>Tipo</th><th>Valor</th></tr></thead>
                  <tbody>{extrato.movimentos.map((movimento) => (
                    <tr key={movimento._id}>
                      <td>{fmtData(movimento.data)}</td>
                      <td>{movimento.descricao}</td>
                      <td>{movimento.lancamento?.descricao || '-'}</td>
                      <td>{movimento.tipo}</td>
                      <td>{movimento.tipo === 'credito' ? '+' : '-'}{fmtMoeda(movimento.valor)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
              <div className="modal-acoes"><button className="btn btn-linha" onClick={() => setExtrato(null)}>Fechar</button></div>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editando ? 'Editar lançamento' : 'Novo lançamento'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Tipo *</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    <option value="pagar">A pagar</option>
                    <option value="receber">A receber</option>
                  </select>
                </div>
                <div className="campo"><label>Descrição *</label><input required value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
                <div className="campo"><label>Categoria</label><input placeholder="materiais, mao de obra..." value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
                <div className="campo"><label>Valor (R$) *</label><input required type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
                <div className="campo"><label>Vencimento *</label><input required type="date" value={form.dataVencimento} onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })} /></div>
                <div className="campo"><label>Obra</label>
                  <select value={form.obra} onChange={(e) => setForm({ ...form, obra: e.target.value })}>
                    <option value="">—</option>
                    {obras.map((o) => <option key={o._id} value={o._id}>{o.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Cliente</label>
                  <select value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })}>
                    <option value="">—</option>
                    {clientes.map((c) => <option key={c._id} value={c._id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Fornecedor</label><input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
                <div className="campo"><label>Forma de pagamento</label><input value={form.formaPagamento} onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })} /></div>
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
