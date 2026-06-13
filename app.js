const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3l1bmVmeW93bWJmeWhiYWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ4MjksImV4cCI6MjA5NjkyMDgyOX0.0M0ZqRBR50w9pR9Xd4aS9htqYBhGmLdhkA2PYPX8p74';

// ── INICIALIZAÇÃO ──────────────────────────────────────
let db = null;

try {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch(e) {
  console.error('Erro ao iniciar Supabase:', e);
}

let tasks = [];
let currentFilter = 'all';

// ── INICIALIZAR APP ────────────────────────────────────
async function init() {
  if (db) {
    await loadFromSupabase();
    subscribeToChanges();
  } else {
    const saved = localStorage.getItem('nosso-lar-tasks');
    tasks = saved ? JSON.parse(saved) : [];
    render();
  }
}

// ── SUPABASE: CARREGAR ─────────────────────────────────
async function loadFromSupabase() {
  const { data, error } = await db
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao carregar tarefas:', error);
    showToast('⚠️ Erro ao carregar. Verifique a conexão.');
    return;
  }
  tasks = data || [];
  render();
}

// ── SUPABASE: REALTIME ─────────────────────────────────
function subscribeToChanges() {
  db.channel('tasks-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
      loadFromSupabase();
    })
    .subscribe();
}

// ── ADICIONAR TAREFA ───────────────────────────────────
async function addTask() {
  const input = document.getElementById('task-input');
  const name = input.value.trim();
  if (!name) { input.focus(); showToast('✏️ Escreve o nome da tarefa!'); return; }

  const responsible = document.getElementById('task-responsible').value;
  const category    = document.getElementById('task-category').value;

  const newTask = { name, responsible, category, done: false };

  if (db) {
    const { error } = await db.from('tasks').insert([newTask]);
    if (error) { showToast('❌ Erro ao salvar: ' + error.message); console.error(error); return; }
  } else {
    newTask.id = Date.now().toString();
    newTask.created_at = new Date().toISOString();
    tasks.push(newTask);
    saveLocal();
    render();
  }

  input.value = '';
  input.focus();
  showToast('✅ Tarefa adicionada!');
}

// ── MARCAR / DESMARCAR ─────────────────────────────────
async function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const newDone = !task.done;

  if (db) {
    const { error } = await db.from('tasks').update({ done: newDone }).eq('id', id);
    if (error) { showToast('❌ Erro ao atualizar.'); return; }
  } else {
    task.done = newDone;
    saveLocal();
    render();
  }
  showToast(newDone ? '🎉 Tarefa concluída!' : '🔄 Tarefa reaberta!');
}

// ── EXCLUIR TAREFA ─────────────────────────────────────
async function deleteTask(id) {
  if (!confirm('Excluir essa tarefa?')) return;

  if (db) {
    const { error } = await db.from('tasks').delete().eq('id', id);
    if (error) { showToast('❌ Erro ao excluir.'); return; }
  } else {
    tasks = tasks.filter(t => t.id !== id);
    saveLocal();
    render();
  }
  showToast('🗑️ Tarefa excluída.');
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
    case 'Aline':   return tasks.filter(t => t.responsible === 'Aline');
    case 'Isabel':  return tasks.filter(t => t.responsible === 'Isabel');
    default:        return tasks;
  }
}

// ── RENDER ─────────────────────────────────────────────
function render() {
  updateStats();
  const list     = document.getElementById('task-list');
  const empty    = document.getElementById('empty-state');
  const filtered = getFiltered();

  list.querySelectorAll('.task-item').forEach(el => el.remove());

  if (filtered.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  filtered.forEach(task => {
    const item = document.createElement('div');
    item.className = `task-item ${task.done ? 'done' : ''}`;
    item.dataset.id = task.id;
    item.innerHTML = `
      <input
        type="checkbox"
        class="task-check"
        ${task.done ? 'checked' : ''}
        onchange="toggleTask('${task.id}')"
        aria-label="Marcar como concluída"
      />
      <div class="task-body">
        <span class="task-name ${task.done ? 'striked' : ''}">${escapeHtml(task.name)}</span>
        <div class="task-meta">
          <span class="tag tag-responsible">${escapeHtml(task.responsible)}</span>
          <span class="tag tag-category">${escapeHtml(task.category)}</span>
        </div>
      </div>
      <button class="btn-delete" onclick="deleteTask('${task.id}')" title="Excluir">🗑️</button>
    `;
    list.appendChild(item);
  });
}

// ── STATS ──────────────────────────────────────────────
function updateStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const pending = total - done;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('stat-total').textContent    = total;
  document.getElementById('stat-done').textContent     = done;
  document.getElementById('stat-pending').textContent  = pending;
  document.getElementById('stat-progress').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';
}

// ── HELPERS ────────────────────────────────────────────
function saveLocal() {
  localStorage.setItem('nosso-lar-tasks', JSON.stringify(tasks));
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

// ── EXPÕE FUNÇÕES GLOBALMENTE ──────────────────────────
window.addTask    = addTask;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.setFilter  = setFilter;

// ── ENTER para adicionar ───────────────────────────────
document.getElementById('task-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

// ── START ──────────────────────────────────────────────
init();
