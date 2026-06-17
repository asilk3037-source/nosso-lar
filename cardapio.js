const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3l1bmVmeW93bWJmeWhiYWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ4MjksImV4cCI6MjA5NjkyMDgyOX0.0M0ZqRBR50w9pR9Xd4aS9htqYBhGmLdhkA2PYPX8p74';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const DAYS  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MEALS = [
  { key: 'cafe',   label: '☀️ Café', emoji: '☀️' },
  { key: 'almoco', label: '🍽️ Almoço', emoji: '🍽️' },
  { key: 'lanche', label: '🍪 Lanche', emoji: '🍪' },
  { key: 'jantar', label: '🌙 Jantar', emoji: '🌙' },
];

let cardapio  = [];
let weekOffset = 0; // semanas a partir da atual
let editCtx    = null; // { day_of_week, meal_type, existingId? }

function getWeekDates() {
  const today = new Date(); today.setHours(0,0,0,0);
  const dow   = today.getDay(); // 0=Dom
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow + (weekOffset * 7)); // começa no Dom
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

async function init() {
  await load();
  db.channel('cardapio-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cardapio' }, load)
    .subscribe();
}

async function load() {
  const dates = getWeekDates();
  // Carrega toda a semana (simplificado: carregar tudo e filtrar client-side)
  const { data, error } = await db.from('cardapio').select('*').order('created_at');
  if (error) { showToast('⚠️ Erro ao carregar.'); return; }
  cardapio = data || [];
  render();
}

function getMealForSlot(dayOfWeek, mealType) {
  // Para a semana atual, usamos day_of_week + semana relativa
  // Simplificado: armazenamos week_offset junto ao item — mas como a tabela não tem,
  // usamos apenas day_of_week e mostramos o cardápio "template" semanal
  return cardapio.find(m => m.day_of_week === dayOfWeek && m.meal_type === mealType);
}

function render() {
  const dates   = getWeekDates();
  const today   = new Date(); today.setHours(0,0,0,0);

  // Semana label
  const from = dates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const to   = dates[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  document.getElementById('semana-label').textContent = `${from} – ${to}`;

  // Stats
  const planned = cardapio.length;
  const total   = 7 * MEALS.length;
  document.getElementById('c-refeicoes').textContent = planned;
  document.getElementById('c-vazios').textContent    = Math.max(0, total - planned);

  const todayDow = today.getDay();
  const todayMeals = cardapio.filter(m => m.day_of_week === todayDow);
  document.getElementById('c-hoje').textContent =
    todayMeals.length > 0
      ? todayMeals.map(m => m.name).join(' · ')
      : 'Nada planejado ainda';

  const grid = document.getElementById('cardapio-grid');
  grid.innerHTML = '';

  dates.forEach((date, idx) => {
    const dow    = date.getDay();
    const isToday = date.getTime() === today.getTime();
    const col = document.createElement('div');
    col.className = 'cardapio-day';

    const hdr = document.createElement('div');
    hdr.className = `cardapio-day-header ${isToday ? 'today' : ''}`;
    hdr.innerHTML = `${DAYS[dow]}<br><span style="font-size:.8em;opacity:.85">${date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</span>`;
    col.appendChild(hdr);

    const mealsDiv = document.createElement('div');
    mealsDiv.className = 'cardapio-meals';

    MEALS.forEach(m => {
      const meal = getMealForSlot(dow, m.key);
      const slot = document.createElement('div');
      slot.className = 'cardapio-meal';
      slot.onclick   = () => openMealModal(dow, m.key, meal);

      if (meal) {
        slot.innerHTML = `
          <div class="cardapio-meal-type">${m.label}</div>
          <div class="cardapio-meal-name">${escapeHtml(meal.name)}</div>
          <div class="cardapio-meal-add" style="color:var(--muted);font-size:.64rem">✏️ editar</div>
        `;
      } else {
        slot.innerHTML = `
          <div class="cardapio-meal-type">${m.label}</div>
          <div class="cardapio-meal-empty">Vazio</div>
          <div class="cardapio-meal-add">+ adicionar</div>
        `;
      }
      mealsDiv.appendChild(slot);
    });

    col.appendChild(mealsDiv);
    grid.appendChild(col);
  });
}

function openMealModal(dayOfWeek, mealType, existing) {
  editCtx = { dayOfWeek, mealType, id: existing?.id || null };
  const dayName  = DAYS[dayOfWeek];
  const mealName = MEALS.find(m => m.key === mealType)?.label || mealType;
  document.getElementById('meal-modal-title').textContent = `${mealName} — ${dayName}`;
  document.getElementById('meal-name').value   = existing?.name   || '';
  document.getElementById('meal-serves').value = existing?.serves || 2;

  const saveBtn = document.getElementById('meal-save-btn');
  if (existing) {
    saveBtn.textContent = 'Salvar alteração';
    // Adiciona botão de excluir se não existir
    let delBtn = document.getElementById('meal-delete-btn');
    if (!delBtn) {
      delBtn = document.createElement('button');
      delBtn.id        = 'meal-delete-btn';
      delBtn.className = 'btn-import';
      delBtn.style.color = '#be123c';
      delBtn.textContent = '🗑️ Excluir';
      delBtn.onclick   = deleteMeal;
      document.querySelector('.modal-footer').insertBefore(delBtn, saveBtn);
    }
    delBtn.style.display = '';
  } else {
    saveBtn.textContent = 'Salvar';
    const delBtn = document.getElementById('meal-delete-btn');
    if (delBtn) delBtn.style.display = 'none';
  }

  document.getElementById('meal-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('meal-name').focus(), 80);
}

function closeMealModal() {
  document.getElementById('meal-modal').classList.add('hidden');
  editCtx = null;
}

async function saveMeal() {
  const name   = document.getElementById('meal-name').value.trim();
  const serves = parseInt(document.getElementById('meal-serves').value);
  if (!name) { showToast('✏️ Escreva o nome do prato!'); return; }

  const { dayOfWeek, mealType, id } = editCtx;

  if (id) {
    const { error } = await db.from('cardapio').update({ name, serves }).eq('id', id);
    if (error) { showToast('❌ ' + error.message); return; }
    showToast('✅ Refeição atualizada!');
  } else {
    const { error } = await db.from('cardapio').insert([{ day_of_week: dayOfWeek, meal_type: mealType, name, serves }]);
    if (error) { showToast('❌ ' + error.message); return; }
    showToast('🍽️ Refeição adicionada!');
  }
  closeMealModal();
}

async function deleteMeal() {
  if (!editCtx?.id) return;
  const ok = await window.showConfirm('Remover esta refeição do cardápio?', {
    title: 'Remover refeição', icon: '🗑️', okLabel: 'Remover', danger: true
  });
  if (!ok) return;
  const { error } = await db.from('cardapio').delete().eq('id', editCtx.id);
  if (error) { showToast('❌ ' + error.message); return; }
  closeMealModal();
  showToast('🗑️ Removida.');
}

function mudarSemana(delta) {
  weekOffset += delta;
  render();
}

const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2800);
}

window.mudarSemana   = mudarSemana;
window.openMealModal = openMealModal;
window.closeMealModal = closeMealModal;
window.saveMeal      = saveMeal;
window.deleteMeal    = deleteMeal;

document.getElementById('meal-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveMeal();
  if (e.key === 'Escape') closeMealModal();
});

init();
