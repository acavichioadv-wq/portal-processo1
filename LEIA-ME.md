# Portal de Acompanhamento Processual
## André Cavichio Advogados

Portal para clientes consultarem o andamento de processos em qualquer tribunal do Brasil,
com tradução automática em linguagem simples via IA.

---

## 🚀 Como publicar no Vercel (passo a passo)

### 1. Criar conta no GitHub (gratuito)
- Acesse https://github.com e crie uma conta

### 2. Criar repositório e subir os arquivos
- Clique em **"New repository"**
- Nome sugerido: `portal-processo`
- Marque **Public**
- Clique em **"uploading an existing file"**
- Arraste a pasta `portal-processo` toda
- Clique em **"Commit changes"**

### 3. Criar conta no Vercel (gratuito)
- Acesse https://vercel.com
- Clique em **"Sign up with GitHub"**

### 4. Importar o projeto
- Clique em **"Add New Project"**
- Selecione o repositório `portal-processo`
- Clique em **"Deploy"**

### 5. Configurar variáveis de ambiente (chaves)
No painel do Vercel, vá em:
**Settings → Environment Variables** e adicione:

| Nome | Valor |
|------|-------|
| `DATAJUD_KEY` | `cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==` |
| `ANTHROPIC_KEY` | `sk-ant-...` (opcional, para resumo em IA) |

### 6. Fazer redeploy
Após salvar as variáveis, clique em **"Redeploy"**.

### 7. Acessar o portal
O Vercel fornece uma URL tipo:
`https://portal-processo.vercel.app`

Você pode configurar um domínio personalizado como:
`processo.andrecavichio.com.br`

---

## 📁 Estrutura do projeto

```
portal-processo/
├── api/
│   └── processo.js      ← Backend: consulta DataJud + tradução IA
├── public/
│   └── index.html       ← Frontend: interface do cliente
├── vercel.json          ← Configuração do Vercel
└── package.json
```

---

## ✅ O que funciona

- Consulta em **todos os tribunais estaduais** (TJSP, TJRJ, TJMG, etc.)
- Consulta em **TRFs, STJ e STF**
- Identificação automática do tribunal pelo número CNJ
- Tradução dos movimentos em linguagem simples
- Histórico completo de movimentações
- Responsivo para celular

---

## 📞 Suporte
André Cavichio Advogados · OAB/SP 336.049
