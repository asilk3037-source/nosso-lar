const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3l1bmVmeW93bWJmeWhiYWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ4MjksImV4cCI6MjA5NjkyMDgyOX0.0M0ZqRBR50w9pR9Xd4aS9htqYBhGmLdhkA2PYPX8p74';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let dates = [];
let dateFilter = 'all';

async function init() {
  await load();
  db.channel('dates-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'important_dates' }, load)
    .subscribe();
}

async function load() {
  const { data, error } = await db.from('important_dates').select('*').order('date');
  if (error) { showToast('⚠️ Erro ao carregar.'); return; }
  dates = data || [];
  render();
}

function getDiff(d) {
  const today = new Date(); today.setHours(0,0,0,0);
  let evDate  = new Date(d.date + 'T00:00:00');
  if (d.repeat_yearly) {
    evDate.setFullYear(today.getFullYear());
    if (evDate < today) evDate.setFullYear(today.getFullYear() + 1);
  }
  return Math.round((evDate - today) / 86400000);
}

function getDisplayDate(d) {
  let evDate = new Date(d.date + 'T00:00:00');
  if (d.repeat_yearly) {
    const today = new Date(); today.setHours(0,0,0,0);
    evDate.setFullYear(today.getFullYear());
    if (evDate < today) evDate.setFullYear(today.getFullYear() + 1);
  }
  return evDate;
}

async function addDate() {
  const titulo  = document.getElementById('d-titulo').value.trim();
  const data    = document.getElementById('d-data').value;
  const cat     = document.getElementById('d-cat').value;
  const repeat  = document.getElementById('d-repeat').checked;

  if (!titulo) { showToast('✏️ Escreve o nome do evento!'); return; }
  if (!data)   { showToast('📅 Selecione uma data!'); return; }

  const { error } = await db.from('important_dates').insert([{
    title: titulo, date: data, category: cat, repeat_yearly: repeat
  }]);
  if (error) { showToast('❌ ' + error.message); return; }

  document.getElementById('d-titulo').value = '';
  document.getElementById('d-data').value   = '';
  document.getElementById('d-repeat').checked = false;
  showToast('📅 Data adicionada!');
}

async function deleteDate(id) {
  const ok = await window.showConfirm('Excluir esta data importante?', {
    title: 'Excluir data', icon: '📅', okLabel: 'Excluir', danger: true
  });
  if (!ok) return;
  const { error } = await db.from('important_dates').delete().eq('id', id);
  if (error) { showToast('❌ Erro ao excluir.'); return; }
  showToast('🗑️ Excluída.');
}

function setDateFilter(f, btn) {
  dateFilter = f;
  document.querySelectorAll('[data-df]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  render();
}

function render() {
  const today = new Date(); today.setHours(0,0,0,0);

  const withDiff = dates.map(d => ({ ...d, diff: getDiff(d), evDate: getDisplayDate(d) }));
  const total    = dates.length;
  const proximas = withDiff.filter(d => d.diff >= 0 && d.diff <= 30).length;
  const next     = withDiff.filter(d => d.diff >= 0).sort((a,b) => a.diff - b.diff)[0];

  document.getElementById('d-total').textContent   = total;
  document.getElementById('d-proximas').textContent= proximas;
  document.getElementById('d-proxima-label').textContent = next
    ? `${next.title} — ${next.diff === 0 ? 'Hoje!' : next.diff === 1 ? 'Amanhã' : `em ${next.diff} dias`}`
    : 'Nenhuma próxima';

  let filtered = withDiff;
  if (dateFilter === 'soon') filtered = withDiff.filter(d => d.diff >= 0 && d.diff <= 30);
  if (dateFilter === 'past') filtered = withDiff.filter(d => d.diff < 0);
  if (dateFilter === 'anual') filtered = withDiff.filter(d => d.repeat_yearly);

  filtered = filtered.sort((a,b) => a.diff - b.diff);

  const list  = document.getElementById('dates-list');
  const empty = document.getElementById('dates-empty');
  list.querySelectorAll('.date-item').forEach(el => el.remove());

  if (filtered.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  filtered.forEach(d => {
    const isPast = d.diff < 0;
    const cdCls  = d.diff === 0 ? 'today' : d.diff > 0 && d.diff <= 7 ? 'soon' : '';
    const num    = isPast ? Math.abs(d.diff) : d.diff;
    const unit   = num === 0 ? '🎉' : isPast ? 'dias atrás' : 'dias';
    const dateStr = d.evDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    const item = document.createElement('div');
    item.className = `date-item ${isPast ? 'past' : ''}`;
    item.innerHTML = `
      <div class="date-countdown ${cdCls}">
        <span class="date-countdown-num">${num === 0 ? '🎉' : num}</span>
        ${num !== 0 ? `<span class="date-countdown-unit">${unit}</span>` : ''}
      </div>
      <div class="date-body">
        <div class="date-title">${d.category.split(' ')[0]} ${escapeHtml(d.title)}</div>
        <div class="date-sub">${dateStr} ${d.repeat_yearly ? '• 🔁 Anual' : ''}</div>
      </div>
      <button class="btn-delete" onclick="deleteDate('${d.id}')">🗑️</button>
    `;
    list.appendChild(item);
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

window.addDate      = addDate;
window.deleteDate   = deleteDate;
window.setDateFilter = setDateFilter;

document.getElementById('d-titulo').addEventListener('keydown', e => {
  if (e.key === 'Enter') addDate();
});

init();
