import { useState } from 'react';
import { FOLHAS_MOCK, COLABORADORES_MOCK, OBRAS_MOCK } from '../../utils/mockData.js';

const meses = ['Janeiro', 'Feverdeiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function Folha() {
  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();
  const [folhas] = useState(FOLHAS_MOCK);
  const [mês, setMes] = useState(mesAtual);
  const [ano, setAno] = useState(anoAtual);

  const handleExportCSV = () => {
    const header = 'Nome,CPF,Funcao,Tipo,Diaria,Dias Trabalhados,Bruto,Adiantamentos,Liquido,Obra,Status';
    const rows = folhas.map((f) => [
      f.colaborador?.nome || '',
      f.colaborador?.cpf || '',
      f.colaborador?.funcao || '',
      f.colaborador?.tipo || '',
      (f.valorDiaria || 0).toFixed(2),
      f.diasTrabalhados || 0,
      (f.totalBruto || 0).toFixed(2),
      (f.adiantamentos || 0).toFixed(2),
      (f.totalLiquido || 0).toFixed(2),
      f.obra?.nome || '',
      f.status
    ].join(';'));

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `folha-${mês}-${ano}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="topbar">
        <h1>Folha de Pagamento</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
          <div className="campo"><label>Mês</label>
            <select value={mês} onChange={(e) => setMes(Number(e.target.value))}>
              {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="campo"><label>Ano</label><input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} style={{ width: 80 }} /></div>
          <button className="btn btn-linha" onClick={handleExportCSV}>Exportar CSV</button>
        </div>
      </div>

      <div className="card">
        {folhas.length === 0 ? (
          <div className="vazio">Nenhuma folha para este período.</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Função</th>
                  <th>Tipo</th>
                  <th>Diária (R$)</th>
                  <th>Dias trabalhados</th>
                  <th>Bruto (R$)</th>
                  <th>Adiantamentos (R$)</th>
                  <th>Líquido (R$)</th>
                  <th>Obra</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {folhas.map((f) => (
                  <tr key={f._id}>
                    <td>{f.colaborador?.nome || '-'}</td>
                    <td>{f.colaborador?.funcao || '-'}</td>
                    <td>{f.colaborador?.tipo || '-'}</td>
                    <td>{f.valorDiaria?.toFixed(2) || '0.00'}</td>
                    <td>{f.diasTrabalhados || 0}</td>
                    <td>{(f.totalBruto || 0).toFixed(2)}</td>
                    <td>{(f.adiantamentos || 0).toFixed(2)}</td>
                    <td><strong>{(f.totalLiquido || 0).toFixed(2)}</strong></td>
                    <td>{f.obra?.nome || '-'}</td>
                    <td>{f.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <strong>Total geral: R$ {folhas.reduce((s, f) => s + (f.totalLiquido || 0), 0).toFixed(2)}</strong>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
