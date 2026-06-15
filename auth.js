// auth.js — inclua em todas as páginas ANTES do script da página
(function () {
  const user = sessionStorage.getItem('lar_user');
  if (!user) {
    window.location.replace('login.html');
    throw new Error('Não autenticado');
  }
  window.CURRENT_USER = user;
})();
