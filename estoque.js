const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3l1bmVmeW93bWJmeWhiYWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ4MjksImV4cCI6MjA5NjkyMDgyOX0.0M0ZqRBR50w9pR9Xd4aS9htqYBhGmLdhkA2PYPX8p74';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let stock = [];
let stockFilter = 'all';

async function init() {
  await load();
  db.channel('stock-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stock' }, load)
    .subscribe();
}

async function load() {
  const { data, error } = await db.from('stock').select('*').order('category').order('name');
  if (error) { showToast('⚠️ Erro ao carregar.'); return; }
  stock = data || [];
  render();
}

function isLow(item) {
  return Number(item.quantity) <= Number(item.min_quantity);
}

async function addItem() {
  const name    = document.getElementById('s-nome').value.trim();
  const cat     = document.getElementById('s-cat').value;
  const qty     = parseFloat(document.getElementById('s-qty').value);
  const min_qty = parseFloat(document.getElementById('s-min').value);
  const unit    = document.getElementById('s-unit').value;

  if (!name)                   { showToast('✏️ Escreva o nome do produto!'); return; }
  if (isNaN(qty) || qty < 0)   { showToast('📦 Informe a quantidade atual!'); return; }
  if (isNaN(min_qty) || min_qty < 0) { showToast('⚠️ Informe a quantidade mínima!'); return; }

  const { error } = await db.from('stock').insert([{
    name, category: cat, quantity: qty, min_quantity: min_qty, unit
  }]);
  if (error) { showToast('❌ ' + error.message); return; }

  document.getElementById('s-nome').value = '';
  document.getElementById('s-qty').value  = '';
  document.getElementById('s-min').value  = '';
  showToast('📦 Item adicionado!');
}

async function updateQty(id, delta) {
  const item = stock.find(s => s.id === id);
  if (!item) return;
  const newQty = Math.max(0, Number(item.quantity) + delta);
  const { error } = await db.from('stock').update({ quantity: newQty }).eq('id', id);
  if (error) showToast('❌ Erro ao atualizar.');
}

async function deleteStock(id) {
  if (!confirm('Excluir este item do estoque?')) return;
  const { error } = await db.from('stock').delete().eq('id', id);
  if (error) { showToast('❌ Erro ao excluir.'); return; }
  showToast('🗑️ Excluído.');
}

async function addToCompras(id) {
  const item = stock.find(s => s.id === id);
  if (!item) return;

  // Verifica se já está na lista de compras
  const { data: existing } = await db.from('shopping_items').select('id').ilike('name', item.name).limit(1);
  if (existing && existing.length > 0) {
    showToast('🛒 Já está na lista de compras!');
    return;
  }

  const { error } = await db.from('shopping_items').insert([{
    name: item.name, category: item.category, checked: false,
    value: 0, qty_num: 1, qty_unit: item.unit
  }]);
  if (error) { showToast('❌ ' + error.message); return; }
  showToast('🛒 Adicionado à lista de compras!');
}

async function addAllLowToCart() {
  const lowItems = stock.filter(isLow);
  if (lowItems.length === 0) { showToast('✅ Nenhum item em baixo estoque!'); return; }

  // Busca o que já está na lista
  const { data: existing } = await db.from('shopping_items').select('name');
  const existingNames = new Set((existing || []).map(e => e.name.toLowerCase()));

  const toAdd = lowItems.filter(i => !existingNames.has(i.name.toLowerCase()));
  if (toAdd.length === 0) { showToast('🛒 Todos já estão na lista!'); return; }

  const rows = toAdd.map(i => ({
    name: i.name, category: i.category, checked: false,
    value: 0, qty_num: 1, qty_unit: i.unit
  }));

  const { error } = await db.from('shopping_items').insert(rows);
  if (error) { showToast('❌ ' + error.message); return; }
  showToast(`🛒 ${toAdd.length} item${toAdd.length>1?'s':''} adicionado${toAdd.length>1?'s':''} à lista!`);
}

function setStockFilter(f, btn) {
  stockFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  render();
}

function render() {
  const total = stock.length;
  const low   = stock.filter(isLow).length;
  const ok    = total - low;

  document.getElementById('s-total').textContent = total;
  document.getElementById('s-low').textContent   = low;
  document.getElementById('s-ok').textContent    = ok;

  let filtered = stock;
  if (stockFilter === 'low') filtered = stock.filter(isLow);
  if (stockFilter === 'ok')  filtered = stock.filter(s => !isLow(s));

  const list  = document.getElementById('stock-list');
  const empty = document.getElementById('stock-empty');
  list.querySelectorAll('.stock-item').forEach(el => el.remove());

  if (filtered.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  // Agrupar por categoria
  const groups = {};
  filtered.forEach(i => {
    if (!groups[i.category]) groups[i.category] = [];
    groups[i.category].push(i);
  });

  Object.entries(groups).forEach(([cat, items]) => {
    // Separador de categoria
    const sep = document.createElement('div');
    sep.style.cssText = 'padding:8px 4px 4px;font-size:.72rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px';
    sep.textContent = cat;
    list.appendChild(sep);

    items.forEach(item => {
      const low   = isLow(item);
      const el    = document.createElement('div');
      el.className = `stock-item ${low ? 'low-stock' : ''}`;
      el.innerHTML = `
        <div class="stock-body">
          <div class="stock-name">${escapeHtml(item.name)}</div>
          <div class="stock-qty ${low ? 'low' : ''}">
            ${low ? '⚠️ ' : ''}${item.quantity} ${escapeHtml(item.unit)} (mín: ${item.min_quantity})
          </div>
        </div>
        <div class="stock-controls">
          <button class="qty-btn" onclick="updateQty('${item.id}', -1)" title="Diminuir">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="updateQty('${item.id}', 1)"  title="Aumentar">+</button>
        </div>
        ${low ? `<button class="btn-add-compras" onclick="addToCompras('${item.id}')">🛒 Comprar</button>` : ''}
        <button class="btn-delete" onclick="deleteStock('${item.id}')">🗑️</button>
      `;
      list.appendChild(el);
    });
  });
}

const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 2800);
}

window.addItem         = addItem;
window.updateQty       = updateQty;
window.deleteStock     = deleteStock;
window.addToCompras    = addToCompras;
window.addAllLowToCart = addAllLowToCart;
window.setStockFilter  = setStockFilter;

document.getElementById('s-nome').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

init();
