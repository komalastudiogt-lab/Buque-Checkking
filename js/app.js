(function () {
  var P = 'bchk_';
  var PRESET = ['#e0525a', '#3fa7d6', '#59c36a', '#f2a541', '#b57edc', '#2ec4b6', '#f06eaa', '#9aa5b1', '#c9b037', '#ff8a4c', '#7f9cff', '#a3d977'];
  var CHK = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" stroke-width="3"/></svg>';
  var DEF = { rows: 11, on: 5, un: 6 };
  var S = defaults();
  var tab = 'cap', bay = null, sel = '', tt = null;

  function mkShip(name) {
    return { id: 's' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), name: name, bays: [], imp: {}, done: {}, exp: {}, log: [] };
  }
  function defaults() {
    var sh = mkShip('Mi buque');
    return {
      ships: [sh], cur: sh.id, vib: true,
      codes: [
        { c: 'EH', color: '#e0525a' }, { c: 'HN', color: '#3fa7d6' }, { c: 'LN', color: '#59c36a' },
        { c: 'BO', color: '#f2a541' }, { c: 'LM', color: '#b57edc' }, { c: 'MI', color: '#2ec4b6' },
        { c: 'SV', color: '#f06eaa' }, { c: 'B', color: '#9aa5b1' }
      ]
    };
  }
  function $(i) { return document.getElementById(i); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function purgeLog() {
    var sh = SH(), l = sh.log || [], r = [], i, e;
    for (i = 0; i < l.length; i++) { e = l[i]; if (e.a === 'D' ? sh.done[e.k] : sh.exp[e.k]) r.push(e); }
    sh.log = r;
  }
  function logAdd(a, k) {
    var sh = SH();
    if (!sh.log) sh.log = [];
    sh.log.push({ t: Date.now(), a: a, k: k, c: (a === 'D' ? sh.imp[k] : sh.exp[k]) || '' });
    if (sh.log.length > 5000) sh.log.splice(0, sh.log.length - 5000);
  }
  function save() { try { purgeLog(); } catch (e) {}
    try { localStorage.setItem(P + 'data', JSON.stringify(S)); } catch (e) {} }
  function SH() {
    for (var i = 0; i < S.ships.length; i++) { if (S.ships[i].id === S.cur) return S.ships[i]; }
    return S.ships[0];
  }
  function bcfg(id) {
    var b = SH().bays;
    for (var i = 0; i < b.length; i++) { if (b[i].id === id) return b[i]; }
    return null;
  }
  function sortBays() { SH().bays.sort(function (a, b) { return a.id.localeCompare(b.id, undefined, { numeric: true }); }); }
  function pad(n) { return ('0' + n).slice(-2); }
  function rowLabels(n) {
    var odd = n % 2 === 1, e = odd ? (n - 1) / 2 : n / 2, r = [], i;
    for (i = e; i >= 1; i--) r.push(pad(i * 2));
    if (odd) r.push('00');
    for (i = 0; i < e; i++) r.push(pad(i * 2 + 1));
    return r;
  }
  function tierLabels(on, n) {
    var r = [];
    for (var i = n - 1; i >= 0; i--) r.push(pad(on ? 82 + 2 * i : 2 * (i + 1)));
    return r;
  }
  function lim(v, a, b, d) { v = parseInt(v, 10); return isNaN(v) ? d : Math.max(a, Math.min(b, v)); }

  /* ---------- Validación y migración ---------- */
  function valid(o) {
    return o && typeof o === 'object' && Array.isArray(o.codes) &&
      (Array.isArray(o.ships) || (Array.isArray(o.bays) && o.imp && typeof o.imp === 'object' && o.exp && typeof o.exp === 'object'));
  }
  function normShip(x) {
    var sh = mkShip(typeof x.name === 'string' && x.name ? x.name.slice(0, 40) : 'Buque');
    if (typeof x.id === 'string' && /^[A-Za-z0-9]{1,20}$/.test(x.id)) sh.id = x.id;
    var i, k, ids = [], bl = Array.isArray(x.bays) ? x.bays : [];
    for (i = 0; i < bl.length; i++) {
      var b = bl[i], id, rows = DEF.rows, on = DEF.on, un = DEF.un;
      if (b && typeof b === 'object') { id = b.id; rows = lim(b.rows, 1, 16, DEF.rows); on = lim(b.on, 0, 8, DEF.on); un = lim(b.un, 0, 10, DEF.un); }
      else id = b;
      id = String(id).replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
      if (id && ids.indexOf(id) < 0) { ids.push(id); sh.bays.push({ id: id, rows: rows, on: on, un: un }); }
    }
    var re = /^[A-Za-z0-9]{1,8}\|\d\d\|\d\d$/, im = x.imp || {}, dn = x.done || {}, ex = x.exp || {};
    for (k in im) { if (re.test(k) && ids.indexOf(k.split('|')[0]) >= 0 && typeof im[k] === 'string') sh.imp[k] = im[k].slice(0, 4); }
    for (k in dn) { if (sh.imp[k] && dn[k]) sh.done[k] = 1; }
    for (k in ex) { if (re.test(k) && ids.indexOf(k.split('|')[0]) >= 0 && typeof ex[k] === 'string') sh.exp[k] = ex[k].slice(0, 4); }
    var lg = Array.isArray(x.log) ? x.log : [], q;
    for (i = 0; i < lg.length && sh.log.length < 5000; i++) {
      q = lg[i];
      if (q && (q.a === 'D' || q.a === 'C') && typeof q.t === 'number' && isFinite(q.t) && q.t > 0 && typeof q.k === 'string' && re.test(q.k)) {
        sh.log.push({ t: q.t, a: q.a, k: q.k, c: typeof q.c === 'string' ? q.c.slice(0, 4) : '' });
      }
    }
    return sh;
  }
  function norm(o) {
    var r = defaults(), i;
    r.vib = o.vib !== false;
    var cs = [];
    for (i = 0; i < o.codes.length; i++) {
      var c = o.codes[i];
      if (c && typeof c.c === 'string' && /^[A-Za-z0-9]{1,4}$/.test(c.c) && /^#[0-9a-fA-F]{6}$/.test(c.color || '')) {
        cs.push({ c: c.c.toUpperCase(), color: c.color });
      }
    }
    if (cs.length) r.codes = cs;
    var list = Array.isArray(o.ships) ? o.ships : [{ name: o.buque, bays: o.bays, imp: o.imp, done: o.done, exp: o.exp }];
    var seen = {};
    r.ships = [];
    for (i = 0; i < list.length; i++) {
      var sh = normShip(list[i] || {});
      while (seen[sh.id]) sh.id += 'x';
      seen[sh.id] = 1; r.ships.push(sh);
    }
    if (!r.ships.length) r.ships = [mkShip('Mi buque')];
    r.cur = (typeof o.cur === 'string' && seen[o.cur]) ? o.cur : r.ships[0].id;
    return r;
  }
  function load() {
    try {
      var t = localStorage.getItem(P + 'data');
      if (t) { var o = JSON.parse(t); if (valid(o)) S = norm(o); }
    } catch (e) {}
    bay = SH().bays.length ? SH().bays[0].id : null;
    sel = S.codes[0].c;
    save();
  }
  function col(c) {
    for (var i = 0; i < S.codes.length; i++) { if (S.codes[i].c === c) return S.codes[i].color; }
    return '#9aa5b1';
  }
  function count(b) {
    var sh = SH(), r = { p: 0, d: 0, l: 0 }, k;
    for (k in sh.imp) { if (!b || k.split('|')[0] === b) { r.p++; if (sh.done[k]) r.d++; } }
    for (k in sh.exp) { if (!b || k.split('|')[0] === b) r.l++; }
    return r;
  }
  function vib(t) { if (S.vib && window.NativeHaptics) { try { window.NativeHaptics(t); } catch (e) {} } }
  function toast(t) {
    var e = $('toast');
    e.textContent = t; e.hidden = false;
    clearTimeout(tt);
    tt = setTimeout(function () { e.hidden = true; }, 2200);
  }

  /* ---------- Ventanas propias ---------- */
  function modal(title, html, btns) {
    var m = $('modal');
    var h = '<div class="mb"><h3>' + esc(title) + '</h3><div>' + html + '</div><div class="mbt">';
    for (var i = 0; i < btns.length; i++) {
      h += '<button type="button" class="btn ' + (btns[i].cls || '') + '" data-mb="' + i + '">' + esc(btns[i].t) + '</button>';
    }
    m.innerHTML = h + '</div></div>';
    m._b = btns; m._v = null; m.hidden = false;
    var inp = m.querySelector('input[type=text]');
    if (inp) setTimeout(function () { inp.focus(); }, 60);
  }
  function closeModal() { var m = $('modal'); m.hidden = true; m.innerHTML = ''; m._b = null; m._v = null; }
  function ask(title, label, val, cb) {
    modal(title, '<p>' + esc(label) + '</p><input type="text" id="mi" maxlength="40" value="' + esc(val) + '">', [
      { t: 'Cancelar' },
      { t: 'Aceptar', cls: 'pri', fn: function () { return cb($('mi').value.trim()); } }
    ]);
  }
  function sure(title, msg, txt, cb) {
    modal(title, '<p>' + esc(msg) + '</p>', [{ t: 'Cancelar' }, { t: txt, cls: 'dan', fn: cb }]);
  }

  /* ---------- Dibujo ---------- */
  function render() {
    var c = count(null);
    $('ttl').textContent = SH().name;
    $('cnt').innerHTML = '<span class="okc">Desc.<br><b>' + c.d + '</b>/' + c.p + '</span><span>Carg.<br><b>' + c.l + '</b></span>';
    var navb = document.querySelectorAll('nav button');
    for (var i = 0; i < navb.length; i++) { navb[i].className = navb[i].getAttribute('data-tab') === tab ? 'on' : ''; }
    var r = tab === 'res';
    $('bays').hidden = r; $('tools').hidden = r; $('grid').hidden = r; $('res').hidden = !r;
    if (r) { renderRes(); return; }
    renderBays(); renderTools(); renderGrid();
  }
  function renderBays() {
    var h = '', b = SH().bays;
    for (var i = 0; i < b.length; i++) {
      h += '<button type="button" class="bay' + (b[i].id === bay ? ' on' : '') + '" data-bay="' + esc(b[i].id) + '">' + esc(b[i].id) + '</button>';
    }
    h += '<button type="button" class="bay" data-addbay="1">+ Bahía</button>';
    $('bays').innerHTML = h;
  }
  function palette(eraser) {
    var h = '<div class="pal">';
    if (eraser) h += '<button type="button" class="chip era' + (sel === '' ? ' on' : '') + '" data-code="">Borrar</button>';
    for (var i = 0; i < S.codes.length; i++) {
      var c = S.codes[i];
      h += '<button type="button" class="chip' + (sel === c.c ? ' on' : '') + '" style="background:' + c.color + '" data-code="' + esc(c.c) + '">' + esc(c.c) + '</button>';
    }
    return h + '<button type="button" class="chip add" data-addcode="1">+ Código</button></div>';
  }
  function renderTools() {
    var h = '', c = count(bay || null);
    if (tab === 'cap') {
      h = '<p class="step">Paso 1: captura el plano</p>' + palette(true) + '<p class="hint">Elige un código y toca las celdas. Toca una celda del mismo código para quitarla.</p>';
    } else if (tab === 'des') {
      h = '<p class="step">Paso 2: descarga</p><p class="hint">Toca un contenedor para marcarlo descargado. Tócalo otra vez para deshacer. Pendientes en esta bahía: <b>' + (c.p - c.d) + '</b></p>';
    } else {
      h = '<p class="step">Paso 3: carga</p>' + palette(false) + '<p class="hint">Elige el código y toca la celda donde cargaste. Atenuadas: siguen ocupadas. Punteadas: espacio liberado.</p>';
    }
    $('tools').innerHTML = h;
  }
  function renderGrid() {
    var cfg = bcfg(bay), sh = SH();
    if (!cfg) {
      $('grid').innerHTML = '<div class="empty">Este buque aún no tiene bahías.<br><br><button type="button" class="btn pri" data-addbay="1">Agregar bahía</button></div>';
      return;
    }
    var R = rowLabels(cfg.rows), secs = [['SOBRE CUBIERTA', tierLabels(true, cfg.on)], ['BAJO CUBIERTA', tierLabels(false, cfg.un)]];
    var h = '<div class="g' + (cfg.rows > 12 ? ' sm' : '') + '" style="grid-template-columns:24px repeat(' + R.length + ',minmax(0,1fr))"><div></div>', i, j, s, k, v, t;
    for (i = 0; i < R.length; i++) h += '<div class="ch">' + R[i] + '</div>';
    for (s = 0; s < 2; s++) {
      if (!secs[s][1].length) continue;
      h += '<div class="sec">' + secs[s][0] + '</div>';
      for (j = 0; j < secs[s][1].length; j++) {
        t = secs[s][1][j];
        h += '<div class="lb">' + t + '</div>';
        for (i = 0; i < R.length; i++) {
          k = bay + '|' + R[i] + '|' + t;
          v = tab === 'exp' ? sh.exp[k] : sh.imp[k];
          if (!v) {
            var oc = tab === 'exp' && sh.imp[k], cl = 'c';
            if (oc && sh.done[k]) cl += ' fr';
            if (oc && !sh.done[k]) {
              h += '<button type="button" class="c oc" style="color:' + col(sh.imp[k]) + '" data-k="' + k + '">' + esc(sh.imp[k]) + '</button>';
            } else h += '<button type="button" class="' + cl + '" data-k="' + k + '"></button>';
            continue;
          }
          if (tab !== 'exp' && sh.done[k]) {
            h += '<button type="button" class="c dn" style="border-color:' + col(v) + ';color:' + col(v) + '" data-k="' + k + '">' + CHK + '</button>';
          } else {
            h += '<button type="button" class="c" style="background:' + col(v) + ';border-color:' + col(v) + '" data-k="' + k + '">' + esc(v) + '</button>';
          }
        }
      }
    }
    h += '</div><button type="button" class="btn blk" data-editcells="1">Editar celdas de la bahía ' + esc(bay) + '</button>' +
      '<button type="button" class="btn blk" data-delbay="1">Eliminar bahía ' + esc(bay) + '</button>';
    $('grid').innerHTML = h;
  }
  function renderRes() {
    var t = count(null), h = '';
    h += '<div class="card"><h4>Totales - ' + esc(SH().name) + '</h4><div class="big"><div><b>' + t.p + '</b>Plan</div><div><b>' + t.d + '</b>Descargados</div><div><b>' + (t.p - t.d) + '</b>Pendientes</div><div><b>' + t.l + '</b>Cargados</div></div>';
    h += '<p class="hint">Movimientos totales: <b>' + (t.d + t.l) + '</b></p></div>';
    h += logCard();
    h += '<div class="card"><h4>Por bahía</h4>' + tabla() + '</div>';
    h += '<div class="card"><h4>Archivos</h4><button type="button" class="btn pri blk" data-act="pdf">Compartir resumen en PDF</button>' +
      '<button type="button" class="btn blk" data-act="bak">Guardar respaldo (JSON)</button>' +
      '<button type="button" class="btn blk" data-act="res">Restaurar respaldo</button></div>';
    h += '<div class="card"><h4>Ajustes</h4><div class="row"><span>Vibrar al marcar</span><button type="button" class="sw' + (S.vib ? ' on' : '') + '" data-act="vib" aria-label="Vibración"></button></div>' +
      '<button type="button" class="btn blk" data-act="vtest">Probar vibración</button>' +
      '<button type="button" class="btn blk" data-act="ships">Cambiar o agregar buque</button>' +
      '<button type="button" class="btn blk" data-act="name">Renombrar este buque</button>' +
      '<button type="button" class="btn dan blk" data-act="wipe">Borrar todo</button></div>';
    $('res').innerHTML = h;
  }
  function hh(t) { var d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dur(h) { var m = Math.round(h * 60); return Math.floor(m / 60) + ' h ' + pad(m % 60) + ' min'; }
  function stats() {
    var l = SH().log || [], r = { n: l.length, d: 0, c: 0, first: 0, last: 0, perH: 0, hrs: 0, l60: 0, hours: {} }, i, e, d, hk, now = Date.now();
    for (i = 0; i < l.length; i++) {
      e = l[i];
      if (e.a === 'D') r.d++; else r.c++;
      if (!r.first || e.t < r.first) r.first = e.t;
      if (e.t > r.last) r.last = e.t;
      if (now - e.t <= 3600000) r.l60++;
      d = new Date(e.t);
      hk = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours());
      if (!r.hours[hk]) r.hours[hk] = { d: 0, c: 0 };
      if (e.a === 'D') r.hours[hk].d++; else r.hours[hk].c++;
    }
    if (r.n > 1) { r.hrs = Math.max((r.last - r.first) / 3600000, 1 / 60); r.perH = r.n / r.hrs; }
    return r;
  }
  function hoursTable(st, max) {
    var ks = Object.keys(st.hours).sort();
    if (!ks.length) return '';
    if (max) ks = ks.slice(-max);
    var h = '<table class="t2"><tr><th>Hora</th><th>Desc.</th><th>Carg.</th><th>Total</th></tr>';
    for (var i = 0; i < ks.length; i++) {
      var v = st.hours[ks[i]], p = ks[i].split(' ');
      h += '<tr><td>' + p[0].slice(8) + '/' + p[0].slice(5, 7) + ' ' + p[1] + ':00</td><td>' + v.d + '</td><td>' + v.c + '</td><td>' + (v.d + v.c) + '</td></tr>';
    }
    return h + '</table>';
  }
  function logCard() {
    var st = stats(), t = count(null), l = SH().log || [], h = '<div class="card"><h4>Bitácora</h4>';
    if (!st.n) return h + '<p class="hint">Aún no hay movimientos con hora. Se registran al marcar descargas y cargas.</p></div>';
    h += '<div class="big"><div><b>' + (st.n > 1 ? st.perH.toFixed(1) : '-') + '</b>Mov. por hora</div><div><b>' + st.l60 + '</b>Última hora</div><div><b>' + (st.n > 1 ? dur(st.hrs) : '-') + '</b>Duración</div></div>';
    h += '<p class="hint">Primer movimiento: ' + hh(st.first) + ' - Último: ' + hh(st.last) + '</p>';
    if (st.n < t.d + t.l) h += '<p class="hint">Los movimientos marcados antes de esta versión no tienen hora.</p>';
    h += '<p class="hint">Por hora</p>' + hoursTable(st, 12) + '<p class="hint">Últimos movimientos</p><table class="t2"><tr><th>Hora</th><th>Mov.</th><th>Bahía</th><th>Celda</th><th>Cód.</th></tr>';
    for (var i = l.length - 1; i >= 0 && i >= l.length - 10; i--) {
      var p = l[i].k.split('|');
      h += '<tr><td>' + hh(l[i].t) + '</td><td>' + (l[i].a === 'D' ? 'Desc.' : 'Carg.') + '</td><td>' + esc(p[0]) + '</td><td>' + p[1] + '-' + p[2] + '</td><td>' + esc(l[i].c) + '</td></tr>';
    }
    return h + '</table></div>';
  }
  function tabla() {
    var b = SH().bays;
    if (!b.length) return '<p class="hint">Sin bahías.</p>';
    var h = '<table><tr><th>Bahía</th><th>Plan</th><th>Desc.</th><th>Pend.</th><th>Carg.</th></tr>';
    for (var i = 0; i < b.length; i++) {
      var c = count(b[i].id);
      h += '<tr><td>' + esc(b[i].id) + '</td><td>' + c.p + '</td><td>' + c.d + '</td><td>' + (c.p - c.d) + '</td><td>' + c.l + '</td></tr>';
    }
    return h + '</table>';
  }

  /* ---------- Acciones ---------- */
  function tapCell(k) {
    var sh = SH();
    if (tab === 'cap') {
      if (!sel || sh.imp[k] === sel) { delete sh.imp[k]; delete sh.done[k]; }
      else sh.imp[k] = sel;
      vib('suave');
    } else if (tab === 'des') {
      if (sh.imp[k]) {
        if (sh.done[k]) { delete sh.done[k]; vib('aviso'); } else { sh.done[k] = 1; logAdd('D', k); vib('exito'); }
      } else { vib('aviso'); return; }
    } else {
      if (sh.exp[k]) { delete sh.exp[k]; vib('aviso'); } else { sh.exp[k] = sel || S.codes[0].c; logAdd('C', k); vib('exito'); }
    }
    save(); render();
  }
  function addBay() {
    ask('Nueva bahía', 'Solo números o letras sin acentos (ejemplo: 02)', '', function (v) {
      v = v.replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
      if (!v) { toast('Escribe un número de bahía'); return false; }
      if (bcfg(v)) { toast('Esa bahía ya existe'); return false; }
      var base = bcfg(bay) || DEF;
      SH().bays.push({ id: v, rows: base.rows, on: base.on, un: base.un });
      sortBays(); bay = v; save(); render();
    });
  }
  function validKeys(v, id) {
    var o = {}, R = rowLabels(v.rows), T = tierLabels(true, v.on).concat(tierLabels(false, v.un)), i, j;
    for (i = 0; i < R.length; i++) { for (j = 0; j < T.length; j++) o[id + '|' + R[i] + '|' + T[j]] = 1; }
    return o;
  }
  function lostCount(v, ids) {
    var sh = SH(), n = 0, i, k, ok;
    for (i = 0; i < ids.length; i++) {
      ok = validKeys(v, ids[i]);
      for (k in sh.imp) { if (k.indexOf(ids[i] + '|') === 0 && !ok[k]) n++; }
      for (k in sh.exp) { if (k.indexOf(ids[i] + '|') === 0 && !ok[k]) n++; }
    }
    return n;
  }
  function applyCfg(v, ids) {
    var sh = SH(), i, k, ok, c;
    for (i = 0; i < ids.length; i++) {
      ok = validKeys(v, ids[i]);
      for (k in sh.imp) { if (k.indexOf(ids[i] + '|') === 0 && !ok[k]) { delete sh.imp[k]; delete sh.done[k]; } }
      for (k in sh.exp) { if (k.indexOf(ids[i] + '|') === 0 && !ok[k]) delete sh.exp[k]; }
      c = bcfg(ids[i]); c.rows = v.rows; c.on = v.on; c.un = v.un;
    }
    save(); render();
  }
  function editCells() {
    var c = bcfg(bay);
    if (!c) return;
    var v = { rows: c.rows, on: c.on, un: c.un, all: false };
    function line(lbl, key) {
      return '<div class="stp"><span>' + lbl + '</span><span><button type="button" data-step="' + key + ',-1">-</button><b id="sv_' + key + '">' + v[key] + '</b><button type="button" data-step="' + key + ',1">+</button></span></div>';
    }
    modal('Celdas de la bahía ' + bay,
      '<p>Filas: si el número es impar incluye la 00 (13 = 12 a 02, 00, 01 a 11; 14 = 14 a 02, 01 a 13). Pisos: sobre cubierta desde 82, bajo cubierta desde 02.</p>' +
      line('Filas', 'rows') + line('Pisos sobre cubierta', 'on') + line('Pisos bajo cubierta', 'un') +
      '<div class="row"><span>Aplicar a todas las bahías</span><button type="button" class="sw" data-stepall="1"></button></div>', [
        { t: 'Cancelar' },
        { t: 'Guardar', cls: 'pri', fn: function () {
          var ids = [], b = SH().bays, i;
          if (v.all) { for (i = 0; i < b.length; i++) ids.push(b[i].id); } else ids = [bay];
          var n = lostCount(v, ids);
          if (n > 0) {
            sure('Quitar celdas', 'Se borrarán ' + n + ' celdas que tienen datos.', 'Quitar', function () { applyCfg(v, ids); });
            return false;
          }
          applyCfg(v, ids);
        } }
      ]);
    $('modal')._v = v;
  }
  function addCode() {
    var sw = '<div class="sws">';
    for (var i = 0; i < PRESET.length; i++) sw += '<button type="button" class="' + (i === 0 ? 'on' : '') + '" style="background:' + PRESET[i] + '" data-sw="' + PRESET[i] + '"></button>';
    modal('Código de puerto', '<p>Letras o números (máx. 4). Si ya existe, se cambia su color.</p><input type="text" id="mi" maxlength="4">' + sw + '</div>', [
      { t: 'Cancelar' },
      { t: 'Guardar', cls: 'pri', fn: function () {
        var v = $('mi').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        var on = document.querySelector('.sws button.on');
        var chosen = on ? on.getAttribute('data-sw') : PRESET[0];
        if (!v) { toast('Escribe un código'); return false; }
        var f = false;
        for (var j = 0; j < S.codes.length; j++) { if (S.codes[j].c === v) { S.codes[j].color = chosen; f = true; } }
        if (!f) S.codes.push({ c: v, color: chosen });
        sel = v; save(); render();
      } }
    ]);
  }
  /* ---------- Buques ---------- */
  function shipsModal() {
    var h = '', i;
    for (i = 0; i < S.ships.length; i++) {
      h += '<button type="button" class="btn blk' + (S.ships[i].id === S.cur ? ' pri' : '') + '" data-ship="' + esc(S.ships[i].id) + '">' + esc(S.ships[i].name) + '</button>';
    }
    h += '<button type="button" class="btn blk" data-shipact="ren">Renombrar este buque</button><button type="button" class="btn dan blk" data-shipact="del">Eliminar este buque</button>';
    modal('Buques', h, [{ t: 'Cerrar' }, { t: 'Nuevo buque', cls: 'pri', fn: function () { newShip(); return false; } }]);
  }
  function newShip() {
    ask('Nuevo buque', 'Nombre del buque', '', function (v) {
      if (!v) { toast('Escribe un nombre'); return false; }
      var sh = mkShip(v.slice(0, 40));
      S.ships.push(sh); S.cur = sh.id; bay = null; save(); render();
    });
  }
  function renameShip() {
    ask('Nombre del buque', 'Nombre', SH().name, function (v) {
      if (!v) return false;
      SH().name = v.slice(0, 40); save(); render();
    });
  }
  function delShip() {
    if (S.ships.length < 2) { toast('Debe quedar al menos un buque'); return; }
    sure('Eliminar buque', 'Se borra "' + SH().name + '" con todas sus bahías y datos.', 'Eliminar', function () {
      for (var i = 0; i < S.ships.length; i++) { if (S.ships[i].id === S.cur) { S.ships.splice(i, 1); break; } }
      S.cur = S.ships[0].id;
      bay = SH().bays.length ? SH().bays[0].id : null;
      save(); render();
    });
  }
  /* ---------- Archivos ---------- */
  function stamp() { return new Date().toISOString().slice(0, 10); }
  function dl(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); }, 500);
  }
  function backup() {
    var txt = JSON.stringify(S), name = 'BuqueChecking_' + stamp() + '.json';
    if (window.NativeSaveJSON) {
      window.NativeSaveJSON(txt, name).catch(function () { toast('No se pudo guardar el respaldo'); });
    } else dl(new Blob([txt], { type: 'application/json' }), name);
  }
  function restore(file) {
    var fr = new FileReader();
    fr.onload = function () {
      var o;
      try { o = JSON.parse(fr.result); } catch (e) { o = null; }
      if (!valid(o)) { toast('El archivo no es un respaldo válido'); return; }
      sure('Restaurar respaldo', 'Se reemplazarán todos los datos actuales.', 'Restaurar', function () {
        S = norm(o); bay = SH().bays.length ? SH().bays[0].id : null; sel = S.codes[0].c; save(); render(); toast('Respaldo restaurado');
      });
    };
    fr.readAsText(file);
  }
  function pdfT(x) { return x.replace(/<table[^>]*>/g, '<table style="width:100%;border-collapse:collapse;font-size:13px;text-align:center" border="1" cellpadding="4">'); }
  function pdfLog() {
    var st = stats();
    if (!st.n) return '';
    return '<h3>Bitácora</h3><p>Primer movimiento: ' + hh(st.first) + ' - Último: ' + hh(st.last) + (st.n > 1 ? ' - Duración: ' + dur(st.hrs) + ' - Movimientos por hora: ' + st.perH.toFixed(1) : '') + '</p>' + pdfT(hoursTable(st, 0));
  }
  function pdf() {
    if (!window.html2pdf) { toast('PDF disponible solo en la app instalada'); return; }
    var t = count(null), box = $('pdfbox');
    box.innerHTML = '<div style="background:#fff;color:#000;padding:20px;font-family:sans-serif"><h2 style="margin:0">' + esc(SH().name) + '</h2><p>Resumen de operación - ' + stamp() +
      '</p><p><b>Plan:</b> ' + t.p + ' &nbsp; <b>Descargados:</b> ' + t.d + ' &nbsp; <b>Pendientes:</b> ' + (t.p - t.d) + ' &nbsp; <b>Cargados:</b> ' + t.l + ' &nbsp; <b>Movimientos:</b> ' + (t.d + t.l) + '</p>' +
      pdfT(tabla()) + pdfLog() + '</div>';
    var name = 'BuqueChecking_' + stamp() + '.pdf';
    window.html2pdf().from(box.firstChild).set({ margin: 8, jsPDF: { unit: 'mm', format: 'a4' } }).outputPdf('datauristring').then(function (u) {
      var b64 = u.split(',')[1];
      if (window.NativeShare) return window.NativeShare(b64, name);
      var bin = atob(b64), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      dl(new Blob([arr], { type: 'application/pdf' }), name);
    }).catch(function () { toast('No se pudo crear el PDF'); });
  }
  function act(a) {
    if (a === 'pdf') pdf();
    else if (a === 'bak') backup();
    else if (a === 'res') $('file').click();
    else if (a === 'vib') { S.vib = !S.vib; save(); render(); }
    else if (a === 'vtest') {
      if (!window.NativeHaptics) { toast('La vibración funciona solo en la app instalada'); return; }
      window.NativeHaptics('prueba').then(function (r) { toast(r === 'ok' ? 'Vibración enviada' : r); });
    } else if (a === 'ships') shipsModal();
    else if (a === 'name') renameShip();
    else if (a === 'wipe') {
      sure('Borrar todo', 'Se borrarán todos los buques, bahías, planes y cargas. No se puede deshacer.', 'Borrar', function () {
        S = defaults(); bay = null; sel = S.codes[0].c; save(); render();
      });
    }
  }

  /* ---------- Eventos ---------- */
  function up(el, attr) {
    while (el && el !== document.body) {
      if (el.getAttribute && el.getAttribute(attr) !== null) return el;
      el = el.parentNode;
    }
    return null;
  }
  var STEP = { rows: [1, 16], on: [0, 8], un: [0, 10] };
  document.addEventListener('click', function (e) {
    var el, m = $('modal');
    if (!m.hidden) {
      if ((el = up(e.target, 'data-sw'))) {
        var all = document.querySelectorAll('.sws button');
        for (var i = 0; i < all.length; i++) all[i].className = '';
        el.className = 'on'; return;
      }
      if ((el = up(e.target, 'data-step')) && m._v) {
        var p = el.getAttribute('data-step').split(','), L = STEP[p[0]];
        m._v[p[0]] = Math.max(L[0], Math.min(L[1], m._v[p[0]] + parseInt(p[1], 10)));
        $('sv_' + p[0]).textContent = m._v[p[0]]; return;
      }
      if ((el = up(e.target, 'data-stepall')) && m._v) {
        m._v.all = !m._v.all; el.className = 'sw' + (m._v.all ? ' on' : ''); return;
      }
      if ((el = up(e.target, 'data-ship'))) {
        S.cur = el.getAttribute('data-ship');
        bay = SH().bays.length ? SH().bays[0].id : null;
        save(); closeModal(); render(); return;
      }
      if ((el = up(e.target, 'data-shipact'))) {
        if (el.getAttribute('data-shipact') === 'ren') renameShip(); else delShip();
        return;
      }
      if ((el = up(e.target, 'data-mb')) && m._b) {
        var b = m._b[+el.getAttribute('data-mb')];
        if (b.fn && b.fn() === false) return;
        closeModal();
      }
      return;
    }
    if ((el = up(e.target, 'data-k'))) { tapCell(el.getAttribute('data-k')); return; }
    if ((el = up(e.target, 'data-tab'))) {
      tab = el.getAttribute('data-tab');
      if (tab !== 'cap' && !sel) sel = S.codes[0].c;
      render(); return;
    }
    if ((el = up(e.target, 'data-bay'))) { bay = el.getAttribute('data-bay'); render(); return; }
    if (up(e.target, 'data-addbay')) { addBay(); return; }
    if (up(e.target, 'data-editcells')) { editCells(); return; }
    if ((el = up(e.target, 'data-code'))) { sel = el.getAttribute('data-code'); render(); return; }
    if (up(e.target, 'data-addcode')) { addCode(); return; }
    if (up(e.target, 'data-delbay')) {
      sure('Eliminar bahía ' + bay, 'Se borra su plan y sus cargas.', 'Eliminar', function () {
        var sh = SH(), k, p = bay + '|';
        for (k in sh.imp) { if (k.indexOf(p) === 0) { delete sh.imp[k]; delete sh.done[k]; } }
        for (k in sh.exp) { if (k.indexOf(p) === 0) delete sh.exp[k]; }
        sh.bays.splice(sh.bays.indexOf(bcfg(bay)), 1);
        bay = sh.bays.length ? sh.bays[0].id : null; save(); render();
      });
      return;
    }
    if ((el = up(e.target, 'data-act'))) { act(el.getAttribute('data-act')); return; }
    if (up(e.target, 'id') && up(e.target, 'id').id === 'ttl') shipsModal();
  });
  $('file').addEventListener('change', function () {
    if (this.files && this.files[0]) restore(this.files[0]);
    this.value = '';
  });

  load();
  render();
  window.__appListo = true;
})();
