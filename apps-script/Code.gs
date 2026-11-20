// Departmental Clash Bowling - backend. Paste this whole file into Extensions > Apps Script.
// STAFF PIN: staff type this once on each device. Everyone else can only watch the Lanes board.
// Change it before you deploy. Leave it empty ('') to let anyone with the site link check people in.
var PIN = 'CHANGE_ME_BEFORE_DEPLOY';

// Shared rules. Runs inside Google Apps Script (the server) and in the browser (demo mode and tests).
var Logic = (function () {
  var CAP = 8, COMP = [1, 2, 3, 4], CASUAL = 5;
  var FIELDS = ['name', 'dept', 'status', 'mode', 'stage', 'lane', 'r1', 'r2', 'fin', 'cons', 'guest', 'late', 'at', 'extras'];
  var ROUNDS = ['checkin', 'r1', 'r2', 'final', 'done'];
  function blank(id, name, dept, guest) {
    return { id: id, name: name, dept: dept || '', status: 'registered', mode: null, stage: null, lane: null, r1: null, r2: null, fin: null, cons: null, guest: !!guest, late: false, at: null, extras: 0 };
  }
  function laneCount(st, n) {
    var c = 0; st.players.forEach(function (p) { if (p.status === 'in' && p.lane === n && p.stage !== 'done') c++; }); return c;
  }
  function pickLane(st, mode) {
    var i, n, round = st.cfg.round;
    if (round !== 'checkin' && mode === 'compete') {
      for (i = 0; i < 2; i++) { n = [3, 4][i]; if (laneCount(st, n) < CAP) return n; }
      return laneCount(st, CASUAL) < CAP ? CASUAL : null;
    }
    if (mode === 'compete') { for (i = 0; i < COMP.length; i++) if (laneCount(st, COMP[i]) < CAP) return COMP[i]; return null; }
    if (laneCount(st, CASUAL) < CAP) return CASUAL;
    for (i = 3; i >= 0; i--) if (laneCount(st, COMP[i]) < CAP) return COMP[i];
    return null;
  }
  function find(st, id) { for (var i = 0; i < st.players.length; i++) if (st.players[i].id === id) return st.players[i]; return null; }
  function clean(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 80); }
  function newId(st, prefix) { var id; do { id = prefix + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); } while (find(st, id)); return id; }
  function setFields(p, f) {
    FIELDS.forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(f, k)) return;
      var v = f[k];
      if (k === 'name' || k === 'dept') v = clean(v);
      if (k === 'lane' || k === 'r1' || k === 'r2' || k === 'fin' || k === 'cons' || k === 'at') v = (v === null || v === '' || isNaN(v)) ? null : Number(v);
      if (k === 'guest' || k === 'late') v = !!v;
      if (k === 'extras') v = Math.max(0, Math.min(50, Math.round(Number(v) || 0)));
      p[k] = v;
    });
  }
  function apply(st, req) {
    var a = req.action, p, i;
    if (a === 'import') {
      var have = {}, added = 0, skipped = 0;
      st.players.forEach(function (x) { have[x.name.toLowerCase()] = x; });
      (req.people || []).slice(0, 300).forEach(function (q, i2) {
        var nm = clean(q.name), dp = clean(q.dept); if (!nm) return;
        var ex = have[nm.toLowerCase()];
        if (ex) { if (!ex.dept && dp) ex.dept = dp; skipped++; return; }
        var np = blank(newId(st, 'p') + i2, nm, dp, false); st.players.push(np); have[nm.toLowerCase()] = np; added++;
      });
      return { added: added, skipped: skipped };
    }
    if (a === 'checkin') {
      p = find(st, req.id); if (!p) return { error: 'missing' };
      if (p.status === 'in') return { error: 'already', lane: p.lane };
      var mode = req.mode === 'relax' ? 'relax' : 'compete', lane = pickLane(st, mode);
      if (lane == null) return { error: 'full' };
      var late = st.cfg.round !== 'checkin' && mode === 'compete';
      p.extras = Math.max(0, Math.min(50, Math.round(Number(req.extras) || 0)));
      p.status = 'in'; p.mode = mode; p.lane = lane; p.late = late; p.at = Date.now();
      p.stage = mode === 'relax' ? 'relax' : (st.cfg.round === 'checkin' ? 'bowl' : 'cons');
      return { id: p.id, name: p.name, extras: p.extras, lane: lane, mode: mode, stage: p.stage, late: late };
    }
    if (a === 'addguest') {
      var nm2 = clean(req.name); if (!nm2) return { error: 'name' };
      var ex2 = null; st.players.forEach(function (x) { if (x.name.toLowerCase() === nm2.toLowerCase()) ex2 = x; });
      if (ex2) return { id: ex2.id, existing: true };
      var g = blank(newId(st, 'g'), nm2, req.dept, true); st.players.push(g); return { id: g.id };
    }
    if (a === 'update') { p = find(st, req.id); if (!p) return { error: 'missing' }; setFields(p, req.fields || {}); return { id: p.id }; }
    if (a === 'batch') {
      (req.updates || []).forEach(function (u) { var q = find(st, u.id); if (q) setFields(q, u.fields || {}); });
      if (req.round && ROUNDS.indexOf(req.round) > -1) st.cfg.round = req.round;
      return { ok: true };
    }
    if (a === 'walkups') { st.cfg.walkups = Math.max(0, Math.min(500, Math.round(Number(req.n) || 0))); return { ok: true }; }
    if (a === 'remove') { st.players = st.players.filter(function (x) { return x.id !== req.id; }); return { ok: true }; }
    if (a === 'setround') { if (ROUNDS.indexOf(req.round) < 0) return { error: 'round' }; st.cfg.round = req.round; return { ok: true }; }
    if (a === 'reset') {
      st.players.forEach(function (x) { x.status = 'registered'; x.mode = null; x.stage = null; x.lane = null; x.r1 = null; x.r2 = null; x.fin = null; x.cons = null; x.late = false; x.at = null; x.extras = 0; });
      st.players = st.players.filter(function (x) { return !x.guest; }); // late adds are dropped on reset; the registered list stays
      st.cfg.round = 'checkin'; st.cfg.walkups = 0; return { ok: true };
    }
    return { error: 'unknown' };
  }
  return { CAP: CAP, blank: blank, laneCount: laneCount, pickLane: pickLane, apply: apply, FIELDS: FIELDS };
})();

// ================= Google Sheet storage and web endpoints =================
var COLS = ['id', 'name', 'dept', 'status', 'mode', 'stage', 'lane', 'r1', 'r2', 'fin', 'cons', 'guest', 'late', 'at', 'extras'];
var NUMS = { lane: 1, r1: 1, r2: 1, fin: 1, cons: 1, at: 1, extras: 1 };

function sheet_(name, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, header.length).setValues([header]);
  return sh;
}
function readState_() {
  var sh = sheet_('Players', COLS), cs = sheet_('Config', ['key', 'value']);
  var rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, COLS.length).getValues() : [];
  var players = rows.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    var p = {};
    COLS.forEach(function (c, i) {
      var v = r[i];
      if (c === 'guest' || c === 'late') p[c] = (v === true || v === 'TRUE');
      else if (NUMS[c]) p[c] = (v === '' || v === null) ? null : Number(v);
      else p[c] = (v === '') ? (c === 'name' || c === 'dept' || c === 'id' ? '' : null) : String(v);
    });
    return p;
  });
  var round = 'checkin', walkups = 0;
  if (cs.getLastRow() >= 2) { var v = String(cs.getRange(2, 2).getValue() || ''); if (v) round = v; }
  if (cs.getLastRow() >= 3) walkups = Number(cs.getRange(3, 2).getValue()) || 0;
  players.forEach(function (p) { p.extras = p.extras || 0; });
  return { players: players, cfg: { round: round, walkups: walkups } };
}
function safe_(v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }
function writeState_(st) {
  var sh = sheet_('Players', COLS), cs = sheet_('Config', ['key', 'value']);
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, COLS.length).clearContent();
  if (st.players.length) {
    sh.getRange(2, 1, st.players.length, COLS.length).setValues(st.players.map(function (p) {
      return COLS.map(function (c) { var v = p[c]; return v === null || v === undefined ? '' : safe_(v); });
    }));
  }
  cs.getRange(2, 1, 2, 2).setValues([['round', st.cfg.round], ['walkups', st.cfg.walkups || 0]]);
}
function cacheGet_() { try { var s = CacheService.getScriptCache().get('state'); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function cachePut_(st) { try { CacheService.getScriptCache().put('state', JSON.stringify(st), 5); } catch (e) {} }

function handle_(req) {
  var a = req.action || 'state', authed = !PIN || String(req.pin || '') === PIN;
  if (a === 'state') {
    var st0 = cacheGet_();
    if (!st0) { st0 = readState_(); cachePut_(st0); }
    return { ok: true, state: st0, locked: !!PIN, authed: authed };
  }
  if (!authed) return { ok: false, error: 'pin', locked: true, authed: false };
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var st = readState_(), res = Logic.apply(st, req);
    writeState_(st); cachePut_(st);
    return { ok: !res.error, result: res, state: st, locked: !!PIN, authed: true };
  } finally { lock.releaseLock(); }
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) { try { return out_(handle_(e && e.parameter ? e.parameter : {})); } catch (err) { return out_({ ok: false, error: String(err) }); } }
function doPost(e) { try { return out_(handle_(JSON.parse(e.postData.contents))); } catch (err) { return out_({ ok: false, error: String(err) }); } }
