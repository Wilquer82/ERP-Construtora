import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ResetSenha() {
  const { redefinirSenha } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const salvar = async (event) => {
    event.preventDefault();
    setErro('');
    if (novaSenha !== confirmacao) {
      setErro('As senhas nao coincidem.');
      return;
    }
    setCarregando(true);
    try {
      await redefinirSenha(token, novaSenha);
      navigate('/login', { replace: true, state: { mensagem: 'Senha definida. Entre e conclua a troca obrigatoria, se solicitada.' } });
    } catch (error) {
      setErro(error.response?.data?.error || 'Link invalido, expirado ou ja utilizado.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1><span>Definir senha</span></h1>
        <p className="sub">Escolha uma senha com ao menos 8 caracteres, incluindo letras e numeros.</p>
        {!token ? (
          <div className="erro">O link nao contem um token valido.</div>
        ) : (
          <form onSubmit={salvar}>
            <div className="campo">
              <label>Nova senha</label>
              <input type="password" value={novaSenha} onChange={(event) => setNovaSenha(event.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <div className="campo">
              <label>Confirme a nova senha</label>
              <input type="password" value={confirmacao} onChange={(event) => setConfirmacao(event.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            {erro && <div className="erro">{erro}</div>}
            <button className="btn btn-primario" style={{ marginTop: 8 }} disabled={carregando}>
              {carregando ? 'Salvando...' : 'Salvar senha'}
            </button>
          </form>
        )}
        <p className="sub"><Link to="/login">Voltar ao login</Link></p>
      </div>
    </div>
  );
}
