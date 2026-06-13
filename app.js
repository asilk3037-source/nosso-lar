// ═══════════════════════════════════════════════════════
//  CONFIGURAÇÃO DO SUPABASE
//  1. Acesse https://supabase.com e crie um projeto grátis
//  2. Vá em Project Settings → API
//  3. Cole a URL e a anon key abaixo
// ═══════════════════════════════════════════════════════

const SUPABASE_URL = 'COLE_SUA_URL_AQUI';
const SUPABASE_KEY = 'COLE_SUA_ANON_KEY_AQUI';

// ── INICIALIZAÇÃO ──────────────────────────────────────
const isConfigured = SUPABASE_URL !== 'COLE_SUA_URL_AQUI';
let supabaseClient = null;

if (isConfigured) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  document.getElementById('config-banner')?.classList.remove('hidden');
}

// ── ESTADO LOCAL ───────────────────────────────────────
let tasks = [];
let currentFilter = 'all';

// ── TAREFAS PADRÃO (modo offline) ─────────────────────
const DEFAULT_TASKS = [
  { id: '1', name: 'Limpar geladeira',     responsible: 'Aline',          category: '🍳 Cozinha',   done: false },
  { id: '2', name: 'Lavar vasilha',        responsible: 'Isabel',         category: '🍳 Cozinha',   done: false },
  { id: '3', name: 'Lavar banheiro',       responsible: 'Aline + Isabel', category: '🧹 Limpeza',   done: false },
  { id: '4', name: 'Lavar roupa',          responsible: 'Aline',          category: '👗 Roupas',    done: false },
  { id: '5', name: 'Pegar roupa e dobrar', responsible: 'Isabel',         category: '👗 Roupas',    done: false },
];

// ── INICIALIZAR APP ────────────────────────────────────
async function init() {
  if (isConfigured) {
    await loadFromSupabase();
    subscribeToChanges();
  } else {
    const saved = localStorage.getItem('nosso-lar-tasks');
    tasks = saved ? JSON.parse(saved) : DEFAULT_TASKS;
    render();
  }
}

// ── SUPABASE: CARREGAR ─────────────────────────────────
async function loadFromSupabase() {
  const { data, error } = await supabaseClient
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
  supabaseClient
    .channel('tasks-channel')
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

  const newTask = {
    id:         Date.now().toString(),
    name,
    responsible,
    category,
    done:       false,
    created_at: new Date().toISOString(),
  };

  if (isConfigured) {
    const { error } = await supabaseClient.from('tasks').insert([newTask]);
    if (error) { showToast('❌ Erro ao salvar tarefa.'); console.error(error); return; }
  } else {
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

  if (isConfigured) {
    const { error } = await supabaseClient.from('tasks').update({ done: newDone }).eq('id', id);
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

  if (isConfigured) {
    const { error } = await supabaseClient.from('tasks').delete().eq('id', id);
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
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
