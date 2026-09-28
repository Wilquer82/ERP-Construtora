import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DashboardAtencao from './pages/Dashboard/Atencao.jsx';
import Assistente from './pages/Dashboard/Assistente.jsx';
import RH from './pages/RH/RH.jsx';
import Clientes from './pages/Clientes.jsx';
import Obras from './pages/Obras.jsx';
import Orcamentos from './pages/Orcamentos.jsx';
import Contratos from './pages/Contratos.jsx';
import Financeiro from './pages/Financeiro.jsx';
import Materiais from './pages/Materiais.jsx';
import Fornecedores from './pages/Fornecedores.jsx';
import Compras from './pages/Compras.jsx';
import Usuarios from './pages/Usuarios.jsx';
import TrocarSenha from './pages/TrocarSenha.jsx';
import EsqueciSenha from './pages/EsqueciSenha.jsx';
import ResetSenha from './pages/ResetSenha.jsx';

function RotaProtegida({ children }) {
  const { user, carregandoSessao } = useAuth();
  const location = useLocation();
  if (carregandoSessao) return <div className="vazio">Validando sessao...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.trocarSenha && location.pathname !== '/trocar-senha') {
    return <Navigate to="/trocar-senha" replace />;
  }
  return children;
}

function RotaAdmin({ children }) {
  const { user, carregandoSessao } = useAuth();
  if (carregandoSessao) return <div className="vazio">Validando sessao...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/reset-senha" element={<ResetSenha />} />
      <Route path="/trocar-senha" element={<RotaProtegida><TrocarSenha /></RotaProtegida>} />
      <Route path="/" element={<RotaProtegida><Layout /></RotaProtegida>}>
          <Route index element={<DashboardAtencao />} />
         <Route path="clientes" element={<Clientes />} />
         <Route path="obras" element={<Obras />} />
         <Route path="orcamentos" element={<Orcamentos />} />
         <Route path="contratos" element={<Contratos />} />
         <Route path="financeiro" element={<Financeiro />} />
         <Route path="materiais" element={<Materiais />} />
         <Route path="fornecedores" element={<Fornecedores />} />
         <Route path="compras" element={<Compras />} />
         <Route path="rh/*" element={<RH />} />
         <Route path="dashboard/resumo" element={<Dashboard />} />
         <Route path="dashboard/assistente" element={<Assistente />} />
         <Route path="usuarios" element={<RotaAdmin><Usuarios /></RotaAdmin>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
