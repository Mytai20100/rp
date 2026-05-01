(() => {
  'use strict';

  /* ── Dynamic base URL ── */
  const BASE = (() => {
    const { origin, pathname } = window.location;
    const base = pathname.endsWith('/') ? pathname : pathname.replace(/\/[^/]*$/, '/');
    return origin + base;
  })();

  /* ── Dynamic GitHub URL from base ── */
  // Derives https://github.com/USER/REPO from https://USER.github.io/REPO/
  const GITHUB_URL = (() => {
    try {
      const url = new URL(BASE);
      const host = url.hostname; // e.g. meomeo.github.io
      const parts = host.split('.');
      if (parts.length >= 3 && parts[1] === 'github' && parts[2] === 'io') {
        const user = parts[0];
        const repo = url.pathname.replace(/^\/|\/$/g, '') || user;
        return `https://github.com/${user}/${repo}`;
      }
    } catch (_) {}
    return null;
  })();

  /* ── DOM refs ── */
  const grid      = document.getElementById('tweaksGrid');
  const count     = document.getElementById('pkgCount');
  const overlay   = document.getElementById('modalOverlay');
  const body      = document.getElementById('modalBody');
  const repoUrl   = document.getElementById('repoUrl');
  const toast     = document.getElementById('toast');
  const addBtn    = document.getElementById('addRepoBtn');
  const footerGh  = document.getElementById('footerGithub');
  const footerMeta = document.getElementById('footerMeta');

  /* ── Populate dynamic URLs ── */
  if (repoUrl) repoUrl.textContent = BASE;

  if (addBtn) {
    addBtn.href = `cydia://url/https://cydia.saurik.com/api/share#?source=${encodeURIComponent(BASE)}`;
  }

  if (footerGh) {
    if (GITHUB_URL) {
      footerGh.href = GITHUB_URL;
      footerGh.textContent = 'GitHub';
    } else {
      footerGh.style.display = 'none';
    }
  }

  /* ── Resolve asset URL relative to BASE ── */
  function assetUrl(path) {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    // Strip leading slash if any
    return BASE + path.replace(/^\//, '');
  }

  /* ── Default icon SVG ── */
  const DEFAULT_ICON = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 54 54'><rect width='54' height='54' rx='14' fill='%232997ff'/><text y='.9em' font-size='36' x='50%25' text-anchor='middle'>📦</text></svg>`;

  /* ── Load Release file for version + sha ── */
  async function loadReleaseMeta() {
    try {
      const res = await fetch('Release');
      if (!res.ok) return {};
      const text = await res.text();
      const meta = {};
      for (const line of text.split('\n')) {
        const [key, ...rest] = line.split(':');
        if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
      }
      return meta;
    } catch { return {}; }
  }

  /* ── Load packages index ── */
  async function loadTweaks() {
    try {
      const res = await fetch('packages/index.json');
      if (!res.ok) throw new Error('No index');
      return await res.json();
    } catch { return []; }
  }

  /* ── Load Packages file for sha256 per package ── */
  async function loadPackagesSha() {
    try {
      const res = await fetch('Packages');
      if (!res.ok) return {};
      const text = await res.text();
      const map = {};
      const blocks = text.trim().split(/\n\n+/);
      for (const block of blocks) {
        let pkg = null, sha = null;
        for (const line of block.split('\n')) {
          if (line.startsWith('Package:')) pkg = line.split(':')[1].trim();
          if (line.startsWith('SHA256:')) sha = line.split(':')[1].trim();
        }
        if (pkg && sha) map[pkg] = sha;
      }
      return map;
    } catch { return {}; }
  }

  /* ── Render cards ── */
  function renderCards(tweaks) {
    grid.innerHTML = '';
    count.textContent = tweaks.length;

    if (!tweaks.length) {
      grid.innerHTML = '<p style="color:var(--text2);grid-column:1/-1">No packages yet.</p>';
      return;
    }

    tweaks.forEach((pkg, i) => {
      const card = document.createElement('div');
      card.className = 'tweak-card';
      card.style.animationDelay = `${i * 60}ms`;

      const iconSrc = assetUrl(pkg.icon) || DEFAULT_ICON;

      card.innerHTML = `
        <div class="card-top">
          <img class="card-icon" src="${iconSrc}" alt="${pkg.name}" onerror="this.src='${DEFAULT_ICON}'">
          <div class="card-meta">
            <div class="card-name">${pkg.name}</div>
            <div class="card-version">v${pkg.version}</div>
          </div>
        </div>
        <p class="card-desc">${pkg.description}</p>
        <div class="card-footer">
          <span class="card-section">${pkg.section || 'Tweaks'}</span>
          <button class="card-get-btn" onclick="event.stopPropagation(); openCydia('${pkg.id}')">Get</button>
        </div>
      `;
      card.addEventListener('click', () => openModal(pkg));
      grid.appendChild(card);
    });
  }

  /* ── Modal ── */
  let shaMap = {};

  window.openModal = function(pkg) {
    const shots = (pkg.screenshots || [])
      .map(s => `<img src="${assetUrl(s)}" alt="Screenshot" loading="lazy">`)
      .join('');

    const iconSrc = assetUrl(pkg.icon) || DEFAULT_ICON;
    const sha = shaMap[pkg.id];
    const shaHtml = sha
      ? `<div class="info-item"><label>SHA256</label><span class="mono-sm">${sha.slice(0, 16)}…</span></div>`
      : '';

    body.innerHTML = `
      <div class="modal-header">
        <img class="modal-icon" src="${iconSrc}" alt="${pkg.name}" onerror="this.src='${DEFAULT_ICON}'">
        <div>
          <div class="modal-name">${pkg.name}</div>
          <div class="modal-author">by ${pkg.author || pkg.maintainer || 'meomeo'}</div>
        </div>
      </div>
      <button class="modal-cta" onclick="openCydia('${pkg.id}')">
        Get — Add to Cydia / Sileo
      </button>
      ${shots ? `<div class="modal-screenshots">${shots}</div>` : ''}
      <p class="modal-desc">${pkg.description}</p>
      <div class="modal-info">
        <div class="info-item"><label>Version</label><span>v${pkg.version}</span></div>
        <div class="info-item"><label>Architecture</label><span>${pkg.architecture || 'iphoneos-arm'}</span></div>
        <div class="info-item"><label>Section</label><span>${pkg.section || 'Tweaks'}</span></div>
        <div class="info-item"><label>Package ID</label><span class="mono-sm">${pkg.id}</span></div>
        ${shaHtml}
      </div>
    `;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeModal = function() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ── Cydia / Sileo deep-link ── */
  window.openCydia = function(pkgId) {
    window.location.href = `cydia://url/https://cydia.saurik.com/api/share#?source=${encodeURIComponent(BASE)}`;
  };

  window.addToManager = function(e) {
    e.preventDefault();
    window.location.href = `cydia://url/https://cydia.saurik.com/api/share#?source=${encodeURIComponent(BASE)}`;
  };

  /* ── Copy URL ── */
  window.copyUrl = function() {
    navigator.clipboard?.writeText(BASE).then(() => showToast('Copied!')).catch(() => {
      const el = document.createElement('textarea');
      el.value = BASE;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
      showToast('Copied!');
    });
  };

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  /* ── Boot ── */
  Promise.all([loadTweaks(), loadPackagesSha(), loadReleaseMeta()]).then(([tweaks, sha, release]) => {
    shaMap = sha;
    renderCards(tweaks);

    // Footer meta: repo version from Release
    if (footerMeta && release['Version']) {
      footerMeta.textContent = ` · v${release['Version']}`;
    }
  });
})();
