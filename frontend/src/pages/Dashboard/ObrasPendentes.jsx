import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { fmtMoeda, fmtData } from '../../api.js';

const statusLabel = {
  planejamento: 'Planejamento',
  em_andamento: 'Andamento',
  pausada: 'Pausada',
  concluida: 'Concluída'
};

const statusCor = {
  planejamento: '#64748b',
  em_andamento: '#35d18a',
  pausada: '#f59e0b',
  concluida: '#477ddd'
};

export default function ObrasPendentes() {
  const [obras, setObras] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true);
        const { data } = await api.get('/dashboard/obras-pendentes');
        setObras(data);
        setErro('');
      } catch (err) {
        setErro(err.response?.data?.error || 'Erro ao carregar obras.');
        setObras([]);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  if (carregando) {
    return <div className="vazio">Carregando obras...</div>;
  }

  if (erro) {
    return <div className="erro" role="alert">{erro}</div>;
  }

  const totalCusto = obras.reduce((s, o) => s + (o.custoRealizado?.total || 0), 0);
  const totalCombustivel = obras.reduce((s, o) => s + (o.custoRealizado?.combustivel || 0), 0);
  const totalReceita = obras.reduce((s, o) => s + (o.receitaRealizada || 0), 0);
  const totalLucro = obras.reduce((s, o) => s + (o.lucroReal || 0), 0);

  return (
    <div>
      <div className="topbar">
        <h1>Painel de Obras em Andamento</h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
          {obras.length} obra(s) em andamento ou planejamento
        </p>
      </div>

      <div className="card" style={{ padding: 16, marginTop: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: '#91a4b2', marginBottom: 2 }}>Custo total (combustível incluído)</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--perigo)' }}>{fmtMoeda(totalCusto)}</div>
          <div style={{ fontSize: 12, color: '#91a4b2' }}>Combustível: {fmtMoeda(totalCombustivel)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#91a4b2', marginBottom: 2 }}>Receita recebida</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#35d18a' }}>{fmtMoeda(totalReceita)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#91a4b2', marginBottom: 2 }}>Lucro real</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: totalLucro >= 0 ? '#35d18a' : '#ef4444' }}>
            {fmtMoeda(totalLucro)}
          </div>
        </div>
      </div>

      {obras.length === 0 ? (
        <div className="vazio" style={{ marginTop: 24 }}>
          Nenhuma obra em andamento no momento.
        </div>
      ) : (
        <div style={{ marginTop: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Obra</th>
                <th>Status</th>
                <th className="desktop">Cliente</th>
                <th className="desktop">Orçamento</th>
                <th>Recebido</th>
                <th>A receber</th>
                <th className="desktop">Receita real</th>
                <th className="desktop">Custo</th>
                <th className="desktop">Combustível</th>
                <th className="desktop">Lucro</th>
                <th>Margem</th>
                <th>Físico</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {obras.map((obra) => {
                const c = obra.custoRealizado || {};
                const custoTotal = Number(c.total) || 0;
                const combustivel = Number(c.combustivel) || 0;
                const receitaRealizada = Number(obra.receitaRealizada) || 0;
                const lucro = Number(obra.lucroReal) || 0;
                const margem = Number(obra.margemPercentual) || 0;
                const fisico = Number(obra.percentualFisico) || 0;
                const receitaAReceber = Number(obra.receitaAReceber) || 0;
                const previsto = Number(obra.valorOrcamento) || 0;

                return (
                  <tr key={String(obra._id)}>
                    <td>
                      <Link to={`/obras/${obra._id}`} style={{ fontWeight: 600, color: 'var(--primaria-claro)' }}>
                        {obra.codigo ? `${obra.codigo} — ${obra.nome}` : obra.nome}
                      </Link>
                    </td>
                    <td>
                      <span style={{
                        color: statusCor[obra.status] || '#64748b',
                        fontWeight: 600,
                        fontSize: 11
                      }}>{statusLabel[obra.status] || obra.status}</span>
                    </td>
                    <td className="desktop">{obra.cliente || '—'}</td>
                    <td className="desktop">{fmtMoeda(previsto)}</td>
                    <td>{fmtMoeda(receitaRealizada)}</td>
                    <td>{fmtMoeda(receitaAReceber)}</td>
                    <td className="desktop">{fmtMoeda(receitaRealizada)}</td>
                    <td className="desktop">{fmtMoeda(custoTotal)}</td>
                    <td className="desktop">
                      <div>{fmtMoeda(combustivel)}</div>
                      {combustivel > 0 && custoTotal > 0 && (
                        <div style={{ fontSize: 10, color: '#91a4b2' }}>
                          {Math.round((combustivel / custoTotal) * 100)}%
                        </div>
                      )}
                    </td>
                    <td className="desktop" style={{ color: lucro >= 0 ? '#35d18a' : '#ef4444', fontWeight: lucro >= 0 ? 600 : 500 }}>
                      {fmtMoeda(lucro)}
                    </td>
                    <td>{margem}%</td>
                    <td>
                      <div>{fisico}%</div>
                      <div style={{
                        width: '40px',
                        height: 4,
                        background: 'var(--fundo-input)',
                        borderRadius: 2,
                        marginTop: 2,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(100, fisico)}%`,
                          height: '100%',
                          background: '#35d18a',
                          borderRadius: 2
                        }} />
                      </div>
                    </td>
                    <td>
                      <Link to={`/obras/${obra._id}/relatorio?inicio=${new Date().toISOString().split('T')[0]}&fim=${new Date().toISOString().split('T')[0]}`} className="btn btn-linha btn-mini">
                        🔍
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
