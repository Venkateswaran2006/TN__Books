/* =====================================================================
   TNPSC Study Library — PDF reader (reader.html)
   Uses PDF.js with lazy, spooled page rendering.
   ===================================================================== */
(function () {
  'use strict';

  const TL = window.TL;

  const MIN_ZOOM = 40;
  const MAX_ZOOM = 300;
  const ZOOM_STEP = 10;
  const KEEP_RANGE = 3;          // pages kept rendered around current page
  const PDF_PROXY = 'pdfjs/pdf.min.js';

  let DATA = null;
  let BOOK = null;
  let pdfDoc = null;
  let pdfjs = null;

  let layoutW = 0;               // layout content width (fit target)
  let zoom = 100;                // percent
  let pages = [];                // {view} viewport(scale 1) per page
  let pageTops = [];             // absolute top (px) per page
  let pageEls = [];              // dom refs
  let canvases = {};             // index -> canvas element
  let renderTasks = {};
  let destroyed = false;

  let pageTextCache = {};
  let search = { query: '', matches: [], index: -1, ended: true, token: 0 };

  const refs = {};

  /* ---------------------------------------------------------------- */

  function grabRefs() {
    refs.app = TL.$('#readerApp');
    refs.title = TL.$('#rdTitle');
    refs.sub = TL.$('#rdSub');
    refs.backBtn = TL.$('#backBtn');
    refs.searchBtn = TL.$('#searchBtn');
    refs.moreBtn = TL.$('#moreBtn');
    refs.moreMenu = TL.$('#moreMenu');
    refs.fullBtn = TL.$('#fullBtn');
    refs.scroller = TL.$('#scroller');
    refs.spool = TL.$('#spool');
    refs.loading = TL.$('#loadingPanel');
    refs.spinnerText = TL.$('#spinnerText');
    refs.error = TL.$('#errorPanel');
    refs.noPdf = TL.$('#noPdfPanel');
    refs.noPdfTitle = TL.$('#noPdfTitle');
    refs.zoomOut = TL.$('#zoomOut');
    refs.zoomIn = TL.$('#zoomIn');
    refs.zoomLevel = TL.$('#zoomLevel');
    refs.fitBtn = TL.$('#fitBtn');
    refs.prevBtn = TL.$('#prevBtn');
    refs.nextBtn = TL.$('#nextBtn');
    refs.pageInput = TL.$('#pageInput');
    refs.totalLabel = TL.$('#totalLabel');
    refs.searchForm = TL.$('#searchForm');
    refs.searchInput = TL.$('#searchInput');
    refs.searchClose = TL.$('#searchClose');
    refs.searchPrev = TL.$('#searchPrev');
    refs.searchNext = TL.$('#searchNext');
    refs.searchStatus = TL.$('#searchStatus');
    refs.menuSource = TL.$('#menuSource');
    refs.fullBtn2 = TL.$('#fullBtn2');
  }

  /* ---------------------------------------------------------------- */

  function show(id, show) { refs[id].style.display = show ? '' : 'none'; }

  function showOnly(panel) {
    ['loading', 'error', 'noPdf'].forEach(function (p) {
      show(p, p === panel);
    });
    const spoolControls = panel === null;
    refs.spool.style.display = spoolControls ? '' : 'none';
    if (refs.scroller) refs.scroller.style.display = spoolControls ? '' : 'none';
  }

  function errorPanel(title, message, openUrl) {
    showOnly('error');
    const el = refs.error;
    el.innerHTML =
      '<span class="emoji" aria-hidden="true">\u{1f4f4}</span>' +
      '<strong>' + TL.escapeHtml(title) + '</strong>' +
      '<p>' + TL.escapeHtml(message) + '</p>' +
      '<button type="button" class="btn btn-primary" onclick="location.reload()">Try again</button>' +
      (TL.safeUrl(openUrl)
        ? '<button type="button" class="btn btn-ghost js-open-pdf">Open PDF</button>'
        : '');
    const openBtn = TL.$('.js-open-pdf', el);
    if (openBtn) openBtn.addEventListener('click', function () { TL.openExternal(openUrl); });
  }

  function noPdfPanel() {
    showOnly('noPdf');
    refs.noPdfTitle.textContent = BOOK ? BOOK.title : 'Book';
    const source = officialSource();
    const srcBtn = TL.$('#noPdfSource');
    srcBtn.style.display = source ? '' : 'none';
    srcBtn.addEventListener('click', function () { TL.openExternal(source); });
    const backBtn = TL.$('#noPdfBack');
    backBtn.addEventListener('click', function () { goBack(); });
  }

  function officialSource() {
    if (!BOOK) return (DATA && DATA.app.officialSourceUrl) || '';
    return TL.safeUrl(BOOK.sourceUrl) || (DATA && DATA.app.officialSourceUrl) || '';
  }

  /* ---------------------------------------------------------------- */

  function goBack() {
    if (BOOK && BOOK.classId) {
      window.location.href = 'library.html?standard=' + encodeURIComponent(BOOK.classId);
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'library.html';
    }
  }

  function saveHistory() {
    if (!BOOK) return;
    const current = currentPageNumber();
    if (!current) return;
    TL.saveHistory(BOOK.id, current, {
      title: BOOK.title + (BOOK.volume ? ' ' + BOOK.volume : ''),
      className: BOOK.className,
      cover: BOOK.cover,
    });
  }

  const saveHistoryDebounced = TL.debounce(saveHistory, 500);

  /* current page index (0-based) based on scroll position */
  function currentIndex() {
    const st = refs.scroller.scrollTop;
    const probe = st + refs.scroller.clientHeight * 0.35;
    let lo = 0, hi = pageTops.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (pageTops[mid] <= probe) { ans = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    return ans;
  }

  function currentPageNumber() { return currentIndex() + 1; }

  function layout() {
    if (!pdfDoc) return;
    const spoolW = Math.min(refs.scroller.clientWidth, 900);
    layoutW = spoolW;
    rebuildLayout();
  }

  function effScale(i) {
    const page = pages[i];
    if (!page) return 1;
    return (layoutW / page.view.width) * (zoom / 100);
  }

  function rebuildLayout() {
    // update inline sizes + tops
    let top = 0;
    pageTops = [];
    pages.forEach(function (p, i) {
      const scale = effScale(i);
      const h = p.view.height * scale;
      const el = pageEls[i];
      el.style.width = Math.round(p.view.width * scale) + 'px';
      el.style.height = Math.round(h) + 'px';
      el.style.marginTop = (i === 0 ? 0 : 10) + 'px';
      pageTops.push(top);
      top += h + (i < pages.length - 1 ? 10 : 0);
    });
    refs.spool.style.display = '';
  }

  function viewportFor(i) {
    const page = pages[i];
    return page.view.clone({ scale: effScale(i) });
  }

  async function renderPage(i, dpr) {
    if (destroyed) return;
    if (i < 0 || i >= pages.length) return;
    if (renderTasks[i]) return;
    const el = pageEls[i];
    if (!el) return;
    const dprUse = dpr || Math.min(window.devicePixelRatio || 1, 2);
    const viewport = viewportFor(i);

    let canvas = canvases[i];
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';
      el.innerHTML = '';
      el.appendChild(canvas);
      canvases[i] = canvas;
    } else {
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';
    }
    canvas.width = Math.floor(viewport.width * dprUse);
    canvas.height = Math.floor(viewport.height * dprUse);

    const ctx = canvas.getContext('2d');
    const task = pdfDoc.getPage(i + 1).then(function (pdfPage) {
      const renderTask = pdfPage.render({
        canvasContext: ctx,
        viewport: viewport,
        transform: dprUse !== 1 ? [dprUse, 0, 0, dprUse, 0, 0] : null,
      });
      renderTasks[i] = renderTask;
      return renderTask.promise.then(function () {
        renderTasks[i] = null;
      }).catch(function () {
        renderTasks[i] = null;
      });
    });
    // if getPage itself throws, clear the pending marker
    task.catch(function () { renderTasks[i] = null; });
  }

  function destroyPage(i) {
    if (renderTasks[i]) {
      try { renderTasks[i].cancel(); } catch (e) { /* ignore */ }
      renderTasks[i] = null;
    }
    const canvas = canvases[i];
    if (canvas) {
      canvas.remove();
      canvases[i] = null;
      pageEls[i].innerHTML = '';
    }
  }

  function reconcile() {
    if (!pdfDoc || destroyed) return;
    const cur = currentIndex();
    const lo = Math.max(0, cur - KEEP_RANGE);
    const hi = Math.min(pages.length - 1, cur + KEEP_RANGE);
    for (let i = 0; i < pages.length; i++) {
      if (i < lo || i > hi) destroyPage(i);
    }
    for (let i = lo; i <= hi; i++) renderPage(i);
  }

  /* ---- scroll monitor ---- */
  let scrollPending = false;
  function onScroll() {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(function () {
      scrollPending = false;
      if (!pdfDoc || destroyed) return;
      const cur = currentIndex();
      const pageNo = cur + 1;
      refs.pageInput.value = String(pageNo);
      refs.totalLabel.textContent = ' / ' + pdfDoc.numPages;
      reconcile();
      saveHistoryDebounced();
    });
  }

  /* ---------------------------------------------------------------- */

  function setZoom(next, keepPageIndex) {
    const anchorTop = refs.scroller.scrollTop;
    const curIdx = keepPageIndex != null ? keepPageIndex : currentIndex();
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(next)));
    rebuildLayout();
    refs.zoomLevel.textContent = zoom + '%';
    // keep the current page roughly in view
    const target = (curIdx >= 0 && pageTops[curIdx] != null) ? pageTops[curIdx] : anchorTop;
    refs.scroller.scrollTop = target || 0;
    reconcile();
  }

  function zoomLabel() { return zoom + '%'; }

  function gotoPage(pageNo) {
    if (!pdfDoc) return;
    const idx = Math.min(pages.length - 1, Math.max(0, pageNo - 1));
    refs.scroller.scrollTop = pageTops[idx] || 0;
    reconcile();
    saveHistory();
  }

  function toggleMenu(forceClose) {
    const visible = refs.moreMenu.style.display !== 'none';
    const next = (forceClose ? true : !visible);
    refs.moreMenu.style.display = next ? 'none' : '';
  }

  function toggleSearch(force) {
    const el = TL.$('#searchPanel');
    if (!el) return;
    const visible = el.style.display !== 'none';
    const nextOpen = force != null ? force : !visible;
    el.style.display = nextOpen ? '' : 'none';
    if (nextOpen && !search.query) {
      refs.searchInput.value = '';
      refs.searchStatus.textContent = '';
      setTimeout(function () { refs.searchInput.focus(); }, 30);
    }
  }

  /* ---- fullscreen ---- */
  function fullscreenEl() { return refs.app; }

  function toggleFullscreen() {
    const el = fullscreenEl();
    if (document.fullscreenElement === el) {
      document.exitFullscreen().catch(function () { /* ignore */ });
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(function () { /* ignore */ });
    } else {
      try { el.webkitRequestFullscreen(); } catch (e) { /* ignore */ }
    }
  }

  function syncFullIcon() {
    const active = document.fullscreenElement === fullscreenEl();
    refs.fullBtn.innerHTML = active ? TL.ICONS.fullscreenExit : TL.ICONS.fullscreen;
    refs.fullBtn.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  }

  /* ---------------------------------------------------------------- */

  async function loadDocument() {
    showOnly('loading');
    refs.spinnerText.textContent = 'Loading book\u2026';
    try {
      pdfDoc = await pdfjs.getDocument({
        url: TL.safeUrl(BOOK.pdfUrl),
        isEvalSupported: false,
        onProgress: function (p) {
          if (p.total) {
            const pct = Math.min(100, Math.round((p.loaded / p.total) * 100));
            refs.spinnerText.textContent = 'Loading book\u2026 ' + pct + '%';
          }
        },
      }).promise;
    } catch (err) {
      errorPanel('Unable to load this book.', 'This PDF cannot be embedded here. Use Open PDF to view it.', TL.safeUrl(BOOK.pdfUrl));
      return;
    }

    pages = [];
    pageEls = [];
    canvases = {};
    pageTops = [];

    for (let i = 0; i < pdfDoc.numPages; i++) {
      let view;
      try {
        const p = await pdfDoc.getPage(i + 1);
        view = p.getViewport({ scale: 1 });
      } catch (e) {
        view = { width: 600, height: 800 };
      }
      pages.push({ view: view });
      const el = document.createElement('div');
      el.className = 'spool-page';
      el.setAttribute('aria-label', 'Page ' + (i + 1));
      el.setAttribute('data-index', String(i));
      refs.spool.appendChild(el);
      pageEls.push(el);
    }

    refs.totalLabel.textContent = ' / ' + pdfDoc.numPages;
    refs.pageInput.max = String(pdfDoc.numPages);
    showOnly(null);

    layout();

    // jump to last read page
    const history = TL.loadHistory();
    let startPage = 1;
    if (history && history.bookId === BOOK.id && history.pageNumber) {
      startPage = Math.min(pdfDoc.numPages, Math.max(1, history.pageNumber));
    }
    setTimeout(function () {
      gotoPage(startPage);
      reconcile();
    }, 30);
  }

  function ensurePdfjs() {
    return new Promise(function (resolve, reject) {
      if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
      const s = document.createElement('script');
      s.src = PDF_PROXY;
      s.onload = function () {
        if (window.pdfjsLib) resolve(window.pdfjsLib);
        else reject(new Error('pdfjs failed'));
      };
      s.onerror = function () { reject(new Error('pdfjs unreachable')); };
      document.head.appendChild(s);
    });
  }

  /* ---- search ----------------------------------------------------- */

  async function pageText(i) {
    const n = i + 1;
    if (pageTextCache[n]) return pageTextCache[n];
    const p = await pdfDoc.getPage(n);
    const tc = await p.getTextContent();
    const txt = tc.items.map(function (it) { return it.str || ''; }).join(' ');
    pageTextCache[n] = txt;
    return txt;
  }

  async function runSearch(query, token) {
    search.query = query;
    search.matches = [];
    search.index = -1;
    search.ended = false;
    refs.searchStatus.textContent = 'Searching\u2026';

    const lower = query.toLowerCase();
    let found = 0;
    for (let i = 0; i < pages.length; i++) {
      if (token !== search.token || destroyed) return;
      let txt;
      try { txt = await pageText(i); } catch (e) { continue; }
      let from = 0;
      let hit;
      while ((hit = txt.toLowerCase().indexOf(lower, from)) !== -1) {
        search.matches.push(i + 1);
        from = hit + lower.length;
        if (search.matches.length >= 500) break;
      }
      found += search.matches.length;
      if (i % 5 === 0) {
        refs.searchStatus.textContent = 'Searching\u2026 ' + (i + 1) + '/' + pages.length;
        await new Promise(function (r) { setTimeout(r, 0); });
      }
    }
    if (token !== search.token) return;
    search.ended = true;
    if (search.matches.length) {
      refs.searchStatus.textContent = search.matches.length + ' match' + (search.matches.length === 1 ? '' : 'es');
      gotoSearchMatch(0);
    } else {
      refs.searchStatus.textContent = 'No matches for \u201c' + query + '\u201d';
    }
  }

  function gotoSearchMatch(offset) {
    if (!search.matches.length) return;
    const n = search.matches.length;
    search.index = (search.index + offset + n) % n;
    gotoPage(search.matches[search.index]);
    refs.searchStatus.textContent = 'Match ' + (search.index + 1) + ' of ' + n;
  }

  function mountSearch() {
    if (!refs.searchForm) return;
    refs.searchForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      const q = refs.searchInput.value.trim();
      if (!q) return;
      search.token++;
      runSearch(q, search.token);
    });
    refs.searchInput.addEventListener('input', TL.debounce(function () {
      const q = refs.searchInput.value.trim();
      if (q && q !== search.query) {
        search.token++;
        runSearch(q, search.token);
      } else if (!q) {
        search.token++;
        search.matches = [];
        search.index = -1;
        refs.searchStatus.textContent = '';
      }
    }, 350));
    refs.searchPrev.addEventListener('click', function () { gotoSearchMatch(-1); });
    refs.searchNext.addEventListener('click', function () { gotoSearchMatch(1); });
  }

  /* ---------------------------------------------------------------- */

  function wireControls() {
    refs.backBtn.addEventListener('click', goBack);

    refs.zoomOut.addEventListener('click', function () { setZoom(zoom - ZOOM_STEP); });
    refs.zoomIn.addEventListener('click', function () { setZoom(zoom + ZOOM_STEP); });
    refs.fitBtn.addEventListener('click', function () { setZoom(100); });
    refs.fitBtn.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setZoom(100); }
    });
    refs.zoomLevel.addEventListener('click', function () { setZoom(100); });

    refs.pageInput.addEventListener('change', function () {
      const n = parseInt(refs.pageInput.value, 10);
      if (!isNaN(n)) gotoPage(Math.min(pdfDoc.numPages, Math.max(1, n)));
    });

    refs.prevBtn.addEventListener('click', function () { gotoPage(currentPageNumber() - 1); });
    refs.nextBtn.addEventListener('click', function () { gotoPage(currentPageNumber() + 1); });

    refs.fullBtn.addEventListener('click', toggleFullscreen);
    if (refs.fullBtn2) refs.fullBtn2.addEventListener('click', function () { toggleMenu(true); toggleFullscreen(); });
    document.addEventListener('fullscreenchange', syncFullIcon);

    refs.searchBtn.addEventListener('click', function () { toggleSearch(); });
    if (refs.searchClose) refs.searchClose.addEventListener('click', function () { toggleSearch(false); });
    refs.moreBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      toggleMenu();
    });
    document.addEventListener('click', function (ev) {
      if (refs.moreMenu && refs.moreMenu.style.display !== 'none' && !refs.moreMenu.contains(ev.target) && ev.target !== refs.moreBtn) {
        toggleMenu(true);
      }
    });
    refs.menuSource.addEventListener('click', function () {
      toggleMenu(true);
      TL.openExternal(officialSource());
    });

    TL.initThemeToggle();
  }

  /* ---------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    TL.initTheme();
    TL.initOffline();
    TL.initServiceWorker();
    grabRefs();
    wireControls();

    const id = TL.getParams().get('id');
    if (!TL.isValidBookId(id)) {
      errorPanel('Book not found.', 'This book link seems to be invalid.', '');
      return;
    }

    TL.loadData().then(function (data) {
      DATA = data;
      BOOK = TL.findBook(data, id);
      if (!BOOK) {
        window.location.replace('library.html');
        return;
      }
      if (BOOK.pdfUrl) {
        window.location.replace(BOOK.pdfUrl);
        return;
      }

      refs.scroller.addEventListener('scroll', onScroll);
      window.addEventListener('resize', TL.debounce(function () {
        if (!destroyed && pdfDoc) layout();
      }, 200));

      window.addEventListener('pagehide', function () {
        destroyed = true;
        Object.keys(renderTasks).forEach(function (k) {
          try { renderTasks[k].cancel(); } catch (e) { /* ignore */ }
        });
        if (pdfDoc) { try { pdfDoc.destroy(); } catch (e) { /* ignore */ } }
      });

      ensurePdfjs()
        .then(function (lib) {
          pdfjs = lib;
          pdfjs.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.min.js';
          if (!navigator.onLine) {
            errorPanel('You\u2019re offline.', 'Please connect to the internet to read this book.', officialSource());
            return;
          }
          loadDocument();
          mountSearch();
        })
        .catch(function () {
          errorPanel('Reading is unavailable right now.', 'The PDF reader could not be initialised.', officialSource());
        });
    }).catch(function () {
      errorPanel('Unable to load this book.', 'The library data could not be loaded.', '');
    });
  });
})();