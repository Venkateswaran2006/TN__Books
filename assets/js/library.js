/* =====================================================================
   TNPSC Study Library — library page (library.html)
   Direct Google Drive book access with standard & term navigation.
   ===================================================================== */
(function () {
  'use strict';

  const TL = window.TL;

  let DATA = null;              // loaded books.json
  let FLAT = [];                // flattened books
  let state = {
    standard: null,
    group: null,
    query: '',
    medium: 'all',
    relevances: [],
    year: 'all',
    subject: null,
  };

  /* ---------- element refs ---------- */
  const refs = {};

  function grab() {
    refs.classChips = TL.$('#classChips');
    refs.groupTabs = TL.$('#groupTabs');
    refs.resultLine = TL.$('#resultLine');
    refs.bookGrid = TL.$('#bookGrid');
    refs.emptyState = TL.$('#emptyState');
    refs.searchInput = TL.$('#searchInput');
    refs.filterBtn = TL.$('#filterBtn');
    refs.filterCount = TL.$('#filterCount');
    refs.filterSheet = TL.$('#filterSheet');
    refs.filterClose = TL.$('#filterClose');
    refs.btnApply = TL.$('#filterApply');
    refs.btnReset = TL.$('#filterReset');
    refs.subLine = TL.$('#subLine');
  }

  /* ---------- helpers ---------- */

  function classById(id) {
    return TL.getClassData(DATA.classes, id);
  }

  function groupsOf(cls) {
    return (cls && (cls.terms || cls.subjects)) || [];
  }

  function yearOptions() {
    const set = {};
    FLAT.forEach(function (b) { set[b.academicYear] = true; });
    return Object.keys(set).sort().reverse();
  }

  function subjectOptions() {
    const set = {};
    FLAT.forEach(function (b) { if (b.subject) set[b.subject] = true; });
    return Object.keys(set).sort();
  }

  function mediumsInData() {
    const set = {};
    FLAT.forEach(function (b) { if (b.medium) set[b.medium] = true; });
    return Object.keys(set).sort();
  }

  function passes(book) {
    if (state.medium !== 'all' && book.medium !== state.medium) return false;
    if (state.subject && book.subject !== state.subject) return false;
    if (book.academicYear && state.year !== 'all' && book.academicYear !== state.year) return false;
    if (state.relevances.length && state.relevances.indexOf(book.relevance) === -1) return false;
    return true;
  }

  function queryMatches(book, q) {
    if (!q) return true;
    const hay = [
      book.title, book.subject, book.medium, book.academicYear,
      book.className, book.classId, book.standard, book.groupName, book.volume,
    ].join(' ').toLowerCase();
    return q.split(/\s+/).every(function (t) { return hay.indexOf(t) !== -1; });
  }

  function relevanceLabel(r) {
    return { high: 'High Relevance ⭐', basic: 'Basic Concepts', relevant: 'Relevant' }[r] || r;
  }

  function updateUrlQuery() {
    if (!window.history || !window.history.replaceState) return;
    const p = new URLSearchParams();
    if (state.standard) p.set('standard', state.standard);
    if (state.group && state.group !== 'all') p.set('term', state.group);
    const newUrl = window.location.pathname + (p.toString() ? '?' + p.toString() : '');
    window.history.replaceState(null, '', newUrl);
  }

  /* ---------- search ---------- */

  function doSearch() {
    const q = state.query.trim().toLowerCase();
    if (!q) {
      renderGrid();
      return;
    }
    const results = FLAT.filter(function (b) {
      return queryMatches(b, q) && passes(b);
    });
    renderResultSet(results, 'Search: ' + state.query.trim(), results.length + ' ' + (results.length === 1 ? 'book' : 'books') + ' found');
  }

  /* ---------- rendering ---------- */

  function renderChips() {
    const parts = [];
    DATA.classes.forEach(function (cls) {
      if (cls.section === 'higher-secondary' && parts.length && parts[parts.length - 1].indexOf('chip-divider') === -1) {
        parts.push('<span class="chip-divider" role="separator"></span>');
      }
      const active = String(cls.id) === String(state.standard) ? ' active' : '';
      parts.push('<button type="button" class="chip' + active + '" data-standard="' + TL.escapeHtml(cls.id) + '" aria-pressed="' + (String(cls.id) === String(state.standard)) + '">' + TL.escapeHtml(cls.name) + '</button>');
    });
    refs.classChips.innerHTML = parts.join('');
  }

  function renderTabs() {
    const cls = classById(state.standard);
    const groups = groupsOf(cls);
    if (!groups.length || groups.length <= 1) {
      refs.groupTabs.innerHTML = '';
      refs.groupTabs.style.display = 'none';
      state.group = groups.length === 1 ? groups[0].id : null;
      return;
    }
    refs.groupTabs.style.display = '';

    const validIds = ['all'].concat(groups.map(function (g) { return g.id; }));
    if (!state.group || validIds.indexOf(state.group) === -1) {
      state.group = cls.structure === 'terms' ? groups[0].id : 'all';
    }

    const tabItems = [];
    if (cls.structure === 'terms') {
      groups.forEach(function (g) {
        tabItems.push({ id: g.id, name: g.name });
      });
      tabItems.push({ id: 'all', name: 'All Terms' });
    } else {
      tabItems.push({ id: 'all', name: 'All Books' });
      groups.forEach(function (g) {
        tabItems.push({ id: g.id, name: g.name });
      });
    }

    refs.groupTabs.innerHTML = tabItems.map(function (t) {
      const active = t.id === state.group ? ' active' : '';
      return '<button type="button" class="tab' + active + '" data-group="' + TL.escapeHtml(t.id) + '" aria-pressed="' + (t.id === state.group) + '">' + TL.escapeHtml(t.name) + '</button>';
    }).join('');
  }

  function booksForStandard() {
    const cls = classById(state.standard);
    if (!cls) return [];
    const groups = groupsOf(cls);
    let list = [];
    groups.forEach(function (g) {
      if (!state.group || state.group === 'all' || g.id === state.group) {
        list = list.concat((g.books || []).map(function (b) {
          return Object.assign({}, b, {
            classId: cls.id,
            className: cls.name,
            groupId: g.id,
            groupName: g.name,
          });
        }));
      }
    });
    return list;
  }

  function renderResultSet(list, heading, note) {
    const shown = list.filter(passes);
    if (shown.length) {
      refs.bookGrid.hidden = false;
      refs.emptyState.hidden = true;
      refs.bookGrid.innerHTML = shown.map(bookCardHtml).join('');

      TL.$$('.book-card', refs.bookGrid).forEach(function (card) {
        card.addEventListener('click', function () {
          const id = card.getAttribute('data-id');
          const book = TL.findBook(DATA, id);
          if (book) {
            TL.saveHistory(book.id, 1, {
              title: book.title,
              className: book.className,
              cover: book.cover,
            });
          }
        });
      });
    } else {
      refs.bookGrid.hidden = true;
      refs.emptyState.hidden = false;
      refs.emptyState.innerHTML =
        '<span class="emoji" aria-hidden="true">\u{1f4dc}</span>' +
        ((state.query.trim()) ? '<strong>No matching books found.</strong><p>Try a different subject, standard, or clear the filters.</p>' : '<strong>No books here yet.</strong><p>This section has no books for the selected filters.</p>');
    }
    const line = heading || '';
    refs.resultLine.innerHTML =
      '<span>' + TL.escapeHtml(line) + '</span><span>' + note + '</span>';
  }

  function renderGrid() {
    if (state.query.trim()) {
      doSearch();
      return;
    }
    const cls = classById(state.standard);
    const list = booksForStandard();
    const note = list.length + ' ' + (list.length === 1 ? 'book' : 'books');

    let heading = cls ? cls.name : '';
    if (cls && state.group && state.group !== 'all') {
      const groups = groupsOf(cls);
      const match = groups.find(function (g) { return g.id === state.group; });
      if (match) heading += ' \u2014 ' + match.name;
    }

    renderResultSet(list, heading, note);
  }

  function bookCardHtml(b) {
    const vol = b.volume ? ' ' + TL.escapeHtml(b.volume) : '';
    const groupBadge = (b.groupName && b.groupName !== b.title && b.groupName !== 'All Subjects')
      ? ' \u00b7 ' + TL.escapeHtml(b.groupName)
      : '';
    return (
      '<a class="book-card" href="' + TL.escapeHtml(b.pdfUrl) + '" target="_blank" rel="noopener noreferrer" data-id="' + TL.escapeHtml(b.id) + '" aria-label="' + TL.escapeHtml(b.title) + vol + ' - Open Google Drive">' +
        '<div class="cover-wrap">' +
          TL.coverHtml(b) +
          relFlagHtml(b) +
        '</div>' +
        '<div class="book-body">' +
          '<h3>' + TL.escapeHtml(b.title) + vol + '</h3>' +
          '<span class="sub">' + TL.escapeHtml(b.className) + groupBadge + '</span>' +
          '<span class="sub">' + TL.escapeHtml(b.medium) + '</span>' +
          '<span class="year">' + TL.formatYear(b.academicYear) + '</span>' +
        '</div>' +
        '<span class="btn btn-primary direct-btn" aria-hidden="true">Open Drive ' + TL.ICONS.open + '</span>' +
      '</a>'
    );
  }

  function relFlagHtml(b) {
    if (b.relevance === 'relevant') return '';
    const isHigh = b.relevance === 'high';
    const relClass = isHigh ? '' : ' opt';
    const text = isHigh ? 'High Relevance ⭐' : 'Basic Concepts';
    return '<span class="rel-flag' + relClass + '" title="' + TL.escapeHtml(text) + '">' + TL.escapeHtml(text) + '</span>';
  }

  /* ---------- filter sheet ---------- */

  function activeFilterCount() {
    let n = 0;
    if (state.medium !== 'all') n++;
    if (state.subject) n++;
    if (state.year !== 'all') n++;
    if (state.relevances.length) n++;
    return n;
  }

  function renderFilterSheet() {
    const f = refs.filterSheet;
    if (!f) return;
    const standards = DATA.classes.map(function (cls) {
      return '<button type="button" class="opt" data-f="standard" data-v="' + TL.escapeHtml(cls.id) + '" aria-pressed="' + (String(cls.id) === String(state.standard)) + '">' + TL.escapeHtml(cls.name) + '</button>';
    });
    const mediumOptions = ['all'].concat(mediumsInData());
    const mediums = mediumOptions.map(function (m) {
      return '<button type="button" class="opt" data-f="medium" data-v="' + TL.escapeHtml(m) + '" aria-pressed="' + (state.medium === m) + '">' + (m === 'all' ? 'All' : TL.escapeHtml(m)) + '</button>';
    });
    const years = ['all'].concat(yearOptions()).map(function (y) {
      return '<button type="button" class="opt" data-f="year" data-v="' + TL.escapeHtml(y) + '" aria-pressed="' + (String(state.year) === String(y)) + '">' + (y === 'all' ? 'All' : TL.formatYear(y)) + '</button>';
    });
    const relevances = ['high', 'basic', 'relevant'].map(function (r) {
      return '<button type="button" class="opt" data-f="relevance" data-v="' + r + '" aria-pressed="' + (state.relevances.indexOf(r) !== -1) + '">' + relevanceLabel(r) + '</button>';
    });
    const subjects = subjectOptions().map(function (s) {
      return '<button type="button" class="opt" data-f="subject" data-v="' + TL.escapeHtml(s) + '" aria-pressed="' + (state.subject === s) + '">' + TL.escapeHtml(s) + '</button>';
    });

    f.querySelector('.gs-standard .opt-row').innerHTML = standards.join('');
    f.querySelector('.gs-subject .opt-row').innerHTML = subjects.join('');
    f.querySelector('.gs-medium .opt-row').innerHTML = mediums.join('');
    f.querySelector('.gs-year .opt-row').innerHTML = years.join('');
    f.querySelector('.gs-relevance .opt-row').innerHTML = relevances.join('');
  }

  function applyFilter(field, value, pressed) {
    if (field === 'standard') {
      state.standard = value;
      state.group = null;
      renderAfterStateChange();
    } else if (field === 'medium') {
      state.medium = pressed ? value : 'all';
      TL.saveMediumFilter(state.medium);
      renderAfterStateChange();
    } else if (field === 'year') {
      state.year = pressed ? value : 'all';
      renderAfterStateChange();
    } else if (field === 'relevance') {
      if (pressed) {
        if (state.relevances.indexOf(value) === -1) state.relevances.push(value);
      } else {
        state.relevances = state.relevances.filter(function (x) { return x !== value; });
      }
      TL.saveRelevancePreference(state.relevances.slice());
      renderAfterStateChange();
    } else if (field === 'subject') {
      state.subject = pressed ? value : null;
      renderAfterStateChange();
    }
  }

  function renderAfterStateChange() {
    updateUrlQuery();
    renderChips();
    renderTabs();
    renderFilterSheet();
    updateFilterButton();
    renderGrid();
  }

  function updateFilterButton() {
    if (!refs.filterCount) return;
    const n = activeFilterCount();
    refs.filterCount.style.display = n ? 'inline-flex' : 'none';
    refs.filterCount.textContent = String(n);
  }

  function openSheet() {
    if (refs.filterSheet) refs.filterSheet.style.display = 'flex';
  }

  function closeSheet() {
    if (refs.filterSheet) refs.filterSheet.style.display = 'none';
  }

  function resetFilters() {
    state.medium = 'all';
    state.relevances = [];
    state.year = 'all';
    TL.saveMediumFilter('all');
    TL.saveRelevancePreference([]);
    renderAfterStateChange();
  }

  /* ---------- initialisation ---------- */

  function wireEvents() {
    refs.searchInput.addEventListener('input', TL.debounce(function () {
      state.query = refs.searchInput.value || '';
      renderGrid();
    }, 180));

    refs.classChips.addEventListener('click', function (ev) {
      const b = ev.target.closest('.chip');
      if (!b) return;
      state.standard = b.getAttribute('data-standard');
      state.group = null;
      state.subject = null;
      refs.searchInput.value = '';
      state.query = '';
      renderAfterStateChange();
    });

    refs.groupTabs.addEventListener('click', function (ev) {
      const b = ev.target.closest('.tab');
      if (!b) return;
      state.group = b.getAttribute('data-group');
      updateUrlQuery();
      renderTabs();
      renderGrid();
    });

    if (refs.filterBtn) refs.filterBtn.addEventListener('click', openSheet);
    if (refs.btnApply) refs.btnApply.addEventListener('click', closeSheet);
    if (refs.btnReset) refs.btnReset.addEventListener('click', resetFilters);
    if (refs.filterClose) refs.filterClose.addEventListener('click', closeSheet);

    if (refs.filterSheet) {
      refs.filterSheet.addEventListener('click', function (ev) {
        const b = ev.target.closest('.opt');
        if (!b) return;
        const field = b.getAttribute('data-f');
        const value = b.getAttribute('data-v');
        const pressed = b.getAttribute('aria-pressed') === 'true';
        applyFilter(field, value, !pressed);
      });
      refs.filterSheet.addEventListener('mousedown', function (ev) {
        if (ev.target === refs.filterSheet) closeSheet();
      });
    }

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        closeSheet();
      }
    });
  }

  const form = TL.$('#searchForm');
  if (form) form.addEventListener('submit', function (ev) { ev.preventDefault(); });

  document.addEventListener('DOMContentLoaded', function () {
    TL.initTheme();
    TL.initThemeToggle();
    TL.initOffline();
    TL.initServiceWorker();
    grab();

    TL.loadData().then(function (data) {
      DATA = data;
      FLAT = TL.flattenBooks(data.classes);
      state.relevances = TL.relevancePreference(data).slice();
      state.medium = TL.mediumFilter();
      if (['all'].concat(mediumsInData()).indexOf(state.medium) === -1) {
        state.medium = 'all';
      }

      const params = TL.getParams();
      const paramStd = params.get('standard');
      const paramGrp = params.get('term') || params.get('group');

      state.standard = classById(paramStd) ? paramStd : (DATA.classes.length ? DATA.classes[0].id : null);
      if (paramGrp) {
        state.group = paramGrp;
      }

      if (refs.subLine) {
        refs.subLine.textContent = 'Tamil Medium \u00b7 Academic year ' + TL.formatYear(data.app.currentAcademicYear) + ' \u00b7 ' + FLAT.length + ' books';
      }

      renderChips();
      renderTabs();
      renderFilterSheet();
      updateFilterButton();
      renderGrid();
      wireEvents();
    }).catch(function () {
      renderLoadError();
    });
  });

  function renderLoadError() {
    refs.bookGrid.hidden = true;
    refs.emptyState.hidden = false;
    refs.emptyState.innerHTML =
      '<span class="emoji" aria-hidden="true">\u26a0\ufe0f</span>' +
      '<strong>Unable to load the library.</strong>' +
      '<p>Please check your connection and try again.</p>' +
      '<button type="button" class="btn btn-primary" onclick="location.reload()">Try again</button>';
  }
})();