/**
 * build-drive-links.gs — Google Apps Script
 * ============================================================================
 * PURPOSE
 *   Scans a (shared) Google Drive folder full of scanned card images named
 *   like  <base>A.jpg  (front)  and  <base>B.jpg  (back), pairs them up by
 *   their shared <base>, and writes a spreadsheet of Drive share links with
 *   one row per card:  Base | Front Filename | Front URL | Back Filename | Back URL
 *
 *   The Front URL / Back URL columns are what you map to "File 1" (front) and
 *   "File 2" (back) on metadb's "Configure Field Settings" screen when you
 *   ingest the collection. The URL format below is the one metadb's image
 *   proxy understands (it extracts the file id via  /\/d\/([A-Za-z0-9-_]+)/  —
 *   see src/app/api/images/proxy/route.ts).
 *
 *   Side letter is case-insensitive: *A.jpg or *a.jpg = front, *B.jpg / *b.jpg
 *   = back. .jpeg is also accepted.
 *
 * ----------------------------------------------------------------------------
 * ONE-TIME SETUP  (do this each time you need to (re)generate the sheet)
 *
 *   1. Create or open the Google Sheet that should hold the output.
 *        (The script writes to whichever TAB is active when you run it and
 *         overwrites its contents — see step 5.)
 *
 *   2. In that Sheet:  Extensions ▸ Apps Script.
 *
 *   3. Delete the stub in Code.gs and paste the ENTIRE contents of this file.
 *      (Editor ▸ save. The file name inside Apps Script doesn't matter.)
 *
 *   4. Open the Drive folder in the browser and copy its whole URL from the
 *      address bar (e.g. https://drive.google.com/drive/folders/XXXX?usp=...).
 *      Paste it into FOLDER below. (A bare folder id works too — the script
 *      pulls the id out of whatever you paste.)
 *      Works for both My Drive folders and Shared Drive folders, as long as
 *      the account running the script can see the folder.
 *
 *   5. Click into the sheet TAB you want the output written to (it writes to
 *      the currently active tab and overwrites its contents).
 *
 *   6. Run the function `buildDriveLinks` (pick it in the toolbar dropdown,
 *      click Run). The FIRST run asks you to authorize — grant the Drive +
 *      Sheets permissions it requests. (You are authorizing as YOURSELF, using
 *      your own access to the folder — no service account involved here.)
 *
 *   7. When it finishes you'll get a toast + a Logger summary
 *      (View ▸ Logs / Executions) reporting how many complete pairs it found
 *      and how many files were unmatched or skipped.
 *
 *   8. Import/paste those columns into your ingest spreadsheet, then in metadb
 *      map Front URL → File 1 and Back URL → File 2.
 *
 * ----------------------------------------------------------------------------
 * NOTES / GOTCHAS
 *   - Pairing is by EXACT <base> match. If a front and its back have different
 *     base strings (e.g. inconsistent zero-padding: _001A.jpg vs _0001B.jpg),
 *     they will NOT pair — they'll each show up as a front-only / back-only row
 *     (see INCLUDE_UNMATCHED) and be counted in the summary so you can spot it.
 *   - Only files DIRECTLY in the folder are scanned (not subfolders).
 *   - Files whose names don't end in [AaBb].jpg/.jpeg are skipped and counted.
 *   - Generating a link does NOT change sharing/permissions. metadb fetches the
 *     image via its service account, so that account must have access to the
 *     folder for thumbnails to render — this script does not touch that.
 * ============================================================================
 */

// ===== CONFIG =================================================================
// Paste the whole Drive folder URL here (a bare folder id also works):
const FOLDER = 'PASTE_SHARED_DRIVE_FOLDER_URL_HERE';

// Emit rows for fronts-without-backs and backs-without-fronts too (with the
// missing side left blank), so nothing is silently dropped. Set false to emit
// only complete front+back pairs.
const INCLUDE_UNMATCHED = true;
// =============================================================================


function buildDriveLinks() {
  if (!FOLDER || FOLDER.indexOf('PASTE_') === 0) {
    throw new Error('Set FOLDER at the top of the script to your Drive folder URL (or id) first.');
  }

  const folder = DriveApp.getFolderById(extractFolderId(FOLDER));
  const files = folder.getFiles();

  // base -> { front: {name, id} | null, back: {name, id} | null }
  const pairs = {};
  let skipped = 0, dupes = 0;

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();

    // <base><side>.jpg|.jpeg  — side A/a = front, B/b = back (case-insensitive).
    const m = name.match(/^(.+)([ab])\.jpe?g$/i);
    if (!m) { skipped++; continue; }

    const base = m[1];
    const slot = m[2].toLowerCase() === 'a' ? 'front' : 'back';

    if (!pairs[base]) pairs[base] = { front: null, back: null };
    if (pairs[base][slot]) {
      dupes++;
      Logger.log('WARNING: duplicate ' + slot + ' for base "' + base + '": ' + name +
                 ' (keeping first: ' + pairs[base][slot].name + ')');
      continue;
    }
    pairs[base][slot] = { name: name, id: file.getId() };
  }

  const rows = [['Base', 'Front Filename', 'Front URL', 'Back Filename', 'Back URL']];
  const bases = Object.keys(pairs).sort();
  let complete = 0, frontOnly = 0, backOnly = 0;

  bases.forEach(function (base) {
    const p = pairs[base];
    const hasF = !!p.front, hasB = !!p.back;

    if (hasF && hasB) complete++;
    else if (hasF) frontOnly++;
    else backOnly++;

    if (!INCLUDE_UNMATCHED && !(hasF && hasB)) return;

    rows.push([
      base,
      hasF ? p.front.name : '',
      hasF ? driveUrl(p.front.id) : '',
      hasB ? p.back.name : '',
      hasB ? driveUrl(p.back.id) : ''
    ]);
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.setFrozenRows(1);

  const summary =
    complete + ' complete pairs · ' +
    frontOnly + ' front-only · ' +
    backOnly + ' back-only · ' +
    skipped + ' skipped (name not *[AaBb].jpg) · ' +
    dupes + ' duplicate sides. Output on "' + sheet.getName() + '".';
  Logger.log(summary);
  try { ss.toast(summary, 'build-drive-links', 12); } catch (e) { /* toast only works when bound to a Sheet */ }
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
