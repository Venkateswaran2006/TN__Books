/* =====================================================================
   TNPSC Study Library — home page (index.html)
   ===================================================================== */
(function () {
  'use strict';

  const TL = window.TL;

  function renderResume(data) {
    const wrap = TL.$('#resumeSection');
    if (!wrap) return;
    const history = TL.loadHistory();
    if (!history) {
      wrap.hidden = true;
      return;
    }
    const book = TL.findBook(data, history.bookId);
    if (!book) {
      wrap.hidden = true;
      return;
    }

    wrap.hidden = false;
    wrap.innerHTML =
      '<div class="section">' +
        '<div class="section-title"><h2>Recently Opened</h2>' +
          '<button type="button" class="btn btn-ghost js-clear-history">Clear</button>' +
        '</div>' +
        '<a class="resume-card" href="' + TL.escapeHtml(book.pdfUrl) + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="resume-cover">' + TL.coverHtml(book) + '</span>' +
          '<span class="resume-body">' +
            '<span class="kicker">Direct Drive Link</span>' +
            '<strong>' + TL.escapeHtml(book.title) + (book.volume ? ' ' + TL.escapeHtml(book.volume) : '') + '</strong>' +
            '<span class="meta">' + TL.escapeHtml(book.className) + ' \u00b7 Open Google Drive</span>' +
          '</span>' +
          '<span class="icon-btn" aria-hidden="true">' + TL.ICONS.open + '</span>' +
        '</a>' +
      '</div>';

    const clear = TL.$('.js-clear-history');
    if (clear) {
      clear.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        try { localStorage.removeItem('tl-history'); } catch (e) { /* ignore */ }
        wrap.hidden = true;
      });
    }
  }

  function classCardHtml(cls) {
    const groups = cls.terms || cls.subjects || [];
    let total = 0;
    groups.forEach(function (g) {
      total += (g.books || []).length;
    });

    let termsHtml = '';
    if (groups.length > 1) {
      termsHtml =
        '<div class="std-terms">' +
          groups.map(function (g) {
            return '<a class="term-pill" href="library.html?standard=' + encodeURIComponent(cls.id) + '&term=' + encodeURIComponent(g.id) + '">' + TL.escapeHtml(g.name) + '</a>';
          }).join('') +
        '</div>';
    }

    return (
      '<div class="std-card">' +
        '<a class="std-main-link" href="library.html?standard=' + encodeURIComponent(cls.id) + '">' +
          '<div class="std-head">' +
            '<span class="std-badge" aria-hidden="true">' + TL.escapeHtml(cls.id) + '</span>' +
            '<div>' +
              '<h3>' + TL.escapeHtml(cls.name) + '</h3>' +
              '<span class="count">' + total + ' books</span>' +
            '</div>' +
          '</div>' +
        '</a>' +
        termsHtml +
        '<a class="open-link" href="library.html?standard=' + encodeURIComponent(cls.id) + '">Browse standard ' + TL.ICONS.open + '</a>' +
      '</div>'
    );
  }

  function renderClasses(data) {
    const school = data.classes.filter(function (c) {
      return (c.section || 'school') !== 'higher-secondary';
    });
    const hs = data.classes.filter(function (c) {
      return c.section === 'higher-secondary';
    });

    const schoolGrid = TL.$('#schoolGrid');
    if (schoolGrid) schoolGrid.innerHTML = school.map(classCardHtml).join('');

    const hsGrid = TL.$('#hsGrid');
    const hsSection = TL.$('#hsSection');
    if (hsSection) hsSection.style.display = hs.length ? '' : 'none';
    if (hsGrid) hsGrid.innerHTML = hs.map(classCardHtml).join('');

    const count = TL.$('#libraryCount');
    if (count) {
      let total = 0;
      data.classes.forEach(function (c) {
        (c.terms || c.subjects || []).forEach(function (g) {
          total += (g.books || []).length;
        });
      });
      count.textContent = 'Academic year ' + TL.formatYear(data.app.currentAcademicYear) + ' \u00b7 ' + total + ' books';
    }
  }

  function renderError() {
    const wrap = TL.$('#main .container');
    if (!wrap) return;
    wrap.innerHTML =
      '<section class="empty">' +
        '<span class="emoji" aria-hidden="true">\u26a0\ufe0f</span>' +
        '<strong>Unable to load the library.</strong>' +
        '<p>Please check your connection and try again.</p>' +
        '<button type="button" class="btn btn-primary" onclick="location.reload()">Try again</button>' +
      '</section>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    TL.initTheme();
    TL.initThemeToggle();
    TL.initOffline();
    TL.initServiceWorker();

    TL.loadData().then(function (data) {
      const yearPill = TL.$('#yearPill');
      if (yearPill) {
        yearPill.textContent = 'Academic year ' + TL.formatYear(data.app.currentAcademicYear);
      }
      renderResume(data);
      renderClasses(data);
    }).catch(function () {
      renderError();
    });
  });
})();