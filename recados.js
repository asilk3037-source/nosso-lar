const SUPABASE_URL = 'https://pygyunefyowmbfyhbajg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3l1bmVmeW93bWJmeWhiYWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ4MjksImV4cCI6MjA5NjkyMDgyOX0.0M0ZqRBR50w9pR9Xd4aS9htqYBhGmLdhkA2PYPX8p74';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let recados = [];
const ME = window.CURRENT_USER;

async function init() {
  await load();
  db.channel('recados-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'recados' }, load)
    .subscribe();

  // marcar como lidos os recados que não são meus ao abrir a página
  await markMineRead();
}

async function load() {
  const { data, error } = await db.from('recados').select('*').order('created_at', { ascending: false });
  if (error) { showToast('⚠️ Erro ao carregar.'); return; }
  recados = data || [];
  render();
}

async function markMineRead() {
  // marca como lido os recados que vieram para mim (not from me, not read)
  const toRead = recados.filter(r => r.from_user !== ME && !r.read).map(r => r.id);
  if (toRead.length === 0) return;
  await db.from('recados').update({ read: true }).in('id', toRead);
}

async function markAllRead() {
  const unread = recados.filter(r => !r.read).map(r => r.id);
  if (unread.length === 0) { showToast('✅ Tudo já está lido!'); return; }
  const { error } = await db.from('recados').update({ read: true }).in('id', unread);
  if (error) { showToast('❌ Erro ao marcar.'); return; }
  showToast('✅ Todos marcados como lidos!');
}

async function sendRecado() {
  const input = document.getElementById('recado-input');
  const msg   = input.value.trim();
  if (!msg) { input.focus(); showToast('✏️ Escreva o recado primeiro!'); return; }

  const { error } = await db.from('recados').insert([{ from_user: ME, message: msg, read: false }]);
  if (error) { showToast('❌ ' + error.message); return; }

  input.value = '';
  document.getElementById('char-count').textContent = '0 / 500';
  showToast('💌 Recado enviado!');
}

async function deleteRecado(id) {
  const ok = await window.showConfirm('Excluir este recado?', {
    title: 'Excluir recado', icon: '💬', okLabel: 'Excluir', danger: true
  });
  if (!ok) return;
  const { error } = await db.from('recados').delete().eq('id', id);
  if (error) { showToast('❌ Erro ao excluir.'); return; }
  showToast('🗑️ Excluído.');
}

async function toggleRead(id, current) {
  const { error } = await db.from('recados').update({ read: !current }).eq('id', id);
  if (error) showToast('❌ Erro ao atualizar.');
}

function render() {
  const total  = recados.length;
  const unread = recados.filter(r => !r.read).length;
  const fromMe = recados.filter(r => r.from_user === ME).length;

  document.getElementById('stat-total-rec').textContent = total;
  document.getElementById('stat-unread').textContent    = unread;
  document.getElementById('stat-from-me').textContent   = fromMe;

  const list  = document.getElementById('recado-list');
  const empty = document.getElementById('recado-empty');
  list.querySelectorAll('.recado-item').forEach(el => el.remove());

  if (recados.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  recados.forEach(rec => {
    const isMe   = rec.from_user === ME;
    const dt     = new Date(rec.created_at);
    const dtStr  = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' ' +
                   dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const item = document.createElement('div');
    item.className = `recado-item ${!rec.read ? 'unread' : ''}`;

    item.innerHTML = `
      <div class="recado-header">
        <div class="recado-avatar" id="rec-av-${rec.id}">
          ${rec.from_user[0]}
          <img src="fotos/${rec.from_user.toLowerCase()}.jpg" alt="${escapeHtml(rec.from_user)}"
               onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%">
        </div>
        <span class="recado-from">${isMe ? '🟣 Eu ('+escapeHtml(ME)+')' : '💜 '+escapeHtml(rec.from_user)}</span>
        ${!rec.read ? '<span style="font-size:.68rem;background:var(--pink);color:white;border-radius:100px;padding:2px 7px;font-weight:800">NOVO</span>' : ''}
        <span class="recado-time">${dtStr}</span>
      </div>
      <p class="recado-msg">${escapeHtml(rec.message).replace(/\n/g, '<br>')}</p>
      <div class="recado-actions">
        <button class="btn-import" style="font-size:.72rem;padding:4px 10px" onclick="toggleRead('${rec.id}', ${rec.read})">
          ${rec.read ? '🔘 Não lido' : '✅ Lido'}
        </button>
        ${isMe ? `<button class="btn-delete" onclick="deleteRecado('${rec.id}')">🗑️</button>` : ''}
      </div>
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

window.sendRecado  = sendRecado;
window.deleteRecado = deleteRecado;
window.toggleRead  = toggleRead;
window.markAllRead = markAllRead;

document.getElementById('recado-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.ctrlKey) sendRecado();
});

init();
