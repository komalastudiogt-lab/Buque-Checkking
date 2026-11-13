(function () {
  var P = 'bchk_';
  var PRESET = ['#e0525a', '#3fa7d6', '#59c36a', '#f2a541', '#b57edc', '#2ec4b6', '#f06eaa', '#9aa5b1', '#c9b037', '#ff8a4c', '#7f9cff', '#a3d977'];
  var CHK = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" stroke-width="3"/></svg>';
  var DEF = { rows: 11, on: 5, un: 6 };
  var NA = 'N/A', NACOL = '#6b7785', editC = false;
  var S = defaults();
  var tab = 'cap', bay = null, sel = '', tt = null;

  function mkShip(name) {
    return { id: 's' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), name: name, bays: [], imp: {}, done: {}, exp: {}, log: [], mk: {}, mx: {}, cuts: [] };
  }
  function defaults() {
    var sh = mkShip('Mi buque');
    return {
      ships: [sh], cur: sh.id, vib: true,
      codes: [
        { c: 'EH', color: '#e0525a' }, { c: 'HN', color: '#3fa7d6' }, { c: 'LN', color: '#59c36a' },
        { c: 'BO', color: '#f2a541' }, { c: 'LM', color: '#b57edc' }, { c: 'MI', color: '#2ec4b6' },
        { c: 'SV', color: '#f06eaa' }, { c: 'B', color: '#9aa5b1' }, { c: 'N/A', color: '#6b7785' }
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
    var k;
    if (sh.mk) { for (k in sh.mk) { if (!sh.imp[k]) delete sh.mk[k]; } }
    if (sh.mx) { for (k in sh.mx) { if (!sh.exp[k]) delete sh.mx[k]; } }
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
  function tierLabels(on, n, s0) {
    var r = [];
    for (var i = n - 1; i >= 0; i--) r.push(pad(on ? (s0 === 80 ? 80 : 82) + 2 * i : 2 * (i + 1)));
    return r;
  }
  function tagStr(t) {
    var o = '', a = 'RPVD', i;
    for (i = 0; i < a.length; i++) { if (t.indexOf(a.charAt(i)) >= 0) o += a.charAt(i); }
    return o;
  }
  var TAGS = { R: 'Reefer', P: 'Peligrosa', V: 'Vacío', D: 'Dañado' };
  function ink(c) {
    var r = parseInt(c.substr(1, 2), 16), g = parseInt(c.substr(3, 2), 16), b = parseInt(c.substr(5, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#0b0f14' : '#ffffff';
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
      var b = bl[i], id, rows = DEF.rows, on = DEF.on, un = DEF.un, s0 = 82;
      if (b && typeof b === 'object') { id = b.id; rows = lim(b.rows, 1, 16, DEF.rows); on = lim(b.on, 0, 8, DEF.on); un = lim(b.un, 0, 10, DEF.un); s0 = b.s0 === 80 ? 80 : 82; }
      else id = b;
      id = String(id).replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
      if (id && ids.indexOf(id) < 0) { ids.push(id); sh.bays.push({ id: id, rows: rows, on: on, un: un, s0: s0 }); }
    }
    var re = /^[A-Za-z0-9]{1,8}\|\d\d\|\d\d$/, im = x.imp || {}, dn = x.done || {}, ex = x.exp || {};
    for (k in im) { if (re.test(k) && ids.indexOf(k.split('|')[0]) >= 0 && typeof im[k] === 'string') sh.imp[k] = im[k].slice(0, 4); }
    for (k in dn) { if (sh.imp[k] && sh.imp[k] !== NA && dn[k]) sh.done[k] = 1; }
    for (k in ex) { if (re.test(k) && ids.indexOf(k.split('|')[0]) >= 0 && typeof ex[k] === 'string') sh.exp[k] = ex[k].slice(0, 4); }
    var lg = Array.isArray(x.log) ? x.log : [], q;
    for (i = 0; i < lg.length && sh.log.length < 5000; i++) {
      q = lg[i];
      if (q && (q.a === 'D' || q.a === 'C') && typeof q.t === 'number' && isFinite(q.t) && q.t > 0 && typeof q.k === 'string' && re.test(q.k)) {
        sh.log.push({ t: q.t, a: q.a, k: q.k, c: typeof q.c === 'string' ? q.c.slice(0, 4) : '' });
      }
    }
    var cu = Array.isArray(x.cuts) ? x.cuts : [];
    for (i = 0; i < cu.length && sh.cuts.length < 500; i++) {
      q = cu[i];
      if (q && isFinite(q.from) && isFinite(q.to) && q.from > 0 && q.to > 0) sh.cuts.push({ from: +q.from, to: +q.to, d: lim(q.d, 0, 99999, 0), c: lim(q.c, 0, 99999, 0) });
    }
    var mm = [['mk', x.mk, sh.imp], ['mx', x.mx, sh.exp]], z, src, tg, mo, mq;
    for (z = 0; z < 2; z++) {
      src = mm[z][1] || {};
      for (k in src) {
        mq = src[k];
        if (!mq || typeof mq !== 'object' || !mm[z][2][k]) continue;
        tg = tagStr(String(mq.t || '')); mo = String(mq.n || '').slice(0, 30);
        if (tg || mo) sh[mm[z][0]][k] = { t: tg, n: mo };
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
      if (c && typeof c.c === 'string' && /^([A-Za-z0-9]{1,4}|N\/A)$/.test(c.c) && /^#[0-9a-fA-F]{6}$/.test(c.color || '')) {
        cs.push({ c: c.c.toUpperCase(), color: c.color });
      }
    }
    if (cs.length) r.codes = cs;
    var hasNA = false;
    for (i = 0; i < r.codes.length; i++) { if (r.codes[i].c === NA) hasNA = true; }
    if (!hasNA) r.codes.push({ c: NA, color: NACOL });
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
  function firstReal() {
    for (var i = 0; i < S.codes.length; i++) { if (S.codes[i].c !== NA) return S.codes[i].c; }
    return S.codes[0].c;
  }
  function col(c) {
    for (var i = 0; i < S.codes.length; i++) { if (S.codes[i].c === c) return S.codes[i].color; }
    return '#9aa5b1';
  }
  function count(b) {
    var sh = SH(), r = { p: 0, d: 0, l: 0, na: 0 }, k;
    for (k in sh.imp) { if (!b || k.split('|')[0] === b) { if (sh.imp[k] === NA) { r.na++; continue; } r.p++; if (sh.done[k]) r.d++; } }
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
    $('cnt').innerHTML = '<button type="button" class="cutb" data-act="cut">Corte<br><b>' + sinceCut() + '</b></button><span class="okc">Desc.<br><b>' + c.d + '</b>/' + c.p + '</span><span>Carg.<br><b>' + c.l + '</b></span>';
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
      if (tab === 'exp' && c.c === NA) continue;
      h += '<button type="button" class="chip' + (sel === c.c && !editC ? ' on' : '') + '" style="background:' + c.color + ';color:' + ink(c.color) + '" data-code="' + esc(c.c) + '">' + esc(c.c) + '</button>';
    }
    h += '<button type="button" class="chip add" data-addcode="1">+ Código</button>' +
      '<button type="button" class="chip add' + (editC ? ' on' : '') + '" data-editc="1">' + (editC ? 'Listo' : 'Editar') + '</button></div>';
    return h + (editC ? '<p class="hint">Modo edición: toca un código para cambiar su nombre o color, o eliminarlo.</p>' : '');
  }
  function renderTools() {
    var h = '', c = count(bay || null);
    if (tab === 'cap') {
      h = '<p class="step">Paso 1: captura el plano</p>' + palette(true) + '<p class="hint">Elige un código y toca las celdas. Toca una celda del mismo código para quitarla o elige otro para cambiarla. N/A = contenedor que no se mueve (solo referencia). Mantén presionada una celda con contenedor para marcarla (reefer, peligrosa, vacío, dañado) o anotar.</p>';
    } else if (tab === 'des') {
      h = '<p class="step">Paso 2: descarga</p><p class="hint">Toca un contenedor para marcarlo descargado. Tócalo otra vez para deshacer. Pendientes en esta bahía: <b>' + (c.p - c.d) + '</b>. Mantén presionada una celda para marcas y notas.</p>';
    } else {
      h = '<p class="step">Paso 3: carga</p>' + palette(false) + '<p class="hint">Elige el código y toca la celda donde cargaste. Atenuadas: siguen ocupadas. Punteadas: espacio liberado. Mantén presionada una celda cargada para marcas y notas.</p>';
    }
    $('tools').innerHTML = h;
  }
  function tagHtml(M, k) {
    var m = M[k], t;
    if (!m) return '';
    t = m.t + (m.n ? '*' : '');
    return t ? '<i class="tg">' + t + '</i>' : '';
  }
  function renderGrid() {
    var cfg = bcfg(bay), sh = SH();
    if (!cfg) {
      $('grid').innerHTML = '<div class="empty">Este buque aún no tiene bahías.<br><br><button type="button" class="btn pri blk" data-act="impl">Importar plano (PDF)</button><button type="button" class="btn blk" data-addbay="1">Agregar bahía a mano</button></div>';
      return;
    }
    var M = tab === 'exp' ? sh.mx : sh.mk, R = rowLabels(cfg.rows), secs = [['SOBRE CUBIERTA', tierLabels(true, cfg.on, cfg.s0)], ['BAJO CUBIERTA', tierLabels(false, cfg.un)]];
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
            h += '<button type="button" class="c dn" style="border-color:' + col(v) + ';color:' + col(v) + '" data-k="' + k + '">' + CHK + tagHtml(M, k) + '</button>';
          } else {
            h += '<button type="button" class="c" style="background:' + col(v) + ';border-color:' + col(v) + ';color:' + ink(col(v)) + '" data-k="' + k + '">' + esc(v) + tagHtml(M, k) + '</button>';
          }
        }
      }
    }
    h += '</div>' + (tab === 'cap' ? '<button type="button" class="btn pri blk" data-act="impl">Importar plano (PDF)</button>' : '') + '<button type="button" class="btn blk" data-editcells="1">Editar celdas de la bahía ' + esc(bay) + '</button>' +
      '<button type="button" class="btn blk" data-delbay="1">Eliminar bahía ' + esc(bay) + '</button>';
    $('grid').innerHTML = h;
  }
  function renderRes() {
    var t = count(null), h = '';
    h += '<div class="card"><h4>Totales - ' + esc(SH().name) + '</h4><div class="big"><div><b>' + t.p + '</b>Plan</div><div><b>' + t.d + '</b>Descargados</div><div><b>' + (t.p - t.d) + '</b>Pendientes</div><div><b>' + t.l + '</b>Cargados</div></div>';
    h += '<p class="hint">Movimientos totales: <b>' + (t.d + t.l) + '</b>' + (t.na ? ' - Contenedores N/A (no se mueven): <b>' + t.na + '</b>' : '') + '</p></div>';
    h += cutsCard() + marksCard();
    h += '<div class="card"><h4>Por bahía</h4>' + tabla() + '</div>';
    h += '<div class="card"><h4>Archivos</h4><button type="button" class="btn pri blk" data-act="pdf">Compartir resumen en PDF</button>' +
      '<button type="button" class="btn blk" data-act="bak">Guardar respaldo (JSON)</button>' +
      '<button type="button" class="btn blk" data-act="res">Restaurar respaldo</button></div>';
    h += '<div class="card"><h4>Ajustes</h4><div class="row"><span>Vibrar al marcar</span><button type="button" class="sw' + (S.vib ? ' on' : '') + '" data-act="vib" aria-label="Vibración"></button></div>' +
      '<button type="button" class="btn blk" data-act="vtest">Probar vibración</button>' +
      '<button type="button" class="btn blk" data-act="ships">Cambiar o agregar buque</button>' +
      '<button type="button" class="btn blk" data-act="dep">Depurar este buque (nueva operación)</button>' +
      '<button type="button" class="btn blk" data-act="name">Renombrar este buque</button>' +
      '<button type="button" class="btn dan blk" data-act="wipe">Borrar todo</button></div>';
    $('res').innerHTML = h;
  }
  function hhd(t) { var d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + hh(t); }
  function period(a, b) {
    var x = new Date(a), y = new Date(b);
    return hhd(a) + ' - ' + (x.toDateString() === y.toDateString() ? hh(b) : hhd(b));
  }
  function sinceCut() {
    var sh = SH(), cs = sh.cuts || [], l = sh.log || [], n = 0, i, t;
    if (!cs.length) { t = count(null); return t.d + t.l; }
    for (i = 0; i < l.length; i++) { if (l[i].t > cs[cs.length - 1].to) n++; }
    return n;
  }
  function cutNow() {
    var sh = SH(), l = sh.log || [], now = Date.now(), d = 0, c = 0, i, from, t, cs;
    if (!sh.cuts) sh.cuts = [];
    cs = sh.cuts;
    if (cs.length) {
      from = cs[cs.length - 1].to;
      for (i = 0; i < l.length; i++) { if (l[i].t > from && l[i].t <= now) { if (l[i].a === 'D') d++; else c++; } }
    } else {
      t = count(null); d = t.d; c = t.l;
      from = now;
      for (i = 0; i < l.length; i++) { if (l[i].t < from) from = l[i].t; }
    }
    if (d + c === 0) { toast(cs.length ? 'Sin movimientos desde el último corte' : 'Aún no hay movimientos'); vib('aviso'); return; }
    cs.push({ from: from, to: now, d: d, c: c });
    if (cs.length > 500) cs.splice(0, cs.length - 500);
    save(); vib('exito'); render();
    toast('Corte: ' + (d + c) + ' movimientos (' + period(from, now) + ')');
  }
  function cutsTable() {
    var cs = SH().cuts || [], h = '<table class="t2"><tr><th>#</th><th>Periodo</th><th>Mov.</th><th>Desc.</th><th>Carg.</th></tr>', i, tot = 0;
    for (i = 0; i < cs.length; i++) {
      h += '<tr><td>' + (i + 1) + '</td><td>' + period(cs[i].from, cs[i].to) + '</td><td><b>' + (cs[i].d + cs[i].c) + '</b></td><td>' + cs[i].d + '</td><td>' + cs[i].c + '</td></tr>';
      tot += cs[i].d + cs[i].c;
    }
    return h + '<tr><td></td><td>Total</td><td><b>' + tot + '</b></td><td></td><td></td></tr></table>';
  }
  function cutsCard() {
    var cs = SH().cuts || [], h = '<div class="card"><h4>Cortes de hora</h4>', i;
    if (!cs.length) return h + '<p class="hint">Aún no hay cortes. Toca el botón Corte de arriba al terminar cada periodo.</p></div>';
    h += '<div class="seq">';
    for (i = 0; i < cs.length; i++) h += '<span>' + (cs[i].d + cs[i].c) + '</span>';
    return h + '</div>' + cutsTable() + '<button type="button" class="btn blk" data-act="uncut">Eliminar último corte</button></div>';
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
  function marksRows() {
    var sh = SH(), rows = [], k, m, z, M, names;
    for (z = 0; z < 2; z++) {
      M = z ? sh.mx : sh.mk;
      for (k in M) {
        m = M[k]; names = [];
        for (var i = 0; i < m.t.length; i++) names.push(TAGS[m.t.charAt(i)]);
        rows.push([z ? 'Carga' : 'Plano', k.split('|'), names.join(', '), m.n]);
      }
    }
    return rows;
  }
  function marksHTML(max) {
    var rows = marksRows(), h, i, p;
    if (!rows.length) return '';
    h = '<table class="t2"><tr><th>Fase</th><th>Bahía</th><th>Celda</th><th>Marcas</th><th>Nota</th></tr>';
    for (i = 0; i < rows.length && (!max || i < max); i++) {
      p = rows[i][1];
      h += '<tr><td>' + rows[i][0] + '</td><td>' + esc(p[0]) + '</td><td>' + p[1] + '-' + p[2] + '</td><td>' + esc(rows[i][2]) + '</td><td>' + esc(rows[i][3]) + '</td></tr>';
    }
    h += '</table>';
    if (max && rows.length > max) h += '<p class="hint">Se muestran ' + max + ' de ' + rows.length + '. El PDF trae todas.</p>';
    return h;
  }
  function marksCard() {
    var h = marksHTML(25);
    return h ? '<div class="card"><h4>Marcas y notas</h4>' + h + '</div>' : '';
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
      else { sh.imp[k] = sel; if (sel === NA) delete sh.done[k]; }
      vib('suave');
    } else if (tab === 'des') {
      if (sh.imp[k] === NA) { vib('aviso'); toast('N/A no se mueve. Cámbialo en el paso 1 si hay que descargarlo'); return; }
      if (sh.imp[k]) {
        if (sh.done[k]) { delete sh.done[k]; vib('aviso'); } else { sh.done[k] = 1; logAdd('D', k); vib('exito'); }
      } else { vib('aviso'); return; }
    } else {
      if (sh.exp[k]) { delete sh.exp[k]; vib('aviso'); } else { sh.exp[k] = (sel && sel !== NA) ? sel : firstReal(); logAdd('C', k); vib('exito'); }
    }
    save(); render();
  }
  function cellDetails(k) {
    var sh = SH(), ex = tab === 'exp', has = ex ? sh.exp[k] : sh.imp[k];
    if (tab === 'res') return;
    if (!has) { toast('Primero coloca un contenedor en la celda'); return; }
    var M = ex ? sh.mx : sh.mk, cur = M[k] || { t: '', n: '' }, v = { t: cur.t }, p = k.split('|'), g = '', a;
    for (a in TAGS) { g += '<button type="button" class="tgb' + (v.t.indexOf(a) >= 0 ? ' on' : '') + '" data-tg="' + a + '">' + TAGS[a] + '</button>'; }
    modal('Bahía ' + p[0] + ' - celda ' + p[1] + '-' + p[2], '<p>Contenedor ' + esc(has) + '</p><div class="tgs">' + g + '</div><input type="text" id="mi" maxlength="30" placeholder="Nota o número de contenedor" value="' + esc(cur.n) + '">', [
      { t: 'Cancelar' },
      { t: 'Guardar', cls: 'pri', fn: function () {
        var t = tagStr(v.t), n = $('mi').value.trim().slice(0, 30);
        if (!t && !n) delete M[k]; else M[k] = { t: t, n: n };
        save(); render();
      } }
    ]);
    $('modal')._v = v;
  }
  function addBay() {
    ask('Nueva bahía', 'Solo números o letras sin acentos (ejemplo: 02)', '', function (v) {
      v = v.replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
      if (!v) { toast('Escribe un número de bahía'); return false; }
      if (bcfg(v)) { toast('Esa bahía ya existe'); return false; }
      var base = bcfg(bay) || DEF;
      SH().bays.push({ id: v, rows: base.rows, on: base.on, un: base.un, s0: base.s0 === 80 ? 80 : 82 });
      sortBays(); bay = v; save(); render();
    });
  }
  function validKeys(v, id) {
    var o = {}, R = rowLabels(v.rows), T = tierLabels(true, v.on, v.s0).concat(tierLabels(false, v.un)), i, j;
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
      c = bcfg(ids[i]); c.rows = v.rows; c.on = v.on; c.un = v.un; c.s0 = v.s0 === 80 ? 80 : 82;
    }
    save(); render();
  }
  function editCells() {
    var c = bcfg(bay);
    if (!c) return;
    var v = { rows: c.rows, on: c.on, un: c.un, s0: c.s0 === 80 ? 80 : 82, all: false };
    function line(lbl, key) {
      return '<div class="stp"><span>' + lbl + '</span><span><button type="button" data-step="' + key + ',-1">-</button><b id="sv_' + key + '">' + v[key] + '</b><button type="button" data-step="' + key + ',1">+</button></span></div>';
    }
    modal('Celdas de la bahía ' + bay,
      '<p>Filas: si el número es impar incluye la 00 (13 = 12 a 02, 00, 01 a 11; 14 = 14 a 02, 01 a 13). Pisos: sobre cubierta desde 82 (o 80 si lo activas), bajo cubierta desde 02.</p>' +
      line('Filas', 'rows') + line('Pisos sobre cubierta', 'on') + line('Pisos bajo cubierta', 'un') +
      '<div class="row"><span>Cubierta empieza en el piso 80</span><button type="button" class="sw' + (v.s0 === 80 ? ' on' : '') + '" data-s0="1"></button></div>' +
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
  function hex2hsl(hex) {
    var r = parseInt(hex.substr(1, 2), 16) / 255, g = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, sa = 0;
    if (d) {
      sa = d / (1 - Math.abs(2 * l - 1));
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [Math.round(h), Math.round(sa * 100), Math.round(l * 100)];
  }
  function hsl2hex(h, sa, l) {
    sa /= 100; l /= 100;
    var a = sa * Math.min(l, 1 - l);
    function f(n) {
      var k = (n + h / 30) % 12, c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return ('0' + Math.round(255 * c).toString(16)).slice(-2);
    }
    return '#' + f(0) + f(8) + f(4);
  }
  function setColor(hex, src) {
    var m = $('modal');
    if (!m._v || !$('pv')) return;
    hex = hex.toLowerCase();
    m._v.color = hex;
    $('pv').style.background = hex;
    var hs = hex2hsl(hex);
    if (src !== 'sl') { $('ph').value = hs[0]; $('ps').value = hs[1]; $('pl').value = hs[2]; }
    if (src !== 'hex') $('px').value = hex;
    var H = $('ph').value, SA = $('ps').value, L = $('pl').value;
    $('ps').style.background = 'linear-gradient(to right,hsl(' + H + ',0%,' + L + '%),hsl(' + H + ',100%,' + L + '%))';
    $('pl').style.background = 'linear-gradient(to right,#000,hsl(' + H + ',' + SA + '%,50%),#fff)';
  }
  function codeUse(c) {
    var n = 0, i, k;
    for (i = 0; i < S.ships.length; i++) {
      for (k in S.ships[i].imp) { if (S.ships[i].imp[k] === c) n++; }
      for (k in S.ships[i].exp) { if (S.ships[i].exp[k] === c) n++; }
    }
    return n;
  }
  function renameCode(a, b) {
    var i, k, sh, l, z;
    for (i = 0; i < S.ships.length; i++) {
      sh = S.ships[i];
      for (k in sh.imp) { if (sh.imp[k] === a) sh.imp[k] = b; }
      for (k in sh.exp) { if (sh.exp[k] === a) sh.exp[k] = b; }
      l = sh.log || [];
      for (z = 0; z < l.length; z++) { if (l[z].c === a) l[z].c = b; }
    }
    if (sel === a) sel = b;
  }
  function codeModal(oldC) {
    var old = null, i;
    for (i = 0; i < S.codes.length; i++) { if (S.codes[i].c === oldC) old = S.codes[i]; }
    var isNA = !!old && old.c === NA;
    var start = old ? old.color : PRESET[0];
    var sw = '<div class="sws">';
    for (i = 0; i < PRESET.length; i++) sw += '<button type="button" style="background:' + PRESET[i] + '" data-sw="' + PRESET[i] + '"></button>';
    var btns = [{ t: 'Cancelar' }];
    if (old && !isNA) {
      btns.push({ t: 'Eliminar', cls: 'dan', fn: function () {
        var n = codeUse(old.c), reales = 0, j;
        for (j = 0; j < S.codes.length; j++) { if (S.codes[j].c !== NA) reales++; }
        if (reales < 2) { toast('Debe quedar al menos un código'); return false; }
        if (n > 0) { toast('Está en uso en ' + n + ' celdas. Cámbialo o quítalo del plano primero'); return false; }
        sure('Eliminar código', 'Se elimina el código ' + old.c + '.', 'Eliminar', function () {
          for (var q = 0; q < S.codes.length; q++) { if (S.codes[q].c === old.c) { S.codes.splice(q, 1); break; } }
          if (sel === old.c) sel = firstReal();
          save(); render();
        });
        return false;
      } });
    }
    btns.push({ t: 'Guardar', cls: 'pri', fn: function () {
      var raw = $('mi').value.toUpperCase().trim(), v = raw === NA ? NA : raw.replace(/[^A-Z0-9]/g, '');
      var chosen = $('modal')._v.color, j;
      if (isNA) v = NA;
      if (!v) { toast('Escribe un código'); return false; }
      if (old) {
        if (v !== old.c) {
          for (j = 0; j < S.codes.length; j++) { if (S.codes[j].c === v) { toast('Ese código ya existe'); return false; } }
          renameCode(old.c, v); old.c = v;
        }
        old.color = chosen;
      } else {
        var f = false;
        for (j = 0; j < S.codes.length; j++) { if (S.codes[j].c === v) { S.codes[j].color = chosen; f = true; } }
        if (!f) S.codes.push({ c: v, color: chosen });
        sel = v;
      }
      save(); render();
    } });
    modal(old ? 'Editar código' : 'Código de puerto', '<p>' + (isNA ? 'N/A es referencia: no cuenta como movimiento. Aquí solo puedes cambiar su color.' : 'Letras o números (máx. 4). Si ya existe, se cambia su color.') + '</p><input type="text" id="mi" maxlength="4" value="' + esc(old ? old.c : '') + '"' + (isNA ? ' readonly' : '') + '>' +
      '<div class="pv" id="pv"></div>' +
      '<label class="rl">Matiz<input type="range" id="ph" min="0" max="360" class="hue"></label>' +
      '<label class="rl">Saturación<input type="range" id="ps" min="0" max="100"></label>' +
      '<label class="rl">Luminosidad<input type="range" id="pl" min="0" max="100"></label>' +
      '<label class="rl">Color en hexadecimal<input type="text" id="px" maxlength="7"></label>' + sw + '</div>', btns);
    $('modal')._v = { color: start };
    setColor(start, 'init');
  }
  /* ---------- Buques ---------- */
  function shipsModal() {
    var h = '', i;
    for (i = 0; i < S.ships.length; i++) {
      h += '<button type="button" class="btn blk' + (S.ships[i].id === S.cur ? ' pri' : '') + '" data-ship="' + esc(S.ships[i].id) + '">' + esc(S.ships[i].name) + '</button>';
    }
    h += '<button type="button" class="btn blk" data-shipact="ren">Renombrar este buque</button><button type="button" class="btn blk" data-shipact="dep">Depurar este buque (nueva operación)</button><button type="button" class="btn dan blk" data-shipact="del">Eliminar este buque</button>';
    modal('Buques', h, [{ t: 'Cerrar' }, { t: 'Nuevo buque', cls: 'pri', fn: function () { newShip(); return false; } }]);
  }
  function depurar() {
    var sh = SH(), c = count(null);
    modal('Depurar ' + sh.name, '<p>Conserva el buque, sus bahías y la configuración de celdas. Operación actual: ' + c.p + ' en plano, ' + c.d + ' descargados, ' + c.l + ' cargados.</p>' +
      '<button type="button" class="btn blk" data-dep="all">Empezar de cero (borrar plano, descargas, cargas, marcas y cortes)</button>' +
      '<button type="button" class="btn blk" data-dep="keep">Dejar lo que sigue a bordo como plano nuevo (lo no descargado y lo cargado)</button>',
      [{ t: 'Cancelar' }]);
  }
  function doDepurar(w) {
    var sh = SH(), k, ni = {}, nm = {}, n;
    if (w === 'keep') {
      for (k in sh.imp) { if (sh.imp[k] === NA || !sh.done[k]) { ni[k] = sh.imp[k]; if (sh.mk[k]) nm[k] = sh.mk[k]; } }
      for (k in sh.exp) { ni[k] = sh.exp[k]; if (sh.mx[k]) nm[k] = sh.mx[k]; else delete nm[k]; }
    }
    sh.imp = ni; sh.mk = nm; sh.done = {}; sh.exp = {}; sh.mx = {}; sh.log = []; sh.cuts = [];
    n = 0; for (k in ni) { if (ni[k] !== NA) n++; }
    tab = 'cap'; save(); render();
    toast(w === 'keep' ? 'Plano nuevo: ' + n + ' contenedores a bordo' : 'Buque listo para una operación nueva');
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
      pdfT(tabla()) + ((SH().cuts || []).length ? '<h3>Cortes de hora</h3>' + pdfT(cutsTable()) : '') + (marksHTML(0) ? '<h3>Marcas y notas</h3>' + pdfT(marksHTML(0)) : '') + '</div>';
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
    if (a === 'cut') cutNow();
    else if (a === 'uncut') {
      var cs = SH().cuts || [], u = cs[cs.length - 1];
      if (!u) return;
      sure('Eliminar último corte', 'Se elimina el corte ' + period(u.from, u.to) + ' (' + (u.d + u.c) + ' movimientos).', 'Eliminar', function () { cs.pop(); save(); render(); });
    } else if (a === 'pdf') pdf();
    else if (a === 'bak') backup();
    else if (a === 'res') $('file').click();
    else if (a === 'vib') { S.vib = !S.vib; save(); render(); }
    else if (a === 'vtest') {
      if (!window.NativeHaptics) { toast('La vibración funciona solo en la app instalada'); return; }
      window.NativeHaptics('prueba').then(function (r) { toast(r === 'ok' ? 'Vibración enviada' : r); });
    } else if (a === 'ships') shipsModal();
    else if (a === 'name') renameShip();
    else if (a === 'dep') depurar();
    else if (a === 'impl') pickPlan();
    else if (a === 'wipe') {
      sure('Borrar todo', 'Se borrarán todos los buques, bahías, planes y cargas. No se puede deshacer.', 'Borrar', function () {
        S = defaults(); bay = null; sel = S.codes[0].c; save(); render();
      });
    }
  }

  /* ---------- Lector de planos PDF ---------- */
  function pdfMedian(a) {
    var b = a.slice().sort(function (x, y) { return x - y; });
    return b.length ? b[Math.floor(b.length / 2)] : 0;
  }
  function pdfRows(list, tol) {
    list = list.slice().sort(function (a, b) { return a.y - b.y; });
    var rows = [], cur = null;
    list.forEach(function (o) {
      if (cur && o.y - cur.ys / cur.n.length <= tol) { cur.n.push(o); cur.ys += o.y; }
      else { cur = { n: [o], ys: o.y }; rows.push(cur); }
    });
    return rows.map(function (r) { return { y: r.ys / r.n.length, items: r.n.sort(function (a, b) { return a.x - b.x; }) }; });
  }
  function pdfTokens(ch) {
    var D = [], i, rows, toks = [];
    for (i = 0; i < ch.length; i++) { if (ch[i].c >= '0' && ch[i].c <= '9') D.push(ch[i]); }
    rows = pdfRows(D, 2.2);
    rows.forEach(function (r) {
      var cur = null;
      r.items.forEach(function (o) {
        if (cur && o.x - cur.last <= 5.5) { cur.s += o.c; cur.last = o.x; cur.xe = o.x; }
        else { cur = { s: o.c, xs: o.x, xe: o.x, last: o.x, y: r.y }; toks.push(cur); }
      });
    });
    toks.forEach(function (t) { t.x = (t.xs + t.xe) / 2; t.v = parseInt(t.s, 10); });
    return toks;
  }
  function pdfKind(ch) {
    var L = ch.filter(function (o) { return o.y < 70 && o.c >= 'A' && o.c <= 'Z'; }), rows = pdfRows(L, 3), i, s;
    for (i = 0; i < rows.length; i++) {
      s = rows[i].items.map(function (o) { return o.c; }).join('');
      if (s.indexOf('IMPORT') >= 0) return 'imp';
      if (s.indexOf('EXPORT') >= 0) return 'exp';
    }
    return '?';
  }
  function pdfPage(ch) {
    var toks = pdfTokens(ch), out = { kind: pdfKind(ch), blocks: [] }, heads = [], i, j;
    var byRow = pdfRows(toks, 2.5);
    byRow.forEach(function (r) {
      var t = r.items.filter(function (o) { return o.v <= 16; });
      if (t.length < 7) return;
      var gaps = [];
      for (j = 1; j < t.length; j++) gaps.push(t[j].x - t[j - 1].x);
      var med = pdfMedian(gaps), run = [t[0]];
      var flush = function () {
        if (run.length >= 7 && med >= 8 && med <= 16) heads.push({ y: r.y, toks: run, pitch: med, x0: run[0].x, x1: run[run.length - 1].x });
      };
      for (j = 1; j < t.length; j++) {
        if (t[j].x - t[j - 1].x > med * 1.45) { flush(); run = [t[j]]; } else run.push(t[j]);
      }
      flush();
    });
    if (!heads.length) return out;
    heads.sort(function (a, b) { return a.y - b.y || a.x0 - b.x0; });
    var bands = [];
    heads.forEach(function (h) {
      var b = bands[bands.length - 1];
      if (b && Math.abs(b.y - h.y) < 4) b.h.push(h); else bands.push({ y: h.y, h: [h] });
    });
    var Ltrs = ch.filter(function (o) { return o.c >= 'A' && o.c <= 'Z'; });
    bands.forEach(function (b, bi) {
      var yEnd = bi + 1 < bands.length ? bands[bi + 1].y - 3 : 1e9;
      // filas de pisos: números pares en los márgenes (fuera de los bloques)
      var cand = toks.filter(function (t) {
        if (t.y <= b.y + 3 || t.y >= yEnd) return false;
        if (!((t.v >= 80 && t.v <= 96) || (t.v >= 2 && t.v <= 20)) || t.v % 2) return false;
        for (var k = 0; k < b.h.length; k++) { if (t.x > b.h[k].x0 - b.h[k].pitch * 0.6 && t.x < b.h[k].x1 + b.h[k].pitch * 0.6) return false; }
        return true;
      });
      var tr = pdfRows(cand, 2.6).filter(function (r) { return r.items.length >= 2; }).map(function (r) {
        var cnt = {}, best = 0, val = 0;
        r.items.forEach(function (t) { cnt[t.v] = (cnt[t.v] || 0) + 1; if (cnt[t.v] > best) { best = cnt[t.v]; val = t.v; } });
        return { y: r.y, v: val };
      });
      if (!tr.length) return;
      var rp = []; for (j = 1; j < tr.length; j++) rp.push(tr[j].y - tr[j - 1].y);
      var rowTol = Math.max(2.5, Math.min(4.5, (pdfMedian(rp) || 8) * 0.42));
      b.h.forEach(function (h) {
        var cols = h.toks.map(function (t) { return { x: t.x, lab: ('0' + t.v).slice(-2) }; });
        var cells = {}, bad = 0, xs = 0, lo = h.x0 - h.pitch * 0.6, hi = h.x1 + h.pitch * 0.6, parts = {};
        Ltrs.forEach(function (o) {
          if (o.x < lo || o.x > hi || o.y < b.y + 3 || o.y >= yEnd + 3) return;
          var r = -1, rd = 1e9, c = 0, cd = 1e9, k;
          for (k = 0; k < tr.length; k++) { if (Math.abs(tr[k].y - o.y) < rd) { rd = Math.abs(tr[k].y - o.y); r = k; } }
          if (r < 0 || rd > rowTol) return;
          for (k = 0; k < cols.length; k++) { if (Math.abs(cols[k].x - o.x) < cd) { cd = Math.abs(cols[k].x - o.x); c = k; } }
          var key = c + '|' + r;
          (parts[key] = parts[key] || []).push(o);
        });
        var n = 0;
        for (var key in parts) {
          var p = parts[key].sort(function (a, c2) { return a.x - c2.x; }), t = p.map(function (o) { return o.c; }).join(''), ij = key.split('|');
          if (t === 'X') { xs++; continue; }
          if (!/^[A-Z]{1,3}$/.test(t)) { bad++; continue; }
          cells[cols[+ij[0]].lab + '|' + ('0' + tr[+ij[1]].v).slice(-2)] = t; n++;
        }
        // nombre de la bahía: etiquetas "Bay NN" sobre el bloque
        var labels = [];
        ch.forEach(function (o, ix) {
          if (o.c !== 'y' || ix < 2 || ch[ix - 1].c !== 'a' || ch[ix - 2].c !== 'B') return;
          if (o.y > h.y - 3 || o.y < h.y - 45 || o.x < h.x0 - 20 || o.x > h.x1 + 8) return;
          var num = toks.filter(function (t) { return Math.abs(t.y - o.y) < 3 && t.x > o.x && t.x - o.x < 18; }).sort(function (a, c2) { return a.x - c2.x; })[0];
          if (num) labels.push(('0' + num.v).slice(-2));
        });
        var on = tr.filter(function (t) { return t.v >= 80; }).map(function (t) { return t.v; });
        var un = tr.filter(function (t) { return t.v <= 20; }).map(function (t) { return t.v; });
        var name = '', ev = labels.filter(function (l) { return parseInt(l, 10) % 2 === 0; });
        if (ev.length) name = ev.slice().sort().pop(); else if (labels.length) name = labels.slice().sort().pop();
        out.blocks.push({
          band: bi + 1, x: Math.round(h.x0), labels: labels, name: name, rows: cols.length, cols: cols.map(function (c) { return c.lab; }),
          s0: (on.length && Math.min.apply(null, on) === 80) ? 80 : 82, on: on.length ? (Math.max.apply(null, on) - ((on.length && Math.min.apply(null, on) === 80) ? 80 : 82)) / 2 + 1 : 0, un: un.length ? Math.max.apply(null, un) / 2 : 0,
          cells: cells, n: n, xs: xs, bad: bad
        });
      });
    });
    return out;
  }
  function parsePlan(pages) {
    var r = [];
    for (var i = 0; i < pages.length; i++) r.push(pdfPage(pages[i].chars));
    return r;
  }

  /* ---------- Importar plano ---------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (window.pdfjsLib) { res(); return; }
      var s = document.createElement('script');
      s.src = src; s.onload = function () { res(); };
      s.onerror = function () { rej(new Error('script')); };
      document.head.appendChild(s);
    });
  }
  function readPdf(buf) {
    return loadScript('./js/pdf.min.js').then(function () {
      var L = window.pdfjsLib;
      L.GlobalWorkerOptions.workerSrc = './js/pdf.worker.min.js';
      return L.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
    }).then(function (doc) {
      var L = window.pdfjsLib, nums = [], n, tasks;
      for (n = 1; n <= doc.numPages; n++) nums.push(n);
      tasks = nums.map(function (num) {
        return doc.getPage(num).then(function (pg) {
          var vp = pg.getViewport({ scale: 1 });
          return pg.getTextContent().then(function (tc) {
            var ch = [];
            tc.items.forEach(function (it) {
              var s = it.str || '', len = s.length, k, tx, w;
              if (!len) return;
              tx = L.Util.transform(vp.transform, it.transform);
              w = it.width > 0 ? it.width : len * 4;
              for (k = 0; k < len; k++) {
                if (s.charAt(k) === ' ') continue;
                ch.push({ c: s.charAt(k), x: tx[4] + (k + 0.5) * w / len, y: tx[5] - (it.height || 8) * 0.35 });
              }
            });
            return { chars: ch };
          });
        });
      });
      return Promise.all(tasks);
    });
  }
  function planFromPdf(pages) {
    var res = parsePlan(pages), any = false, blocks = [], seen = {};
    res.forEach(function (p) { if (p.kind === 'imp') any = true; });
    res.forEach(function (p) {
      if (any ? p.kind !== 'imp' : p.kind === 'exp') return;
      p.blocks.forEach(function (b) { if (b.n > 0) blocks.push(b); });
    });
    blocks.forEach(function (b) { if (seen[b.name]) b.name = ''; seen[b.name] = 1; });
    return blocks;
  }
  function planFromJson(o) {
    if (!o || o.plan !== 1 || !Array.isArray(o.bahias)) return null;
    var out = [], i, k, b, id, cells, n, v, re = /^\d\d\|\d\d$/, rc = /^([A-Z]{1,4}|N\/A)$/;
    for (i = 0; i < o.bahias.length; i++) {
      b = o.bahias[i] || {};
      id = String(b.id || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
      cells = {}; n = 0;
      for (k in (b.celdas || {})) {
        v = String(b.celdas[k]).toUpperCase();
        if (re.test(k) && rc.test(v)) { cells[k] = v; n++; }
      }
      if (id && n) out.push({ name: id, labels: [], rows: lim(b.filas, 1, 16, 11), s0: b.pisos_sobre_desde === 80 ? 80 : 82, on: lim(b.pisos_sobre, 0, 8, 5), un: lim(b.pisos_bajo, 0, 10, 6), cells: cells, n: n });
    }
    return out;
  }
  function openPlan(blocks) {
    var tot = 0, codes = {}, nw = [], cl = [], i, k, known, h;
    blocks.forEach(function (b) { tot += b.n; for (k in b.cells) codes[b.cells[k]] = (codes[b.cells[k]] || 0) + 1; });
    for (k in codes) {
      known = false;
      for (i = 0; i < S.codes.length; i++) { if (S.codes[i].c === k) known = true; }
      if (!known) nw.push(k);
      cl.push(k + ' ' + codes[k]);
    }
    h = '<p>Se encontraron ' + blocks.length + ' bahías con ' + tot + ' contenedores. Revisa el nombre de cada bahía. Si una ya existe, su plano se reemplaza.</p>' +
      '<p class="hint">' + esc(cl.join(' - ')) + (nw.length ? '. Códigos nuevos que se agregan: ' + esc(nw.join(', ')) : '') + '</p>';
    blocks.forEach(function (b, ix) {
      h += '<div class="pb"><button type="button" class="tgb on" data-pt="' + ix + '">Sí</button><input type="text" id="pn' + ix + '" maxlength="8" value="' + esc(b.name) + '"><small>' + b.n + ' cont.</small></div>';
    });
    modal('Importar plano', h, [{ t: 'Cancelar' }, { t: 'Importar', cls: 'pri', fn: function () {
      var v = $('modal')._v, names = [], used = {}, picked = [], nm, j;
      for (j = 0; j < v.pl.length; j++) {
        if (!v.on[j]) continue;
        nm = $('pn' + j).value.replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
        if (!nm) { toast('Falta el nombre de una bahía'); return false; }
        if (used[nm]) { toast('Hay nombres repetidos: ' + nm); return false; }
        used[nm] = 1; picked.push(j); names[j] = nm;
      }
      if (!picked.length) { toast('No hay bahías seleccionadas'); return false; }
      applyPlan(v.pl, picked, names);
    } }]);
    $('modal')._v = { pl: blocks, on: blocks.map(function () { return true; }) };
    setTimeout(function () { var a = document.activeElement; if (a && a.blur) a.blur(); }, 150);
  }
  function applyPlan(pl, picked, names) {
    var sh = SH(), n = 0, skip = 0, i, j, k, b, id, cfg, old, rl, key, ok, add = 0, first = null, c, found;
    for (i = 0; i < picked.length; i++) {
      b = pl[picked[i]]; id = names[picked[i]];
      cfg = { id: id, rows: lim(b.rows, 1, 16, 11), on: lim(b.on, 0, 8, 5), un: lim(b.un, 0, 10, 6), s0: b.s0 === 80 ? 80 : 82 };
      old = bcfg(id);
      if (old) {
        for (k in sh.imp) { if (k.indexOf(id + '|') === 0) { delete sh.imp[k]; delete sh.done[k]; } }
        old.rows = cfg.rows; old.on = cfg.on; old.un = cfg.un; old.s0 = cfg.s0;
      } else sh.bays.push(cfg);
      ok = validKeys(cfg, id);
      for (k in b.cells) {
        rl = k.split('|'); key = id + '|' + rl[0] + '|' + rl[1];
        if (!ok[key]) { skip++; continue; }
        sh.imp[key] = b.cells[k]; n++;
        found = false;
        for (j = 0; j < S.codes.length; j++) { if (S.codes[j].c === b.cells[k]) found = true; }
        if (!found && b.cells[k] !== NA) { S.codes.push({ c: b.cells[k], color: PRESET[(S.codes.length + add) % PRESET.length] }); add++; }
      }
      if (!first) first = id;
    }
    sortBays(); bay = first; tab = 'cap'; save(); render();
    toast('Plano importado: ' + n + ' contenedores en ' + picked.length + ' bahías' + (skip ? ' (' + skip + ' celdas fuera de la bahía no se importaron)' : ''));
  }
  function importPlanFile(file) {
    var nm = (file.name || '').toLowerCase(), fr = new FileReader();
    if (/\.json$/.test(nm) || file.type === 'application/json') {
      fr.onload = function () {
        var o = null, b;
        try { o = JSON.parse(fr.result); } catch (e) {}
        b = planFromJson(o);
        if (b && b.length) openPlan(b);
        else toast(o && o.ships ? 'Ese archivo es un respaldo: usa Restaurar respaldo' : 'El archivo no tiene un plano válido');
      };
      fr.readAsText(file); return;
    }
    if (!(/\.pdf$/.test(nm) || file.type === 'application/pdf')) { toast('Elige un archivo PDF'); return; }
    toast('Leyendo el PDF...');
    fr.onload = function () {
      readPdf(fr.result).then(function (pages) {
        var b = planFromPdf(pages);
        if (b.length) openPlan(b);
        else toast('No encontré contenedores en este PDF. Si es una foto o un escaneo, mándasela a Claude para convertirla');
      }).catch(function () { toast('No se pudo leer el PDF'); });
    };
    fr.readAsArrayBuffer(file);
  }
  function pickPlan() {
    var f = document.createElement('input');
    f.type = 'file'; f.accept = '.pdf,application/pdf,.json,application/json'; f.style.display = 'none';
    f.addEventListener('change', function () {
      var file = f.files && f.files[0];
      if (file) importPlanFile(file);
      if (f.parentNode) f.parentNode.removeChild(f);
    });
    document.body.appendChild(f); f.click();
  }

  /* ---------- Eventos ---------- */
  function up(el, attr) {
    while (el && el !== document.body) {
      if (el.getAttribute && el.getAttribute(attr) !== null) return el;
      el = el.parentNode;
    }
    return null;
  }
  var lpT = null, lpF = false;
  function lpCancel() { clearTimeout(lpT); }
  document.addEventListener('pointerdown', function (e) {
    lpF = false; clearTimeout(lpT);
    var el = up(e.target, 'data-k');
    if (!el || !$('modal').hidden) return;
    var k = el.getAttribute('data-k');
    lpT = setTimeout(function () { lpF = true; vib('aviso'); cellDetails(k); }, 550);
  });
  document.addEventListener('pointerup', lpCancel);
  document.addEventListener('pointercancel', lpCancel);
  document.addEventListener('scroll', lpCancel, true);
  document.addEventListener('contextmenu', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'INPUT') e.preventDefault();
  });
  document.addEventListener('input', function (e) {
    var m = $('modal'), id = e.target.id;
    if (m.hidden || !m._v || !m._v.color) return;
    if (id === 'ph' || id === 'ps' || id === 'pl') setColor(hsl2hex(+$('ph').value, +$('ps').value, +$('pl').value), 'sl');
    else if (id === 'px') {
      var v = e.target.value.trim();
      if (v.charAt(0) !== '#') v = '#' + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) setColor(v, 'hex');
    }
  });
  var STEP = { rows: [1, 16], on: [0, 8], un: [0, 10] };
  document.addEventListener('click', function (e) {
    var el, m = $('modal');
    if (!m.hidden) {
      if ((el = up(e.target, 'data-sw'))) { setColor(el.getAttribute('data-sw'), 'sw'); return; }
      if ((el = up(e.target, 'data-tg')) && m._v) {
        var tc = el.getAttribute('data-tg'), on = m._v.t.indexOf(tc) < 0;
        m._v.t = on ? m._v.t + tc : m._v.t.replace(tc, '');
        el.className = 'tgb' + (on ? ' on' : ''); return;
      }
      if ((el = up(e.target, 'data-step')) && m._v) {
        var p = el.getAttribute('data-step').split(','), L = STEP[p[0]];
        m._v[p[0]] = Math.max(L[0], Math.min(L[1], m._v[p[0]] + parseInt(p[1], 10)));
        $('sv_' + p[0]).textContent = m._v[p[0]]; return;
      }
      if ((el = up(e.target, 'data-s0')) && m._v) {
        m._v.s0 = m._v.s0 === 80 ? 82 : 80; el.className = 'sw' + (m._v.s0 === 80 ? ' on' : ''); return;
      }
      if ((el = up(e.target, 'data-stepall')) && m._v) {
        m._v.all = !m._v.all; el.className = 'sw' + (m._v.all ? ' on' : ''); return;
      }
      if ((el = up(e.target, 'data-ship'))) {
        S.cur = el.getAttribute('data-ship');
        bay = SH().bays.length ? SH().bays[0].id : null;
        save(); closeModal(); render(); return;
      }
      if ((el = up(e.target, 'data-pt')) && m._v && m._v.pl) {
        var ix = +el.getAttribute('data-pt');
        m._v.on[ix] = !m._v.on[ix];
        el.className = 'tgb' + (m._v.on[ix] ? ' on' : ''); el.textContent = m._v.on[ix] ? 'Sí' : 'No'; return;
      }
      if ((el = up(e.target, 'data-dep'))) {
        var w = el.getAttribute('data-dep');
        sure(w === 'all' ? 'Empezar de cero' : 'Plano nuevo con lo que sigue a bordo',
          w === 'all' ? 'Se borran plano, descargas, cargas, marcas y cortes de este buque. Se conservan sus bahías y celdas.' : 'Lo no descargado y lo cargado pasa a ser el plano nuevo. Se reinician descargas, cargas, marcas anteriores y cortes. Se conservan las bahías.',
          'Aceptar', function () { doDepurar(w); });
        return;
      }
      if ((el = up(e.target, 'data-shipact'))) {
        var sa = el.getAttribute('data-shipact');
        if (sa === 'ren') renameShip(); else if (sa === 'dep') depurar(); else delShip();
        return;
      }
      if ((el = up(e.target, 'data-mb')) && m._b) {
        var b = m._b[+el.getAttribute('data-mb')];
        if (b.fn && b.fn() === false) return;
        closeModal();
      }
      return;
    }
    if ((el = up(e.target, 'data-k'))) { if (lpF) { lpF = false; return; } tapCell(el.getAttribute('data-k')); return; }
    if ((el = up(e.target, 'data-tab'))) {
      tab = el.getAttribute('data-tab');
      editC = false;
      if (tab !== 'cap' && (!sel || (tab === 'exp' && sel === NA))) sel = firstReal();
      render(); return;
    }
    if ((el = up(e.target, 'data-bay'))) { bay = el.getAttribute('data-bay'); render(); return; }
    if (up(e.target, 'data-addbay')) { addBay(); return; }
    if (up(e.target, 'data-editcells')) { editCells(); return; }
    if ((el = up(e.target, 'data-code'))) {
      var cd = el.getAttribute('data-code');
      if (editC) { if (cd) codeModal(cd); return; }
      sel = cd; render(); return;
    }
    if (up(e.target, 'data-addcode')) { codeModal(null); return; }
    if (up(e.target, 'data-editc')) { editC = !editC; render(); return; }
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
  window.__bc = { parsePlan: parsePlan, planFromPdf: planFromPdf, openPlan: openPlan, importPlanFile: importPlanFile };
  window.__appListo = true;
})();
