/**
 * Dev tooling: sanity checks for the project data & assets.
 * Run: node tools/check.cjs   (from the project root)
 *
 * The approved 2026–27 Google Drive PDF list is embedded below so the check
 * fails if any book URL is missing, changed, or added out of spec.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = 'https://www.tntextbooks.in/p/school-books.html?m=1';
const TNT_BOOKS = 'https://www.textbooksonline.tn.nic.in/'; // old source must NOT be used

let failed = 0;

function ok(cond, msg) {
  if (cond) console.log('  \u2713 ' + msg);
  else { failed++; console.error('  \u2717 ' + msg); }
}

const raw = fs.readFileSync(path.join(ROOT, 'data', 'books.json'), 'utf8');
const books = JSON.parse(raw);

/* The full approved Google Drive list (2026–27 New Syllabus). */
const APPROVED = [
  // 6th – Term 1/2/3
  '6-t1-tamil', '6-t1-maths', '6-t1-science', '6-t1-social',
  '6-t2-tamil', '6-t2-maths', '6-t2-science', '6-t2-social',
  '6-t3-tamil', '6-t3-maths', '6-t3-science', '6-t3-social',
  // 7th – Term 1/2/3
  '7-t1-tamil', '7-t1-maths', '7-t1-science', '7-t1-social',
  '7-t2-tamil', '7-t2-maths', '7-t2-science', '7-t2-social',
  '7-t3-tamil', '7-t3-maths', '7-t3-science', '7-t3-social',
  // 8th
  '8-tamil', '8-maths', '8-science', '8-social', '8-pe',
  // 9th
  '9-tamil', '9-maths', '9-science', '9-social',
  // 10th
  '10-tamil', '10-maths', '10-science', '10-social', '10-pe',
  // 11th
  '11-history', '11-geography', '11-economics', '11-political',
  '11-physics-v1', '11-physics-v2', '11-chemistry-v1', '11-chemistry-v2',
  '11-botany', '11-zoology',
  // 12th
  '12-history', '12-geography', '12-economics', '12-political',
  '12-physics-v1', '12-physics-v2', '12-chemistry-v1', '12-chemistry-v2',
  '12-botany', '12-zoology',
].map((id) => `https://drive.google.com/file/d/${FILE_IDS(id)}/view`);

/* The exact /view URL approved for a given book id (or null if unknown). */
function approvedUrlFor(id) {
  const fid = FILE_IDS(id);
  return fid ? `https://drive.google.com/file/d/${fid}/view` : null;
}

function FILE_IDS(id) {
  /* single source of drive ids, mirrored from generate-books.cjs */
  const m = {
    '6-t1-tamil': '1qpcfleoHROxIrZ8rastenjROAHcFSh0I',
    '6-t1-maths': '1a2cjzkMTSC1yXxPH-X3nvm0yXxhKYEaS',
    '6-t1-science': '1HeN_3ffnP9A3LsQ8aq8UKtOg-Yf5mumb',
    '6-t1-social': '1xz06ozIbOQT4LyUlKj5-ik12VFYIRFKC',
    '6-t2-tamil': '1uWGQ0gcI0PLygQoeTLZ4eR89ov1Xe1ke',
    '6-t2-maths': '1tgN9ejhtBWPcFzZR8_bJ8waqeJIC4PuX',
    '6-t2-science': '1z8NtNrp0uqYsNSVLCVwCnLrW5uJB7pvc',
    '6-t2-social': '1Q87SpVWx0D64OAnuM7goGASkPCRIIpBG',
    '6-t3-tamil': '1OI4lSN0EqO1yHSuaMR2wuS8kNWscvy_X',
    '6-t3-maths': '14pP6nnWIpEons5XFlg1P5KJvGOSDa76j',
    '6-t3-science': '1V6nnO3ARfkAcSS6Emrt3g8eyAyY4QJqW',
    '6-t3-social': '1rSWywqBgNDqQRFabnYECq6o73YleuOoa',
    '7-t1-tamil': '1f1P6f7AB9-k12AnHix7M2z0Zy2dERSBV',
    '7-t1-maths': '1GUfYf_snY2kd5LVN81V15E1Vxtnj6sse',
    '7-t1-science': '1HJ34uBhBcXcYYVLBP3MP0y7UPZDEHDA5',
    '7-t1-social': '18c2c4DhrponI63IPPbniA-fqdvZB_whC',
    '7-t2-tamil': '1IvIPrpxpgZn15jmn_Um1gWCMDX_VyVxm',
    '7-t2-maths': '1GZbFWcjO24kvO-1jocR6LmS6f3PZ0wSe',
    '7-t2-science': '1irDvwgqKUcEs2FvKRD_lOzxJRk0IXNmw',
    '7-t2-social': '1LGe8DxtAJ4d2J5PDbhyig1g_y0ibjAWn',
    '7-t3-tamil': '1eks90EpMJGvb_NfiR_olAl-Ecz1os1XM',
    '7-t3-maths': '1FnM_uDZWGovT-c_QpiyUjEcuIZr4VsUG',
    '7-t3-science': '1s0z8bTMTNFckoc1JhDzXj3jWPyhDoZIc',
    '7-t3-social': '1x9o_BQ94A-bkMkV5rgd9h8pgnhd0x5Lj',
    '8-tamil': '1gZL_2CXBM-40x6Lo2ctp6tBs-VOFOpyS',
    '8-maths': '10pGDBigsvjO_ch_yQnCY8M3O6Uf06Yvb',
    '8-science': '1mUXCIMEOnSgzYcE3raERFupaQo87Avj9',
    '8-social': '1RAwJzAzsK2rtuf5jgxbl4b-wEqseh8J7',
    '8-pe': '1GBKomudfbyDycpOPOamsfkpUbOyRS-P9',
    '9-tamil': '1IqE9XzrctCmKUX-o4UjMFgiAZh8BKmup',
    '9-maths': '1gp6z1UOuqoH6MCuZt_qNi492R3vZUWaj',
    '9-science': '1qjiZG4GOIfW5dmsNW-iwmPDmiVuxWrzM',
    '9-social': '1JdytKDzqXFJU1MFfa-sSkb7T6u8rmDBU',
    '10-tamil': '126HDzwgKz1gNaSXWJSow2upisHXVe57-',
    '10-maths': '1BLAJHjMzbBuYesS2qL6NDEl7Tf3xmNBC',
    '10-science': '16mbZtP_8H902it-bbWOAzOZ58bPpgqFL',
    '10-social': '1gT8-P5oMKwVw3rcMN0JdWhW9iei00qKs',
    '10-pe': '1y9MF6Vr5TdQZMWLfwqDVVrZjO8pnUtpv',
    '11-history': '1Q5yFFyNyDpnqlludG5bDvfUB5l5snRkg',
    '11-geography': '1fXOw8QblfLUe1y1oaag8I16985Mqyefc',
    '11-economics': '1k7A2SMULxhsIEH7Wu0c4HKYKhVGIo6DC',
    '11-political': '1gxhGnM6_N-nW3n-aa2RuPuXxYnlM0Hpm',
    '11-physics-v1': '1AbZJV35jGduoQoVHoXnKzIstFRqHMUGv',
    '11-physics-v2': '1UOqpYez_8C4LwDqlHyB-Gr7t6bM_HTG-',
    '11-chemistry-v1': '1E-uNMxAkhjmqT6WxZlYZ9nWuw40wwZBJ',
    '11-chemistry-v2': '1RhqNvf0-9gr5F6CPv55Gg53kUIqR-hWp',
    '11-botany': '1PWhHAuDQ1wKk-pFrCCBKhQxNnoz4uPZ5',
    '11-zoology': '1vUlm-LD0AQMPG3AKpxURDk08sAFbONSE',
    '12-history': '1xTzHWDRSt-yrBI1OWXXfSpb7mMFhC1vj',
    '12-geography': '1JvmY3Q6aIK29Tz11Ci5iwyk72k39hY6-',
    '12-economics': '19_O1kokpJiN_7CdPlA2wddNTe1Gs3kPc',
    '12-political': '18Gdrs13T8ZsWiGB2GA8y7EqG-0mGrj4X',
    '12-physics-v1': '14FUtTFH7mSh2JXLzITGD5B2ZQ_AV0JpN',
    '12-physics-v2': '1NLTmtWajs8ddggYND5vOwPdNvp2ENbj7',
    '12-chemistry-v1': '1rTqMSG006EbBr3VJS70Cdkc9HOq2Emk_',
    '12-chemistry-v2': '1JF-l39S7d9zsml5n32oGmGFku2Id4MbR',
    '12-botany': '1K7bJ4ugqYfnj-yj-rY3KwNZnNM94hPYg',
    '12-zoology': '1wqwHobasDzct80YtalPH_ME3DIOesfgz',
  };
  return m[id];
}

console.log('books.json — app metadata');
ok(books.app && books.app.name === 'TNPSC Study Library', 'app name');
ok(books.app.officialSourceUrl === SOURCE, `source is TN Textbooks (${SOURCE})`);
ok(!String(books.app.officialSourceUrl).includes('textbooksonline'), 'old textbooksonline URL not used');
ok(books.app.currentAcademicYear === '2026-27', 'academic year 2026–27');

console.log('books.json — structure');
ok(Array.isArray(books.classes) && books.classes.length === 7, 'has 7 classes');

const flat = [];
const ids = new Set();
const counts = {};
const schoolIds = [];
const hsIds = [];

books.classes.forEach((cls) => {
  const groups = cls.terms || cls.subjects;
  const hasTerms = Array.isArray(cls.terms);
  const hasSubs = Array.isArray(cls.subjects);
  ok(hasTerms !== hasSubs, `class ${cls.id} uses exactly one structure`);
  ok(['school', 'higher-secondary'].includes(cls.section), `class ${cls.id} has valid section`);
  ok(Array.isArray(groups) && groups.length, `class ${cls.id} (${cls.section}) has groups`);

  if (['6', '7'].includes(cls.id)) {
    ok(hasTerms && groups.length === 3, `class ${cls.id} has 3 terms`);
  }
  if (['8', '9', '10'].includes(cls.id)) {
    ok(hasSubs && !hasTerms, `class ${cls.id} is subject-wise (no old term books)`);
    ok(groups.length === 1 && groups[0].name === 'All Subjects', `class ${cls.id} shows "All Subjects"`);
  }

  groups.forEach((g) => {
    ok(g.id && g.name && Array.isArray(g.books), `group ${g.id} well formed`);
    g.books.forEach((b) => {
      flat.push(assignClass(b, cls));
      counts[cls.id] = (counts[cls.id] || 0) + 1;
      (cls.section === 'school' ? schoolIds : hsIds).push(b.id);
      ok(!ids.has(b.id), `unique id ${b.id}`);
      ids.add(b.id);
      ok(/^[a-z0-9][a-z0-9-]{0,63}$/.test(b.id), `${b.id} has a valid id format`);
      ok(b.title && b.subject, `${b.id} has title + subject`);
      ok(b.medium === 'Tamil Medium', `${b.id} medium is Tamil Medium`);
      ok(['relevant', 'high', 'basic'].includes(b.relevance), `${b.id} valid relevance (${b.relevance})`);
      ok(b.academicYear === '2026-27', `${b.id} academic year 2026–27`);
      ok(typeof b.pdfUrl === 'string' && b.pdfUrl.length > 0, `${b.id} has a PDF URL`);
      ok(/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(b.pdfUrl), `${b.id} pdfUrl is a Google Drive /view link`);
      ok(!!approvedUrlFor(b.id), `${b.id} is listed in the approved drive-id table`);
      ok(b.pdfUrl === approvedUrlFor(b.id), `${b.id} pdfUrl matches its own approved id`);
      ok(APPROVED.includes(b.pdfUrl), `${b.id} pdfUrl is on the approved list`);
      ok(b.sourceUrl === SOURCE, `${b.id} sourceUrl = TN Textbooks`);
    });
  });
});

/* map book into a flattened book w/ class info */
function assignClass(b, cls) {
  const o = Object.assign({}, b, { classId: (cls.terms ? cls.terms[0] : cls.subjects[0]).id });
  if (cls.id && cls.id[0]) o.standard = `${cls.id}th Standard`;
  return o;
}

console.log('books.json — book counts');
const EXPECTED = { '6': 12, '7': 12, '8': 5, '9': 4, '10': 5, '11': 10, '12': 10 };
Object.keys(EXPECTED).forEach((k) => ok(counts[k] === EXPECTED[k], `class ${k} has exactly ${EXPECTED[k]} books`));
ok(flat.length === 58, `total 58 books (found ${flat.length})`);
ok(schoolIds.length === 38, 'school section has 38 books');
ok(hsIds.length === 20, 'higher-secondary section has 20 books');

console.log('books.json — no unwanted content');
ok(!/2019/i.test(raw), 'no 2019 (old) term-wise books');
ok(!/english/i.test(raw.replace(/"medium": "Tamil Medium"/g, '')), 'no English-medium books');
ok(flat.every((b) => !/t1|t2|t3/.test(b.id) || /^[67]-t[123]-/.test(b.id)), 'old term ids removed (only 6/7 terms remain)');

console.log('books.json — 11th/12th subject sets');
[['11', '11th'], ['12', '12th']].forEach(([cls, label]) => {
  const subs = flat.filter((b) => b.id.startsWith(cls + '-'));
  const subjects = subs.map((b) => `${b.subject}${b.volume ? ' ' + b.volume : ''}`).sort();
  ok(subjects.includes('History'), `${label} has History`);
  ok(subjects.includes('Geography'), `${label} has Geography`);
  ok(subjects.includes('Economics'), `${label} has Economics`);
  ok(subjects.includes('Political Science'), `${label} has Political Science`);
  ok(subjects.includes('Physics Volume 1') && subjects.includes('Physics Volume 2'), `${label} has Physics V1 + V2`);
  ok(subjects.includes('Chemistry Volume 1') && subjects.includes('Chemistry Volume 2'), `${label} has Chemistry V1 + V2`);
  ok(subjects.includes('Botany') && subjects.includes('Zoology'), `${label} has Botany + Zoology`);
  ok(!subjects.includes('Biology'), `${label} has no fake "Biology" book`);
  ok(subs.filter((b) => b.relevance === 'high').length === 4, `${label} has 4 High Relevance books`);
  ok(subs.filter((b) => b.relevance === 'basic').length === 6, `${label} has 6 Basic Reference books`);
});

console.log('covers');
flat.forEach((b) => {
  ok(fs.existsSync(path.join(ROOT, b.cover)), `cover exists: ${b.cover}`);
  ok(b.cover.startsWith('assets/covers/'), `${b.id} cover path under assets/covers`);
});

console.log('special assets');
['assets/images/logo.svg', 'assets/images/icon-192.png', 'assets/images/icon-512.png',
  'pdfjs/pdf.min.js', 'pdfjs/pdf.worker.min.js', 'manifest.json', 'robots.txt',
  'assets/css/style.css', 'assets/css/reader.css',
  'assets/js/utils.js', 'assets/js/app.js', 'assets/js/library.js', 'assets/js/reader.js',
].forEach((f) => ok(fs.existsSync(path.join(ROOT, f)), `exists: ${f}`));

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
ok(manifest.icons && manifest.icons.length, 'manifest has icons');
manifest.icons.forEach((ic) => {
  const src = ic.src.replace(/^\.?\//, '');
  ok(fs.existsSync(path.join(ROOT, src)), `manifest icon exists: ${ic.src}`);
});

console.log('');
console.log(`Total books: ${flat.length}`);
console.log(failed ? `FAILED checks: ${failed}` : 'All checks passed.');