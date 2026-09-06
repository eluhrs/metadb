/**
 * build-drive-links.gs — Google Apps Script
 * ============================================================================
 * PURPOSE
 *   Scans a (shared) Google Drive folder of scanned card images named like
 *   <prefix><number>A.jpg (front) and <prefix><number>B.jpg (back), pairs
 *   front+back BY NUMBER, and writes one row per card:
 *
 *     Status | Base | Front Filename | Back Filename | Front URL | Back URL
 *
 *   You give it the FIRST card's full filename (which encodes the prefix, the
 *   starting number, and the zero-pad width). It then walks the sequence from
 *   that number up to the highest number found in the folder — so a card that
 *   is ENTIRELY absent still gets a row, flagged in the Status column. That is
 *   how you catch gaps instead of ending up with silently-missing lines.
 *
 *   Status column (col A), color-coded:
 *     ✅ OK                  front and back both present
 *     ❌ Missing back        front present, back absent
 *     ❌ Missing front       back present, front absent
 *     ❌ Base only (no A/B)  a <prefix><number>.jpg exists but has no A/B sides
 *                            (its LINK — not filename — goes in Front URL; the
 *                             Base column already shows its name)
 *     ❌ Missing card        nothing at all for that number in the sequence
 *
 *   Files that can't be placed in the sequence are appended at the bottom for
 *   review (not sequence positions), flagged in orange:
 *     ⚠️ Before first card   numbered below the first card's number
 *     ⚠️ Unrecognized name   name doesn't parse as <prefix><number>[A/B].jpg
 *     ⚠️ Wrong prefix        parses, but prefix differs from FIRST_FILENAME's
 *
 *   The Front URL / Back URL columns are what you map to "File 1" (front) and
 *   "File 2" (back) on metadb's "Configure Field Settings" screen when you
 *   ingest the collection. The URL format below is the one metadb's image
 *   proxy understands (it extracts the file id via /\/d\/([A-Za-z0-9-_]+)/ —
 *   see src/app/api/images/proxy/route.ts).
 *
 *   Front/back are matched by NUMERIC value, so inconsistent zero-padding
 *   (_001A.jpg vs _0001B.jpg) still pairs correctly. Side letter + extension
 *   are case-insensitive; .jpeg is accepted.
 *
 * ----------------------------------------------------------------------------
 * ONE-TIME SETUP  (do this each time you need to (re)generate the sheet)
 *
 *   1. Create or open the Google Sheet that should hold the output.
 *        (The script writes to whichever TAB is active when you run it and
 *         REPLACES its contents — see step 6.)
 *
 *   2. In that Sheet:  Extensions ▸ Apps Script.
 *
 *   3. Delete the stub in Code.gs and paste the ENTIRE contents of this file.
 *
 *   4. Open the Drive folder in the browser and copy its whole URL from the
 *      address bar (e.g. https://drive.google.com/drive/folders/XXXX?usp=...).
 *      Paste it into FOLDER below. (A bare folder id works too.) Works for My
 *      Drive and Shared Drive folders the running account can see.
 *
 *   5. Copy the FIRST card's full filename (e.g. AGROB_00001A.jpg) and paste it
 *      into FIRST_FILENAME below. This sets the prefix, the starting number,
 *      and the zero-pad width for the whole sequence. (Front or back sample is
 *      fine — only the prefix/number/width are used.)
 *
 *   6. Save the Apps Script project (disk icon / Ctrl+S), then RELOAD the
 *      spreadsheet browser tab. A "Drive Links" menu appears in the
 *      spreadsheet's own menu bar (next to File / Edit / View / ...).
 *
 *   7. Click into the sheet TAB you want the output on (it REPLACES that tab's
 *      contents), then run it:
 *        • Easiest — from the spreadsheet:  Drive Links ▸ Build front/back links
 *        • Or from the Apps Script editor:  select `buildDriveLinks` in the
 *          toolbar's function dropdown (it only appears after you save), Run.
 *      The FIRST run asks you to authorize — grant the Drive + Sheets access.
 *      (You authorize as YOURSELF, using your own access — no service account.)
 *
 *   8. Read the toast / Logger summary (View ▸ Logs) for the count of OK vs
 *      missing cards/fronts/backs. Scan col A for the red ❌ rows.
 *
 *   9. Import/paste the columns into your ingest spreadsheet, then in metadb
 *      map Front URL → File 1 and Back URL → File 2.
 *
 * ----------------------------------------------------------------------------
 * NOTES / GOTCHAS
 *   - The sequence END is the highest number found in the folder. If the LAST
 *     card(s) are entirely missing, the script can't know they should exist —
 *     if you know the true last number, set END_NUMBER below to force it.
 *   - Only files DIRECTLY in the folder are scanned (not subfolders).
 *   - A file named <prefix><number>.jpg with no A/B side is recognized as a
 *     "base only" file (not skipped) and flagged so you can tell it apart from
 *     a number that is truly absent.
 *   - Files that don't fit the sequence — a name that doesn't parse, or a prefix
 *     that differs from FIRST_FILENAME's — are appended at the bottom flagged
 *     "⚠️ Unrecognized name" / "⚠️ Wrong prefix" (with their link), so a
 *     mis-named card that belongs in the run isn't invisible.
 *   - Files numbered BEFORE the first card are appended at the bottom flagged
 *     "⚠️ Before first card" so nothing is hidden.
 *   - Generating a link does NOT change sharing/permissions. metadb fetches the
 *     image via its service account, so that account must have access to the
 *     folder for thumbnails to render — this script does not touch that.
 * ============================================================================
 */

// ===== CONFIG =================================================================
// Paste the whole Drive folder URL here (a bare folder id also works):
const FOLDER = 'PASTE_SHARED_DRIVE_FOLDER_URL_HERE';

// Paste the FIRST card's full filename (sets prefix + start number + padding):
const FIRST_FILENAME = 'PASTE_FIRST_CARD_FILENAME_HERE'; // e.g. AGROB_00001A.jpg

// Optional: force the last number in the sequence (catches trailing cards that
// are entirely missing from the folder). Leave 0 to auto-detect from the folder.
const END_NUMBER = 0;
// =============================================================================


/**
 * Adds a "Drive Links" menu to the spreadsheet so you can run the tool without
 * opening the Apps Script editor. Runs automatically when the sheet is opened;
 * reload the spreadsheet once after installing the script to make it appear.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Drive Links')
    .addItem('Build front/back links', 'buildDriveLinks')
    .addToUi();
}


function buildDriveLinks() {
  if (!FOLDER || FOLDER.indexOf('PASTE_') === 0) {
    throw new Error('Set FOLDER at the top of the script to your Drive folder URL (or id) first.');
  }
  if (!FIRST_FILENAME || FIRST_FILENAME.indexOf('PASTE_') === 0) {
    throw new Error("Set FIRST_FILENAME to the first card's full filename (e.g. AGROB_00001A.jpg).");
  }

  const first = parseName(FIRST_FILENAME);
  if (!first) {
    throw new Error('FIRST_FILENAME "' + FIRST_FILENAME +
                    '" is not of the form <prefix><number><A|B>.jpg');
  }
  const prefix = first.prefix;
  const width = first.width;
  const start = first.num;

  const folder = DriveApp.getFolderById(extractFolderId(FOLDER));
  const files = folder.getFiles();

  // numeric n -> { front: {name,id}|null, back: {name,id}|null }
  const seq = {};
  const beforeStart = {}; // n < start, surfaced separately
  const unrecognized = []; // files that don't fit the sequence at all, surfaced separately
  let maxNum = start, skipped = 0, otherPrefix = 0, dupes = 0;

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();

    const info = parseName(name);
    if (!info) {
      skipped++;
      unrecognized.push({ name: name, id: file.getId(), reason: 'Unrecognized name' });
      Logger.log('Unrecognized name (no <number>[A|B].jpg): ' + name);
      continue;
    }
    if (info.prefix !== prefix) {
      otherPrefix++;
      unrecognized.push({ name: name, id: file.getId(), reason: 'Wrong prefix' });
      Logger.log('Wrong prefix (expected "' + prefix + '"): ' + name);
      continue;
    }

    const bucket = info.num < start ? beforeStart : seq;
    if (info.num >= start && info.num > maxNum) maxNum = info.num;

    if (!bucket[info.num]) bucket[info.num] = { front: null, back: null, base: null };
    const slot = info.side === 'a' ? 'front' : (info.side === 'b' ? 'back' : 'base');
    if (bucket[info.num][slot]) {
      dupes++;
      Logger.log('WARNING: duplicate ' + slot + ' for number ' + info.num + ': ' + name +
                 ' (keeping first: ' + bucket[info.num][slot].name + ')');
      continue;
    }
    bucket[info.num][slot] = { name: name, id: file.getId() };
  }

  const end = (END_NUMBER && END_NUMBER >= start) ? END_NUMBER : maxNum;

  const BG_OK = '#d9ead3', BG_BAD = '#f4cccc', BG_BASE = '#fff2cc', BG_WARN = '#fce5cd';
  const rows = [['Status', 'Base', 'Front Filename', 'Back Filename', 'Front URL', 'Back URL']];
  const bg = []; // one [color] per data row, aligned with rows[1..]
  let ok = 0, missBack = 0, missFront = 0, missCard = 0, baseOnly = 0;

  for (let n = start; n <= end; n++) {
    const p = seq[n] || { front: null, back: null, base: null };
    const hasF = !!p.front, hasB = !!p.back, hasBase = !!p.base;

    // Front columns hold the A-side. For a base-only file (no A/B) we put only
    // its LINK in Front URL — the filename is omitted since it isn't really a
    // "front" and the Base column already shows its name.
    let status, color;
    let frontName = hasF ? p.front.name : '';
    let frontUrl = hasF ? driveUrl(p.front.id) : '';
    if (hasF && hasB)  { status = '✅ OK';            color = BG_OK;   ok++; }
    else if (hasF)     { status = '❌ Missing back';  color = BG_BAD;  missBack++; }
    else if (hasB)     { status = '❌ Missing front'; color = BG_BAD;  missFront++; }
    else if (hasBase)  { status = '❌ Base only (no A/B)'; color = BG_BASE; baseOnly++;
                         frontUrl = driveUrl(p.base.id); } // link only; filename omitted
    else               { status = '❌ Missing card';  color = BG_BAD;  missCard++; }

    rows.push([
      status,
      prefix + pad(n, width),
      frontName,
      hasB ? p.back.name : '',
      frontUrl,
      hasB ? driveUrl(p.back.id) : ''
    ]);
    bg.push([color]);
  }

  // Files numbered before the declared first card (shouldn't normally happen).
  const beforeKeys = Object.keys(beforeStart).map(Number).sort(function (a, b) { return a - b; });
  beforeKeys.forEach(function (n) {
    const p = beforeStart[n];
    const f = p.front || p.base; // fall back to a base-only file if that's all there is
    rows.push([
      '⚠️ Before first card',
      prefix + pad(n, width),
      p.front ? p.front.name : '', // omit filename for a base-only file (same rule as above)
      p.back ? p.back.name : '',
      f ? driveUrl(f.id) : '',
      p.back ? driveUrl(p.back.id) : ''
    ]);
    bg.push([BG_WARN]);
  });

  // Files that don't fit the sequence at all (bad name or wrong prefix). They
  // can't be placed at a number, so list them at the bottom (with link) for
  // review — a mis-named card that belongs in the run must not be invisible.
  unrecognized.forEach(function (u) {
    rows.push(['⚠️ ' + u.reason, '', u.name, '', driveUrl(u.id), '']);
    bg.push([BG_WARN]);
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  sheet.clear(); // wipe old values AND stale row colors from a previous run
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  if (bg.length) sheet.getRange(2, 1, bg.length, 1).setBackgrounds(bg);

  const problems = missCard + missFront + missBack + baseOnly + unrecognized.length;
  const summary =
    'Sequence ' + start + '–' + end + ': ' +
    ok + ' OK · ' +
    missCard + ' missing card · ' +
    baseOnly + ' base only · ' +
    missFront + ' missing front · ' +
    missBack + ' missing back' +
    (beforeKeys.length ? ' · ' + beforeKeys.length + ' before first' : '') +
    (skipped ? ' · ' + skipped + ' unrecognized name' : '') +
    (otherPrefix ? ' · ' + otherPrefix + ' wrong prefix' : '') +
    (dupes ? ' · ' + dupes + ' dup sides' : '') + '.';
  Logger.log(summary);
  try {
    ss.toast(summary, problems ? ('⚠️ ' + problems + ' problem(s)') : '✅ All OK', 15);
  } catch (e) { /* toast only works when bound to a Sheet */ }
}

/**
 * Parses <prefix><number><side>.jpg|.jpeg (side A/a=front, B/b=back).
 * Returns { prefix, num, width, side:'a'|'b' } or null if it doesn't match.
 * The number is the digit run immediately before the side letter, so its
 * length gives the zero-pad width and its value gives the sequence position.
 */
function parseName(name) {
  const s = String(name);
  // Front/back:  <prefix><number>A|B.jpg  (side letter + extension case-insensitive)
  let m = s.match(/^(.*?)(\d+)([ab])\.jpe?g$/i);
  if (m) return { prefix: m[1], num: parseInt(m[2], 10), width: m[2].length, side: m[3].toLowerCase() };
  // Base only (no side letter):  <prefix><number>.jpg
  m = s.match(/^(.*?)(\d+)\.jpe?g$/i);
  if (m) return { prefix: m[1], num: parseInt(m[2], 10), width: m[2].length, side: null };
  return null;
}

/** Left-pads a number with zeros to at least `width` digits (never truncates). */
function pad(n, width) {
  let s = String(n);
  while (s.length < width) s = '0' + s;
  return s;
}

/**
 * Accepts a full Drive folder URL or a bare id and returns the folder id.
 * Handles .../folders/<id>, ...?id=<id>, and open?id=<id> shapes.
 */
function extractFolderId(input) {
  const s = String(input).trim();
  const m = s.match(/\/folders\/([A-Za-z0-9_-]+)/) || s.match(/[?&]id=([A-Za-z0-9_-]+)/);
  return m ? m[1] : s;
}

/**
 * metadb-compatible Drive share link. The proxy extracts the id from the
 * "/d/<id>" segment, so this exact shape is what the ingest expects.
 */
function driveUrl(fileId) {
  return 'https://drive.google.com/file/d/' + fileId + '/view?usp=sharing';
}
