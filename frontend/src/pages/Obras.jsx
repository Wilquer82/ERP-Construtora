import { useEffect, useState } from 'react';
import api, { fmtMoeda, fmtData } from '../api.js';

const vazio = { codigo: '', nome: '', descricao: '', endereco: '', cidade: '', uf: '', cliente: '', status: 'planejamento', valorOrcamento: 0, dataInicio: '', dataPrevisaoFim: '', responsavel: '' };

export default function Obras() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);
  const [obraEtapas, setObraEtapas] = useState(null);
  const [etapas, setEtapas] = useState([]);
  const [medicoes, setMedicoes] = useState([]);
  const [etapaForm, setEtapaForm] = useState({ descricao: '', unidade: 'un', quantidadeTotal: '', precoUnitario: '' });
  const [medicaoForm, setMedicaoForm] = useState({ etapa: '', quantidade: '', data: new Date().toISOString().slice(0, 10), observacao: '' });
  const [medicaoAtual, setMedicaoAtual] = useState(null);
  const [sugestoesEstoque, setSugestoesEstoque] = useState([]);
  const [baixasConcluidas, setBaixasConcluidas] = useState([]);
  const [erroEtapas, setErroEtapas] = useState('');

  const carregar = () => {
    api.get('/obras').then((r) => setLista(r.data));
    api.get('/clientes').then((r) => setClientes(r.data));
  };
  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => { setEditando(null); setForm(vazio); setModal(true); };
  const abrirEdicao = (o) => {
    const dadosObra = { ...o };
    delete dadosObra.percentualConclusao;
    delete dadosObra.percentualFinanceiro;
    delete dadosObra.valorOrcamentoComparativo;
    delete dadosObra.valorConsumido;
    setEditando(o._id);
    setForm({ ...vazio, ...dadosObra, cliente: o.cliente?._id || '', dataInicio: o.dataInicio ? o.dataInicio.slice(0, 10) : '', dataPrevisaoFim: o.dataPrevisaoFim ? o.dataPrevisaoFim.slice(0, 10) : '' });
    setModal(true);
  };

  const abrirEtapas = async (obra) => {
    setObraEtapas(obra);
    setEtapaForm({ descricao: '', unidade: 'un', quantidadeTotal: '', precoUnitario: '' });
    setMedicaoForm({ etapa: '', quantidade: '', data: new Date().toISOString().slice(0, 10), observacao: '' });
    setMedicaoAtual(null);
    setSugestoesEstoque([]);
    setBaixasConcluidas([]);
    setErroEtapas('');
    try {
      const [resEtapas, resMedicoes] = await Promise.all([
        api.get(`/obras/${obra._id}/etapas`),
        api.get('/medicoes', { params: { obra: obra._id } })
      ]);
      setEtapas(resEtapas.data);
      setMedicoes(resMedicoes.data);
    } catch (error) {
      setErroEtapas(error.response?.data?.error || 'Não foi possível carregar etapas e medições.');
    }
  };

  const salvarEtapa = async (e) => {
    e.preventDefault();
    setErroEtapas('');
    try {
      const resposta = await api.post(`/obras/${obraEtapas._id}/etapas`, {
        ...etapaForm,
        quantidadeTotal: Number(etapaForm.quantidadeTotal),
        precoUnitario: Number(etapaForm.precoUnitario)
      });
      setEtapas((atuais) => [...atuais, resposta.data]);
      setEtapaForm({ descricao: '', unidade: 'un', quantidadeTotal: '', precoUnitario: '' });
    } catch (error) {
      setErroEtapas(error.response?.data?.error || 'Não foi possível salvar a etapa.');
    }
  };

  const salvarMedicao = async (e) => {
    e.preventDefault();
    setErroEtapas('');
    try {
      const resposta = await api.post('/medicoes', {
        obra: obraEtapas._id,
        etapa: medicaoForm.etapa,
        quantidade: Number(medicaoForm.quantidade),
        data: medicaoForm.data,
        observacao: medicaoForm.observacao
      });
      setEtapas((atuais) => atuais.map((etapa) => etapa._id === resposta.data.etapa._id ? resposta.data.etapa : etapa));
      setMedicoes((atuais) => [resposta.data.medicao, ...atuais]);
      setMedicaoAtual(resposta.data.medicao);
      setSugestoesEstoque(resposta.data.sugestoesEstoque || []);
      setBaixasConcluidas([]);
      setMedicaoForm((atual) => ({ ...atual, quantidade: '', observacao: '' }));
      carregar();
    } catch (error) {
      setErroEtapas(error.response?.data?.error || 'Não foi possível registrar a medição.');
    }
  };

  const baixarEstoqueSugerido = async (sugestao) => {
    if (!medicaoAtual) return;
    setErroEtapas('');
    try {
      await api.post(`/medicoes/${medicaoAtual._id}/baixa-estoque`, { material: sugestao.material });
      setBaixasConcluidas((atuais) => [...atuais, String(sugestao.material)]);
    } catch (error) {
      setErroEtapas(error.response?.data?.error || 'Não foi possível dar baixa no estoque.');
    }
  };

  const salvar = async (e) => {
    e.preventDefault();
    const payload = { ...form, valorOrcamento: Number(form.valorOrcamento) };
    if (editando) await api.put(`/obras/${editando}`, payload);
    else await api.post('/obras', payload);
    setModal(false); carregar();
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir esta obra?')) return;
    await api.delete(`/obras/${id}`); carregar();
  };

  const filtradas = filtroStatus ? lista.filter((o) => o.status === filtroStatus) : lista;

  return (
    <div>
      <div className="topbar">
        <h1>Obras</h1>
        <button className="btn btn-destaque" onClick={abrirNovo}>+ Nova obra</button>
      </div>

      <div className="card">
        <div className="filtros">
          <div className="campo">
            <label>Status</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="planejamento">Planejamento</option>
              <option value="em_andamento">Em andamento</option>
              <option value="pausada">Pausada</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>
        </div>

        {filtradas.length === 0 ? (
          <div className="vazio">Nenhuma obra encontrada.</div>
        ) : (
          <table>
            <thead><tr><th>Código</th><th>Obra</th><th>Cliente</th><th>Status</th><th>Conclusão</th><th>Orçamento</th><th>Início</th><th>Previsão</th><th>Ações</th></tr></thead>
            <tbody>
              {filtradas.map((o) => (
                <tr key={o._id}>
                  <td>{o.codigo || '-'}</td>
                  <td>{o.nome}</td>
                  <td>{o.cliente?.nome || '-'}</td>
                  <td><span className={`badge ${o.status}`}>{o.status.replace('_', ' ')}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="barra-progresso"><div style={{ width: `${o.percentualConclusao}%` }} /></div>
                      <small>{o.percentualConclusao}%</small>
                    </div>
                  </td>
                  <td>{fmtMoeda(o.valorOrcamento)}</td>
                  <td>{fmtData(o.dataInicio)}</td>
                  <td>{fmtData(o.dataPrevisaoFim)}</td>
                  <td>
                    <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(o)}>Editar</button>{' '}
                    <button className="btn btn-linha btn-mini" onClick={() => abrirEtapas(o)}>Etapas / medições</button>{' '}
                    <button className="btn btn-perigo btn-mini" onClick={() => excluir(o._id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {obraEtapas && (
          <div className="modal-fundo" onClick={() => setObraEtapas(null)}>
            <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
              <h2>Etapas e medições — {obraEtapas.nome}</h2>
              {erroEtapas && <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{erroEtapas}</div>}
              <div className="card">
                <h3>Etapas da obra</h3>
                {etapas.length === 0 ? <div className="vazio">Cadastre etapas para calcular o avanço físico.</div> : (
                  <table>
                    <thead><tr><th>Etapa</th><th>Unidade</th><th>Medido / total</th><th>Preço unitário</th><th>Status</th></tr></thead>
                    <tbody>{etapas.map((etapa) => (
                      <tr key={etapa._id}>
                        <td>{etapa.descricao}</td>
                        <td>{etapa.unidade}</td>
                        <td>{etapa.quantidadeMedida} / {etapa.quantidadeTotal}</td>
                        <td>{fmtMoeda(etapa.precoUnitario)}</td>
                        <td>{etapa.status.replace('_', ' ')}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
                <form onSubmit={salvarEtapa} className="form-grid" style={{ marginTop: 12 }}>
                  <div className="campo"><label>Descrição *</label><input required value={etapaForm.descricao} onChange={(e) => setEtapaForm({ ...etapaForm, descricao: e.target.value })} /></div>
                  <div className="campo"><label>Unidade *</label><input required value={etapaForm.unidade} onChange={(e) => setEtapaForm({ ...etapaForm, unidade: e.target.value })} /></div>
                  <div className="campo"><label>Quantidade orçada *</label><input required type="number" min="0.01" step="0.01" value={etapaForm.quantidadeTotal} onChange={(e) => setEtapaForm({ ...etapaForm, quantidadeTotal: e.target.value })} /></div>
                  <div className="campo"><label>Preço unitário (R$) *</label><input required type="number" min="0" step="0.01" value={etapaForm.precoUnitario} onChange={(e) => setEtapaForm({ ...etapaForm, precoUnitario: e.target.value })} /></div>
                  <div className="campo" style={{ alignSelf: 'end' }}><button className="btn btn-linha" type="submit">Adicionar etapa</button></div>
                </form>
              </div>

              <div className="card" style={{ marginTop: 12 }}>
                <h3>Registrar medição</h3>
                {etapas.length === 0 ? <div className="vazio">Cadastre ao menos uma etapa antes de medir.</div> : (
                  <form onSubmit={salvarMedicao}>
                    <div className="form-grid">
                      <div className="campo"><label>Etapa *</label>
                        <select required value={medicaoForm.etapa} onChange={(e) => setMedicaoForm({ ...medicaoForm, etapa: e.target.value })}>
                          <option value="">Selecione</option>
                          {etapas.map((etapa) => <option key={etapa._id} value={etapa._id} disabled={etapa.quantidadeMedida >= etapa.quantidadeTotal}>{etapa.descricao} ({etapa.quantidadeTotal - etapa.quantidadeMedida} {etapa.unidade} restantes)</option>)}
                        </select>
                      </div>
                      <div className="campo"><label>Quantidade medida *</label><input required type="number" min="0.01" step="0.01" value={medicaoForm.quantidade} onChange={(e) => setMedicaoForm({ ...medicaoForm, quantidade: e.target.value })} /></div>
                      <div className="campo"><label>Data</label><input type="date" value={medicaoForm.data} onChange={(e) => setMedicaoForm({ ...medicaoForm, data: e.target.value })} /></div>
                      <div className="campo"><label>Observação</label><input value={medicaoForm.observacao} onChange={(e) => setMedicaoForm({ ...medicaoForm, observacao: e.target.value })} /></div>
                    </div>
                    <button className="btn btn-primario" type="submit" style={{ marginTop: 12 }}>Registrar medição</button>
                  </form>
                )}
                {sugestoesEstoque.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <h4>Sugestões de baixa de estoque</h4>
                    <p>A quantidade é proporcional ao avanço medido e aos itens de material vinculados à etapa. A baixa só ocorre após sua confirmação.</p>
                    <table>
                      <thead><tr><th>Material</th><th>Quantidade sugerida</th><th>Ação</th></tr></thead>
                      <tbody>{sugestoesEstoque.map((sugestao) => {
                        const baixado = baixasConcluidas.includes(String(sugestao.material));
                        return (
                          <tr key={sugestao.material}>
                            <td>{sugestao.nome}</td>
                            <td>{sugestao.quantidade} {sugestao.unidade}</td>
                            <td><button className="btn btn-linha btn-mini" disabled={baixado} onClick={() => baixarEstoqueSugerido(sugestao)}>{baixado ? 'Estoque baixado' : 'Confirmar baixa'}</button></td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card" style={{ marginTop: 12 }}>
                <h3>Histórico de medições</h3>
                {medicoes.length === 0 ? <div className="vazio">Nenhuma medição registrada.</div> : (
                  <table>
                    <thead><tr><th>Data</th><th>Etapa</th><th>Quantidade</th><th>Observação</th></tr></thead>
                    <tbody>{medicoes.map((medicao) => (
                      <tr key={medicao._id}>
                        <td>{fmtData(medicao.data)}</td>
                        <td>{medicao.etapa?.descricao || '-'}</td>
                        <td>{medicao.quantidade} {medicao.etapa?.unidade || ''}</td>
                        <td>{medicao.observacao || '-'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
              <div className="modal-acoes"><button className="btn btn-linha" onClick={() => setObraEtapas(null)}>Fechar</button></div>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editando ? 'Editar obra' : 'Nova obra'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Código</label><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
                <div className="campo"><label>Nome *</label><input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                <div className="campo"><label>Cliente</label>
                  <select value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })}>
                    <option value="">— Selecione —</option>
                    {clientes.map((c) => <option key={c._id} value={c._id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="planejamento">Planejamento</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="pausada">Pausada</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
                <div className="campo"><label>Valor do orçamento (R$)</label><input type="number" step="0.01" value={form.valorOrcamento} onChange={(e) => setForm({ ...form, valorOrcamento: e.target.value })} /></div>
                <div className="campo"><label>Data de início</label><input type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} /></div>
                <div className="campo"><label>Previsão de término</label><input type="date" value={form.dataPrevisaoFim} onChange={(e) => setForm({ ...form, dataPrevisaoFim: e.target.value })} /></div>
                <div className="campo"><label>Responsável</label><input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
                <div className="campo"><label>Cidade</label><input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
                <div className="campo"><label>UF</label><input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
                <div className="campo" style={{ gridColumn: '1 / -1' }}><label>Endereço</label><input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
                <div className="campo" style={{ gridColumn: '1 / -1' }}><label>Descrição</label><textarea rows="2" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
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
