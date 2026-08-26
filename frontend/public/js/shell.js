// Garante que toda chamada fetch() feita a partir do dashboard envie o cookie
// de sessão — necessário para o requireAuth/requireRole do backend funcionar.
(function patchFetchWithCredentials() {
  const originalFetch = window.fetch;
  window.fetch = (input, init = {}) => originalFetch(input, { ...init, credentials: init.credentials || 'include' });
})();

const MENU = [
  { label: 'Painel', page: 'dashboard.html', icon: '📊' },
  { label: 'Vendas', page: 'vendas.html', icon: '🛒' },
  { label: 'Estoque', page: 'estoque.html', icon: '📦' },
  { label: 'Financeiro', page: 'financeiro.html', icon: '💰' },
  { label: 'Clientes', page: 'clientes.html', icon: '👥' },
  { label: 'Produtos', page: 'produtos.html', icon: '🏷️' },
  { label: 'Fiscal', page: 'fiscal.html', icon: '📄' },
  { label: 'Relatórios', page: 'relatorios.html', icon: '📈' },
  { label: 'Configurações', page: 'configuracoes.html', icon: '⚙️' },
];

function renderShell(activePage) {
  const root = document.getElementById('app-shell');
  if (!root) return;

  const currentPage = activePage || document.body.dataset.page || '';

  const navItems = MENU.map((item) => {
    const isActive = item.page === currentPage;
    return `<a class="sidebar__item${isActive ? ' active' : ''}" href="${item.page}">
      <span>${item.icon}</span><span>${item.label}</span>
    </a>`;
  }).join('');

  root.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar__header">
        <img src="assets/logo/waresync-icon.png" alt="Waresync" />
        <span class="sidebar__logo">Waresync</span>
      </div>
      <nav class="sidebar__nav">${navItems}</nav>
    </aside>
    <div class="app-main">
      <header class="topbar">
        <label class="topbar__search">
          <span>⌕</span>
          <input type="text" placeholder="Buscar..." />
        </label>
        <div class="avatar">UW</div>
      </header>
      <main class="app-content" id="page-content"></main>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  renderShell();
  document.dispatchEvent(new CustomEvent('shell:ready'));
});
