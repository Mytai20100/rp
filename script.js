(() => {
  'use strict';

  /* ── Config ── */
  const BASE = (() => {
    const { origin, pathname } = window.location;
    const base = pathname.endsWith('/') ? pathname : pathname.replace(/\/[^/]*$/, '/');
    return origin + base;
  })();

  /* ── DOM refs ── */
  const grid    = document.getElementById('tweaksGrid');
  const count   = document.getElementById('pkgCount');
  const overlay = document.getElementById('modalOverlay');
  const modal   = document.getElementById('modal');
  const body    = document.getElementById('modalBody');
  const repoUrl = document.getElementById('repoUrl');
  const toast   = document.getElementById('toast');

  /* ── Repo URL ── */
  if (repoUrl) repoUrl.textContent = BASE;

  /* ── Load tweaks ── */
  async function loadTweaks() {
    try {
      const res = await fetch('packages/index.json');
      if (!res.ok) throw new Error('No index');
      return await res.json();
    } catch {
      return [];
    }
  }

  /* ── Render ── */
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
      card.innerHTML = `
        <div class="card-top">
          <img class="card-icon" src="${pkg.icon || 'assets/default-icon.png'}" alt="${pkg.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 54 54\\'><rect width=\\'54\\' height=\\'54\\' rx=\\'14\\' fill=\\'%232997ff\\'/></svg>'">
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
  window.openModal = function(pkg) {
    const shots = (pkg.screenshots || [])
      .map(s => `<img src="${s}" alt="Screenshot" loading="lazy">`)
      .join('');

    body.innerHTML = `
      <div class="modal-header">
        <img class="modal-icon" src="${pkg.icon || ''}" alt="${pkg.name}" onerror="this.style.display='none'">
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
        <div class="info-item"><label>Version</label><span>${pkg.version}</span></div>
        <div class="info-item"><label>Architecture</label><span>${pkg.architecture || 'iphoneos-arm'}</span></div>
        <div class="info-item"><label>Section</label><span>${pkg.section || 'Tweaks'}</span></div>
        <div class="info-item"><label>Package</label><span style="font-family:monospace;font-size:12px">${pkg.id}</span></div>
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

  /* ── Cydia / Sileo ── */
  window.openCydia = function(pkgId) {
    const url = `cydia://url/https://cydia.saurik.com/api/share#?source=${encodeURIComponent(BASE)}`;
    window.location.href = url;
  };

  window.addToCydia = function(e) {
    e.preventDefault();
    const url = `cydia://url/https://cydia.saurik.com/api/share#?source=${encodeURIComponent(BASE)}`;
    window.location.href = url;
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
  loadTweaks().then(renderCards);
})();
