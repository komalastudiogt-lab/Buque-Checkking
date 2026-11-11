(function () {
  var P = 'bchk_';
  var ROWS = ['10', '08', '06', '04', '02', '00', '01', '03', '05', '07', '09'];
  var ON = ['90', '88', '86', '84', '82'];
  var UN = ['12', '10', '08', '06', '04', '02'];
  var PRESET = ['#e0525a', '#3fa7d6', '#59c36a', '#f2a541', '#b57edc', '#2ec4b6', '#f06eaa', '#9aa5b1', '#c9b037', '#ff8a4c', '#7f9cff', '#a3d977'];
  var CHK = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" stroke-width="3"/></svg>';
  var S = defaults();
  var tab = 'imp', mode = 'cap', bay = null, sel = '', tt = null;

  function defaults() {
    return {
      buque: 'Mi buque', bays: [], imp: {}, done: {}, exp: {}, vib: true,
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
  function save() { try { localStorage.setItem(P + 'data', JSON.stringify(S)); } catch (e) {} }
  function valid(o) {
    return o && typeof o === 'object' && Array.isArray(o.bays) && Array.isArray(o.codes) &&
      o.imp && typeof o.imp === 'object' && o.exp && typeof o.exp === 'object';
  }
  function norm(o) {
    var r = defaults(), k, i;
    r.buque = typeof o.buque === 'string' ? o.buque.slice(0, 40) : r.buque;
    r.vib = o.vib !== false;
    r.bays = [];
    for (i = 0; i < o.bays.length; i++) {
      var b = String(o.bays[i]).replace(/[^A-Za-z0-9]/g, '').slice(0, 6);
      if (b && r.bays.indexOf(b) < 0) r.bays.push(b);
    }
    var cs = [];
    for (i = 0; i < o.codes.length; i++) {
      var c = o.codes[i];
      if (c && typeof c.c === 'string' && /^[A-Za-z0-9]{1,4}$/.test(c.c) && /^#[0-9a-fA-F]{6}$/.test(c.color || '')) {
        cs.push({ c: c.c.toUpperCase(), color: c.color });
      }
    }
    if (cs.length) r.codes = cs;
    var re = /^[A-Za-z0-9]{1,6}\|\d\d\|\d\d$/;
    r.imp = {}; r.done = {}; r.exp = {};
    for (k in o.imp) { if (re.test(k) && typeof o.imp[k] === 'string') r.imp[k] = o.imp[k].slice(0, 4); }
    if (o.done && typeof o.done === 'object') { for (k in o.done) { if (r.imp[k] && o.done[k]) r.done[k] = 1; } }
    for (k in o.exp) { if (re.test(k) && typeof o.exp[k] === 'string') r.exp[k] = o.exp[k].slice(0, 4); }
    return r;
  }
  function load() {
    try {
      var t = localStorage.getItem(P + 'data');
      if (t) { var o = JSON.parse(t); if (valid(o)) S = norm(o); }
    } catch (e) {}
    if (S.bays.length) bay = S.bays[0];
    sel = S.codes[0].c;
  }
  function col(c) {
    for (var i = 0; i < S.codes.length; i++) { if (S.codes[i].c === c) return S.codes[i].color; }
    return '#9aa5b1';
  }
  function count(b) {
    var r = { p: 0, d: 0, l: 0 }, k;
    for (k in S.imp) { if (!b || k.split('|')[0] === b) { r.p++; if (S.done[k]) r.d++; } }
    for (k in S.exp) { if (!b || k.split('|')[0] === b) r.l++; }
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
    m._b = btns; m.hidden = false;
    var inp = m.querySelector('input[type=text]');
    if (inp) setTimeout(function () { inp.focus(); }, 60);
  }
  function closeModal() { var m = $('modal'); m.hidden = true; m.innerHTML = ''; m._b = null; }
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
    $('ttl').textContent = S.buque;
    $('cnt').innerHTML = '<span class="okc">Desc.<br><b>' + c.d + '</b>/' + c.p + '</span><span>Carg.<br><b>' + c.l + '</b></span>';
    var navb = document.querySelectorAll('nav button');
    for (var i = 0; i < navb.length; i++) { navb[i].className = navb[i].getAttribute('data-tab') === tab ? 'on' : ''; }
    var r = tab === 'res';
    $('bays').hidden = r; $('tools').hidden = r; $('grid').hidden = r; $('res').hidden = !r;
    if (r) { renderRes(); return; }
    renderBays(); renderTools(); renderGrid();
  }
  function renderBays() {
    var h = '';
    for (var i = 0; i < S.bays.length; i++) {
      h += '<button type="button" class="bay' + (S.bays[i] === bay ? ' on' : '') + '" data-bay="' + esc(S.bays[i]) + '">' + esc(S.bays[i]) + '</button>';
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
    var h = '';
    if (tab === 'imp') {
      h += '<div class="seg"><button type="button" data-mode="cap" class="' + (mode === 'cap' ? 'on' : '') + '">Capturar plan</button>' +
        '<button type="button" data-mode="des" class="' + (mode === 'des' ? 'on' : '') + '">Descargar</button></div>';
      if (mode === 'cap') h += palette(true) + '<p class="hint">Elige un código y toca las celdas del plan.</p>';
      else h += '<p class="hint">Toca un contenedor para marcarlo descargado. Tócalo otra vez para deshacer.</p>';
    } else {
      h += palette(false) + '<p class="hint">Toca la celda donde cargaste. Tócala otra vez para quitarla.</p>';
    }
    $('tools').innerHTML = h;
  }
  function renderGrid() {
    if (!bay) {
      $('grid').innerHTML = '<div class="empty">Aún no hay bahías.<br><br><button type="button" class="btn pri" data-addbay="1">Agregar bahía</button></div>';
      return;
    }
    var h = '<div class="g"><div></div>', i, j, k, v, t, secs = [['SOBRE CUBIERTA', ON], ['BAJO CUBIERTA', UN]];
    for (i = 0; i < ROWS.length; i++) h += '<div class="ch">' + ROWS[i] + '</div>';
    for (var s = 0; s < 2; s++) {
      h += '<div class="sec">' + secs[s][0] + '</div>';
      for (j = 0; j < secs[s][1].length; j++) {
        t = secs[s][1][j];
        h += '<div class="lb">' + t + '</div>';
        for (i = 0; i < ROWS.length; i++) {
          k = bay + '|' + ROWS[i] + '|' + t;
          v = tab === 'imp' ? S.imp[k] : S.exp[k];
          if (!v) { h += '<button type="button" class="c" data-k="' + k + '"></button>'; continue; }
          if (tab === 'imp' && S.done[k]) {
            h += '<button type="button" class="c dn" style="border-color:' + col(v) + ';color:' + col(v) + '" data-k="' + k + '">' + CHK + '</button>';
          } else {
            h += '<button type="button" class="c" style="background:' + col(v) + ';border-color:' + col(v) + '" data-k="' + k + '">' + esc(v) + '</button>';
          }
        }
      }
    }
    h += '</div><button type="button" class="btn blk" data-delbay="1">Eliminar bahía ' + esc(bay) + '</button>';
    $('grid').innerHTML = h;
  }
  function renderRes() {
    var t = count(null), h = '', i;
    h += '<div class="card"><h4>Totales</h4><div class="big"><div><b>' + t.p + '</b>Plan</div><div><b>' + t.d + '</b>Descargados</div><div><b>' + (t.p - t.d) + '</b>Pendientes</div><div><b>' + t.l + '</b>Cargados</div></div>';
    h += '<p class="hint">Movimientos totales: <b>' + (t.d + t.l) + '</b></p></div>';
    h += '<div class="card"><h4>Por bahía</h4>' + tabla() + '</div>';
    h += '<div class="card"><h4>Archivos</h4><button type="button" class="btn pri blk" data-act="pdf">Compartir resumen en PDF</button>' +
      '<button type="button" class="btn blk" data-act="bak">Guardar respaldo (JSON)</button>' +
      '<button type="button" class="btn blk" data-act="res">Restaurar respaldo</button></div>';
    h += '<div class="card"><h4>Ajustes</h4><div class="row"><span>Vibrar al marcar</span><button type="button" class="sw' + (S.vib ? ' on' : '') + '" data-act="vib" aria-label="Vibración"></button></div>' +
      '<button type="button" class="btn blk" data-act="vtest">Probar vibración</button>' +
      '<button type="button" class="btn blk" data-act="name">Cambiar nombre del buque</button>' +
      '<button type="button" class="btn dan blk" data-act="wipe">Borrar todo</button></div>';
    $('res').innerHTML = h;
  }
  function tabla() {
    if (!S.bays.length) return '<p class="hint">Sin bahías.</p>';
    var h = '<table><tr><th>Bahía</th><th>Plan</th><th>Desc.</th><th>Pend.</th><th>Carg.</th></tr>';
    for (var i = 0; i < S.bays.length; i++) {
      var c = count(S.bays[i]);
      h += '<tr><td>' + esc(S.bays[i]) + '</td><td>' + c.p + '</td><td>' + c.d + '</td><td>' + (c.p - c.d) + '</td><td>' + c.l + '</td></tr>';
    }
    return h + '</table>';
  }

  /* ---------- Acciones ---------- */
  function tapCell(k) {
    if (tab === 'imp') {
      if (mode === 'cap') {
        if (!sel || S.imp[k] === sel) { delete S.imp[k]; delete S.done[k]; }
        else S.imp[k] = sel;
        vib('suave');
      } else if (S.imp[k]) {
        if (S.done[k]) { delete S.done[k]; vib('aviso'); } else { S.done[k] = 1; vib('exito'); }
      } else { vib('aviso'); return; }
    } else {
      if (S.exp[k]) { delete S.exp[k]; vib('aviso'); } else { S.exp[k] = sel || S.codes[0].c; vib('exito'); }
    }
    save(); render();
  }
  function addBay() {
    ask('Nueva bahía', 'Número de bahía (ejemplo: 01)', '', function (v) {
      v = v.replace(/[^A-Za-z0-9]/g, '').slice(0, 6);
      if (!v) { toast('Escribe un número de bahía'); return false; }
      if (S.bays.indexOf(v) >= 0) { toast('Esa bahía ya existe'); return false; }
      S.bays.push(v); bay = v; save(); render();
    });
  }
  function addCode() {
    var chosen = PRESET[0];
    var sw = '<div class="sws">';
    for (var i = 0; i < PRESET.length; i++) sw += '<button type="button" class="' + (i === 0 ? 'on' : '') + '" style="background:' + PRESET[i] + '" data-sw="' + PRESET[i] + '"></button>';
    modal('Código de puerto', '<p>Letras o números (máx. 4). Si ya existe, se cambia su color.</p><input type="text" id="mi" maxlength="4">' + sw + '</div>', [
      { t: 'Cancelar' },
      { t: 'Guardar', cls: 'pri', fn: function () {
        var v = $('mi').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        var on = document.querySelector('.sws button.on');
        chosen = on ? on.getAttribute('data-sw') : chosen;
        if (!v) { toast('Escribe un código'); return false; }
        var f = false;
        for (var j = 0; j < S.codes.length; j++) { if (S.codes[j].c === v) { S.codes[j].color = chosen; f = true; } }
        if (!f) S.codes.push({ c: v, color: chosen });
        sel = v; save(); render();
      } }
    ]);
  }
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
        S = norm(o); bay = S.bays[0] || null; sel = S.codes[0].c; save(); render(); toast('Respaldo restaurado');
      });
    };
    fr.readAsText(file);
  }
  function pdf() {
    if (!window.html2pdf) { toast('PDF disponible solo en la app instalada'); return; }
    var t = count(null);
    var box = $('pdfbox');
    box.innerHTML = '<div style="background:#fff;color:#000;padding:20px;font-family:sans-serif"><h2 style="margin:0">' + esc(S.buque) + '</h2><p>Resumen de operación - ' + stamp() +
      '</p><p><b>Plan:</b> ' + t.p + ' &nbsp; <b>Descargados:</b> ' + t.d + ' &nbsp; <b>Pendientes:</b> ' + (t.p - t.d) + ' &nbsp; <b>Cargados:</b> ' + t.l + ' &nbsp; <b>Movimientos:</b> ' + (t.d + t.l) + '</p>' +
      tabla().replace('<table>', '<table style="width:100%;border-collapse:collapse;font-size:14px" border="1" cellpadding="5">') + '</div>';
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
    } else if (a === 'name') {
      ask('Nombre del buque', 'Nombre', S.buque, function (v) { if (!v) return false; S.buque = v; save(); render(); });
    } else if (a === 'wipe') {
      sure('Borrar todo', 'Se borrarán bahías, plan y cargas. No se puede deshacer.', 'Borrar', function () {
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
  document.addEventListener('click', function (e) {
    var el, m = $('modal');
    if (!m.hidden) {
      el = up(e.target, 'data-sw');
      if (el) {
        var all = document.querySelectorAll('.sws button');
        for (var i = 0; i < all.length; i++) all[i].className = '';
        el.className = 'on'; return;
      }
      el = up(e.target, 'data-mb');
      if (el && m._b) {
        var b = m._b[+el.getAttribute('data-mb')];
        if (b.fn && b.fn() === false) return;
        closeModal();
      }
      return;
    }
    if ((el = up(e.target, 'data-k'))) { tapCell(el.getAttribute('data-k')); return; }
    if ((el = up(e.target, 'data-tab'))) {
      tab = el.getAttribute('data-tab');
      if (tab === 'exp' && !sel) sel = S.codes[0].c;
      render(); return;
    }
    if ((el = up(e.target, 'data-bay'))) { bay = el.getAttribute('data-bay'); render(); return; }
    if (up(e.target, 'data-addbay')) { addBay(); return; }
    if ((el = up(e.target, 'data-mode'))) { mode = el.getAttribute('data-mode'); render(); return; }
    if ((el = up(e.target, 'data-code'))) { sel = el.getAttribute('data-code'); render(); return; }
    if (up(e.target, 'data-addcode')) { addCode(); return; }
    if (up(e.target, 'data-delbay')) {
      sure('Eliminar bahía ' + bay, 'Se borra su plan y sus cargas.', 'Eliminar', function () {
        var k, p = bay + '|';
        for (k in S.imp) { if (k.indexOf(p) === 0) { delete S.imp[k]; delete S.done[k]; } }
        for (k in S.exp) { if (k.indexOf(p) === 0) delete S.exp[k]; }
        S.bays.splice(S.bays.indexOf(bay), 1); bay = S.bays[0] || null; save(); render();
      });
      return;
    }
    if ((el = up(e.target, 'data-act'))) { act(el.getAttribute('data-act')); return; }
    if (up(e.target, 'id') && up(e.target, 'id').id === 'ttl') act('name');
  });
  $('file').addEventListener('change', function () {
    if (this.files && this.files[0]) restore(this.files[0]);
    this.value = '';
  });

  load();
  render();
  window.__appListo = true;
})();
