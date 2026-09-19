/**
 * Dev tooling: regenerates data/books.json + assets/covers/*.svg
 *
 * Run:  node tools/generate-books.cjs   (from the project root)
 *
 * The approved 2026–27 New Syllabus book list lives below (Tamil Medium ONLY).
 * The Google Drive file IDs are the ones supplied for this project — the
 * generator never invents URLs. Keep the table here and in check.cjs in sync.
 *
 * Cover SVG files are light-weight placeholders. Drop real cover images into
 * assets/covers/<class>/ and update the "cover" field whenever available.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const YEAR = '2026-27';
const VERIFIED = '2026-09-19';
const SOURCE = 'https://www.tntextbooks.in/p/school-books.html?m=1';
const MEDIUM = 'Tamil Medium';

/* --------------------------------------------------------------------- */
/* Subject catalog                                                        */
/*   relevance: only meaningful for 11th/12th (high | basic)              */
/* --------------------------------------------------------------------- */

const SUBJECT_THEMES = {
  tamil:     { name: 'Tamil',             a: '#D97706', b: '#92400E' },
  maths:     { name: 'Mathematics',       a: '#3B82F6', b: '#1D4ED8' },
  science:   { name: 'Science',           a: '#14B8A6', b: '#0F766E' },
  social:    { name: 'Social Science',    a: '#EF4444', b: '#991B1B' },
  pe:        { name: 'Physical Education', a: '#0EA5E9', b: '#155E75' },
  history:   { name: 'History',           a: '#9F1239', b: '#4C0519', relevance: 'high' },
  geography: { name: 'Geography',         a: '#0EA5E9', b: '#075985', relevance: 'high' },
  economics: { name: 'Economics',         a: '#22C55E', b: '#14532D', relevance: 'high' },
  political: { name: 'Political Science', a: '#6366F1', b: '#312E81', relevance: 'high' },
  physics:   { name: 'Physics',           a: '#06B6D4', b: '#164E63', relevance: 'basic' },
  chemistry: { name: 'Chemistry',         a: '#10B981', b: '#064E3B', relevance: 'basic' },
  botany:    { name: 'Botany',            a: '#4ADE80', b: '#14532D', relevance: 'basic' },
  zoology:   { name: 'Zoology',           a: '#F59E0B', b: '#78350F', relevance: 'basic' },
};

const DEFAULT_THEME = { name: 'Book', a: '#3B82F6', b: '#1E3A8A' };

/* --------------------------------------------------------------------- */
/* Approved 2026–27 book plan (Tamil Medium only)                         */
/*   item = [slug, driveFileId, volume?]                                  */
/* --------------------------------------------------------------------- */

const PLAN = [
  {
    id: '6', name: '6th Standard', section: 'school', structure: 'terms',
    groups: [
      {
        id: '6-t1', name: 'Term 1', items: [
          ['tamil', '1qpcfleoHROxIrZ8rastenjROAHcFSh0I'],
          ['maths', '1a2cjzkMTSC1yXxPH-X3nvm0yXxhKYEaS'],
          ['science', '1HeN_3ffnP9A3LsQ8aq8UKtOg-Yf5mumb'],
          ['social', '1xz06ozIbOQT4LyUlKj5-ik12VFYIRFKC'],
        ],
      },
      {
        id: '6-t2', name: 'Term 2', items: [
          ['tamil', '1uWGQ0gcI0PLygQoeTLZ4eR89ov1Xe1ke'],
          ['maths', '1tgN9ejhtBWPcFzZR8_bJ8waqeJIC4PuX'],
          ['science', '1z8NtNrp0uqYsNSVLCVwCnLrW5uJB7pvc'],
          ['social', '1Q87SpVWx0D64OAnuM7goGASkPCRIIpBG'],
        ],
      },
      {
        id: '6-t3', name: 'Term 3', items: [
          ['tamil', '1OI4lSN0EqO1yHSuaMR2wuS8kNWscvy_X'],
          ['maths', '14pP6nnWIpEons5XFlg1P5KJvGOSDa76j'],
          ['science', '1V6nnO3ARfkAcSS6Emrt3g8eyAyY4QJqW'],
          ['social', '1rSWywqBgNDqQRFabnYECq6o73YleuOoa'],
        ],
      },
    ],
  },
  {
    id: '7', name: '7th Standard', section: 'school', structure: 'terms',
    groups: [
      {
        id: '7-t1', name: 'Term 1', items: [
          ['tamil', '1f1P6f7AB9-k12AnHix7M2z0Zy2dERSBV'],
          ['maths', '1GUfYf_snY2kd5LVN81V15E1Vxtnj6sse'],
          ['science', '1HJ34uBhBcXcYYVLBP3MP0y7UPZDEHDA5'],
          ['social', '18c2c4DhrponI63IPPbniA-fqdvZB_whC'],
        ],
      },
      {
        id: '7-t2', name: 'Term 2', items: [
          ['tamil', '1IvIPrpxpgZn15jmn_Um1gWCMDX_VyVxm'],
          ['maths', '1GZbFWcjO24kvO-1jocR6LmS6f3PZ0wSe'],
          ['science', '1irDvwgqKUcEs2FvKRD_lOzxJRk0IXNmw'],
          ['social', '1LGe8DxtAJ4d2J5PDbhyig1g_y0ibjAWn'],
        ],
      },
      {
        id: '7-t3', name: 'Term 3', items: [
          ['tamil', '1eks90EpMJGvb_NfiR_olAl-Ecz1os1XM'],
          ['maths', '1FnM_uDZWGovT-c_QpiyUjEcuIZr4VsUG'],
          ['science', '1s0z8bTMTNFckoc1JhDzXj3jWPyhDoZIc'],
          ['social', '1x9o_BQ94A-bkMkV5rgd9h8pgnhd0x5Lj'],
        ],
      },
    ],
  },
  {
    id: '8', name: '8th Standard', section: 'school', structure: 'subjects',
    groups: [
      {
        id: '8-all', name: 'All Subjects', items: [
          ['tamil', '1gZL_2CXBM-40x6Lo2ctp6tBs-VOFOpyS'],
          ['maths', '10pGDBigsvjO_ch_yQnCY8M3O6Uf06Yvb'],
          ['science', '1mUXCIMEOnSgzYcE3raERFupaQo87Avj9'],
          ['social', '1RAwJzAzsK2rtuf5jgxbl4b-wEqseh8J7'],
          ['pe', '1GBKomudfbyDycpOPOamsfkpUbOyRS-P9'],
        ],
      },
    ],
  },
  {
    id: '9', name: '9th Standard', section: 'school', structure: 'subjects',
    groups: [
      {
        id: '9-all', name: 'All Subjects', items: [
          ['tamil', '1IqE9XzrctCmKUX-o4UjMFgiAZh8BKmup'],
          ['maths', '1gp6z1UOuqoH6MCuZt_qNi492R3vZUWaj'],
          ['science', '1qjiZG4GOIfW5dmsNW-iwmPDmiVuxWrzM'],
          ['social', '1JdytKDzqXFJU1MFfa-sSkb7T6u8rmDBU'],
        ],
      },
    ],
  },
  {
    id: '10', name: '10th Standard', section: 'school', structure: 'subjects',
    groups: [
      {
        id: '10-all', name: 'All Subjects', items: [
          ['tamil', '126HDzwgKz1gNaSXWJSow2upisHXVe57-'],
          ['maths', '1BLAJHjMzbBuYesS2qL6NDEl7Tf3xmNBC'],
          ['science', '16mbZtP_8H902it-bbWOAzOZ58bPpgqFL'],
          ['social', '1gT8-P5oMKwVw3rcMN0JdWhW9iei00qKs'],
          ['pe', '1y9MF6Vr5TdQZMWLfwqDVVrZjO8pnUtpv'],
        ],
      },
    ],
  },
  {
    id: '11', name: '11th Standard', section: 'higher-secondary', structure: 'subjects',
    groups: [
      {
        id: '11-high', name: 'High Relevance', items: [
          ['history', '1Q5yFFyNyDpnqlludG5bDvfUB5l5snRkg'],
          ['geography', '1fXOw8QblfLUe1y1oaag8I16985Mqyefc'],
          ['economics', '1k7A2SMULxhsIEH7Wu0c4HKYKhVGIo6DC'],
          ['political', '1gxhGnM6_N-nW3n-aa2RuPuXxYnlM0Hpm'],
        ],
      },
      {
        id: '11-basic', name: 'Basic Reference', items: [
          ['physics', '1AbZJV35jGduoQoVHoXnKzIstFRqHMUGv', 1],
          ['physics', '1UOqpYez_8C4LwDqlHyB-Gr7t6bM_HTG-', 2],
          ['chemistry', '1E-uNMxAkhjmqT6WxZlYZ9nWuw40wwZBJ', 1],
          ['chemistry', '1RhqNvf0-9gr5F6CPv55Gg53kUIqR-hWp', 2],
          ['botany', '1PWhHAuDQ1wKk-pFrCCBKhQxNnoz4uPZ5'],
          ['zoology', '1vUlm-LD0AQMPG3AKpxURDk08sAFbONSE'],
        ],
      },
    ],
  },
  {
    id: '12', name: '12th Standard', section: 'higher-secondary', structure: 'subjects',
    groups: [
      {
        id: '12-high', name: 'High Relevance', items: [
          ['history', '1xTzHWDRSt-yrBI1OWXXfSpb7mMFhC1vj'],
          ['geography', '1JvmY3Q6aIK29Tz11Ci5iwyk72k39hY6-'],
          ['economics', '19_O1kokpJiN_7CdPlA2wddNTe1Gs3kPc'],
          ['political', '18Gdrs13T8ZsWiGB2GA8y7EqG-0mGrj4X'],
        ],
      },
      {
        id: '12-basic', name: 'Basic Reference', items: [
          ['physics', '14FUtTFH7mSh2JXLzITGD5B2ZQ_AV0JpN', 1],
          ['physics', '1NLTmtWajs8ddggYND5vOwPdNvp2ENbj7', 2],
          ['chemistry', '1rTqMSG006EbBr3VJS70Cdkc9HOq2Emk_', 1],
          ['chemistry', '1JF-l39S7d9zsml5n32oGmGFku2Id4MbR', 2],
          ['botany', '1K7bJ4ugqYfnj-yj-rY3KwNZnNM94hPYg'],
          ['zoology', '1wqwHobasDzct80YtalPH_ME3DIOesfgz'],
        ],
      },
    ],
  },
];

/* --------------------------------------------------------------------- */
/* Book builders                                                          */
/* --------------------------------------------------------------------- */

function themeOf(slug) {
  return SUBJECT_THEMES[slug] || DEFAULT_THEME;
}

function coverPath(cls, slug) {
  return `assets/covers/${cls}/${slug}.svg`;
}

function mkBook(cls, g, item) {
  const [slug, fileId, volume] = item;
  const theme = themeOf(slug);
  const relevance = cls.section === 'higher-secondary'
    ? (theme.relevance || 'basic')
    : 'relevant';
  const idBase = cls.structure === 'terms' ? g.id : cls.id;
  const book = {
    id: `${idBase}-${slug}${volume ? '-v' + volume : ''}`,
    title: theme.name,
    subject: theme.name,
    medium: MEDIUM,
    academicYear: YEAR,
    edition: 'Current',
    relevance,
    pdfUrl: `https://drive.google.com/file/d/${fileId}/view`,
    sourceUrl: SOURCE,
    cover: coverPath(cls.id, slug),
    lastVerified: VERIFIED,
  };
  if (volume) book.volume = `Volume ${volume}`;
  return book;
}

function buildClass(cfg) {
  const groups = cfg.groups.map((g) => ({
    id: g.id,
    name: g.name,
    books: g.items.map((item) => mkBook(cfg, g, item)),
  }));
  const out = {
    id: cfg.id,
    name: cfg.name,
    section: cfg.section,
    structure: cfg.structure,
  };
  out[cfg.structure === 'terms' ? 'terms' : 'subjects'] = groups;
  return out;
}

/* --------------------------------------------------------------------- */
/* Cover SVG placeholders                                                 */
/* --------------------------------------------------------------------- */

function svgEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function yearShort() {
  return YEAR.replace('-', '\u2013'); // 2026–27 (en dash)
}

function coverSvg(cls, slug) {
  const theme = themeOf(slug);
  const name = theme.name;
  const initial = name.charAt(0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560" role="img" aria-label="${svgEscape(name)} cover placeholder">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.a}"/>
      <stop offset="1" stop-color="${theme.b}"/>
    </linearGradient>
  </defs>
  <rect width="420" height="560" fill="url(#g)"/>
  <circle cx="360" cy="40" r="150" fill="#ffffff" opacity="0.08"/>
  <circle cx="30" cy="520" r="120" fill="#ffffff" opacity="0.06"/>
  <text x="60" y="90" font-family="Segoe UI, Arial, sans-serif" font-size="22" letter-spacing="4" fill="#ffffff" opacity="0.9">TNPSC STUDY LIBRARY</text>
  <text x="210" y="300" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="230" font-weight="700" fill="#ffffff">${svgEscape(initial)}</text>
  <text x="210" y="380" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="600" fill="#ffffff">${svgEscape(name)}</text>
  <line x1="150" y1="410" x2="270" y2="410" stroke="#ffffff" stroke-width="2" opacity="0.7"/>
  <text x="210" y="470" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="600" fill="#ffffff">${svgEscape(cfgName(cls))}</text>
  <text x="210" y="515" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#ffffff" opacity="0.9">${yearShort()}</text>
</svg>
`;
}

function cfgName(cls) {
  return `${cls} Standard`;
}

/* --------------------------------------------------------------------- */
/* Logo                                                                   */
/* --------------------------------------------------------------------- */

function logo() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="TNPSC Study Library">
  <defs>
    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3B82F6"/>
      <stop offset="1" stop-color="#6D28D9"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#lg)"/>
  <path d="M14 20c5-3 11-3 18 .5v24c-7-3.5-13-3.5-18-.5V20z" fill="#ffffff" opacity="0.95"/>
  <path d="M50 20c-5-3-11-3-18 .5v24c7-3.5 13-3.5 18-.5V20z" fill="#ffffff" opacity="0.7"/>
  <line x1="32" y1="20.5" x2="32" y2="44.5" stroke="#6D28D9" stroke-width="2"/>
</svg>
`;
}

/* --------------------------------------------------------------------- */
/* Write outputs                                                          */
/* --------------------------------------------------------------------- */

function write(pathname, content) {
  const abs = path.join(ROOT, pathname);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  return abs;
}

const app = {
  name: 'TNPSC Study Library',
  tagline: 'Current Tamil Nadu school books (New Syllabus 2026–27), Tamil Medium, for focused preparation.',
  currentAcademicYear: YEAR,
  lastUpdated: VERIFIED,
  officialSourceUrl: SOURCE,
  sourceLabel: 'TN Textbooks',
};

const classes = PLAN.map(buildClass);
const output = { app, classes };

// Defensive: validate IDs are unique.
const seen = new Set();
const allIds = [];
function walk(node) {
  if (node.id) {
    if (seen.has(node.id)) throw new Error(`Duplicate id: ${node.id}`);
    seen.add(node.id);
    allIds.push(node.id);
  }
  if (Array.isArray(node)) node.forEach(walk);
  else if (node && typeof node === 'object') Object.values(node).forEach(walk);
}
walk(output);

write('data/books.json', JSON.stringify(output, null, 2) + '\n');

// Cover placeholder SVGs + logo.
const coverSlugs = new Set();
classes.forEach((cls) => {
  const groups = cls.terms || cls.subjects;
  groups.forEach((g) => g.books.forEach((b) => coverSlugs.add(b.cover)));
});
coverSlugs.forEach((cover) => {
  const m = cover.match(/^assets\/covers\/(\d+)\/([a-z]+)\.svg$/);
  if (m) write(cover, coverSvg(m[1], m[2]));
});
write('assets/images/logo.svg', logo());

// Summary
const byClass = classes.map((c) => {
  const groups = c.terms || c.subjects;
  const count = groups.reduce((n, g) => n + g.books.length, 0);
  return `${c.id}: ${count} books`;
});
const totalBooks = classes.reduce(
  (sum, c) => sum + (c.terms || c.subjects).reduce((n, g) => n + g.books.length, 0),
  0
);
console.log('books.json written to data/books.json');
console.log(`Total books: ${totalBooks}`);
console.log(`Cover SVGs:   ${coverSlugs.size}`);
console.log(byClass.join('\n'));