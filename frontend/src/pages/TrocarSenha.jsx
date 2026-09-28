import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function TrocarSenha() {
  const { user, trocarSenha, logout } = useAuth();
  const navigate = useNavigate();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  if (!user?.trocarSenha) return <Navigate to="/" replace />;

  const salvar = async (event) => {
    event.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await trocarSenha(senhaAtual, novaSenha);
      navigate('/', { replace: true });
    } catch (error) {
      setErro(error.response?.data?.error || 'Nao foi possivel trocar a senha.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1><span>Troque sua senha</span></h1>
        <p className="sub">Uma nova senha e obrigatoria antes de continuar.</p>
        <form onSubmit={salvar}>
          <div className="campo">
            <label>Senha atual</label>
            <input type="password" value={senhaAtual} onChange={(event) => setSenhaAtual(event.target.value)} required autoComplete="current-password" />
          </div>
          <div className="campo">
            <label>Nova senha</label>
            <input type="password" value={novaSenha} onChange={(event) => setNovaSenha(event.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
          {erro && <div className="erro">{erro}</div>}
          <button className="btn btn-primario" style={{ marginTop: 8 }} disabled={carregando}>
            {carregando ? 'Salvando...' : 'Salvar nova senha'}
          </button>
          <button type="button" className="btn" style={{ marginTop: 8 }} onClick={logout}>
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
