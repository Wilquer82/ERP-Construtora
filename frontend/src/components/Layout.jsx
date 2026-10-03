import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const itens = [
  { to: '/', icone: 'dashboard', texto: 'Dashboard', fim: true },
  { to: '/assistente', icone: 'assistente', texto: 'Assistente' },
  { to: '/dashboard/obras-pendentes', icone: 'obra', texto: 'Obras em Andamento' },
  { to: '/obras', icone: 'obra', texto: 'Obras' },
  { to: '/clientes', icone: 'clientes', texto: 'Clientes' },
  { to: '/orcamentos', icone: 'orcamento', texto: 'Orçamentos' },
  { to: '/contratos', icone: 'contrato', texto: 'Contratos' },
  { to: '/financeiro', icone: 'financeiro', texto: 'Financeiro' },
  { to: '/materiais', icone: 'materiais', texto: 'Materiais / Estoque' },
  { to: '/fornecedores', icone: 'clientes', texto: 'Fornecedores' },
  { to: '/compras', icone: 'orcamento', texto: 'Compras / Pedidos' },
  { to: '/rh', icone: 'rh', texto: 'RH', fim: true },
  { to: '/empreiteiros', icone: 'rh', texto: 'Empreiteiros' },
  { to: '/contratos-empreiteiro', icone: 'contrato', texto: 'Contratos Empreiteiro' },
  { to: '/reembolsos', icone: 'financeiro', texto: 'Reembolsos' },
  { to: '/cheques', icone: 'financeiro', texto: 'Cheques' },
  { to: '/acordos', icone: 'financeiro', texto: 'Acordos' },
  { to: '/recebiveis-obra', icone: 'financeiro', texto: 'Recebíveis Obra' },
  { to: '/usuarios', icone: 'clientes', texto: 'Usuários e permissões', admin: true },
];

const grupos = [
  { titulo: 'Visão geral', rotas: ['/', '/assistente'] },
  { titulo: 'Obras e contratos', rotas: ['/obras', '/dashboard/obras-pendentes', '/clientes', '/orcamentos', '/contratos'] },
  { titulo: 'Financeiro', rotas: ['/financeiro', '/recebiveis-obra', '/reembolsos', '/cheques', '/acordos'] },
  { titulo: 'Suprimentos', rotas: ['/materiais', '/compras', '/fornecedores'] },
  { titulo: 'Pessoas e equipes', rotas: ['/rh', '/empreiteiros', '/contratos-empreiteiro'] },
  { titulo: 'Administração', rotas: ['/usuarios'] }
];

function Icone({ nome }) {
  const desenhos = {
    dashboard: <><path d="M4 13h6V4H4v9Z" /><path d="M14 20h6V4h-6v16Z" /><path d="M4 20h6v-4H4v4Z" /><path d="M14 13h6V10h-6v3Z" /></>,
    obra: <><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" /><path d="M2 21h20" /><path d="M8 7h2M8 11h2M8 15h2M12 7h2M12 11h2M12 15h2" /></>,
    clientes: <><path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7.5" r="3.5" /><path d="M17 11.5a3.5 3.5 0 0 0 0-7" /><path d="M21 19v-1a4 4 0 0 0-3-3.85" /></>,
    orcamento: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5V3h6v1.5" /><path d="M9 10h6M9 14h6" /></>,
    contrato: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" /></>,
    financeiro: <><path d="M20 7V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" /><path d="M4 7h16v10H4z" /><path d="M16 12h.01" /></>,
    materiais: <><path d="M21 8.2v7.6a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 15.8V8.2a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4a2 2 0 0 1 1 1.73Z" /><path d="M3 8.2 12 13.4l9-5.2" /><path d="M12 13.4V21" /></>,
    rh: <><path d="M12 12c2.7 0 8 1.3 8 4v2H4v-2c0-2.7 5.3-4 8-4Z" /><circle cx="12" cy="8" r="3" /></>,
    assistente: <><circle cx="12" cy="12" r="9" /><path d="M9 9h.01M15 9h.01M9 15c1.5 2 6 2 9 0" /></>,
    sair: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
  };

  return (
    <svg className="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {desenhos[nome]}
    </svg>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const iniciais = (user?.nome || 'CE').split(' ').slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  const menuVisivel = grupos.map((grupo) => ({
    ...grupo,
    itens: grupo.rotas.map((rota) => itens.find((item) => item.to === rota)).filter((item) => item && (!item.admin || user?.role === 'admin'))
  })).filter((grupo) => grupo.itens.length > 0);

  const sair = () => { logout(); navigate('/login'); };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-marca" aria-hidden="true"><span /></div>
          <div className="logo-copy">
            <span className="logo-name">Constru<em>ERP</em></span>
            <span className="logo-tag">gestão de obras</span>
          </div>
        </div>
        <nav aria-label="Navegação principal">
          {menuVisivel.map((grupo) => (
            <div className="menu-grupo" key={grupo.titulo} role="group" aria-label={grupo.titulo}>
              <span className="menu-grupo-titulo">{grupo.titulo}</span>
              {grupo.itens.map((m) => (
                <NavLink key={m.to} to={m.to} end={m.fim} title={m.texto} className={({ isActive }) => `item-menu${isActive ? ' ativo' : ''}`}>
                  <span className="menu-icono"><Icone nome={m.icone} /></span>
                  <span className="txt">{m.texto}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="user-box">
          <div className="user-avatar" aria-hidden="true">{iniciais}</div>
          <div className="user-dados">
            <div className="nome">{user?.nome || 'Usuário'}</div>
            <div className="email">{user?.email}</div>
          </div>
          <button type="button" className="logout-button" onClick={sair} aria-label="Sair do sistema">
            <Icone nome="sair" />
            <span className="txt">Sair</span>
          </button>
        </div>
      </aside>
      <main className="conteudo">
        <div className="workspace-meta">
          <span className="workspace-label">PAINEL OPERACIONAL</span>
          <span className="workspace-status"><i /> {navigator.onLine ? 'Sistema online' : 'Modo offline'}</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
