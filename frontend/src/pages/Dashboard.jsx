import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import api, { fmtMoeda, fmtData } from '../api.js';

const statusColors = {
  planejamento: '#a78bfa',
  em_andamento: '#38bdf8',
  pausada: '#fbbf24',
  concluida: '#22c55e'
};

export default function Dashboard() {
  const [dados, setDados] = useState(null);
  const [fluxo, setFluxo] = useState([]);
  const [alertas, setAlertas] = useState({ estoqueBaixo: [], contasVencendo: [], obrasAtrasadas: [] });
  const [erroAlertas, setErroAlertas] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/resumo'),
      api.get('/dashboard/fluxo-caixa')
    ]).then(([resumo, fluxoCaixa]) => {
      setDados(resumo.data);
      setFluxo(fluxoCaixa.data || []);
    }).catch(() => {
      setDados(null);
      setFluxo([]);
    });
    api.get('/dashboard/alertas').then((alertasResponse) => {
      setAlertas(alertasResponse.data);
      setErroAlertas('');
    }).catch(() => {
      setAlertas({ estoqueBaixo: [], contasVencendo: [], obrasAtrasadas: [] });
      setErroAlertas('Não foi possível carregar os alertas operacionais.');
    });
  }, []);

  if (!dados) return <div className="vazio">Carregando indicadores...</div>;

  const cards = [
    { rotulo: 'Obras cadastradas', valor: dados.totalObras, cls: '' },
    { rotulo: 'Clientes', valor: dados.totalClientes, cls: '' },
    { rotulo: 'Contratos', valor: dados.totalContratos, cls: '' },
    { rotulo: 'A pagar (em aberto)', valor: fmtMoeda(dados.aPagar), cls: 'negativo' },
    { rotulo: 'A receber (em aberto)', valor: fmtMoeda(dados.aReceber), cls: 'positivo' },
    { rotulo: 'Saldo previsto', valor: fmtMoeda(dados.saldoPrevisto), cls: dados.saldoPrevisto >= 0 ? 'positivo' : 'negativo' },
    { rotulo: 'Materiais abaixo do mínimo', valor: dados.materiaisAbaixo, cls: dados.materiaisAbaixo > 0 ? 'alerta' : '' },
  ];

  const pieData = (dados.obrasPorStatus || []).map((item) => ({
    name: item.status?.replace('_', ' ') || 'Sem status',
    value: item.total,
    color: statusColors[item.status] || '#64748b'
  }));

  const barData = (dados.obrasConclusao || []).slice(0, 8).map((obra) => ({
    name: obra.nome.length > 18 ? `${obra.nome.slice(0, 18)}...` : obra.nome,
    percentualFisico: Number(obra.percentualConclusao) || 0,
    percentualFinanceiro: Number(obra.percentualFinanceiro) || 0
  }));

  return (
    <div>
      <div className="topbar"><h1>Dashboard</h1></div>
      {erroAlertas && <div className="erro" role="alert">{erroAlertas}</div>}
      {(alertas.estoqueBaixo.length > 0 || alertas.contasVencendo.length > 0 || alertas.obrasAtrasadas.length > 0) && (
        <div className="card" style={{ marginBottom: 18, borderColor: 'var(--aviso)' }}>
          <h3>Alertas operacionais</h3>
          {alertas.estoqueBaixo.length > 0 && <p><strong>Estoque abaixo do mínimo:</strong> {alertas.estoqueBaixo.map((material) => `${material.nome} (${material.estoqueAtual}/${material.estoqueMinimo})`).join(' • ')} <Link to="/materiais">Ver estoque</Link></p>}
          {alertas.contasVencendo.length > 0 && <p><strong>Contas a pagar vencendo em até 3 dias:</strong> {alertas.contasVencendo.map((conta) => `${conta.descricao} (${fmtData(conta.dataVencimento)} — ${fmtMoeda(conta.valor)})`).join(' • ')} <Link to="/financeiro">Abrir financeiro</Link></p>}
          {alertas.obrasAtrasadas.length > 0 && <p><strong>Obras atrasadas mais de 10 p.p.:</strong> {alertas.obrasAtrasadas.map((obra) => `${obra.nome} (previsto ${obra.percentualPrevisto}%, realizado ${obra.percentualConclusao}%)`).join(' • ')} <Link to="/obras">Ver obras</Link></p>}
        </div>
      )}
      <div className="grid-cards">
        {cards.map((c) => (
          <div key={c.rotulo} className={`kpi ${c.cls}`}>
            <div className="rotulo">{c.rotulo}</div>
            <div className="valor">{c.valor}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12, color: 'var(--primaria-escura)' }}>Fluxo de caixa previsto</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={fluxo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis tickFormatter={(v) => `R$ ${Number(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmtMoeda(v)} />
              <Legend />
              <Line type="monotone" dataKey="aPagar" name="A pagar" stroke="#ef4444" strokeWidth={3} />
              <Line type="monotone" dataKey="aReceber" name="A receber" stroke="#22c55e" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-cards" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12, color: 'var(--primaria-escura)' }}>Obras por status</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v} obras`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 12, color: 'var(--primaria-escura)' }}>Avanço físico × orçamento consumido</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={barData} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={90} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
                <Bar dataKey="percentualFisico" name="Avanço físico" fill="#2563eb" radius={[0, 4, 4, 0]} />
                <Bar dataKey="percentualFinanceiro" name="Orçamento consumido (pago)" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12, color: 'var(--primaria-escura)' }}>Materiais abaixo do estoque mínimo</h3>
        {dados.materiaisAbaixoLista.length === 0 ? (
          <div className="vazio">Todos os materiais atendem o nível mínimo.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {dados.materiaisAbaixoLista.map((material) => (
              <li key={material.nome} style={{ marginBottom: 8 }}>
                <strong>{material.nome}</strong> — faltam {material.falta} {material.falta === 1 ? 'unidade' : 'unidades'} (estoque {material.estoqueAtual} / mínimo {material.estoqueMinimo}).
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12, color: 'var(--primaria-escura)' }}>Obras recentes</h3>
        {dados.obrasRecentes.length === 0 ? (
          <div className="vazio">Nenhuma obra ainda. <Link to="/obras">Criar primeira obra</Link></div>
        ) : (
          <table>
            <thead>
              <tr><th>Obra</th><th>Cliente</th><th>Status</th><th>Avanço físico</th><th>Orçamento consumido</th><th>Início</th></tr>
            </thead>
            <tbody>
              {dados.obrasRecentes.map((o) => (
                <tr key={o._id}>
                  <td>{o.nome}</td>
                  <td>{o.cliente?.nome || '-'}</td>
                  <td><span className={`badge ${o.status}`}>{o.status.replace('_', ' ')}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="barra-progresso"><div style={{ width: `${o.percentualConclusao}%` }} /></div>
                      <small>{o.percentualConclusao}%</small>
                    </div>
                  </td>
                  <td>{fmtMoeda(o.valorConsumido)} / {fmtMoeda(o.valorOrcamentoComparativo)} ({Number(o.percentualFinanceiro) || 0}%)</td>
                  <td>{fmtData(o.dataInicio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
