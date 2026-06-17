const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3l1bmVmeW93bWJmeWhiYWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ4MjksImV4cCI6MjA5NjkyMDgyOX0.0M0ZqRBR50w9pR9Xd4aS9htqYBhGmLdhkA2PYPX8p74';

let db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let tasks = [];
let currentFilter = 'all';

const PRIORITY_LABEL = { alta: '🔴 Alta', media: '🟡 Média', baixa: '🟢 Baixa' };
const PRIORITY_ORDER = { alta: 0, media: 1, baixa: 2 };

async function init() {
  await loadFromSupabase();
  subscribeToChanges();
}

async function loadFromSupabase() {
  const { data, error } = await db.from('tasks').select('*').order('created_at', { ascending: true });
  if (error) { showToast('⚠️ Erro ao carregar.'); console.error(error); return; }
  tasks = data || [];
  render();
}

function subscribeToChanges() {
  db.channel('tasks-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadFromSupabase())
    .subscribe();
}

async function addTask() {
  const input    = document.getElementById('task-input');
  const name     = input.value.trim();
  if (!name) { input.focus(); showToast('✏️ Escreve o nome da tarefa!'); return; }

  const responsible = document.getElementById('task-responsible').value;
  const category    = document.getElementById('task-category').value;
  const priority    = document.getElementById('task-priority').value;

  const { error } = await db.from('tasks').insert([{ name, responsible, category, priority, done: false }]);
  if (error) { showToast('❌ ' + error.message); return; }
  input.value = '';
  input.focus();
  showToast('✅ Tarefa adicionada!');
}

async function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const { error } = await db.from('tasks').update({ done: !task.done }).eq('id', id);
  if (error) { showToast('❌ Erro ao atualizar.'); return; }
  showToast(!task.done ? '🎉 Concluída!' : '🔄 Reaberta!');
}

async function changeResponsible(id, value) {
  const { error } = await db.from('tasks').update({ responsible: value }).eq('id', id);
  if (error) { showToast('❌ Erro ao atualizar.'); return; }
  showToast('👤 Responsável atualizado!');
}

async function changePriority(id, value) {
  const { error } = await db.from('tasks').update({ priority: value }).eq('id', id);
  if (error) { showToast('❌ Erro ao atualizar.'); return; }
}

async function deleteTask(id) {
  const ok = await window.showConfirm('Excluir essa tarefa permanentemente?', {
    title: 'Excluir tarefa', icon: '🗑️', okLabel: 'Excluir', danger: true
  });
  if (!ok) return;
  const { error } = await db.from('tasks').delete().eq('id', id);
  if (error) { showToast('❌ Erro ao excluir.'); return; }
  showToast('🗑️ Excluída.');
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    const match = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
    if (match) match.classList.add('active');
  }
  document.querySelectorAll('.stat-card[data-filter]').forEach(c => {
    c.classList.toggle('stat-active', c.dataset.filter === filter);
  });
  render();
  document.querySelector('.tasks-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getFiltered() {
  switch (currentFilter) {
    case 'pending': return tasks.filter(t => !t.done);
    case 'done':    return tasks.filter(t => t.done);
    case 'Aline':   return tasks.filter(t => t.responsible === 'Aline'  || t.responsible === 'Aline + Isabel');
    case 'Isabel':  return tasks.filter(t => t.responsible === 'Isabel' || t.responsible === 'Aline + Isabel');
    default:        return tasks;
  }
}

function render() {
  const filtered = getFiltered();
  // Ordenar: alta > media > baixa, depois as concluídas por último
  filtered.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (PRIORITY_ORDER[a.priority || 'media'] || 1) - (PRIORITY_ORDER[b.priority || 'media'] || 1);
  });
  updateStats(filtered);

  const list  = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  list.querySelectorAll('.task-item').forEach(el => el.remove());

  if (filtered.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  filtered.forEach(task => {
    const p    = task.priority || 'media';
    const item = document.createElement('div');
    item.className = `task-item priority-${p} ${task.done ? 'done' : ''}`;
    item.innerHTML = `
      <input type="checkbox" class="task-check" ${task.done ? 'checked' : ''}
        onchange="toggleTask('${task.id}')" aria-label="Concluir" />
      <div class="task-body">
        <span class="task-name ${task.done ? 'striked' : ''}">${escapeHtml(task.name)}</span>
        <div class="task-meta">
          <select class="tag-select" onchange="changeResponsible('${task.id}', this.value)">
            <option value="Aline"          ${task.responsible === 'Aline'          ? 'selected' : ''}>👤 Aline</option>
            <option value="Isabel"         ${task.responsible === 'Isabel'         ? 'selected' : ''}>👤 Isabel</option>
            <option value="Aline + Isabel" ${task.responsible === 'Aline + Isabel' ? 'selected' : ''}>👥 Aline + Isabel</option>
          </select>
          <span class="tag tag-category">${escapeHtml(task.category)}</span>
          <select class="tag-select tag-priority-${p}" style="background:none;border:1.5px solid currentColor;opacity:.85"
            onchange="changePriority('${task.id}', this.value)">
            <option value="alta"  ${p==='alta'  ? 'selected':''}>🔴 Alta</option>
            <option value="media" ${p==='media' ? 'selected':''}>🟡 Média</option>
            <option value="baixa" ${p==='baixa' ? 'selected':''}>🟢 Baixa</option>
          </select>
        </div>
      </div>
      <button class="btn-delete" onclick="deleteTask('${task.id}')" title="Excluir">🗑️</button>
    `;
    list.appendChild(item);
  });
}

function updateStats(filtered) {
  const total   = filtered.length;
  const done    = filtered.filter(t => t.done).length;
  const pending = total - done;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('stat-total').textContent    = total;
  document.getElementById('stat-done').textContent     = done;
  document.getElementById('stat-pending').textContent  = pending;
  document.getElementById('stat-progress').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';

  const label = {
    all: 'Total de Tarefas', pending: 'Pendentes', done: 'Concluídas',
    Aline: 'Tarefas da Aline', Isabel: 'Tarefas da Isabel',
  }[currentFilter] || 'Total de Tarefas';
  document.querySelector('#stats .stat-card:first-child .stat-label').textContent = label;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 2800);
}

window.addTask           = addTask;
window.toggleTask        = toggleTask;
window.deleteTask        = deleteTask;
window.setFilter         = setFilter;
window.changeResponsible = changeResponsible;
window.changePriority    = changePriority;

document.getElementById('task-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

init();
