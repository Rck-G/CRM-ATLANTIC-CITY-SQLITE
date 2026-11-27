const API = '/api';

function applyTheme(theme) {
  const selected = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = selected;
  try {
    localStorage.setItem('ac_theme', selected);
  } catch (e) {}

  const label = selected === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  ['theme-toggle', 'auth-theme-toggle'].forEach(id => {
    const b = document.getElementById(id);
    if (b) {
      b.textContent = selected === 'dark' ? '☀' : '☾';
      b.title = label;
      b.setAttribute('aria-label', label);
    }
  });

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = selected === 'dark' ? '#071329' : '#f4f7fc';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let saved = 'dark';
  try {
    saved = localStorage.getItem('ac_theme') || 'dark';
  } catch (e) {}
  applyTheme(saved);

  ['theme-toggle', 'auth-theme-toggle'].forEach(id => {
    const b = document.getElementById(id);
    if (b) {
      b.addEventListener('click', () => {
        applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
      });
    }
  });
});

const state = {
  token: sessionStorage.getItem('ac_token') || '',
  user: JSON.parse(sessionStorage.getItem('ac_user') || 'null'),
  page: 'dashboard',
  cache: {},
};

const $ = id => document.getElementById(id);

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[c]));

const titleCase = s => String(s || '')
  .replaceAll('_', ' ')
  .toLowerCase()
  .replace(/\b\w/g, c => c.toUpperCase());

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

async function api(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const r = await fetch(API + path, { ...opts, headers });
  if (!r.ok) {
    let e = {};
    try {
      e = await r.json();
    } catch {}
    throw new Error(e.error || `Error ${r.status}`);
  }

  if (r.status === 204) return null;
  const type = r.headers.get('content-type') || '';
  return type.includes('application/json') ? r.json() : r;
}

let bootstrapAvailable = true;

function showAuth(which = 'login') {
  if (which === 'bootstrap' && !bootstrapAvailable) which = 'login';

  ['login-form', 'register-form', 'bootstrap-form'].forEach(id => {
    $(id).classList.toggle('hidden', id !== `${which}-form`);
  });

  $('auth-title').textContent = which === 'register'
    ? 'Crear cuenta de cliente'
    : which === 'bootstrap'
      ? 'Configurar administrador'
      : 'Bienvenido al CRM';

  $('auth-subtitle').textContent = which === 'register'
    ? 'Registra tus datos para acceder a Atlantic City.'
    : which === 'bootstrap'
      ? 'Crea la cuenta que administrará el CRM.'
      : 'Ingresa para administrar clientes y operaciones.';

  $('auth-message').textContent = '';
}

async function checkBootstrapStatus() {
  try {
    const r = await fetch(API + '/auth/bootstrap-status');
    if (!r.ok) throw new Error('No se pudo consultar el estado inicial');
    const data = await r.json();
    bootstrapAvailable = !!data.available;
  } catch (e) {
    bootstrapAvailable = false;
  }

  const button = $('show-bootstrap');
  if (button) button.classList.toggle('hidden', !bootstrapAvailable);

  if (
    !bootstrapAvailable &&
    $('bootstrap-form') &&
    !$('bootstrap-form').classList.contains('hidden')
  ) {
    showAuth('login');
  }
}

function enterApp() {
  if (!state.user) return;
  $('auth-screen').classList.add('hidden');
  $('app-shell').classList.remove('hidden');
  $('user-name').textContent = state.user.name;
  $('user-role').textContent = ({
    ADMIN: 'Administrador',
    EMPLOYEE: 'Gerencia / Operaciones',
    MARKETING: 'Marketing',
    CLIENT: 'Cliente',
  })[state.user.role] || titleCase(state.user.role);

  $('user-avatar').textContent = state.user.name[0].toUpperCase();
  $('top-avatar').textContent = state.user.name[0].toUpperCase();
  buildNav();
  navigate('dashboard');
}

function logout() {
  state.token = '';
  state.user = null;
  sessionStorage.removeItem('ac_token');
  sessionStorage.removeItem('ac_user');
  $('app-shell').classList.add('hidden');
  $('auth-screen').classList.remove('hidden');
  showAuth('login');
}

const navItems = [
  ['dashboard', '▦', 'Resumen', ['ADMIN', 'MARKETING', 'EMPLOYEE', 'CLIENT']],
  ['clients', '♙', 'Clientes', ['ADMIN', 'MARKETING', 'EMPLOYEE']],
  ['campaigns', '◈', 'Campañas', ['ADMIN', 'MARKETING', 'EMPLOYEE']],
  ['benefits', '✧', 'Beneficios', ['ADMIN', 'MARKETING', 'EMPLOYEE']],
  ['tickets', '▤', 'Atención al cliente', ['ADMIN', 'MARKETING', 'EMPLOYEE', 'CLIENT']],
  ['restaurants', '⌂', 'Restaurantes', ['ADMIN', 'EMPLOYEE', 'MARKETING']],
  ['reservations', '▣', 'Reservas', ['ADMIN', 'EMPLOYEE', 'MARKETING']],
  ['events', '✦', 'Eventos', ['ADMIN', 'MARKETING', 'EMPLOYEE']],
  ['sales', '＄', 'Ventas / POS', ['ADMIN', 'MARKETING']],
  ['users', '♧', 'Usuarios', ['ADMIN']],
  ['integrations', '⇄', 'Integraciones', ['ADMIN']],
  ['audit', '◷', 'Auditoría', ['ADMIN']],
  ['loyalty', '✧', 'Fidelización', ['ADMIN']],
];

function buildNav() {
  $('navigation').innerHTML = navItems
    .filter(x => x[3].includes(state.user.role))
    .map(x => `
      <button class="nav-item ${state.page === x[0] ? 'active' : ''}" data-page="${x[0]}">
        <span class="nav-icon">${x[1]}</span>${x[2]}
      </button>
    `)
    .join('');

  $('navigation').querySelectorAll('[data-page]').forEach(b => {
    b.onclick = () => navigate(b.dataset.page);
  });
}

const headings = {
  profile: 'Mi perfil',
  dashboard: 'Resumen general',
  clients: 'Gestión de clientes',
  campaigns: 'Marketing y campañas',
  benefits: 'Beneficios y fidelización',
  tickets: 'Atención al cliente',
  restaurants: 'Restaurantes',
  reservations: 'Reservas',
  events: 'Eventos',
  sales: 'Ventas y POS',
  users: 'Administración de usuarios',
  integrations: 'Integraciones',
  audit: 'Registro de auditoría',
  loyalty: 'Configuración de fidelización',
};

async function navigate(page) {
  state.page = page;
  buildNav();
  $('page-heading').textContent = headings[page] || 'Atlantic City';
  $('sidebar').classList.remove('open');
  $('content').innerHTML = '<div class="loading">Cargando información...</div>';

  try {
    if (page === 'profile') await renderProfile();
    else if (page === 'dashboard') await renderDashboard();
    else if (page === 'loyalty') await renderLoyalty();
    else await renderModule(page);
  } catch (e) {
    $('content').innerHTML = `<div class="notice">${esc(e.message)}</div>`;
  }
}

function intro(title, desc, button = '') {
  return `
    <div class="page-intro">
      <div>
        <h3>${title}</h3>
        <p>${desc}</p>
      </div>
      <div class="actions">${button}</div>
    </div>
  `;
}

function stat(label, value, icon, note) {
  return `
    <div class="stat-card">
      <div class="stat-top">
        <span>${label}</span>
        <span class="stat-icon">${icon}</span>
      </div>
      <div class="stat-value">${value ?? '—'}</div>
      <div class="stat-note">${note || 'Información del sistema'}</div>
    </div>
  `;
}

async function renderLoyalty() {
  const cfg = await api('/loyalty/config');
  const tierMap = Object.fromEntries(cfg.tiers.map(x => [x.tier, Number(x.min_points)]));
  const rules = cfg.rules || [];

  $('content').innerHTML = `
    ${intro(
      'Programa de fidelización',
      'Configura los umbrales Silver, Gold y Platinum y las reglas de acumulación de puntos.'
    )}
    <section class="table-panel" style="padding:22px;margin-bottom:18px">
      <h3>Umbrales de categoría</h3>
      <p class="muted">Silver debe comenzar en cero. Los siguientes niveles deben tener umbrales crecientes.</p>
      <div class="modal-grid">
        <label>Silver · puntos mínimos
          <input id="tier-silver" type="number" min="0" step="1" value="${tierMap.SILVER ?? 0}">
        </label>
        <label>Gold · puntos mínimos
          <input id="tier-gold" type="number" min="1" step="1" value="${tierMap.GOLD ?? 500}">
        </label>
        <label>Platinum · puntos mínimos
          <input id="tier-platinum" type="number" min="1" step="1" value="${tierMap.PLATINUM ?? 1500}">
        </label>
      </div>
    </section>
    <section class="table-panel" style="padding:22px">
      <div class="page-intro">
        <div>
          <h3>Reglas de acumulación</h3>
          <p class="muted">Ejemplo: 1 punto por cada S/ 1 de compra POS.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Regla</th>
              <th>Origen</th>
              <th>Puntos</th>
              <th>Por cada importe</th>
              <th>Activa</th>
            </tr>
          </thead>
          <tbody>
            ${rules.map((r, i) => `
              <tr>
                <td><input data-rule="name" data-i="${i}" value="${esc(r.name)}"></td>
                <td><input data-rule="source" data-i="${i}" value="${esc(r.source)}"></td>
                <td><input data-rule="pointsPerUnit" data-i="${i}" type="number" min="0" step="0.01" value="${r.points_per_unit}"></td>
                <td><input data-rule="unitAmount" data-i="${i}" type="number" min="0.01" step="0.01" value="${r.unit_amount}"></td>
                <td><input data-rule="active" data-i="${i}" type="checkbox" ${r.active ? 'checked' : ''}></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="modal-footer">
        <button class="btn primary" id="save-loyalty">Guardar configuración</button>
      </div>
    </section>
  `;

  $('save-loyalty').onclick = async () => {
    try {
      const tiers = [
        { tier: 'SILVER', minPoints: Number($('tier-silver').value) },
        { tier: 'GOLD', minPoints: Number($('tier-gold').value) },
        { tier: 'PLATINUM', minPoints: Number($('tier-platinum').value) },
      ];

      const updated = rules.map((r, i) => {
        const out = {
          ruleKey: r.rule_key,
          name: r.name,
          source: r.source,
          pointsPerUnit: Number(r.points_per_unit),
          unitAmount: Number(r.unit_amount),
          active: !!r.active,
        };
        document.querySelectorAll(`[data-i="${i}"]`).forEach(el => {
          const k = el.dataset.rule;
          out[k] = k === 'active'
            ? el.checked
            : (k === 'pointsPerUnit' || k === 'unitAmount' ? Number(el.value) : el.value);
        });
        return out;
      });

      await api('/loyalty/config', {
        method: 'PUT',
        body: JSON.stringify({ tiers, rules: updated }),
      });
      toast('Configuración de fidelización guardada');
      await renderLoyalty();
    } catch (e) {
      toast(e.message);
    }
  };
}

async function renderDashboard() {
  let d = { clients: 0, vip: 0, campaigns: 0, ticketsOpen: 0, reservations: 0, sales: 0 };
  let myBenefits = [];

  if (state.user.role !== 'CLIENT') {
    try {
      d = await api('/analytics/summary');
    } catch (e) {
      console.error('No se pudo cargar el resumen', e);
    }
  } else {
    try {
      myBenefits = await api('/my/benefits');
    } catch (e) {
      console.error('No se pudieron cargar los beneficios', e);
    }
  }

  let recent = [];
  if (state.user.role !== 'CLIENT') {
    try {
      recent = await api('/clients?limit=6');
    } catch {}
  }

  const isClient = state.user.role === 'CLIENT';
  const availableBenefitsCount = myBenefits.filter(b => b.assignment_status === 'AVAILABLE').length;

  $('content').innerHTML = `
    <div class="command-heading">
      <div>
        <div class="eyebrow">VISIÓN GENERAL · ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        <h3>Atlantic City Command Center</h3>
        <p>Información centralizada para gestionar clientes, experiencias y operaciones.</p>
      </div>
      <div class="command-chip"><i></i> Sistema operativo</div>
    </div>

    <div class="stats-grid">
      ${stat(isClient ? 'Mis solicitudes' : 'Clientes registrados', isClient ? '—' : d.clients, '♙', 'Base de clientes')}
      ${stat(
        isClient ? 'Mis beneficios' : 'Clientes VIP',
        isClient ? availableBenefitsCount : d.vip,
        '✧',
        isClient ? 'Beneficios disponibles' : 'Niveles Gold y Platinum'
      )}
      ${stat(
        isClient ? 'Mis tickets' : 'Tickets abiertos',
        isClient ? '—' : (d.ticketsOpen ?? d.pendingTickets ?? 0),
        '▤',
        'Seguimiento de atención'
      )}
      ${stat(isClient ? 'Mis reservas' : 'Reservas activas', d.reservations, '▣', 'Pendientes o confirmadas')}
    </div>

    ${isClient ? `
      <section class="panel command-panel wide-panel client-benefits-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">PROGRAMA DE FIDELIZACIÓN</span>
            <h4>Mis beneficios</h4>
            <p class="panel-subtitle">Consulta las ventajas asignadas a tu cuenta.</p>
          </div>
          <span class="live-pill">${availableBenefitsCount} disponibles</span>
        </div>
        ${myBenefits.length
          ? `<div class="benefit-cards">${myBenefits.map(b => `
              <article class="benefit-card">
                <div class="benefit-card-top">
                  <span class="badge ${b.assignment_status === 'AVAILABLE' ? 'green' : 'blue'}">${esc(titleCase(b.assignment_status))}</span>
                  <span class="muted">${esc(b.tier || 'Todos los niveles')}</span>
                </div>
                <h4>${esc(b.name)}</h4>
                <p>${esc(b.description || 'Beneficio de Atlantic City')}</p>
                <div class="benefit-code">Código: <strong>${esc(b.code)}</strong></div>
                ${b.valid_until ? `<small>Válido hasta ${esc(String(b.valid_until).slice(0, 10))}</small>` : ''}
              </article>
            `).join('')}</div>`
          : '<div class="empty">Aún no tienes beneficios asignados. Cuando se te asigne uno, aparecerá aquí.</div>'}
      </section>
    ` : ''}

    <div class="dashboard-grid command-grid">
      <section class="panel command-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">RELACIÓN CON CLIENTES</span>
            <h4>Clientes recientes</h4>
          </div>
          <button class="text-button" data-go="clients">Ver clientes ↗</button>
        </div>
        ${recent.length
          ? `<div class="client-feed">${recent.map(c => `
              <div class="client-feed-row">
                <div class="client-avatar">${esc((c.firstName || '?')[0])}${esc((c.lastName || '')[0])}</div>
                <div class="client-info">
                  <strong>${esc(c.firstName)} ${esc(c.lastName)}</strong>
                  <span>${esc(c.email || c.dni || 'Sin correo')}</span>
                </div>
                <span class="badge ${c.vipTier === 'PLATINUM' ? 'amber' : c.vipTier === 'GOLD' ? 'blue' : ''}">${esc(c.vipTier || 'STANDARD')}</span>
              </div>
            `).join('')}</div>`
          : '<div class="empty">No hay clientes recientes para mostrar.</div>'}
      </section>

      <section class="panel command-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">CENTRO DE OPERACIONES</span>
            <h4>Accesos rápidos</h4>
          </div>
          <span class="live-pill">Accesos</span>
        </div>
        <div class="action-grid">
          ${[
            ['clients', '♙', 'Gestión de clientes', 'Consulta y administra perfiles'],
            ['tickets', '◉', 'Atención al cliente', 'Da seguimiento a solicitudes'],
            ['reservations', '▣', 'Reservas', 'Gestiona reservas activas'],
            ['events', '✦', 'Eventos', 'Administra experiencias'],
          ]
            .filter(x => navItems.find(n => n[0] === x[0])[3].includes(state.user.role))
            .map(x => `
              <button class="action-tile" data-go="${x[0]}">
                <span class="action-icon">${x[1]}</span>
                <span><strong>${x[2]}</strong><small>${x[3]}</small></span>
                <b>↗</b>
              </button>
            `).join('')}
        </div>
      </section>

      <section class="panel command-panel wide-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">ATLANTIC CITY CRM</span>
            <h4>Tu operación, en un solo lugar</h4>
            <p class="panel-subtitle">Selecciona un módulo para continuar trabajando.</p>
          </div>
          <span class="command-orb">✧</span>
        </div>
        <div class="module-strip">
          ${navItems
            .filter(x => x[0] !== 'dashboard' && x[3].includes(state.user.role))
            .slice(0, 6)
            .map(x => `
              <button class="module-pill" data-go="${x[0]}">
                <span>${x[1]}</span>${x[2]}<b>→</b>
              </button>
            `).join('')}
        </div>
      </section>
    </div>
  `;

  $('content').querySelectorAll('[data-go]').forEach(b => {
    b.onclick = () => navigate(b.dataset.go);
  });
}

async function renderProfile() {
  const p = await api('/profile');
  const isClient = p.role === 'CLIENT';
  const roleLabel = ({
    ADMIN: 'Administrador',
    EMPLOYEE: 'Gerencia / Operaciones',
    MARKETING: 'Marketing',
    CLIENT: 'Cliente',
  })[p.role] || titleCase(p.role);

  $('content').innerHTML = `
    ${intro('Mi perfil', 'Consulta y actualiza tus datos personales. Los permisos y el rol de tu cuenta se mantienen protegidos.')}
    <div class="profile-layout">
      <section class="panel profile-card">
        <div class="profile-heading">
          <div class="profile-large-avatar">${esc((p.name || 'U').trim().charAt(0).toUpperCase())}</div>
          <div>
            <h3>${esc(p.name)}</h3>
            <p>${esc(roleLabel)} · ${esc(p.email)}</p>
          </div>
        </div>
        <form id="profile-form" class="form-stack profile-form">
          ${isClient
            ? `<div class="two-col">
                <label>Nombres<input name="firstName" required maxlength="120" value="${esc(p.firstName || '')}"></label>
                <label>Apellidos<input name="lastName" required maxlength="120" value="${esc(p.lastName || '')}"></label>
              </div>`
            : `<label>Nombre completo<input name="name" required maxlength="160" value="${esc(p.name || '')}"></label>`}
          <label>Correo electrónico<input name="email" type="email" required maxlength="190" value="${esc(p.email || '')}"></label>
          <label>Teléfono<input name="phone" type="tel" maxlength="60" value="${esc(p.phone || '')}" placeholder="Ingresa tu número de contacto"></label>
          ${isClient
            ? `<label>Documento de identidad
                <input value="${esc(p.dni || '')}" disabled>
                <small class="field-note">Para proteger la identificación de tu cuenta, este dato no se modifica desde el perfil.</small>
              </label>`
            : ''}
          <div class="profile-meta">
            <span>Tipo de cuenta</span><strong>${esc(roleLabel)}</strong>
            <span>Rol y permisos</span><strong>No editables desde el perfil</strong>
          </div>
          <div class="actions">
            <button class="btn primary" type="submit">Guardar cambios</button>
          </div>
        </form>
      </section>

      <section class="panel password-card">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">SEGURIDAD DE LA CUENTA</span>
            <h4>Cambiar contraseña</h4>
          </div>
        </div>
        <p class="muted">Para cambiarla, confirma primero tu contraseña actual.</p>
        <form id="password-form" class="form-stack">
          <label>Contraseña actual<input name="currentPassword" type="password" autocomplete="current-password" required></label>
          <label>Nueva contraseña
            <input name="newPassword" type="password" minlength="12" maxlength="200" autocomplete="new-password" required>
            <small class="field-note">Mínimo 12 caracteres.</small>
          </label>
          <label>Confirmar nueva contraseña<input name="confirmPassword" type="password" minlength="12" maxlength="200" autocomplete="new-password" required></label>
          <button class="btn secondary" type="submit">Actualizar contraseña</button>
        </form>
      </section>
    </div>
  `;

  $('profile-form').onsubmit = async e => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const result = await api('/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      state.user = { ...state.user, ...result.user };
      sessionStorage.setItem('ac_user', JSON.stringify(state.user));
      $('user-name').textContent = state.user.name;
      $('user-avatar').textContent = state.user.name.trim().charAt(0).toUpperCase();
      $('top-avatar').textContent = state.user.name.trim().charAt(0).toUpperCase();
      toast('Tus datos se actualizaron correctamente');
      await renderProfile();
    } catch (err) {
      toast(err.message);
    }
  };

  $('password-form').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = fd.get('currentPassword');
    const newPassword = fd.get('newPassword');
    const confirmPassword = fd.get('confirmPassword');

    if (newPassword !== confirmPassword) {
      toast('Las nuevas contraseñas no coinciden');
      return;
    }

    try {
      await api('/profile/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      e.currentTarget.reset();
      toast('Contraseña actualizada correctamente');
    } catch (err) {
      toast(err.message);
    }
  };
}

const configs = {
  clients: {
    endpoint: '/clients',
    title: 'Clientes',
    desc: 'Consulta, registra y actualiza la información de los clientes.',
    add: 'Nuevo cliente',
    fields: [
      ['dni', 'DNI / Documento', 'text', true],
      ['firstName', 'Nombres', 'text', true],
      ['lastName', 'Apellidos', 'text', true],
      ['email', 'Correo electrónico', 'email'],
      ['phone', 'Teléfono', 'text'],
      ['consentMarketing', 'Acepta comunicaciones', 'checkbox'],
    ],
    cols: [
      ['dni', 'Documento'],
      ['firstName', 'Nombres'],
      ['lastName', 'Apellidos'],
      ['email', 'Correo'],
      ['phone', 'Teléfono'],
      ['vipTier', 'Nivel VIP'],
    ],
    canAdd: ['ADMIN', 'EMPLOYEE'],
    canEdit: ['ADMIN', 'EMPLOYEE'],
    search: true,
  },
  campaigns: {
    endpoint: '/campaigns',
    title: 'Campañas',
    desc: 'Crea campañas y segmenta audiencias por nivel VIP y consentimiento.',
    add: 'Nueva campaña',
    fields: [
      ['name', 'Nombre', 'text', true],
      ['description', 'Descripción', 'textarea'],
      ['status', 'Estado', 'select', ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'FINISHED']],
      ['targetTier', 'Nivel objetivo', 'select', ['', 'SILVER', 'GOLD', 'PLATINUM']],
      ['startsAt', 'Fecha de inicio', 'date'],
      ['endsAt', 'Fecha de fin', 'date'],
      ['channel', 'Canal', 'text'],
    ],
    cols: [
      ['name', 'Campaña'],
      ['status', 'Estado'],
      ['target_tier', 'Nivel objetivo'],
      ['channel', 'Canal'],
      ['starts_at', 'Inicio'],
    ],
    canAdd: ['ADMIN', 'MARKETING'],
    canEdit: [],
  },
  benefits: {
    endpoint: '/benefits',
    title: 'Beneficios',
    desc: 'Administra beneficios, asignaciones y canjes de clientes.',
    add: 'Nuevo beneficio',
    fields: [
      ['campaignId', 'Campaña asociada', 'campaign', false],
      ['name', 'Nombre', 'text', true],
      ['description', 'Descripción', 'textarea'],
      ['code', 'Código único', 'text', true],
      ['tier', 'Nivel VIP', 'select', ['', 'SILVER', 'GOLD', 'PLATINUM']],
      ['maxRedemptions', 'Máximo de canjes', 'number'],
      ['validFrom', 'Válido desde', 'date'],
      ['validUntil', 'Válido hasta', 'date'],
    ],
    cols: [
      ['name', 'Beneficio'],
      ['code', 'Código'],
      ['tier', 'Nivel'],
      ['status', 'Estado'],
      ['redeemed_count', 'Canjes'],
    ],
    canAdd: ['ADMIN', 'MARKETING'],
    canEdit: [],
  },
  tickets: {
    endpoint: '/tickets',
    title: 'Solicitudes de atención',
    desc: 'Registra consultas y realiza seguimiento a los tickets.',
    add: 'Crear ticket',
    fields: [
      ['subject', 'Asunto', 'text', true],
      ['description', 'Descripción', 'textarea', true],
      ['category', 'Categoría', 'text'],
      ['priority', 'Prioridad', 'select', ['LOW', 'MEDIUM', 'HIGH', 'URGENT']],
      ['department', 'Departamento', 'text'],
      ['status', 'Estado', 'select', ['NEW', 'PENDING', 'IN_PROGRESS', 'WAITING_INFO', 'RESOLVED', 'CLOSED']],
    ],
    cols: [
      ['ticket_no', 'Ticket'],
      ['subject', 'Asunto'],
      ['priority', 'Prioridad'],
      ['status', 'Estado'],
      ['created_at', 'Fecha'],
    ],
    canAdd: ['ADMIN', 'MARKETING', 'EMPLOYEE', 'CLIENT'],
    canEdit: ['ADMIN', 'MARKETING', 'EMPLOYEE'],
  },
  restaurants: {
    endpoint: '/restaurants',
    title: 'Restaurantes',
    desc: 'Catálogo de establecimientos y capacidad operativa.',
    add: 'Nuevo restaurante',
    fields: [
      ['code', 'Código', 'text', true],
      ['name', 'Nombre', 'text', true],
      ['description', 'Descripción', 'textarea'],
      ['location', 'Ubicación', 'text'],
      ['capacity', 'Capacidad', 'number'],
    ],
    cols: [
      ['code', 'Código'],
      ['name', 'Nombre'],
      ['location', 'Ubicación'],
      ['capacity', 'Capacidad'],
      ['active', 'Activo'],
    ],
    canAdd: ['ADMIN', 'EMPLOYEE'],
    canEdit: [],
  },
  reservations: {
    endpoint: '/reservations',
    title: 'Reservas',
    desc: 'Gestiona reservas y evita horarios superpuestos por restaurante.',
    add: 'Nueva reserva',
    fields: [
      ['restaurantId', 'Restaurante', 'restaurant', true],
      ['guestName', 'Nombre del cliente', 'text', true],
      ['guestEmail', 'Correo', 'email'],
      ['guestPhone', 'Teléfono', 'text'],
      ['partySize', 'Número de personas', 'number', true],
      ['startsAt', 'Inicio', 'datetime-local', true],
      ['endsAt', 'Fin', 'datetime-local', true],
      ['notes', 'Notas', 'textarea'],
      ['status', 'Estado', 'select', ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']],
    ],
    cols: [
      ['guest_name', 'Cliente'],
      ['restaurant_name', 'Restaurante'],
      ['party_size', 'Personas'],
      ['starts_at', 'Inicio'],
      ['status', 'Estado'],
    ],
    canAdd: ['ADMIN', 'EMPLOYEE'],
    canEdit: ['ADMIN', 'EMPLOYEE'],
  },
  events: {
    endpoint: '/events',
    title: 'Eventos',
    desc: 'Publica eventos, administra aforos e inscripciones.',
    add: 'Nuevo evento',
    fields: [
      ['code', 'Código', 'text', true],
      ['name', 'Nombre', 'text', true],
      ['description', 'Descripción', 'textarea'],
      ['venue', 'Lugar', 'text'],
      ['startsAt', 'Inicio', 'datetime-local', true],
      ['endsAt', 'Fin', 'datetime-local', true],
      ['capacity', 'Aforo', 'number'],
      ['status', 'Estado', 'select', ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']],
    ],
    cols: [
      ['code', 'Código'],
      ['name', 'Evento'],
      ['venue', 'Lugar'],
      ['starts_at', 'Inicio'],
      ['status', 'Estado'],
    ],
    canAdd: ['ADMIN', 'MARKETING'],
    canEdit: ['ADMIN', 'MARKETING'],
  },
  users: {
    endpoint: '/users',
    title: 'Usuarios',
    desc: 'Administra accesos y perfiles del personal.',
    add: 'Nuevo usuario',
    fields: [
      ['name', 'Nombre', 'text', true],
      ['email', 'Correo', 'email', true],
      ['password', 'Contraseña', 'password', true],
      ['role', 'Rol', 'select', ['EMPLOYEE', 'MARKETING', 'ADMIN']],
    ],
    cols: [
      ['name', 'Nombre'],
      ['email', 'Correo'],
      ['role', 'Rol'],
      ['created_at', 'Creado'],
    ],
    canAdd: ['ADMIN'],
    canEdit: ['ADMIN'],
  },
  integrations: {
    endpoint: '/integrations',
    title: 'Integraciones',
    desc: 'Inventario de conexiones previstas con sistemas externos.',
    add: 'Nueva integración',
    fields: [
      ['name', 'Nombre', 'text', true],
      ['type', 'Tipo', 'text'],
      ['endpoint', 'URL / Endpoint', 'text'],
      ['enabled', 'Habilitada', 'checkbox'],
    ],
    cols: [
      ['name', 'Integración'],
      ['type', 'Tipo'],
      ['endpoint', 'Endpoint'],
      ['enabled', 'Habilitada'],
      ['last_status', 'Último estado'],
    ],
    canAdd: ['ADMIN'],
    canEdit: [],
  },
  audit: {
    endpoint: '/audit',
    title: 'Auditoría',
    desc: 'Registro de acciones realizadas en el sistema.',
    cols: [
      ['created_at', 'Fecha'],
      ['action', 'Acción'],
      ['resource', 'Recurso'],
      ['resource_id', 'ID'],
      ['outcome', 'Resultado'],
    ],
    canAdd: [],
  },
  sales: {
    endpoint: '/sales',
    title: 'Ventas registradas',
    desc: 'Ventas recibidas desde la integración POS.',
    cols: [
      ['external_id', 'ID externo'],
      ['source', 'Origen'],
      ['amount', 'Importe'],
      ['currency', 'Moneda'],
      ['status', 'Estado'],
      ['sold_at', 'Fecha'],
    ],
    canAdd: [],
  },
};

function badge(v) {
  const s = String(v ?? '—');
  const cl = ['ACTIVE', 'CONFIRMED', 'COMPLETED', 'RESOLVED', 'PAID', 'PUBLISHED', 'AVAILABLE', 'SUCCESS', 'GOLD'].includes(s)
    ? 'green'
    : ['URGENT', 'CANCELLED', 'CLOSED', 'REFUNDED', 'DENIED', 'PLATINUM'].includes(s)
      ? 'red'
      : ['PENDING', 'IN_PROGRESS', 'SCHEDULED', 'SEATED'].includes(s)
        ? 'amber'
        : 'blue';

  return `<span class="badge ${cl}">${esc(titleCase(s))}</span>`;
}

async function renderModule(key) {
  const c = configs[key];
  const rows = await api(c.endpoint);
  state.cache[key] = rows;

  let actions = c.canAdd?.includes(state.user.role)
    ? `<button class="btn primary" id="add-record">＋ ${c.add}</button>`
    : '';

  if (key === 'clients' && ['ADMIN', 'MARKETING'].includes(state.user.role)) {
    actions += `
      <button class="btn secondary" id="vip-recalc">Recalcular VIP</button>
      <button class="btn secondary" id="export-csv">Exportar CSV</button>
    `;
  }

  const search = c.search
    ? '<div class="search"><input id="table-search" placeholder="Buscar por nombre, DNI o correo..."></div>'
    : '';

  $('content').innerHTML = `
    ${intro(c.title, c.desc, actions)}
    <div class="table-panel">
      <div class="table-toolbar">
        ${search}
        <span class="muted">${rows.length} registro(s)</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${c.cols.map(x => `<th>${x[1]}</th>`).join('')}<th>Acciones</th></tr>
          </thead>
          <tbody id="table-body">${renderRows(key, rows)}</tbody>
        </table>
      </div>
    </div>
  `;

  if ($('add-record')) {
    $('add-record').onclick = () => openForm(key);
  }

  if ($('vip-recalc')) {
    $('vip-recalc').onclick = async () => {
      try {
        const preview = await api('/vip/recalculate', {
          method: 'POST',
          body: JSON.stringify({ dryRun: true }),
        });

        showInfo(
          'Vista previa de niveles VIP',
          `
            <p class="muted">Se evaluarán ${preview.evaluated} clientes según sus puntos acumulados y los umbrales configurados.</p>
            ${preview.results.map(x => `
              <div class="quick-row">
                <strong>${esc(x.clientId.slice(0, 8))} · ${esc(x.tier)}</strong>
                <span>${esc(x.score)} puntos</span>
              </div>
            `).join('')}
            <div class="modal-footer">
              <button class="btn primary" id="apply-vip">Aplicar recálculo</button>
            </div>
          `
        );

        setTimeout(() => {
          const b = document.getElementById('apply-vip');
          if (b) {
            b.onclick = async () => {
              await api('/vip/recalculate', {
                method: 'POST',
                body: JSON.stringify({}),
              });
              document.querySelector('.modal-backdrop')?.remove();
              toast('Niveles VIP actualizados');
              navigate('clients');
            };
          }
        }, 0);
      } catch (e) {
        toast(e.message);
      }
    };
  }

  if ($('export-csv')) {
    $('export-csv').onclick = async () => {
      try {
        const r = await fetch(API + '/reports/clients.csv', {
          headers: { Authorization: `Bearer ${state.token}` },
        });
        if (!r.ok) throw new Error('No se pudo exportar el reporte');
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'clientes_atlantic.csv';
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (e) {
        toast(e.message);
      }
    };
  }

  if ($('table-search')) {
    $('table-search').oninput = e => {
      const q = e.target.value.toLowerCase();
      $('table-body').innerHTML = renderRows(
        key,
        rows.filter(r => JSON.stringify(r).toLowerCase().includes(q))
      );
      wireRowActions(key);
    };
  }

  wireRowActions(key);
}

function renderRows(key, rows) {
  const c = configs[key];
  if (!rows.length) {
    return `<tr><td class="empty" colspan="${c.cols.length + 1}">No hay registros para mostrar.</td></tr>`;
  }

  return rows.map(r => `
    <tr>
      ${c.cols.map(([field]) => {
        let v = r[field];
        if (['consentMarketing', 'enabled', 'active'].includes(field)) v = v ? 'Sí' : 'No';
        if (['status', 'priority', 'vipTier', 'vip_tier', 'role', 'last_status', 'outcome'].includes(field)) {
          return `<td>${badge(v)}</td>`;
        }
        if (field === 'amount' && v !== undefined) v = Number(v).toFixed(2);
        return `<td>${esc(v ?? '—')}</td>`;
      }).join('')}
      <td>
        <div class="row-actions">
          ${key === 'clients' ? `<button class="text-button" data-action="detail" data-id="${r.id}">Ficha</button>` : ''}
          ${key === 'clients' && state.user.role === 'ADMIN' ? `
            <button class="text-button" data-action="tier" data-id="${r.id}">Nivel VIP</button>
            <button class="text-button" data-action="tier-auto" data-id="${r.id}">Automático</button>
            <button class="text-button" data-action="points" data-id="${r.id}">Puntos ±</button>
          ` : ''}
          ${key !== 'users' && c.canEdit?.includes(state.user.role)
            ? `<button class="text-button" data-action="edit" data-id="${r.id}">Editar</button>`
            : ''}
          ${['tickets', 'reservations'].includes(key) && c.canEdit?.includes(state.user.role)
            ? `<button class="text-button" data-action="status" data-id="${r.id}">Estado</button>`
            : ''}
          ${key === 'benefits' && state.user.role !== 'CLIENT' ? `
            <button class="text-button" data-action="assign" data-id="${r.id}">Asignar</button>
            <button class="text-button" data-action="redeem" data-id="${r.id}">Canjear</button>
          ` : ''}
          ${key === 'events' ? `<button class="text-button" data-action="register" data-id="${r.id}">Inscribir</button>` : ''}
          ${key === 'campaigns' ? `
            <button class="text-button" data-action="audience" data-id="${r.id}">Audiencia</button>
            <button class="text-button" data-action="assign-campaign" data-id="${r.id}">Asignar beneficios</button>
          ` : ''}
          ${key === 'integrations' ? `<button class="text-button" data-action="sync" data-id="${r.id}">Sincronizar</button>` : ''}
          ${key === 'users' && state.user.role === 'ADMIN' ? `
            <button class="text-button" data-action="edit" data-id="${r.id}">Editar</button>
            <button class="text-button" data-action="role" data-id="${r.id}">Editar rol</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function wireRowActions(key) {
  $('table-body').querySelectorAll('[data-action]').forEach(b => {
    b.onclick = () => rowAction(key, b.dataset.action, b.dataset.id);
  });
}

function actionForm(title, description, fields, onSave, saveLabel = 'Guardar cambios') {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';

  const fieldHtml = fields.map(([name, label, type, value, options]) => {
    const val = value ?? '';
    if (type === 'textarea') {
      return `<label class="wide">${label}<textarea name="${name}" rows="3">${esc(val)}</textarea></label>`;
    }
    if (type === 'select') {
      return `
        <label>${label}
          <select name="${name}">
            ${options.map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(val) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
          </select>
        </label>
      `;
    }
    return `<label>${label}<input name="${name}" type="${type}" value="${esc(val)}" ${type === 'number' ? 'step="any"' : ''} required></label>`;
  }).join('');

  wrap.innerHTML = `
    <form class="modal action-modal">
      <div class="modal-head">
        <div>
          <h3>${esc(title)}</h3>
          <p class="muted">${esc(description || 'Completa los datos y confirma para guardar.')}</p>
        </div>
        <button type="button" class="icon-btn" data-close aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-grid">${fieldHtml}</div>
      <div class="modal-footer">
        <button type="button" class="btn secondary" data-close>Cancelar</button>
        <button class="btn primary" type="submit">${esc(saveLabel)}</button>
      </div>
    </form>
  `;

  document.body.append(wrap);
  wrap.querySelectorAll('[data-close]').forEach(b => {
    b.onclick = () => wrap.remove();
  });
  wrap.onclick = e => {
    if (e.target === wrap) wrap.remove();
  };

  wrap.querySelector('form').onsubmit = async e => {
    e.preventDefault();
    const payload = {};
    for (const [k, v] of new FormData(e.currentTarget).entries()) {
      payload[k] = v;
    }
    for (const f of fields) {
      if (f[2] === 'number') payload[f[0]] = Number(payload[f[0]]);
    }

    const submit = e.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;

    try {
      await onSave(payload);
      wrap.remove();
    } catch (err) {
      submit.disabled = false;
      toast(err.message);
    }
  };
}

async function rowAction(key, action, id) {
  const r = (state.cache[key] || []).find(x => x.id === id);

  try {
    if (action === 'detail') {
      const d = await api('/clients/' + id);
      const movements = await api(`/clients/${id}/loyalty/transactions`);
      showInfo(
        'Ficha del cliente',
        `
          <div class="quick-list">
            ${[
              ['Nombre', `${d.firstName} ${d.lastName}`],
              ['Documento', d.dni],
              ['Correo', d.email],
              ['Teléfono', d.phone],
              ['Nivel VIP', d.vipTier],
              ['Puntaje VIP', d.vipScore],
              ['Modo de nivel', d.vip_tier_override ? 'Manual' : 'Automático'],
              ['Consentimiento', d.consentMarketing ? 'Sí' : 'No'],
            ].map(x => `<div class="quick-row"><span>${x[0]}</span><strong>${esc(x[1] ?? '—')}</strong></div>`).join('')}
          </div>
          <h4>Movimientos de puntos</h4>
          ${movements.map(m => `
            <div class="quick-row">
              <span>${esc(m.description || m.source)} · ${esc(m.created_at)}</span>
              <strong>${Number(m.points) > 0 ? '+' : ''}${esc(m.points)} pts</strong>
            </div>
          `).join('') || '<p class="muted">Sin movimientos registrados.</p>'}
          <h4>Actividad reciente</h4>
          ${(d.activity || []).map(a => `<p class="muted">${esc(a.kind)} · ${esc(a.occurred_at)}</p>`).join('') || '<p class="muted">Sin actividad.</p>'}
        `
      );
      return;
    }

    if (action === 'points') {
      actionForm(
        'Ajustar puntos VIP',
        `Cliente: ${r.firstName || ''} ${r.lastName || ''}. Usa un valor negativo para descontar puntos.`,
        [
          ['points', 'Ajuste de puntos', 'number', 100],
          ['reason', 'Motivo del ajuste', 'textarea', 'Ajuste autorizado por administración'],
        ],
        async p => {
          await api(`/clients/${id}/loyalty/points`, {
            method: 'POST',
            body: JSON.stringify(p),
          });
          toast('Puntos ajustados correctamente');
          navigate('clients');
        }
      );
      return;
    }

    if (action === 'tier-auto') {
      actionForm(
        'Reactivar nivel VIP automático',
        'El nivel volverá a calcularse a partir de los puntos y umbrales vigentes.',
        [['confirm', 'Escribe REACTIVAR para confirmar', 'text', '']],
        async p => {
          if (p.confirm.trim().toUpperCase() !== 'REACTIVAR') {
            throw new Error('Escribe REACTIVAR para confirmar');
          }
          await api(`/clients/${id}/loyalty/tier-override`, { method: 'DELETE' });
          toast('Asignación automática reactivada');
          navigate('clients');
        },
        'Reactivar automático'
      );
      return;
    }

    if (action === 'tier') {
      actionForm(
        'Asignación manual de nivel VIP',
        'Esta asignación prevalece sobre el cálculo automático hasta que lo reactives.',
        [
          ['tier', 'Nivel VIP', 'select', r.vipTier || 'SILVER', [
            { value: 'SILVER', label: 'Silver' },
            { value: 'GOLD', label: 'Gold' },
            { value: 'PLATINUM', label: 'Platinum' },
          ]],
          ['reason', 'Motivo', 'textarea', 'Atención especial'],
        ],
        async p => {
          await api(`/clients/${id}/loyalty/tier`, {
            method: 'POST',
            body: JSON.stringify(p),
          });
          toast('Nivel VIP asignado correctamente');
          navigate('clients');
        }
      );
      return;
    }

    if (action === 'edit' && ['clients', 'events', 'tickets', 'reservations'].includes(key)) {
      return openForm(key, r);
    }

    if (action === 'edit' && key === 'users') {
      actionForm(
        'Editar usuario',
        'Actualiza el nombre y el estado de acceso.',
        [
          ['name', 'Nombre', 'text', r.name],
          ['is_active', 'Estado', 'select', r.is_active ? '1' : '0', [
            { value: '1', label: 'Activo' },
            { value: '0', label: 'Inactivo' },
          ]],
        ],
        async p => {
          p.is_active = p.is_active === '1';
          await api(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(p),
          });
          toast('Usuario actualizado');
          navigate(key);
        }
      );
      return;
    }

    if (action === 'role' && key === 'users') {
      actionForm(
        'Editar rol de usuario',
        'El cambio de rol modifica los permisos disponibles para esta cuenta.',
        [
          ['role', 'Rol', 'select', r.role, [
            { value: 'ADMIN', label: 'Administrador' },
            { value: 'EMPLOYEE', label: 'Gerencia / Operaciones' },
            { value: 'MARKETING', label: 'Marketing' },
            { value: 'CLIENT', label: 'Cliente' },
          ]],
        ],
        async p => {
          await api(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(p),
          });
          toast('Rol actualizado correctamente');
          navigate(key);
        }
      );
      return;
    }

    if (action === 'status') {
      const statuses = key === 'tickets'
        ? ['NEW', 'PENDING', 'IN_PROGRESS', 'WAITING_INFO', 'RESOLVED', 'CLOSED']
        : ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

      actionForm(
        key === 'tickets' ? 'Actualizar estado del ticket' : 'Actualizar estado de la reserva',
        'Selecciona el nuevo estado del registro.',
        [['status', 'Estado', 'select', r.status, statuses.map(x => ({ value: x, label: titleCase(x) }))]],
        async p => {
          if (key === 'tickets') {
            await api(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(p) });
          } else {
            await api(`/reservations/${id}/status`, { method: 'PATCH', body: JSON.stringify(p) });
          }
          toast('Estado actualizado');
          navigate(key);
        }
      );
      return;
    }

    if (action === 'assign' || action === 'redeem') {
      const clients = await api('/clients?limit=100');
      if (!Array.isArray(clients) || !clients.length) {
        toast('No hay clientes disponibles para seleccionar');
        return;
      }

      const selected = await selectClient(
        clients,
        action === 'assign' ? 'Asignar beneficio' : 'Canjear beneficio'
      );
      if (!selected) return;

      if (action === 'assign') {
        await api(`/benefits/${id}/assign`, {
          method: 'POST',
          body: JSON.stringify({ clientId: selected.id }),
        });
        toast(`Beneficio asignado a ${selected.firstName} ${selected.lastName}`);
      } else {
        await api(`/benefits/${id}/redeem`, {
          method: 'POST',
          body: JSON.stringify({ clientId: selected.id }),
        });
        toast(`Beneficio canjeado por ${selected.firstName} ${selected.lastName}`);
      }
      return;
    }

    if (action === 'register') {
      actionForm(
        'Inscribir participante',
        `Evento: ${r.name || 'Evento'}.`,
        [
          ['attendeeName', 'Nombre del asistente', 'text', state.user.name],
          ['attendeeEmail', 'Correo electrónico', 'email', state.user.email],
        ],
        async p => {
          await api(`/events/${id}/register`, {
            method: 'POST',
            body: JSON.stringify(p),
          });
          toast('Inscripción registrada correctamente');
        },
        'Confirmar inscripción'
      );
      return;
    }

    if (action === 'audience') {
      const a = await api(`/campaigns/${id}/audience`);
      showInfo(
        'Audiencia de campaña',
        `
          <p class="muted">${a.consented} cliente(s) con consentimiento de ${a.totalEligible} elegible(s).</p>
          ${(a.clients || []).map(x => `
            <div class="quick-row">
              <strong>${esc(x.firstName)} ${esc(x.lastName)}</strong>
              <span>${esc(x.email)}</span>
            </div>
          `).join('')}
        `
      );
      return;
    }

    if (action === 'assign-campaign') {
      actionForm(
        'Asignar beneficios de campaña',
        'Se asignarán los beneficios asociados a esta campaña a los clientes que tengan consentimiento de marketing.',
        [
          ['tier', 'Filtrar por nivel VIP', 'select', '', [
            { value: '', label: 'Todos los niveles' },
            { value: 'SILVER', label: 'Silver' },
            { value: 'GOLD', label: 'Gold' },
            { value: 'PLATINUM', label: 'Platinum' },
          ]],
        ],
        async p => {
          const a = await api(`/campaigns/${id}/assign-benefits`, {
            method: 'POST',
            body: JSON.stringify(p),
          });
          toast(`${a.assignmentsCreated ?? a.assigned ?? 0} asignación(es) creadas`);
          navigate(key);
        },
        'Asignar beneficios'
      );
      return;
    }

    if (action === 'sync') {
      const result = await api(`/integrations/${id}/sync`, {
        method: 'POST',
        body: '{}',
      });
      toast(result.message);
    }
  } catch (e) {
    toast(e.message);
  }
}

function selectClient(clients, title = 'Seleccionar cliente') {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop client-picker-backdrop';

    const rows = clients.map(c => ({
      ...c,
      _label: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
    }));

    wrap.innerHTML = `
      <section class="modal client-picker" role="dialog" aria-modal="true" aria-labelledby="client-picker-title">
        <div class="modal-head">
          <div>
            <h3 id="client-picker-title">${esc(title)}</h3>
            <p class="muted">Busca y selecciona un cliente de la lista.</p>
          </div>
          <button class="icon-btn" type="button" data-picker-close aria-label="Cerrar">✕</button>
        </div>
        <label class="client-picker-search">
          <span>Buscar cliente</span>
          <input id="client-picker-query" type="search" autocomplete="off" placeholder="Nombre, documento o correo...">
        </label>
        <div class="client-picker-meta">
          <span id="client-picker-count"></span>
          <span>Selecciona una fila para continuar</span>
        </div>
        <div class="client-picker-list" id="client-picker-list"></div>
        <div class="modal-footer">
          <button class="btn secondary" type="button" data-picker-close>Cancelar</button>
        </div>
      </section>
    `;

    document.body.append(wrap);

    const list = wrap.querySelector('#client-picker-list');
    const query = wrap.querySelector('#client-picker-query');
    const count = wrap.querySelector('#client-picker-count');
    let settled = false;

    const finish = value => {
      if (settled) return;
      settled = true;
      wrap.remove();
      resolve(value);
    };

    const render = () => {
      const q = query.value.trim().toLocaleLowerCase();
      const filtered = rows.filter(c => [c._label, c.dni, c.email, c.phone]
        .some(v => String(v || '').toLocaleLowerCase().includes(q)));

      count.textContent = `${filtered.length} de ${rows.length} clientes`;
      list.innerHTML = filtered.length
        ? filtered.map(c => `
            <button class="client-option" type="button" data-client-index="${rows.indexOf(c)}">
              <span class="client-option-avatar">${esc((c.firstName || '?').charAt(0).toUpperCase())}</span>
              <span class="client-option-main">
                <strong>${esc(c._label || 'Cliente sin nombre')}</strong>
                <small>${esc(c.email || 'Sin correo')} · ${esc(c.dni || 'Sin documento')}</small>
              </span>
              <span class="client-option-arrow">›</span>
            </button>
          `).join('')
        : '<div class="client-picker-empty">No se encontraron clientes. Prueba con otro nombre o documento.</div>';

      list.querySelectorAll('[data-client-index]').forEach(button => {
        button.addEventListener('click', () => finish(rows[Number(button.dataset.clientIndex)]));
      });
    };

    query.addEventListener('input', render);
    wrap.querySelectorAll('[data-picker-close]').forEach(button => {
      button.addEventListener('click', () => finish(null));
    });
    wrap.addEventListener('click', event => {
      if (event.target === wrap) finish(null);
    });
    wrap.addEventListener('keydown', event => {
      if (event.key === 'Escape') finish(null);
    });

    render();
    query.focus();
  });
}

function showInfo(title, html) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h3>${title}</h3>
        <button class="icon-btn" data-close>✕</button>
      </div>
      ${html}
      <div class="modal-footer">
        <button class="btn primary" data-close>Cerrar</button>
      </div>
    </div>
  `;

  document.body.append(wrap);
  wrap.querySelectorAll('[data-close]').forEach(b => {
    b.onclick = () => wrap.remove();
  });
  wrap.onclick = e => {
    if (e.target === wrap) wrap.remove();
  };
}

const fieldAliases = {
  firstName: 'first_name',
  lastName: 'last_name',
  consentMarketing: 'consent_marketing',
  targetTier: 'target_tier',
  startsAt: 'starts_at',
  endsAt: 'ends_at',
  maxRedemptions: 'max_redemptions',
  validFrom: 'valid_from',
  validUntil: 'valid_until',
  partySize: 'party_size',
  guestName: 'guest_name',
  guestEmail: 'guest_email',
  guestPhone: 'guest_phone',
  restaurantId: 'restaurant_id',
};

async function openForm(key, record = null) {
  const c = configs[key];
  let restaurants = [];
  let campaigns = [];

  if (key === 'reservations') restaurants = await api('/restaurants');
  if (key === 'benefits') campaigns = await api('/campaigns');

  const fields = c.fields || [];
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';

  wrap.innerHTML = `
    <form class="modal" id="record-form">
      <div class="modal-head">
        <h3>${record ? 'Editar' : 'Crear'} ${c.title.toLowerCase()}</h3>
        <button type="button" class="icon-btn" data-close>✕</button>
      </div>
      <div class="modal-grid">
        ${fields.map(([name, label, type, extra]) => {
          const alias = fieldAliases[name] || name;
          const val = record ? (record[name] ?? record[alias] ?? '') : '';

          if (type === 'checkbox') {
            return `<label class="wide checkline"><input name="${name}" type="checkbox" ${val ? 'checked' : ''}> ${label}</label>`;
          }
          if (type === 'textarea') {
            return `<label class="wide">${label}<textarea name="${name}">${esc(val)}</textarea></label>`;
          }
          if (type === 'select') {
            return `
              <label>${label}
                <select name="${name}">
                  ${extra.map(v => `<option value="${v}" ${String(val) === v ? 'selected' : ''}>${v ? titleCase(v) : 'Sin especificar'}</option>`).join('')}
                </select>
              </label>
            `;
          }
          if (type === 'restaurant') {
            return `
              <label>${label}
                <select name="${name}" required>
                  <option value="">Selecciona...</option>
                  ${restaurants.map(v => `<option value="${v.id}" ${String(val) === String(v.id) ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}
                </select>
              </label>
            `;
          }
          if (type === 'campaign') {
            return `
              <label>${label}
                <select name="${name}">
                  <option value="">Sin campaña asociada</option>
                  ${campaigns.map(v => `<option value="${v.id}" ${String(val) === String(v.id) ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}
                </select>
              </label>
            `;
          }
          return `<label>${label}<input name="${name}" type="${type}" value="${esc(val)}" ${extra === true ? 'required' : ''} ${type === 'number' ? 'min="0"' : ''}></label>`;
        }).join('')}
      </div>
      <div class="modal-footer">
        <button type="button" class="btn secondary" data-close>Cancelar</button>
        <button class="btn primary" type="submit">Guardar</button>
      </div>
    </form>
  `;

  document.body.append(wrap);
  wrap.querySelectorAll('[data-close]').forEach(b => {
    b.onclick = () => wrap.remove();
  });
  wrap.onclick = e => {
    if (e.target === wrap) wrap.remove();
  };

  wrap.querySelector('form').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {};

    for (const [k, v] of fd.entries()) {
      payload[k] = v;
    }

    fields.forEach(([k, , t]) => {
      if (t === 'checkbox') payload[k] = !!e.target.elements[k].checked;
      if (t === 'number') payload[k] = payload[k] === '' ? null : Number(payload[k]);
    });

    if (key === 'campaigns') payload.targetTier = payload.targetTier || null;
    if (key === 'events' && payload.capacity === '') payload.capacity = null;

    try {
      if (record && ['clients', 'events', 'tickets', 'reservations'].includes(key)) {
        await api(`${c.endpoint}/${record.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api(c.endpoint, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      wrap.remove();
      toast('Información guardada correctamente');
      navigate(key);
    } catch (err) {
      toast(err.message);
    }
  };
}

$('login-btn').onclick = async () => {
  try {
    const r = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('login-email').value,
        password: $('login-password').value,
      }),
    });
    state.token = r.token;
    state.user = r.user;
    sessionStorage.setItem('ac_token', r.token);
    sessionStorage.setItem('ac_user', JSON.stringify(r.user));
    enterApp();
  } catch (e) {
    $('auth-message').textContent = e.message;
  }
};

$('register-btn').onclick = async () => {
  if ($('reg-password').value !== $('reg-confirm').value) {
    $('auth-message').textContent = 'Las contraseñas no coinciden';
    return;
  }

  try {
    const r = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        firstName: $('reg-first').value,
        lastName: $('reg-last').value,
        dni: $('reg-dni').value,
        email: $('reg-email').value,
        phone: $('reg-phone').value,
        password: $('reg-password').value,
        consentMarketing: $('reg-consent').checked,
      }),
    });
    state.token = r.token;
    state.user = r.user;
    sessionStorage.setItem('ac_token', r.token);
    sessionStorage.setItem('ac_user', JSON.stringify(r.user));
    enterApp();
  } catch (e) {
    $('auth-message').textContent = e.message;
  }
};

$('bootstrap-btn').onclick = async () => {
  try {
    await api('/auth/bootstrap-admin', {
      method: 'POST',
      body: JSON.stringify({
        name: $('boot-name').value,
        email: $('boot-email').value,
        password: $('boot-password').value,
      }),
    });
    bootstrapAvailable = false;
    $('show-bootstrap').classList.add('hidden');
    toast('Administrador creado. Ya puedes iniciar sesión.');
    showAuth('login');
  } catch (e) {
    $('auth-message').textContent = e.message;
    if (e.message.includes('inicialización ya fue realizada')) {
      bootstrapAvailable = false;
      $('show-bootstrap').classList.add('hidden');
      showAuth('login');
    }
  }
};

$('show-register').onclick = () => showAuth('register');
$('show-login').onclick = () => showAuth('login');
$('show-bootstrap').onclick = () => showAuth('bootstrap');
$('back-login').onclick = () => showAuth('login');
$('logout-btn').onclick = logout;
$('menu-toggle').onclick = () => $('sidebar').classList.toggle('open');
$('top-avatar').onclick = () => navigate('profile');
$('sidebar-profile').onclick = () => navigate('profile');

checkBootstrapStatus();

if (state.token && state.user) {
  api('/auth/me')
    .then(u => {
      state.user = { ...state.user, ...u };
      sessionStorage.setItem('ac_user', JSON.stringify(state.user));
      enterApp();
    })
    .catch(logout);
} else {
  showAuth('login');
}