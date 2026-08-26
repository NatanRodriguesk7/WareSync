const API_BASE = 'http://localhost:3000/api';

let clientesCache = [];
let editandoId = null;

function qs(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Elemento não encontrado: ${selector}`);
  return el;
}

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function carregarClientes(busca) {
  const content = qs('#page-content');
  content.innerHTML = renderPageShell();

  const url = busca
    ? `${API_BASE}/clientes?busca=${encodeURIComponent(busca)}`
    : `${API_BASE}/clientes`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    clientesCache = data.data || [];
    renderTabela();
  } catch (err) {
    qs('#tabelaWrap').innerHTML = `<div class="empty-state">Não foi possível carregar os clientes. Verifique se o backend está rodando.</div>`;
  }
}

function renderPageShell() {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Clientes</h1>
        <p class="page-subtitle">Cadastro e consulta de clientes</p>
      </div>
      <button class="btn-primary" id="novoClienteBtn">+ Novo cliente</button>
    </div>

    <div class="table-card" style="margin-bottom:16px">
      <div style="padding:12px 16px;border-bottom:1px solid var(--color-border)">
        <input type="text" id="buscaInput" placeholder="Buscar por nome, documento ou e-mail..."
          style="width:100%;border:1px solid var(--color-border);border-radius:8px;padding:9px 12px;font-size:13px;font-family:var(--font-sans);outline:none" />
      </div>
    </div>

    <div class="table-card" id="tabelaWrap"></div>
  `;
}

function renderTabela() {
  const wrap = qs('#tabelaWrap');

  if (clientesCache.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Nenhum cliente encontrado.</div>`;
    return;
  }

  const rows = clientesCache
    .map(
      (c) => `
      <tr>
        <td>${c.nome}</td>
        <td>${c.documento || '—'}</td>
        <td>${c.email || '—'}</td>
        <td>${c.telefone || '—'}</td>
        <td>${formatMoeda(c.limite_credito)}</td>
        <td class="actions">
          <button class="btn-secondary" data-edit="${c.id}">Editar</button>
          <button class="btn-danger" data-delete="${c.id}">Inativar</button>
        </td>
      </tr>`
    )
    .join('');

  wrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Documento</th>
          <th>E-mail</th>
          <th>Telefone</th>
          <th>Limite de crédito</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  wrap.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => abrirModalEdicao(Number(btn.dataset.edit)));
  });
  wrap.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => confirmarInativacao(Number(btn.dataset.delete)));
  });
}

function abrirModalNovo() {
  editandoId = null;
  qs('#modalTitle').textContent = 'Novo cliente';
  qs('#clienteForm').reset();
  clearFormError();
  qs('#clienteModal').classList.add('show');
}

function abrirModalEdicao(id) {
  const cliente = clientesCache.find((c) => c.id === id);
  if (!cliente) return;

  editandoId = id;
  qs('#modalTitle').textContent = 'Editar cliente';
  clearFormError();

  qs('#nome').value = cliente.nome || '';
  qs('#documento').value = cliente.documento || '';
  qs('#telefone').value = cliente.telefone || '';
  qs('#email').value = cliente.email || '';
  qs('#endereco').value = cliente.endereco || '';
  qs('#limiteCredito').value = cliente.limite_credito || '';

  qs('#clienteModal').classList.add('show');
}

function fecharModal() {
  qs('#clienteModal').classList.remove('show');
}

function showFormError(message) {
  const box = qs('#formError');
  box.textContent = message;
  box.classList.add('show');
}

function clearFormError() {
  qs('#formError').classList.remove('show');
}

async function salvarCliente(event) {
  event.preventDefault();
  clearFormError();

  const payload = {
    nome: qs('#nome').value.trim(),
    documento: qs('#documento').value.trim(),
    telefone: qs('#telefone').value.trim(),
    email: qs('#email').value.trim(),
    endereco: qs('#endereco').value.trim(),
    limite_credito: Number(qs('#limiteCredito').value) || 0,
  };

  if (!payload.nome) {
    showFormError('O nome do cliente é obrigatório.');
    return;
  }

  const saveBtn = qs('#saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Salvando...';

  try {
    const url = editandoId ? `${API_BASE}/clientes/${editandoId}` : `${API_BASE}/clientes`;
    const method = editandoId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data.success) {
      showFormError(data.message || 'Não foi possível salvar o cliente.');
      return;
    }

    fecharModal();
    carregarClientes(qs('#buscaInput')?.value);
  } catch (err) {
    showFormError('Não foi possível conectar ao servidor.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Salvar';
  }
}

async function confirmarInativacao(id) {
  const cliente = clientesCache.find((c) => c.id === id);
  if (!cliente) return;

  const confirmado = window.confirm(`Inativar o cliente "${cliente.nome}"? Ele deixará de aparecer nas listagens.`);
  if (!confirmado) return;

  try {
    await fetch(`${API_BASE}/clientes/${id}`, { method: 'DELETE' });
    carregarClientes(qs('#buscaInput')?.value);
  } catch (err) {
    alert('Não foi possível inativar o cliente.');
  }
}

document.addEventListener('shell:ready', () => {
  carregarClientes();

  document.body.addEventListener('click', (e) => {
    if (e.target.id === 'novoClienteBtn') abrirModalNovo();
    if (e.target.id === 'cancelBtn') fecharModal();
  });

  document.body.addEventListener('submit', (e) => {
    if (e.target.id === 'clienteForm') salvarCliente(e);
  });

  let debounce;
  document.body.addEventListener('input', (e) => {
    if (e.target.id === 'buscaInput') {
      clearTimeout(debounce);
      debounce = setTimeout(() => carregarClientes(e.target.value), 300);
    }
  });

  qs('#clienteModal').addEventListener('click', (e) => {
    if (e.target.id === 'clienteModal') fecharModal();
  });
});
