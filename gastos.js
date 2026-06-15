const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3l1bmVmeW93bWJmeWhiYWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ4MjksImV4cCI6MjA5NjkyMDgyOX0.0M0ZqRBR50w9pR9Xd4aS9htqYBhGmLdhkA2PYPX8p74';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let expenses = [];
let currentPerson = 'Aline';

async function init() {
  await load();
  db.channel('expenses-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, load)
    .subscribe();
}

async function load() {
  const { data, error } = await db.from('expenses').select('*').order('created_at', { ascending: false });
  if (error) { showToast('⚠️ Erro ao carregar.'); return; }
  expenses = data || [];
  render();
}

function switchPerson(person, btn) {
  currentPerson = person;

  // sincroniza abas de pessoa
  document.querySelectorAll('.person-tab').forEach(b => b.classList.remove('active'));
  const activeTab = btn || document.getElementById(`tab-${person.toLowerCase()}`);
  if (activeTab) activeTab.classList.add('active');

  // sincroniza stat cards
  document.querySelectorAll('.stat-card[data-person]').forEach(c => {
    c.classList.toggle('stat-active', c.dataset.person === person);
  });

  document.getElementById('form-title').textContent    = `➕ Lançar Gasto — ${person}`;
  document.getElementById('history-title').textContent = `📋 Histórico — ${person} (+ compartilhados)`;
  render();
  document.querySelector('.tasks-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function addExpense() {
  const desc  = document.getElementById('expense-desc').value.trim();
  const cat   = document.getElementById('expense-cat').value;
  const value = parseFloat(document.getElementById('expense-value').value);

  if (!desc)          { showToast('✏️ Escreve a descrição!'); return; }
  if (!value || value <= 0) { showToast('💰 Informe um valor válido!'); return; }

  const { error } = await db.from('expenses').insert([{
    description: desc, category: cat, value, person: currentPerson
  }]);
  if (error) { showToast('❌ ' + error.message); return; }

  document.getElementById('expense-desc').value  = '';
  document.getElementById('expense-value').value = '';
  showToast('✅ Gasto adicionado!');
}

async function deleteExpense(id) {
  if (!confirm('Excluir esse gasto?')) return;
  const { error } = await db.from('expenses').delete().eq('id', id);
  if (error) { showToast('❌ Erro ao excluir.'); return; }
  showToast('🗑️ Excluído.');
}

function render() {
  // Totais individuais (gastos pessoais de cada uma)
  const totalAline  = expenses.filter(e => e.person === 'Aline').reduce((s, e) => s + Number(e.value), 0);
  const totalIsabel = expenses.filter(e => e.person === 'Isabel').reduce((s, e) => s + Number(e.value), 0);
  // Total geral = todos os gastos (incluindo compartilhados Aline + Isabel)
  const totalGeral  = expenses.reduce((s, e) => s + Number(e.value), 0);
  document.getElementById('total-aline').textContent  = fmt(totalAline);
  document.getElementById('total-isabel').textContent = fmt(totalIsabel);
  document.getElementById('total-geral').textContent  = fmt(totalGeral);

  // Lista filtrada: mostra gastos da pessoa + gastos compartilhados
  const list    = document.getElementById('expense-list');
  const empty   = document.getElementById('expense-empty');
  const filtered = expenses.filter(e => e.person === currentPerson || e.person === 'Aline + Isabel');
  list.querySelectorAll('.task-item').forEach(el => el.remove());

  if (filtered.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  filtered.forEach(exp => {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.innerHTML = `
      <div class="task-body">
        <span class="task-name">${escapeHtml(exp.description)}</span>
        <div class="task-meta">
          <span class="tag tag-category">${escapeHtml(exp.category)}</span>
          <span class="tag tag-value">R$ ${Number(exp.value).toFixed(2).replace('.',',')}</span>
          <span class="tag tag-date">${new Date(exp.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
      <button class="btn-delete" onclick="deleteExpense('${exp.id}')">🗑️</button>
    `;
    list.appendChild(item);
  });
}

const fmt = v => 'R$ ' + v.toFixed(2).replace('.',',');
const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 2800);
}

window.addExpense    = addExpense;
window.deleteExpense = deleteExpense;
window.switchPerson  = switchPerson;

document.getElementById('expense-value').addEventListener('keydown', e => {
  if (e.key === 'Enter') addExpense();
});

init();
