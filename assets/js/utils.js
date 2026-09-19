/* =====================================================================
   TNPSC Study Library — shared utilities
   Loaded on every page.
   ===================================================================== */
(function () {
  'use strict';

  const TL = window.TL = window.TL || {};

  /* ---- DOM helpers ------------------------------------------------ */
  TL.$ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  TL.$$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---- URL / search params ---------------------------------------- */
  TL.getParams = function () {
    return new URLSearchParams(window.location.search || '');
  };

  /* ---- Security: only http(s) URLs are allowed -------------------- */
  TL.safeUrl = function (url) {
    if (!url || typeof url !== 'string') return '';
    const u = String(url).trim();
    if (/^https?:\/\//i.test(u)) return u;
    return '';
  };

  /* ---- Escape data before injecting into templates ---------------- */
  TL.escapeHtml = function (value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  TL.isValidBookId = function (id) {
    return /^[a-z0-9][a-z0-9\-]{0,63}$/i.test(String(id || ''));
  };

  /* ---- Data loading (books.json) ---------------------------------- */
  let dataPromise = null;

  TL.fetchJSON = function (url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  };

  TL.loadData = function (force) {
    if (dataPromise && !force) return dataPromise;
    if (window.BOOKS_DATA && Array.isArray(window.BOOKS_DATA.classes)) {
      dataPromise = Promise.resolve(window.BOOKS_DATA);
      return dataPromise;
    }
    dataPromise = TL.fetchJSON('data/books.json').then(function (json) {
      if (!json || !Array.isArray(json.classes)) throw new Error('Invalid data file');
      return json;
    }).catch(function (err) {
      if (window.BOOKS_DATA && Array.isArray(window.BOOKS_DATA.classes)) {
        return window.BOOKS_DATA;
      }
      throw err;
    });
    return dataPromise;
  };

  TL.getClassData = function (all, id) {
    if (!Array.isArray(all)) return null;
    return all.filter(function (c) {
      return String(c.id) === String(id);
    })[0] || null;
  };

  /* Flatten: return [{ ...book, classId, className, groupId, groupName }] */
  TL.flattenBooks = function (classes) {
    const out = [];
    classes.forEach(function (cls) {
      const groups = cls.terms || cls.subjects || [];
      groups.forEach(function (g) {
        (g.books || []).forEach(function (book) {
          out.push(Object.assign({}, book, {
            classId: cls.id,
            className: cls.name,
            groupId: g.id,
            groupName: g.name,
          }));
        });
      });
    });
    return out;
  };

  TL.findBook = function (data, id) {
    if (!TL.isValidBookId(id)) return null;
    const flat = TL.flattenBooks(data.classes);
    let found = null;
    flat.some(function (b) {
      if (b.id === id) { found = b; return true; }
      return false;
    });
    return found;
  };

  /* Relevances shown by default. All approved books are shown; relevance is
     a label only ("High Relevance" / "Basic Reference" for 11th/12th).
     The user's saved filter (if any) is restored so choices persist. */
  TL.relevancePreference = function () {
    const valid = ['high', 'basic', 'relevant'];
    try {
      const raw = localStorage.getItem('tl-relevance');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return list.filter(function (r) { return valid.indexOf(r) !== -1; });
        }
      }
    } catch (e) { /* ignore */ }
    return [];
  };

  TL.saveRelevancePreference = function (list) {
    try { localStorage.setItem('tl-relevance', JSON.stringify(list)); } catch (e) { /* ignore */ }
  };

  TL.mediumFilter = function () {
    return localStorage.getItem('tl-medium') || 'all';
  };

  TL.saveMediumFilter = function (m) {
    try { localStorage.setItem('tl-medium', m); } catch (e) { /* ignore */ }
  };

  /* ---- Reading history --------------------------------------------- */
  TL.saveHistory = function (bookId, pageNumber, meta) {
    try {
      const entry = { bookId: bookId, pageNumber: pageNumber, timestamp: Date.now() };
      if (meta) {
        entry.title = meta.title;
        entry.className = meta.className;
        meta.cover && (entry.cover = meta.cover);
      }
      localStorage.setItem('tl-history', JSON.stringify(entry));
    } catch (e) { /* ignore */ }
  };

  TL.loadHistory = function () {
    try {
      const raw = localStorage.getItem('tl-history');
      if (!raw) return null;
      const h = JSON.parse(raw);
      return h && h.bookId ? h : null;
    } catch (e) {
      return null;
    }
  };

  /* ---- Theme -------------------------------------------------------- */
  TL.applyTheme = function (theme) {
    document.documentElement.setAttribute('data-theme', theme);
  };

  TL.theme = function () {
    try {
      return localStorage.getItem('tl-theme') || 'light';
    } catch (e) {
      return 'light';
    }
  };

  TL.initTheme = function () {
    const saved = TL.theme();
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    TL.applyTheme(saved === 'auto' ? (prefersDark ? 'dark' : 'light') : saved);
  };

  TL.toggleTheme = function () {
    const next = TL.theme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('tl-theme', next); } catch (e) { /* ignore */ }
    TL.applyTheme(next);
    return next;
  };

  /* ---- Loose helpers ------------------------------------------------ */
  TL.debounce = function (fn, wait) {
    let t = null;
    return function () {
      const args = arguments;
      const ctx = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  };

  TL.formatYear = function (y) {
    if (/^\d{4}-\d{2,4}$/.test(String(y))) {
      return String(y).replace('-', '\u2013');
    }
    return TL.escapeHtml(y);
  };

  TL.openExternal = function (url) {
    const safe = TL.safeUrl(url);
    if (!safe) return false;
    window.open(safe, '_blank', 'noopener,noreferrer');
    return true;
  };

  /* Token for the reader: id of an icon we want (moon/sun/svg set) */
  TL.ICONS = {
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></svg>',
    fullscreen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/></svg>',
    fullscreenExit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3m13 0v-3a2 2 0 0 0-2-2h-3"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    chevLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    chevRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M7 12h10m-6 6h2"/></svg>',
  };

  /* Build a theme toggle button (icon syncs after init) */
  TL.initThemeToggle = function () {
    const btn = TL.$('.js-theme-toggle');
    if (!btn) return null;
    const sync = function () {
      const dark = TL.theme() === 'dark';
      btn.innerHTML = dark ? TL.ICONS.sun : TL.ICONS.moon;
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    };
    btn.addEventListener('click', function () {
      TL.toggleTheme();
      sync();
    });
    sync();
    return btn;
  };

  /* ---- Offline banner ---------------------------------------------- */
  TL.initOffline = function () {
    const banner = TL.$('.offline-banner');
    if (!banner) return;
    const notify = function (off) {
      if (off) {
        banner.textContent = "You're offline. Please connect to the internet to read this book.";
        banner.classList.add('show');
      } else {
        banner.classList.remove('show');
      }
    };
    notify(!navigator.onLine);
    window.addEventListener('offline', function () { notify(true); });
    window.addEventListener('online', function () { notify(false); });
  };

  /* ---- Service worker (progressive enhancement, HTTPS only) --------- */
  TL.initServiceWorker = function () {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('service-worker.js').catch(function () { /* ignore */ });
    }
  };

  /* ---- Generated cover art (fallback when no image is configured) -- */
  TL.COVER_GRADIENTS = [
    ['#3563e9', '#1e3a8a'],
    ['#7c3aed', '#4c1d95'],
    ['#0d9488', '#134e4a'],
    ['#db2777', '#831843'],
    ['#d97706', '#78350f'],
    ['#059669', '#064e3b'],
    ['#2563eb', '#172554'],
    ['#dc2626', '#7f1d1d'],
  ];

  TL.coverSeed = function (book) {
    const s = String(book.id || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };

  TL.coverArtHtml = function (book, seed) {
    const g = (TL.COVER_GRADIENTS[(seed != null ? seed : TL.coverSeed(book)) % TL.COVER_GRADIENTS.length]);
    const name = String(book.title || 'Book');
    const initial = name.trim().charAt(0).toUpperCase();
    const inline = { background: 'linear-gradient(135deg, ' + g[0] + ', ' + g[1] + ')' };
    return (
      '<div class="cover-art" style="background:linear-gradient(135deg,' + g[0] + ',' + g[1] + ')">' +
        '<span class="ca-initial">' + TL.escapeHtml(initial) + '</span>' +
        '<span class="ca-name">' + TL.escapeHtml(name) + '</span>' +
      '</div>'
    );
  };

  TL.coverFallback = function (imgEl) {
    /* onerror handler for <img> */
    if (imgEl && imgEl.parentNode) {
      const placeholder = document.createElement('div');
      placeholder.innerHTML = TL.coverArtHtml({ id: imgEl.getAttribute('data-id') || 'x', title: imgEl.getAttribute('alt') || 'Book' });
      if (!imgEl.getAttribute('alt')) {
        const el = placeholder.firstChild;
        if (el) el.setAttribute('role', 'img');
      }
      imgEl.parentNode.replaceChild(placeholder.firstChild, imgEl);
    }
  };

  /* Book cover <img> built from data (uses image or falls back to art) */
  TL.coverHtml = function (book) {
    const src = TL.safeUrl(book.cover);
    const seed = TL.coverSeed(book);
    if (src) {
      return '<img src="' + TL.escapeHtml(src) + '" alt="' + TL.escapeHtml(book.title) + '" loading="lazy" decoding="async" data-id="' + TL.escapeHtml(book.id) + '" onerror="TL.coverFallback(this)">';
    }
    return TL.coverArtHtml(book, seed);
  };
})();