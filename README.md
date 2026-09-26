# Sienge-MERN — Sistema Essencial de Gestão de Obras

Implementação **MERN** (MongoDB, Express, React, Node.js) dos módulos essenciais de um ERP de construção civil, no estilo **Sienge**.

## Módulos inclusos

| Módulo | Descrição |
|---|---|
| 🔐 Auth | Login/registro com JWT, senha criptografada (bcrypt), papéis admin/usuário |
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

**Usuário padrão (após o seed):** `admin@sienge.local` / `admin123`

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

Todas as rotas (exceto `/auth/login` e `/auth/registro`) exigem header `Authorization: Bearer <token>`.

- `POST /auth/login`, `POST /auth/registro`, `GET /auth/me`
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

```bash
cd frontend && npm run build   # gera dist/
# sirva dist/ a partir do backend (express.static) ou hospede na Vercel/Netlify
# backend: Render, Railway, Fly.io ou VM própria; MongoDB no Atlas
```

---
Feito para estudo e ponto de partida. Substitua `JWT_SECRET` e o usuário admin antes de colocar em produção.
