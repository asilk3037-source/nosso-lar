# 🏠 Nosso Lar — Aline & Isabel

Gerenciador de tarefas domésticas com banco de dados na nuvem.

---

## 🗂️ Estrutura do Projeto

```
nosso-lar/
├── index.html   → estrutura da página
├── style.css    → visual e design
├── app.js       → lógica e conexão com o banco
└── README.md    → este arquivo
```

---

## 🟢 Passo 1 — Criar o banco gratuito no Supabase

1. Acesse **https://supabase.com** e clique em **Start for free**
2. Crie uma conta (pode usar Google ou GitHub)
3. Clique em **New project** e preencha:
   - **Name:** nosso-lar
   - **Database Password:** crie uma senha forte e guarde
   - **Region:** South America (São Paulo) — mais rápido pro Brasil
4. Espere o projeto criar (~1 min)

---

## 🗄️ Passo 2 — Criar a tabela de tarefas

No painel do Supabase, vá em **SQL Editor** e cole o SQL abaixo:

```sql
-- Cria a tabela de tarefas
CREATE TABLE tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  responsible  TEXT NOT NULL DEFAULT 'Aline',
  category     TEXT NOT NULL DEFAULT '📋 Outro',
  done         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Habilita leitura/escrita pública (para o site sem login)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público" ON tasks
  FOR ALL USING (true) WITH CHECK (true);

-- Habilita atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
```

Clique em **Run** ✅

---

## 🔑 Passo 3 — Pegar as credenciais

1. No painel do Supabase, vá em **Project Settings → API**
2. Copie:
   - **Project URL** → ex: `https://xyzabc.supabase.co`
   - **anon public key** → começa com `eyJ...`

3. Abra o arquivo `app.js` e cole nas linhas no topo:

```js
const SUPABASE_URL = 'https://xyzabc.supabase.co';     // ← sua URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIs...';        // ← sua key
```

Salve o arquivo ✅

---

## 🐙 Passo 4 — Subir no GitHub

### 4a. Criar conta e repositório no GitHub
1. Acesse **https://github.com** e crie uma conta se não tiver
2. Clique em **+** no canto superior direito → **New repository**
3. Preencha:
   - **Repository name:** nosso-lar
   - Deixe em **Public** (ou Private se quiser privado)
4. Clique em **Create repository**

### 4b. Subir os arquivos pelo terminal

> Precisa ter o **Git** instalado. Confirme com `git --version` no terminal.
> Caso não tenha: https://git-scm.com/downloads

```bash
# Entre na pasta do projeto
cd nosso-lar

# Inicia o Git
git init

# Adiciona todos os arquivos
git add .

# Cria o primeiro commit
git commit -m "🏠 Primeiro commit - Nosso Lar"

# Conecta com o GitHub (substitua SEU_USUARIO pelo seu login)
git remote add origin https://github.com/SEU_USUARIO/nosso-lar.git

# Sobe os arquivos
git branch -M main
git push -u origin main
```

---

## 🌐 Passo 5 (bônus) — Publicar o site grátis

O site pode ficar online de graça com **GitHub Pages**:

1. No GitHub, vá no repositório → **Settings**
2. Clique em **Pages** (menu lateral)
3. Em **Source**, selecione: `Deploy from a branch`
4. Branch: `main` / Folder: `/ (root)`
5. Clique em **Save**

Após alguns minutos, o site estará em:
`https://SEU_USUARIO.github.io/nosso-lar/`

---

## 🔄 Como atualizar o site depois de mudar algo

```bash
git add .
git commit -m "✏️ Descrição do que mudou"
git push
```

---

## ✨ Funcionalidades

- [x] Cadastrar tarefas com nome, responsável e categoria
- [x] Marcar como concluída / reabrir
- [x] Excluir tarefas
- [x] Filtrar por status ou responsável
- [x] Contador de progresso em tempo real
- [x] Banco de dados na nuvem (Supabase)
- [x] Funciona offline com LocalStorage como fallback
- [x] Atualização em tempo real entre dispositivos
- [x] Design responsivo (celular e desktop)

---

Feito com ❤️ por Aline & Isabel
