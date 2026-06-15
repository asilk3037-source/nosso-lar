# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

**Nosso Lar** é um gerenciador doméstico para duas pessoas (Aline e Isabel). É um site estático puro (HTML + CSS + JS vanilla) sem build step, sem bundler, sem framework — abrir o arquivo no navegador já roda o app. O banco de dados é o Supabase (PostgreSQL na nuvem), acessado diretamente do browser via SDK CDN.

## Como rodar

Abra qualquer `.html` diretamente no navegador. Não há servidor, build ou instalação necessária.

Para testar com servidor local (evita CORS em alguns casos):
```
npx serve .
# ou
python -m http.server 8080
```

## Credenciais do Supabase

A URL e a chave `anon` pública estão repetidas no topo de cada arquivo JS:

```js
const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIs...';
```

A `anon key` é pública por design — RLS (Row Level Security) está habilitada no Supabase com política de acesso aberto (`USING (true)`). Se adicionar dados sensíveis, revisar as policies.

## Arquitetura

### Páginas e seus scripts

| Página | Script | Tabela Supabase |
|--------|--------|-----------------|
| `index.html` | `app.js` | `tasks` |
| `gastos.html` | `gastos.js` | `expenses` |
| `compras.html` | `compras.js` | `shopping_items` |
| `perfil.html` | inline | `sessionStorage` apenas |
| `login.html` | inline | `sessionStorage` apenas |

### Autenticação

`auth.js` é um IIFE incluso em todas as páginas (exceto `login.html`). Ele lê `sessionStorage.getItem('lar_user')` — se vazio, redireciona para `login.html` e lança exceção. O valor guardado é simplesmente `"Aline"` ou `"Isabel"`. Não há JWT, senha ou backend.

### Padrão de cada módulo JS

Todos os scripts seguem o mesmo padrão:
1. Declara `db = supabase.createClient(...)` e estado local (array `tasks`/`expenses`/`items`)
2. `init()` → `load()` + `subscribeToChanges()` (realtime via `db.channel(...)`)
3. Mutations sempre vão direto ao Supabase; o realtime channel dispara novo `load()` que chama `render()`
4. `render()` reconstrói o DOM manualmente com `document.createElement` + `innerHTML`
5. Funções expostas com `window.fn = fn` para serem chamadas de atributos `onclick=` no HTML

### Lista de compras (`compras.js`) — mais complexo

- `CATALOG`: array de categorias com itens pré-definidos, exibido em bottom sheet
- Busca funciona sobre `ALL_ITEMS` (flat map do catálogo)
- Campo `qty_num` + `qty_unit`: unidades em `MULTIPLY_UNITS` (unid, pct, cx, lata, sac, fardo) multiplicam o valor unitário; unidades contínuas (kg, L, g, ml) não multiplicam
- `finishShopping()` soma itens marcados, insere na tabela `expenses` e apaga toda a `shopping_items`

### Schema do banco

```sql
-- tasks
id UUID PK, name TEXT, responsible TEXT, category TEXT, done BOOLEAN, created_at TIMESTAMPTZ

-- expenses
id UUID PK, description TEXT, category TEXT, value NUMERIC, person TEXT, created_at TIMESTAMPTZ

-- shopping_items
id UUID PK, name TEXT, category TEXT, checked BOOLEAN, value NUMERIC, qty_num NUMERIC(8,2), qty_unit TEXT, created_at TIMESTAMPTZ
```

Migrações ficam em `migration_vN.sql`. A atual é v9 (adicionou `qty_num`/`qty_unit`).

## Convenções

- `escapeHtml()` e `showToast()` são duplicados em cada arquivo — não há arquivo utilitário compartilhado. Manter assim ou centralizar num `utils.js`.
- `style.css` é compartilhado por todas as páginas; `compras.css` é adicional só para `compras.html`.
- Versionamento de cache via query string: `style.css?v=9` nos `<link>`.
