const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3l1bmVmeW93bWJmeWhiYWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ4MjksImV4cCI6MjA5NjkyMDgyOX0.0M0ZqRBR50w9pR9Xd4aS9htqYBhGmLdhkA2PYPX8p74';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let items = [];

// ── CATÁLOGO COMPLETO ─────────────────────────────────
const CATALOG = [
  { cat: '🥩 Carnes', emoji: '🥩', items: [
    'Carne moída','Patinho','Acém','Alcatra','Contrafilé','Costela',
    'Frango inteiro','Peito de frango','Coxa e sobrecoxa','Filé de frango',
    'Linguiça','Bacon','Presunto','Peito de peru','Hambúrguer',
    'Tilápia','Merluza','Salmão','Atum em lata','Sardinha em lata','Ovos',
  ]},
  { cat: '🥛 Laticínios', emoji: '🥛', items: [
    'Leite integral','Leite desnatado','Leite condensado','Creme de leite',
    'Iogurte natural','Iogurte grego','Requeijão','Manteiga','Margarina',
    'Queijo muçarela','Queijo prato','Queijo parmesão','Queijo minas','Cream cheese',
  ]},
  { cat: '🍞 Padaria', emoji: '🍞', items: [
    'Pão francês','Pão de forma','Pão integral','Torradas',
    'Biscoito água e sal','Biscoito recheado','Bolo','Pão de queijo',
  ]},
  { cat: '🌾 Grãos', emoji: '🌾', items: [
    'Arroz','Feijão carioca','Feijão preto','Lentilha','Grão-de-bico',
    'Macarrão espaguete','Macarrão parafuso','Lasanha','Farinha de trigo',
    'Farinha de mandioca','Fubá','Aveia','Tapioca','Milho para pipoca',
  ]},
  { cat: '🥫 Enlatados', emoji: '🥫', items: [
    'Molho de tomate','Extrato de tomate','Milho verde','Ervilha',
    'Palmito','Azeitona','Pepino em conserva','Cogumelos',
  ]},
  { cat: '🧂 Temperos', emoji: '🧂', items: [
    'Sal','Açúcar','Adoçante','Alho','Cebola','Pimenta-do-reino',
    'Páprica','Orégano','Açafrão','Chimichurri','Caldo de carne',
    'Caldo de galinha','Vinagre','Azeite','Óleo de soja',
  ]},
  { cat: '🥦 Hortifruti', emoji: '🥦', items: [
    'Alface','Rúcula','Agrião','Couve','Espinafre',
    'Batata','Batata-doce','Cenoura','Abobrinha','Berinjela',
    'Chuchu','Beterraba','Pepino','Pimentão','Tomate',
    'Banana','Maçã','Pera','Laranja','Limão','Mamão',
    'Manga','Abacaxi','Uva','Melancia','Morango','Abacate',
  ]},
  { cat: '🥤 Bebidas', emoji: '🥤', items: [
    'Água mineral','Água com gás','Refrigerante','Suco',
    'Café','Chá','Achocolatado',
  ]},
  { cat: '🍫 Doces', emoji: '🍫', items: [
    'Chocolate','Bombons','Gelatina','Pudim','Sorvete','Doce de leite',
  ]},
  { cat: '❄️ Congelados', emoji: '❄️', items: [
    'Nuggets','Pizza congelada','Lasanha congelada',
    'Legumes congelados','Hambúrguer congelado','Polpa de frutas',
  ]},
  { cat: '🧹 Limpeza', emoji: '🧹', items: [
    'Detergente','Esponja','Sabão em pó','Sabão líquido','Amaciante',
    'Água sanitária','Desinfetante','Limpador multiuso','Álcool',
    'Saco de lixo','Papel toalha',
  ]},
  { cat: '🧴 Higiene', emoji: '🧴', items: [
    'Papel higiênico','Creme dental','Escova de dentes','Fio dental',
    'Shampoo','Condicionador','Sabonete','Desodorante',
    'Protetor solar','Absorvente','Lenço umedecido',
  ]},
  { cat: '🐾 Pet', emoji: '🐾', items: [
    'Ração','Petiscos','Tapete higiênico','Areia sanitária','Shampoo pet',
  ]},
  { cat: '🏠 Outros', emoji: '🏠', items: [
    'Pilhas','Fósforos','Velas','Filtro de café','Guardanapos',
    'Papel alumínio','Filme plástico','Sacos zip','Gelo','Carvão',
  ]},
];

// lista flat para busca
const ALL_ITEMS = CATALOG.flatMap(c => c.items.map(name => ({ name, cat: c.cat })));

// ── INIT ──────────────────────────────────────────────
async function init() {
  buildCatGrid();
  await load();
  db.channel('shopping-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, load)
    .subscribe();
}

async function load() {
  const { data, error } = await db
    .from('shopping_items').select('*').order('created_at', { ascending: true });
  if (error) { showToast('⚠️ Erro ao carregar.'); return; }
  items = data || [];
  render();
  refreshCatalogState();
}

// ── CATÁLOGO ─────────────────────────────────────────
function buildCatGrid() {
  const grid = document.getElementById('cat-grid');
  grid.innerHTML = '';
  CATALOG.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'cat-card';
    btn.onclick = () => openCategory(i);
    btn.innerHTML = `
      <span class="cat-card-emoji">${c.emoji}</span>
      <span class="cat-card-name">${c.cat.replace(/^.+? /,'')}</span>
    `;
    grid.appendChild(btn);
  });
}

function openCatalog() {
  document.getElementById('catalog-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  showCatHome();
  clearSearch();
}

function closeCatalog(e) {
  if (e && e.target !== document.getElementById('catalog-overlay')) return;
  document.getElementById('catalog-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function showCatHome() {
  document.getElementById('cat-home').classList.remove('hidden');
  document.getElementById('cat-items-screen').classList.add('hidden');
  document.getElementById('cat-search-screen').classList.add('hidden');
}

function openCategory(idx) {
  const cat = CATALOG[idx];
  document.getElementById('cat-items-title').textContent = cat.cat;
  const list = document.getElementById('cat-items-list');
  list.innerHTML = '';
  cat.items.forEach(name => {
    list.appendChild(makeCatItemBtn(name, cat.cat));
  });
  document.getElementById('cat-home').classList.add('hidden');
  document.getElementById('cat-items-screen').classList.remove('hidden');
}

function makeCatItemBtn(name, cat) {
  const inList = items.some(i => i.name.toLowerCase() === name.toLowerCase());
  const btn = document.createElement('button');
  btn.className = `cat-item-btn${inList ? ' added' : ''}`;
  btn.dataset.name = name;
  btn.innerHTML = `
    <span class="cat-item-check">${inList ? '✓' : ''}</span>
    <span class="cat-item-name">${escapeHtml(name)}</span>
    <span class="cat-item-cat">${escapeHtml(cat.replace(/^[^\s]+\s/,''))}</span>
  `;
  btn.onclick = () => toggleCatalogItem(btn, name, cat);
  return btn;
}

async function toggleCatalogItem(btn, name, cat) {
  const existing = items.find(i => i.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    // já está na lista → remove
    await db.from('shopping_items').delete().eq('id', existing.id);
    showToast(`🗑️ "${name}" removido`);
  } else {
    // adiciona
    const { error } = await db.from('shopping_items').insert([{ name, category: cat, checked: false, value: null }]);
    if (error) { showToast('❌ ' + error.message); return; }
    showToast(`✅ "${name}" adicionado!`);
  }
}

function refreshCatalogState() {
  // atualiza botões visíveis no catálogo sem fechar o sheet
  document.querySelectorAll('.cat-item-btn').forEach(btn => {
    const name = btn.dataset.name;
    const inList = items.some(i => i.name.toLowerCase() === name.toLowerCase());
    btn.classList.toggle('added', inList);
    btn.querySelector('.cat-item-check').textContent = inList ? '✓' : '';
  });
}

// ── BUSCA ─────────────────────────────────────────────
function onSearch(q) {
  const clear = document.getElementById('clear-search');
  const home  = document.getElementById('cat-home');
  const catIt = document.getElementById('cat-items-screen');
  const srch  = document.getElementById('cat-search-screen');

  if (!q.trim()) {
    clear.classList.add('hidden');
    srch.classList.add('hidden');
    home.classList.remove('hidden');
    catIt.classList.add('hidden');
    return;
  }
  clear.classList.remove('hidden');
  home.classList.add('hidden');
  catIt.classList.add('hidden');
  srch.classList.remove('hidden');

  const results = ALL_ITEMS.filter(i =>
    i.name.toLowerCase().includes(q.toLowerCase())
  );
  const res = document.getElementById('cat-search-results');
  res.innerHTML = '';
  if (results.length === 0) {
    res.innerHTML = '<div class="cat-empty">Nenhum produto encontrado 😕</div>';
    return;
  }
  results.forEach(({ name, cat }) => {
    res.appendChild(makeCatItemBtn(name, cat));
  });
}

function clearSearch() {
  const input = document.getElementById('cat-search');
  input.value = '';
  onSearch('');
}

// ── FORM MANUAL ───────────────────────────────────────
function toggleManual() {
  const form = document.getElementById('manual-form');
  const btn  = document.getElementById('btn-manual-toggle');
  const open = form.classList.toggle('hidden');
  btn.classList.toggle('open', !open);
  if (!open) document.getElementById('item-input').focus();
}

async function addItem() {
  const input = document.getElementById('item-input');
  const name  = input.value.trim();
  if (!name) { input.focus(); showToast('✏️ Escreve o nome do produto!'); return; }
  const cat = document.getElementById('item-cat').value;
  const { error } = await db.from('shopping_items').insert([{ name, category: cat, checked: false, value: null }]);
  if (error) { showToast('❌ ' + error.message); return; }
  input.value = '';
  input.focus();
  showToast('✅ Adicionado!');
}

// ── TOGGLE CHECK ──────────────────────────────────────
async function toggleItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  await db.from('shopping_items').update({ checked: !item.checked }).eq('id', id);
}

// ── ATUALIZAR VALOR ───────────────────────────────────
async function updateValue(id, val) {
  const value = parseFloat(val);
  if (isNaN(value) || value < 0) return;
  await db.from('shopping_items').update({ value }).eq('id', id);
}

// ── EXCLUIR ───────────────────────────────────────────
async function deleteItem(id) {
  await db.from('shopping_items').delete().eq('id', id);
  showToast('🗑️ Removido.');
}

// ── FINALIZAR COMPRA ──────────────────────────────────
async function finishShopping() {
  const total = items.reduce((s, i) => s + (i.checked && i.value ? Number(i.value) : 0), 0);
  if (total === 0) { showToast('⚠️ Informe o valor dos itens antes de finalizar!'); return; }
  if (!confirm(`Finalizar compra?\n\nTotal: R$ ${fmt(total)}\n\nIsso vai salvar nos gastos de Aline + Isabel e limpar a lista.`)) return;

  const { error } = await db.from('expenses').insert([{
    description: '🛒 Compras do mercado',
    category:    '🛒 Mercado',
    value:       total,
    person:      'Aline + Isabel',
  }]);
  if (error) { showToast('❌ Erro ao salvar gasto.'); return; }

  const ids = items.map(i => i.id);
  await db.from('shopping_items').delete().in('id', ids);
  showToast(`🎉 Compra de R$ ${fmt(total)} salva nos gastos!`);
}

// ── RENDER ────────────────────────────────────────────
function render() {
  const total   = items.reduce((s, i) => s + (i.checked && i.value ? Number(i.value) : 0), 0);
  const checked = items.filter(i => i.checked).length;

  document.getElementById('stat-itens').textContent        = items.length;
  document.getElementById('stat-checked').textContent      = checked;
  document.getElementById('stat-total-compra').textContent = 'R$ ' + fmt(total);
  document.getElementById('btn-finish').disabled           = items.length === 0;

  const list  = document.getElementById('shopping-list');
  const empty = document.getElementById('shopping-empty');
  list.querySelectorAll('.task-item').forEach(el => el.remove());

  if (items.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  // pendentes primeiro
  const sorted = [...items].sort((a, b) => a.checked - b.checked);

  sorted.forEach(item => {
    const el = document.createElement('div');
    el.className = `task-item ${item.checked ? 'done' : ''}`;
    el.innerHTML = `
      <input type="checkbox" class="task-check" ${item.checked ? 'checked' : ''}
        onchange="toggleItem('${item.id}')" />
      <div class="task-body">
        <span class="task-name ${item.checked ? 'striked' : ''}">${escapeHtml(item.name)}</span>
        <div class="task-meta">
          <span class="tag tag-category">${escapeHtml(item.category)}</span>
          ${item.checked ? `
            <div class="value-input-wrap">
              <span class="value-prefix">R$</span>
              <input type="number" class="value-input" placeholder="0,00"
                min="0" step="0.01"
                value="${item.value !== null ? item.value : ''}"
                onchange="updateValue('${item.id}', this.value)"
                onclick="event.stopPropagation()" />
            </div>` : ''}
        </div>
      </div>
      <button class="btn-delete" onclick="deleteItem('${item.id}')">🗑️</button>
    `;
    list.appendChild(el);
  });
}

// ── HELPERS ───────────────────────────────────────────
const fmt        = v  => Number(v).toFixed(2).replace('.',',');
const escapeHtml = s  => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 2600);
}

// ── EXPÕE FUNÇÕES ─────────────────────────────────────
window.openCatalog    = openCatalog;
window.closeCatalog   = closeCatalog;
window.showCatHome    = showCatHome;
window.onSearch       = onSearch;
window.clearSearch    = clearSearch;
window.toggleManual   = toggleManual;
window.addItem        = addItem;
window.toggleItem     = toggleItem;
window.updateValue    = updateValue;
window.deleteItem     = deleteItem;
window.finishShopping = finishShopping;

// ── ENTER ─────────────────────────────────────────────
document.getElementById('item-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

// Fechar com ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('catalog-overlay').classList.add('hidden');
    document.body.style.overflow = '';
  }
});

init();
