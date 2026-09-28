# Sienge-MERN — Sistema Essencial de Gestão de Obras

Implementação **MERN** (MongoDB, Express, React, Node.js) dos módulos essenciais de um ERP de construção civil, no estilo **Sienge**.

## Módulos inclusos

| Módulo | Descrição |
|---|---|
| 🔐 Auth | Login, convites e recuperacao de senha com JWT, bcrypt e papeis admin/usuario |
| 🏗️ Obras | CRUD completo, status, % de conclusão, orçamento, vinculação a cliente |
| 👥 Clientes | CRUD com CPF/CNPJ, contato e endereço |
| 📋 Orçamentos | Itens com quantidade × custo unitário, desconto/acréscimo, total automático |
| 📄 Contratos | Número, obra, cliente, valor, vigência e status |
| 💰 Financeiro | Contas a pagar/receber, baixa (pagamento), filtros, saldo previsto |
| 📦 Materiais/Estoque | Cadastro, estoque mínimo, entradas e saídas com histórico |
| ▦ Dashboard | KPIs (obras, clientes, a pagar/receber, saldo, estoque baixo) + obras recentes |

## Pré-requisitos

- **Node.js** 18+
- **MongoDB** rodando localmente (`mongodb://localhost:27017`) — ou use o [MongoDB Atlas](https://www.mongodb.com/atlas) (grátis) e altere `MONGO_URI` no `.env`

## Como rodar

### 1) Backend (porta 5000)

```bash
cd backend
npm install
cp .env.example .env   # edite se precisar
npm run seed           # cria admin + dados de exemplo (opcional, mas recomendado)
npm run dev            # ou: npm start
```

O seed cria o administrador usando `ADMIN_EMAIL` e `ADMIN_PASSWORD` do `.env`.
Configure uma senha forte antes de executa-lo; uma conta criada pelo seed precisa
trocar a senha no primeiro login.

### 2) Frontend (porta 5173)

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Abra **http://localhost:5173** e faça login.

> O Vite já tem proxy configurado: chamadas a `/api/*` no frontend são redirecionadas automaticamente para `http://localhost:5000`.

## Estrutura

```
sienge-mern/
├── backend/
│   ├── server.js          # entrada Express + rotas
│   ├── config/db.js       # conexão MongoDB
│   ├── middleware/auth.js # proteção JWT
│   ├── models/            # User, Cliente, Obra, Orcamento, Contrato, Lancamento, Material
│   ├── routes/            # auth, clientes, obras, orcamentos, contratos, financeiro, materiais, dashboard
│   └── seed.js            # dados iniciais
└── frontend/
    └── src/
        ├── api.js         # cliente axios + formatação
        ├── context/       # AuthContext (login/logout)
        ├── components/    # Layout (sidebar)
        └── pages/         # Login, Dashboard, Clientes, Obras, Orcamentos, Contratos, Financeiro, Materiais
```

## API (REST, prefixo `/api`)

Todas as rotas de dados exigem header `Authorization: Bearer <token>`.

- `POST /auth/login`, `GET /auth/me`
- `POST /auth/esqueci-senha`, `POST /auth/reset-senha`
- `GET|POST|PUT|DELETE /clientes`, `/obras`, `/orcamentos`, `/contratos`, `/materiais`
- `GET|POST|PUT|DELETE /financeiro` + `POST /financeiro/:id/baixar`
- `POST /materiais/:id/movimento` (entrada/saída de estoque)
- `GET /dashboard/resumo`

## Próximos passos (sugestões)

- Relatórios PDF/Excel e gráficos (Recharts)
- Medição de obras e Acompanhamento de Serviços (medição por item)
- Folha de ponto / Mão de obra
- Integração fiscal (NF-e, NFS-e, boletos)
- Upload de anexos e fotos da obra
- Permissões por módulo e multiempresa

## Produção

No servico do backend no Render, configure `CORS_ORIGIN` com a URL exata do frontend
(por exemplo, `https://erp-construtora-1.onrender.com`). O backend tambem inclui esse
dominio na lista padrao; valores adicionais em `CORS_ORIGIN` sao aceitos.

Configure `JWT_SECRET` no ambiente do backend com um valor aleatorio de pelo menos 32
caracteres. Para rotaciona-lo, substitua o valor no Render e faca redeploy. Isso invalida
os JWTs assinados com a chave antiga; o script de limpeza tambem incrementa a versao de
todos os usuarios para revogar sessoes. Uma chave pode ser gerada com
`node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`;
configure o resultado diretamente no ambiente do servico e nao o salve no repositorio.

O cadastro e convite de contas e feito por administradores em `POST /api/usuarios`.
Contas convidadas precisam definir uma senha pelo link recebido e troca-la novamente no
primeiro login. Senhas devem ter ao menos 8 caracteres, uma letra e um numero, e nao
podem ser comuns.

Para remover o usuario legado e contas com email invalido, o script e inicialmente
somente de simulacao. Execute a partir de `backend` e confirme a exclusao:

```bash
node scripts/cleanup-users.js
node scripts/cleanup-users.js --apply
```

Para redefinir a senha do administrador por CLI (nao existe rota HTTP para isso), defina
`MONGO_URI`, `ADMIN_EMAIL` e `ADMIN_NEW_PASSWORD` no ambiente e execute:

```bash
node scripts/reset-admin.js
```

O script exige uma senha forte, redefine a conta admin indicada por `ADMIN_EMAIL`, marca
a troca obrigatoria no proximo login e incrementa `tokenVersion`.

Para trocar o email legado `admin@sienge.local` pelo email real do administrador,
configure `MONGO_URI` e `ADMIN_EMAIL` e execute:

```bash
npm run migrate:super-admin-email
```

Isso atualiza a conta legada, exige a troca de senha e revoga suas sessoes.

### Multi-tenant

Configure `SUPER_ADMIN_EMAIL` com o email real do super-admin (ou use `ADMIN_EMAIL` como
fallback); mantenha esses valores iguais ao `ADMIN_EMAIL` da conta super-admin. Para uma
base existente cujo admin ainda usa `admin@sienge.local`, faca backup, configure as
variaveis apontando para o MongoDB de producao em ambiente seguro e execute a migracao de
email antes do backfill. Execute ambos **antes do deploy que exige empresas nos documentos**:

```bash
cd backend
npm run migrate:super-admin-email
npm run backfill:tenants
npm run seed
```

A migracao de email so e necessaria para uma base ainda no endereco legado; ela exige
troca de senha e revoga sessoes antigas. Em uma instalacao nova, configure `ADMIN_EMAIL`
e `ADMIN_PASSWORD` e execute somente `npm run seed`; a empresa `Demo` e seus dados sao
criados no mesmo tenant. O backfill cria/usa a empresa `Demo`, atribui a ela documentos ainda sem empresa,
preenche os campos de auditoria ausentes e troca indices globais por indices unicos
por empresa. Faça backup do MongoDB antes de executar. Todas as consultas de negocio
sao limitadas automaticamente a empresa autenticada; o super-admin configurado pode
administrar empresas e ignorar esse escopo. `POST /api/empresas` cria uma empresa trial,
convida seu administrador e popula dados demonstrativos automaticamente.

### Convites e recuperacao de senha

Em desenvolvimento, configure `EMAIL_PROVIDER=console`; os links serao impressos no
terminal. Em producao, configure `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`
(remetente verificado no Resend) e `FRONTEND_URL`. As rotas publicas
`POST /api/auth/esqueci-senha` e `POST /api/auth/reset-senha` permitem recuperar o acesso;
o pedido tem limite de tres por hora por email e responde de forma generica.
Links de recuperacao expiram em 15 minutos e convites em 7 dias. Administradores enviam
ou reenviam convites pela tela de usuarios. O banco guarda somente o hash SHA-256 dos
tokens, que sao de uso unico.

```bash
cd frontend && npm run build   # gera dist/
# sirva dist/ a partir do backend (express.static) ou hospede na Vercel/Netlify
# backend: Render, Railway, Fly.io ou VM própria; MongoDB no Atlas
```

Na Static Site do Render, cadastre uma regra de rewrite `/*` para `/index.html` para
que atualizar uma rota interna do SPA, como `/dashboard`, nao retorne 404. O arquivo
`frontend/public/_redirects` serve hospedagens que suportam esse formato, mas regras do
Render devem ser configuradas no Dashboard. Configure tambem o health check do backend
para `/healthz`. Para evitar cold starts durante demonstracoes e vendas, use uma
instancia web paga no Render; health checks nao substituem uma instancia que nao suspende.

O formulario de login intercepta o submit com `event.preventDefault()` antes de chamar
a API, impedindo o reload/navegacao nativa do formulario.

---
Feito para estudo e ponto de partida. Substitua `JWT_SECRET` e o usuário admin antes de colocar em produção.
