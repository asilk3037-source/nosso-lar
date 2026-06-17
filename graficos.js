const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3l1bmVmeW93bWJmeWhiYWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ4MjksImV4cCI6MjA5NjkyMDgyOX0.0M0ZqRBR50w9pR9Xd4aS9htqYBhGmLdhkA2PYPX8p74';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let allExpenses = [];
let selectedMonth = null;
let chartCat   = null;
let chartMonth = null;

const COLORS = [
  '#c084fc','#f472b6','#fb7185','#f97316','#fbbf24',
  '#34d399','#60a5fa','#a78bfa','#818cf8','#e879a8',
];

async function init() {
  const { data, error } = await db.from('expenses').select('*').order('created_at');
  if (error) { showToast('⚠️ Erro ao carregar.'); return; }
  allExpenses = data || [];

  buildMonthTabs();
  renderAll();
}

function buildMonthTabs() {
  const months = [...new Set(allExpenses.map(e => e.created_at.slice(0,7)))].sort().reverse();
  const now    = new Date().toISOString().slice(0,7);

  if (months.length === 0) months.push(now);
  selectedMonth = months[0];

  const container = document.getElementById('month-tabs');
  container.innerHTML = '';

  months.slice(0, 8).forEach(m => {
    const [y, mo] = m.split('-');
    const label = new Date(parseInt(y), parseInt(mo)-1, 1)
      .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const btn = document.createElement('button');
    btn.className = `month-tab ${m === selectedMonth ? 'active' : ''}`;
    btn.textContent = label;
    btn.onclick = () => {
      selectedMonth = m;
      document.querySelectorAll('.month-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAll();
    };
    container.appendChild(btn);
  });
}

function getMonthExpenses() {
  return allExpenses.filter(e => e.created_at.startsWith(selectedMonth));
}

function renderAll() {
  const exps = getMonthExpenses();

  const total   = exps.reduce((s,e) => s + Number(e.value), 0);
  const aline   = exps.filter(e => e.person === 'Aline').reduce((s,e) => s + Number(e.value), 0);
  const isabel  = exps.filter(e => e.person === 'Isabel').reduce((s,e) => s + Number(e.value), 0);
  const shared  = exps.filter(e => e.person === 'Aline + Isabel').reduce((s,e) => s + Number(e.value), 0);

  document.getElementById('g-total').textContent  = fmt(total);
  document.getElementById('g-aline').textContent  = fmt(aline);
  document.getElementById('g-isabel').textContent = fmt(isabel);
  document.getElementById('g-shared').textContent = fmt(shared);

  renderCatChart(exps);
  renderMonthChart();
  renderTopList(exps);
  loadBudgets();
}

function renderCatChart(exps) {
  const catMap = {};
  exps.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + Number(e.value);
  });
  const labels = Object.keys(catMap);
  const values = Object.values(catMap);

  if (chartCat) chartCat.destroy();
  const ctx = document.getElementById('chart-cat').getContext('2d');
  chartCat = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: COLORS.slice(0, labels.length),
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' R$ ' + ctx.parsed.y.toFixed(2).replace('.',',')
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Nunito', size: 11, weight: '700' } } },
        y: {
          grid: { color: '#f5eeff' },
          ticks: {
            font: { family: 'Nunito', size: 11 },
            callback: v => 'R$' + v.toFixed(0)
          }
        }
      }
    }
  });
}

function renderMonthChart() {
  const now = new Date();
  const months6 = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months6.push(d.toISOString().slice(0,7));
  }

  const labels = months6.map(m => {
    const [y,mo] = m.split('-');
    return new Date(parseInt(y), parseInt(mo)-1, 1).toLocaleDateString('pt-BR', { month: 'short' });
  });

  const totalByMonth  = months6.map(m => allExpenses.filter(e => e.created_at.startsWith(m)).reduce((s,e) => s+Number(e.value), 0));
  const alineByMonth  = months6.map(m => allExpenses.filter(e => e.created_at.startsWith(m) && e.person==='Aline').reduce((s,e) => s+Number(e.value), 0));
  const isabelByMonth = months6.map(m => allExpenses.filter(e => e.created_at.startsWith(m) && e.person==='Isabel').reduce((s,e) => s+Number(e.value), 0));

  if (chartMonth) chartMonth.destroy();
  const ctx = document.getElementById('chart-month').getContext('2d');
  chartMonth = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Total', data: totalByMonth, borderColor: '#c084fc', backgroundColor: 'rgba(192,132,252,.1)', tension: .35, fill: true, borderWidth: 2.5, pointBackgroundColor: '#c084fc', pointRadius: 4 },
        { label: 'Aline', data: alineByMonth, borderColor: '#34d399', borderDash: [4,3], tension: .35, borderWidth: 2, pointBackgroundColor: '#34d399', pointRadius: 3 },
        { label: 'Isabel', data: isabelByMonth, borderColor: '#f472b6', borderDash: [4,3], tension: .35, borderWidth: 2, pointBackgroundColor: '#f472b6', pointRadius: 3 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { family: 'Nunito', size: 11, weight: '700' }, boxWidth: 20 } },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.dataset.label}: R$ ${ctx.parsed.y.toFixed(2).replace('.',',')}` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Nunito', size: 11, weight: '700' } } },
        y: {
          grid: { color: '#f5eeff' },
          ticks: { font: { family: 'Nunito', size: 11 }, callback: v => 'R$' + v.toFixed(0) }
        }
      }
    }
  });
}

function renderTopList(exps) {
  const sorted = [...exps].sort((a,b) => Number(b.value) - Number(a.value)).slice(0,5);
  const list = document.getElementById('top-list');
  list.innerHTML = '';

  if (sorted.length === 0) {
    list.innerHTML = '<div class="empty-state" style="padding:24px 0"><span>📊</span><p>Sem gastos neste mês ainda.</p></div>';
    return;
  }
  sorted.forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'task-item';
    row.innerHTML = `
      <span style="font-size:1.1rem;font-weight:800;color:var(--muted);min-width:24px;text-align:center">${i+1}</span>
      <div class="task-body">
        <span class="task-name">${escapeHtml(e.description)}</span>
        <div class="task-meta">
          <span class="tag tag-category">${escapeHtml(e.category)}</span>
          <span class="tag tag-value">R$ ${Number(e.value).toFixed(2).replace('.',',')}</span>
          <span class="tag tag-date">${escapeHtml(e.person)}</span>
        </div>
      </div>
    `;
    list.appendChild(row);
  });
}

// ── ORÇAMENTO ─────────────────────────────────
let budgets = [];

async function loadBudgets() {
  const { data } = await db.from('budgets').select('*').eq('month', selectedMonth);
  budgets = data || [];
  renderBudgetBars();
}

function toggleBudgetEdit() {
  const el = document.getElementById('budget-edit');
  el.style.display = el.style.display === 'none' ? '' : 'none';
}

async function saveBudget() {
  const cat    = document.getElementById('budget-cat').value;
  const amount = parseFloat(document.getElementById('budget-amount').value);
  if (!amount || amount <= 0) { showToast('💰 Informe um valor válido!'); return; }

  // Upsert: remove existing e insere novo
  await db.from('budgets').delete().eq('category', cat).eq('month', selectedMonth);
  const { error } = await db.from('budgets').insert([{ category: cat, amount, month: selectedMonth }]);
  if (error) { showToast('❌ ' + error.message); return; }

  document.getElementById('budget-amount').value = '';
  showToast('🎯 Limite salvo!');
  await loadBudgets();
}

function renderBudgetBars() {
  const exps = getMonthExpenses();
  const catMap = {};
  exps.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + Number(e.value); });

  const container = document.getElementById('budget-bars');
  if (budgets.length === 0) {
    container.innerHTML = '<p style="font-size:.85rem;color:var(--muted);font-weight:600;text-align:center;padding:12px 0">Nenhum limite definido. Clique em "Editar limites" para configurar.</p>';
    return;
  }

  container.innerHTML = '';
  budgets.forEach(b => {
    const spent = catMap[b.category] || 0;
    const pct   = Math.min(100, Math.round((spent / b.amount) * 100));
    const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';
    const div   = document.createElement('div');
    div.style.marginBottom = '12px';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:.82rem;font-weight:700;color:var(--text)">${escapeHtml(b.category)}</span>
        <span style="font-size:.78rem;font-weight:700;color:${color}">
          R$${spent.toFixed(0).replace('.',',')} / R$${Number(b.amount).toFixed(0).replace('.',',')} (${pct}%)
        </span>
      </div>
      <div style="height:8px;background:var(--border);border-radius:100px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:100px;transition:width .6s cubic-bezier(.4,0,.2,1)"></div>
      </div>
    `;
    container.appendChild(div);
  });
}

const fmt = v => 'R$ ' + v.toFixed(2).replace('.',',');
const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

window.toggleBudgetEdit = toggleBudgetEdit;
window.saveBudget       = saveBudget;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 2800);
}

init();
