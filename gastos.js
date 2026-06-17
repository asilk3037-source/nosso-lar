const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3l1bmVmeW93bWJmeWhiYWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ4MjksImV4cCI6MjA5NjkyMDgyOX0.0M0ZqRBR50w9pR9Xd4aS9htqYBhGmLdhkA2PYPX8p74';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let expenses = [];
let currentPerson  = 'Aline';
let currentBillTab = 'unpaid';

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
  document.querySelectorAll('.person-tab').forEach(b => b.classList.remove('active'));
  const activeTab = btn || document.getElementById(`tab-${person.toLowerCase()}`);
  if (activeTab) activeTab.classList.add('active');
  document.querySelectorAll('.stat-card[data-person]').forEach(c => {
    c.classList.toggle('stat-active', c.dataset.person === person);
  });
  document.getElementById('form-title').textContent    = `➕ Novo Lançamento — ${person}`;
  document.getElementById('history-title').textContent = `📋 Histórico — ${person}`;
  render();
  document.querySelector('.tasks-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function switchBillTab(tab, btn) {
  currentBillTab = tab;
  document.querySelectorAll('.bill-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  render();
}

async function addExpense() {
  const desc      = document.getElementById('expense-desc').value.trim();
  const cat       = document.getElementById('expense-cat').value;
  const value     = parseFloat(document.getElementById('expense-value').value);
  const due       = document.getElementById('expense-due').value || null;
  const recurring = document.getElementById('expense-recurring').checked;

  if (!desc)             { showToast('✏️ Escreve a descrição!'); return; }
  if (!value || value <= 0) { showToast('💰 Informe um valor válido!'); return; }

  const { error } = await db.from('expenses').insert([{
    description: desc, category: cat, value,
    person: currentPerson,
    due_date: due, paid: false, recurring
  }]);
  if (error) { showToast('❌ ' + error.message); return; }

  document.getElementById('expense-desc').value  = '';
  document.getElementById('expense-value').value = '';
  document.getElementById('expense-recurring').checked = false;
  showToast('✅ Lançamento adicionado!');
}

async function togglePaid(id, current) {
  const { error } = await db.from('expenses').update({ paid: !current }).eq('id', id);
  if (error) showToast('❌ Erro ao atualizar.');
  else showToast(!current ? '✅ Marcado como pago!' : '🔄 Marcado como pendente!');
}

function exportCSV() {
  const rows = [['Descrição','Categoria','Valor','Pessoa','Vencimento','Pago','Recorrente','Data']];
  const toExport = expenses.filter(e => e.person === currentPerson || e.person === 'Aline + Isabel');
  toExport.forEach(e => {
    rows.push([
      `"${(e.description||'').replace(/"/g,'""')}"`,
      `"${(e.category||'').replace(/"/g,'""')}"`,
      Number(e.value).toFixed(2).replace('.',','),
      `"${e.person}"`,
      e.due_date || '',
      e.paid ? 'Sim' : 'Não',
      e.recurring ? 'Sim' : 'Não',
      new Date(e.created_at).toLocaleDateString('pt-BR'),
    ]);
  });
  const csv  = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `gastos-${currentPerson.toLowerCase()}-${new Date().toISOString().slice(0,7)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('⬇️ CSV exportado!');
}

async function deleteExpense(id) {
  const ok = await window.showConfirm('Excluir esse lançamento?', {
    title: 'Excluir lançamento', icon: '🗑️', okLabel: 'Excluir', danger: true
  });
  if (!ok) return;
  const { error } = await db.from('expenses').delete().eq('id', id);
  if (error) { showToast('❌ Erro ao excluir.'); return; }
  showToast('🗑️ Excluído.');
}

function getDueCls(dueDateStr, paid) {
  if (paid) return 'noDue';
  if (!dueDateStr) return 'noDue';
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(dueDateStr + 'T00:00:00');
  const diff  = Math.round((due - today) / 86400000);
  if (diff < 0)  return 'overdue';
  if (diff === 0) return 'today';
  return 'future';
}

function getDueLabel(dueDateStr, paid) {
  if (paid || !dueDateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(dueDateStr + 'T00:00:00');
  const diff  = Math.round((due - today) / 86400000);
  if (diff < 0)  return `⚠️ Venceu há ${Math.abs(diff)} dia${Math.abs(diff)>1?'s':''}`;
  if (diff === 0) return '⚡ Vence hoje!';
  return `📅 Vence em ${diff} dia${diff>1?'s':''}`;
}

function render() {
  const totalAline  = expenses.filter(e => e.person === 'Aline').reduce((s, e) => s + Number(e.value), 0);
  const totalIsabel = expenses.filter(e => e.person === 'Isabel').reduce((s, e) => s + Number(e.value), 0);
  const totalGeral  = expenses.reduce((s, e) => s + Number(e.value), 0);
  const totalUnpaid = expenses.filter(e => !e.paid).length;

  document.getElementById('total-aline').textContent  = fmt(totalAline);
  document.getElementById('total-isabel').textContent = fmt(totalIsabel);
  document.getElementById('total-geral').textContent  = fmt(totalGeral);
  document.getElementById('total-unpaid').textContent = totalUnpaid;

  let filtered = expenses.filter(e => e.person === currentPerson || e.person === 'Aline + Isabel');
  if (currentBillTab === 'unpaid') filtered = filtered.filter(e => !e.paid);
  if (currentBillTab === 'paid')   filtered = filtered.filter(e => e.paid);

  const list  = document.getElementById('expense-list');
  const empty = document.getElementById('expense-empty');
  list.querySelectorAll('.bill-item').forEach(el => el.remove());

  if (filtered.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  filtered.forEach(exp => {
    const dueCls   = getDueCls(exp.due_date, exp.paid);
    const dueLabel = getDueLabel(exp.due_date, exp.paid);
    const item = document.createElement('div');
    item.className = `bill-item ${!exp.paid ? 'unpaid' : 'paid-done'}`;
    item.innerHTML = `
      <div class="task-check ${exp.paid ? 'paid-check' : ''}" style="
        width:22px;height:22px;min-width:22px;border-radius:7px;cursor:pointer;
        border:2.5px solid ${exp.paid ? 'transparent' : 'var(--border)'};
        background:${exp.paid ? 'var(--gradient,#16a34a)' : 'var(--bg)'};
        display:flex;align-items:center;justify-content:center;font-size:.7rem;color:white;font-weight:800;
        transition:all .15s;flex-shrink:0"
        onclick="togglePaid('${exp.id}', ${exp.paid})" title="${exp.paid ? 'Marcar como pendente' : 'Marcar como pago'}">
        ${exp.paid ? '✓' : ''}
      </div>
      <div class="bill-body">
        <div class="bill-name">${escapeHtml(exp.description)}</div>
        <div class="bill-meta">
          <span class="tag tag-category">${escapeHtml(exp.category)}</span>
          <span class="tag tag-value">R$ ${Number(exp.value).toFixed(2).replace('.',',')}</span>
          ${dueLabel ? `<span class="bill-due ${dueCls}">${dueLabel}</span>` : ''}
          ${exp.recurring ? '<span class="tag" style="background:#ede9fe;color:#7c3aed">🔁 Recorrente</span>' : ''}
          ${exp.person === 'Aline + Isabel' ? '<span class="tag" style="background:#e0f2fe;color:#0369a1">👥 Compartilhado</span>' : ''}
        </div>
      </div>
      ${!exp.paid ? `<button class="btn-pay" onclick="togglePaid('${exp.id}', false)">💳 Pagar</button>` : ''}
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

window.addExpense   = addExpense;
window.deleteExpense = deleteExpense;
window.exportCSV    = exportCSV;
window.switchPerson = switchPerson;
window.switchBillTab = switchBillTab;
window.togglePaid   = togglePaid;

document.getElementById('expense-value').addEventListener('keydown', e => {
  if (e.key === 'Enter') addExpense();
});

init();
