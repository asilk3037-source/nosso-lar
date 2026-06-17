/* ── dialog.js — modais animados de confirmação e alerta ── */
(function () {
  // Injetar HTML do modal ao carregar o script
  const tpl = document.createElement('div');
  tpl.innerHTML = `
    <div id="dlg-overlay" class="dlg-overlay hidden" aria-modal="true" role="dialog">
      <div class="dlg-box">
        <div class="dlg-icon" id="dlg-icon">⚠️</div>
        <h3 class="dlg-title"  id="dlg-title">Confirmar</h3>
        <p  class="dlg-msg"    id="dlg-msg"></p>
        <div class="dlg-btns">
          <button class="dlg-btn dlg-cancel" id="dlg-cancel">Cancelar</button>
          <button class="dlg-btn dlg-ok"     id="dlg-ok">Confirmar</button>
        </div>
      </div>
    </div>
    <style>
      .dlg-overlay {
        position: fixed; inset: 0;
        background: rgba(20,5,40,.55);
        backdrop-filter: blur(5px);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; padding: 16px;
        transition: opacity .2s;
      }
      .dlg-overlay.hidden { display: none; }
      .dlg-box {
        background: var(--surface, #fff);
        border-radius: 24px;
        padding: 32px 28px 24px;
        width: 100%; max-width: 360px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,.28);
        animation: dlgIn .22s cubic-bezier(.34,1.56,.64,1);
      }
      @keyframes dlgIn {
        from { opacity: 0; transform: scale(.88) translateY(12px); }
        to   { opacity: 1; transform: none; }
      }
      .dlg-icon  { font-size: 2.4rem; margin-bottom: 10px; }
      .dlg-title { font-family: 'Playfair Display', serif; font-size: 1.15rem; color: var(--text, #2d1458); margin-bottom: 8px; }
      .dlg-msg   { font-size: .9rem; color: var(--muted, #a87bc0); font-weight: 600; line-height: 1.5; margin-bottom: 22px; }
      .dlg-btns  { display: flex; gap: 10px; }
      .dlg-btn   { flex: 1; padding: 12px; border-radius: 14px; font-size: .93rem; font-weight: 800; font-family: 'Nunito', sans-serif; cursor: pointer; border: none; transition: all .15s; }
      .dlg-cancel { background: var(--bg, #fff8fd); color: var(--muted, #a87bc0); border: 2px solid var(--border, #ede9fe); }
      .dlg-cancel:hover { background: var(--border, #ede9fe); }
      .dlg-ok     { background: linear-gradient(135deg,#c084fc,#e879a8,#fb7185); color: white; box-shadow: 0 4px 14px rgba(236,72,153,.3); }
      .dlg-ok:hover { opacity: .9; transform: translateY(-1px); }
      .dlg-ok.danger { background: linear-gradient(135deg, #ef4444, #be123c); }
    </style>
  `;
  document.body.appendChild(tpl);

  let _resolve = null;

  document.getElementById('dlg-ok').addEventListener('click', () => {
    hide(); if (_resolve) _resolve(true);
  });
  document.getElementById('dlg-cancel').addEventListener('click', () => {
    hide(); if (_resolve) _resolve(false);
  });
  document.getElementById('dlg-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) { hide(); if (_resolve) _resolve(false); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('dlg-overlay').classList.contains('hidden')) {
      hide(); if (_resolve) _resolve(false);
    }
  });

  function hide() { document.getElementById('dlg-overlay').classList.add('hidden'); }

  window.showConfirm = function (msg, { title = 'Confirmar', icon = '⚠️', okLabel = 'Confirmar', danger = false } = {}) {
    return new Promise(resolve => {
      _resolve = resolve;
      document.getElementById('dlg-icon').textContent  = icon;
      document.getElementById('dlg-title').textContent = title;
      document.getElementById('dlg-msg').textContent   = msg;
      document.getElementById('dlg-ok').textContent    = okLabel;
      document.getElementById('dlg-ok').classList.toggle('danger', danger);
      document.getElementById('dlg-cancel').style.display = '';
      document.getElementById('dlg-overlay').classList.remove('hidden');
      document.getElementById('dlg-ok').focus();
    });
  };

  window.showAlert = function (msg, { title = 'Aviso', icon = 'ℹ️' } = {}) {
    return new Promise(resolve => {
      _resolve = resolve;
      document.getElementById('dlg-icon').textContent  = icon;
      document.getElementById('dlg-title').textContent = title;
      document.getElementById('dlg-msg').textContent   = msg;
      document.getElementById('dlg-ok').textContent    = 'OK';
      document.getElementById('dlg-ok').classList.remove('danger');
      document.getElementById('dlg-cancel').style.display = 'none';
      document.getElementById('dlg-overlay').classList.remove('hidden');
      document.getElementById('dlg-ok').focus();
    });
  };
})();
