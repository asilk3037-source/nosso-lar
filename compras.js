const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3l1bmVmeW93bWJmeWhiYWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ4MjksImV4cCI6MjA5NjkyMDgyOX0.0M0ZqRBR50w9pR9Xd4aS9htqYBhGmLdhkA2PYPX8p74';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let items = [];

async function init() {
  await load();
  db.channel('shopping-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, load)
    .subscribe();
}

async function load() {
  const { data, error } = await db.from('shopping_items').select('*').order('created_at', { ascending: true });
  if (error) { showToast('⚠️ Erro ao carregar.'); return; }
  items = data || [];
  render();
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
  showToast('✅ Item adicionado!');
}

async function toggleItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  const { error } = await db.from('shopping_items').update({ checked: !item.checked }).eq('id', id);
  if (error) showToast('❌ Erro.');
}

async function updateValue(id, val) {
  const value = parseFloat(val);
  if (isNaN(value) || value < 0) return;
  await db.from('shopping_items').update({ value }).eq('id', id);
}

async function deleteItem(id) {
  await db.from('shopping_items').delete().eq('id', id);
  showToast('🗑️ Item removido.');
}

async function finishShopping() {
  const total = items.reduce((s, i) => s + (i.checked && i.value ? Number(i.value) : 0), 0);
  if (total === 0) { showToast('⚠️ Informe o valor dos itens antes de finalizar!'); return; }
  if (!confirm(`Finalizar compra de R$ ${total.toFixed(2).replace('.',',')}?\n\nIsso vai salvar nos gastos de Aline + Isabel e limpar a lista.`)) return;

  // Salva como gasto conjunto
  const { error: expErr } = await db.from('expenses').insert([{
    description: `🛒 Compras do mercado`,
    category:    '🛒 Mercado',
    value:       total,
    person:      'Aline + Isabel'
  }]);
  if (expErr) { showToast('❌ Erro ao salvar gasto.'); return; }

  // Limpa a lista
  const ids = items.map(i => i.id);
  await db.from('shopping_items').delete().in('id', ids);

  showToast(`🎉 Compra de R$ ${total.toFixed(2).replace('.',',')} salva nos gastos!`);
}

function render() {
  const total   = items.reduce((s, i) => s + (i.checked && i.value ? Number(i.value) : 0), 0);
  const checked = items.filter(i => i.checked).length;

  document.getElementById('stat-itens').textContent        = items.length;
  document.getElementById('stat-checked').textContent      = checked;
  document.getElementById('stat-total-compra').textContent = 'R$ ' + total.toFixed(2).replace('.',',');

  const btn = document.getElementById('btn-finish');
  btn.disabled = items.length === 0;

  const list  = document.getElementById('shopping-list');
  const empty = document.getElementById('shopping-empty');
  list.querySelectorAll('.task-item').forEach(el => el.remove());

  if (items.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  // pendentes primeiro, depois marcados
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
              <input
                type="number"
                class="value-input"
                placeholder="0,00"
                min="0" step="0.01"
                value="${item.value !== null ? item.value : ''}"
                onchange="updateValue('${item.id}', this.value)"
                onclick="event.stopPropagation()"
              />
            </div>` : ''}
        </div>
      </div>
      <button class="btn-delete" onclick="deleteItem('${item.id}')">🗑️</button>
    `;
    list.appendChild(el);
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

window.addItem        = addItem;
window.toggleItem     = toggleItem;
window.updateValue    = updateValue;
window.deleteItem     = deleteItem;
window.finishShopping = finishShopping;

document.getElementById('item-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

init();
