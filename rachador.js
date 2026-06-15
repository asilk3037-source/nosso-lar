const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3l1bmVmeW93bWJmeWhiYWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ4MjksImV4cCI6MjA5NjkyMDgyOX0.0M0ZqRBR50w9pR9Xd4aS9htqYBhGmLdhkA2PYPX8p74';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Inicializa datas com mês atual
(function initDates() {
  const now  = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const to   = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0];
  document.getElementById('date-from').value = from;
  document.getElementById('date-to').value   = to;
})();

function setMonth(offset) {
  const now  = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1).toISOString().split('T')[0];
  const to   = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0).toISOString().split('T')[0];
  document.getElementById('date-from').value = from;
  document.getElementById('date-to').value   = to;
  calcular();
}

function setAll() {
  document.getElementById('date-from').value = '2000-01-01';
  document.getElementById('date-to').value   = new Date().toISOString().split('T')[0];
  calcular();
}

async function calcular() {
  const from = document.getElementById('date-from').value;
  const to   = document.getElementById('date-to').value;
  if (!from || !to) { showToast('📅 Selecione as datas!'); return; }

  const { data, error } = await db.from('expenses').select('*')
    .gte('created_at', from + 'T00:00:00')
    .lte('created_at', to   + 'T23:59:59');

  if (error) { showToast('⚠️ Erro ao calcular.'); return; }
  const exps = data || [];

  const totalAline  = exps.filter(e => e.person === 'Aline').reduce((s,e) => s+Number(e.value), 0);
  const totalIsabel = exps.filter(e => e.person === 'Isabel').reduce((s,e) => s+Number(e.value), 0);
  const shared      = exps.filter(e => e.person === 'Aline + Isabel').reduce((s,e) => s+Number(e.value), 0);
  const countAline  = exps.filter(e => e.person === 'Aline').length;
  const countIsabel = exps.filter(e => e.person === 'Isabel').length;

  // Compartilhados são divididos 50/50
  const alineTotal  = totalAline  + shared / 2;
  const isabelTotal = totalIsabel + shared / 2;
  const diff = alineTotal - isabelTotal;

  document.getElementById('rach-aline').textContent       = fmt(alineTotal);
  document.getElementById('rach-isabel').textContent      = fmt(isabelTotal);
  document.getElementById('rach-aline-count').textContent = `${countAline} lançamentos`;
  document.getElementById('rach-isabel-count').textContent= `${countIsabel} lançamentos`;

  const resultEl = document.getElementById('rach-result');
  const label    = document.getElementById('rach-label');
  const value    = document.getElementById('rach-value');
  const sub      = document.getElementById('rach-sub');

  if (Math.abs(diff) < 0.01) {
    resultEl.className = 'rach-result rach-equal';
    label.textContent  = '🎉 Tudo igual!';
    value.textContent  = 'R$ 0,00';
    sub.textContent    = 'As contas estão completamente equilibradas!';
  } else if (diff > 0) {
    resultEl.className = 'rach-result';
    label.textContent  = '💚 Isabel deve para Aline';
    value.textContent  = fmt(diff);
    sub.textContent    = `Aline gastou R$${fmt(diff)} a mais no período selecionado`;
  } else {
    resultEl.className = 'rach-result';
    label.textContent  = '💜 Aline deve para Isabel';
    value.textContent  = fmt(Math.abs(diff));
    sub.textContent    = `Isabel gastou R$${fmt(Math.abs(diff))} a mais no período selecionado`;
  }

  // Detalhamento por categoria
  const catMap = {};
  exps.forEach(e => {
    if (!catMap[e.category]) catMap[e.category] = { aline: 0, isabel: 0, shared: 0 };
    if (e.person === 'Aline') catMap[e.category].aline += Number(e.value);
    else if (e.person === 'Isabel') catMap[e.category].isabel += Number(e.value);
    else catMap[e.category].shared += Number(e.value);
  });

  const detail = document.getElementById('rach-detail');
  detail.innerHTML = '';
  Object.entries(catMap).sort((a,b) => (b[1].aline+b[1].isabel+b[1].shared) - (a[1].aline+a[1].isabel+a[1].shared)).forEach(([cat, vals]) => {
    const total = vals.aline + vals.isabel + vals.shared;
    const row = document.createElement('div');
    row.className = 'rach-row';
    row.innerHTML = `
      <span class="rach-row-cat">${escapeHtml(cat)}</span>
      <span class="rach-row-val">${fmt(total)}</span>
    `;
    detail.appendChild(row);
  });

  // Gastos compartilhados
  const sharedExps = exps.filter(e => e.person === 'Aline + Isabel').sort((a,b) => Number(b.value)-Number(a.value));
  const sharedList = document.getElementById('shared-list');
  sharedList.innerHTML = '';
  if (sharedExps.length === 0) {
    sharedList.innerHTML = '<p style="font-size:.85rem;color:var(--muted);font-weight:600;text-align:center;padding:16px 0">Nenhum gasto compartilhado no período.</p>';
  } else {
    sharedExps.forEach(e => {
      const row = document.createElement('div');
      row.className = 'task-item';
      row.innerHTML = `
        <div class="task-body">
          <span class="task-name">${escapeHtml(e.description)}</span>
          <div class="task-meta">
            <span class="tag tag-category">${escapeHtml(e.category)}</span>
            <span class="tag tag-value">R$ ${Number(e.value).toFixed(2).replace('.',',')} (cada: R$ ${(Number(e.value)/2).toFixed(2).replace('.',',')})</span>
          </div>
        </div>
      `;
      sharedList.appendChild(row);
    });
  }

  document.getElementById('empty-rach').style.display    = 'none';
  document.getElementById('result-section').style.display = 'block';
  document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

const fmt = v => 'R$ ' + Number(v).toFixed(2).replace('.',',');
const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 2800);
}

window.calcular = calcular;
window.setMonth = setMonth;
window.setAll   = setAll;
