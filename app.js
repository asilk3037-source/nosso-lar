const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3l1bmVmeW93bWJmeWhiYWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ4MjksImV4cCI6MjA5NjkyMDgyOX0.0M0ZqRBR50w9pR9Xd4aS9htqYBhGmLdhkA2PYPX8p74';

let db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let tasks = [];
let currentFilter = 'all';

// ── INIT ───────────────────────────────────────────────
async function init() {
  await loadFromSupabase();
  subscribeToChanges();
}

// ── CARREGAR DO BANCO ──────────────────────────────────
async function loadFromSupabase() {
  const { data, error } = await db
    .from('tasks').select('*').order('created_at', { ascending: true });
  if (error) { showToast('⚠️ Erro ao carregar.'); console.error(error); return; }
  tasks = data || [];
  render();
}

// ── REALTIME ───────────────────────────────────────────
function subscribeToChanges() {
  db.channel('tasks-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
      loadFromSupabase();
    }).subscribe();
}

// ── ADICIONAR ──────────────────────────────────────────
async function addTask() {
  const input = document.getElementById('task-input');
  const name  = input.value.trim();
  if (!name) { input.focus(); showToast('✏️ Escreve o nome da tarefa!'); return; }

  const responsible = document.getElementById('task-responsible').value;
  const category    = document.getElementById('task-category').value;

  const { error } = await db.from('tasks').insert([{ name, responsible, category, done: false }]);
  if (error) { showToast('❌ ' + error.message); return; }
  input.value = '';
  input.focus();
  showToast('✅ Tarefa adicionada!');
}

// ── MARCAR / DESMARCAR ─────────────────────────────────
async function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const { error } = await db.from('tasks').update({ done: !task.done }).eq('id', id);
  if (error) { showToast('❌ Erro ao atualizar.'); return; }
  showToast(!task.done ? '🎉 Concluída!' : '🔄 Reaberta!');
}

// ── TROCAR RESPONSÁVEL (inline select) ────────────────
async function changeResponsible(id, value) {
  const { error } = await db.from('tasks').update({ responsible: value }).eq('id', id);
  if (error) { showToast('❌ Erro ao atualizar.'); return; }
  showToast('👤 Responsável atualizado!');
}

// ── EXCLUIR ────────────────────────────────────────────
async function deleteTask(id) {
  if (!confirm('Excluir essa tarefa?')) return;
  const { error } = await db.from('tasks').delete().eq('id', id);
  if (error) { showToast('❌ Erro ao excluir.'); return; }
  showToast('🗑️ Excluída.');
}

// ── FILTROS ────────────────────────────────────────────
function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function getFiltered() {
  switch (currentFilter) {
    case 'pending': return tasks.filter(t => !t.done);
    case 'done':    return tasks.filter(t => t.done);
    case 'Aline':   return tasks.filter(t => t.responsible === 'Aline' || t.responsible === 'Aline + Isabel');
    case 'Isabel':  return tasks.filter(t => t.responsible === 'Isabel' || t.responsible === 'Aline + Isabel');
    default:        return tasks;
  }
}

// ── RENDER ─────────────────────────────────────────────
function render() {
  const filtered = getFiltered();
  updateStats(filtered);

  const list  = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  list.querySelectorAll('.task-item').forEach(el => el.remove());

  if (filtered.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  filtered.forEach(task => {
    const item = document.createElement('div');
    item.className = `task-item ${task.done ? 'done' : ''}`;
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
        </div>
      </div>
      <button class="btn-delete" onclick="deleteTask('${task.id}')" title="Excluir">🗑️</button>
    `;
    list.appendChild(item);
  });
}

// ── STATS baseados no filtro ativo ─────────────────────
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

  // Label dinâmico no card de total
  const label = {
    all:     'Total de Tarefas',
    pending: 'Pendentes',
    done:    'Concluídas',
    Aline:   'Tarefas da Aline',
    Isabel:  'Tarefas da Isabel',
  }[currentFilter] || 'Total de Tarefas';
  document.querySelector('#stats .stat-card:first-child .stat-label').textContent = label;
}

// ── HELPERS ────────────────────────────────────────────
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

// ── EXPÕE FUNÇÕES GLOBALMENTE ──────────────────────────
window.addTask           = addTask;
window.toggleTask        = toggleTask;
window.deleteTask        = deleteTask;
window.setFilter         = setFilter;
window.changeResponsible = changeResponsible;

// ── ENTER ──────────────────────────────────────────────
document.getElementById('task-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

init();
