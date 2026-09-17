/*!
 * Elio Charts — 30 second preview player
 * ---------------------------------------------------------------------------
 * Drop-in, no build step, no dependencies. Adds a play button to every chart
 * row and a small docked player at the bottom of the page.
 *
 * Next.js (App Router)
 *   1. save this file as public/elio-preview-player.js
 *   2. in app/layout.tsx:
 *
 *        import Script from 'next/script'
 *        ...
 *        <Script src="/elio-preview-player.js" strategy="afterInteractive" />
 *
 * Anything else: <script defer src="/elio-preview-player.js"></script>
 *
 * It re-scans on client-side navigation, so it keeps working when you move
 * between /weekly, /year-end, /decade-end and so on without a reload.
 *
 * Previews come from the iTunes Search API. Matches are cached in
 * localStorage, so each song is only ever looked up once per visitor.
 * ---------------------------------------------------------------------------
 */

(function () {
  'use strict';

  if (window.__elioPreview) return;
  window.__elioPreview = true;

  /* ----------------------------------------------------------------- config */

  var CFG = {
    row: 'div.group.border-y',
    artwork: 'img[alt$=" artwork"]',
    artist: 'p.text-blue-600',
    anchor: 'button[aria-label="Show chart history"]',
    accent: '#0050FF',
    fade: 1.0,
    cacheKey: 'elioPreviewCache.v1'
  };

  var ACCEPT = 0.62;
  var MAX_CAND = 6;

  /* ---------------------------------------------------------------- styles */

  var css = [
    '.ec-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;',
    'flex:0 0 auto;align-self:center;}',

    '.ec-group{margin-left:auto;display:flex;align-items:center;gap:.4rem;flex:0 0 auto;align-self:center;}',

    '.ec-play{display:flex;align-items:center;justify-content:center;background:none;border:0;padding:0;',
    'margin:0;cursor:pointer;color:rgba(0,0,0,.4);transition:color .15s ease,opacity .15s ease;',
    '-webkit-tap-highlight-color:transparent;}',

    'html.dark .ec-play{color:rgba(255,255,255,.4);}',

    '.ec-play:hover{color:rgba(0,0,0,.6);}',

    'html.dark .ec-play:hover{color:rgba(255,255,255,.6);}',

    '.ec-sm .ec-play svg{width:22px;height:22px;display:block;}',

    '.ec-lg .ec-play svg{width:30px;height:30px;display:block;}',

    '.ec-sm{margin-right:.25rem;}',

    '.ec-prog{transition:stroke-dashoffset .12s linear;}',

    '.ec-wrap.ec-cur .ec-play{color:' + CFG.accent + ';}',

    '.ec-wrap.ec-dead .ec-play{opacity:.22;cursor:default;}',

    '.ec-wrap.ec-busy .ec-track{opacity:.3;}',

    '.ec-wrap.ec-busy .ec-prog{stroke-dasharray:22 104;animation:ecspin .9s linear infinite;',
    'transition:none;transform-origin:50% 50%;}',

    '@keyframes ecspin{from{transform:rotate(-90deg)}to{transform:rotate(270deg)}}',

    '.ec-dock{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#fff;color:#000;',
    'border-top:1px solid rgba(0,0,0,.12);box-shadow:0 -16px 44px rgba(0,0,0,.14);',
    'transform:translateY(112%);transition:transform .34s cubic-bezier(.22,.61,.36,1);',
    'font-family:var(--font-brown-regular),system-ui,sans-serif;}',

    'html.dark .ec-dock{background:#1b1b1b;color:#fff;border-top-color:rgba(255,255,255,.14);',
    'box-shadow:0 -16px 44px rgba(0,0,0,.6);}',

    '.ec-dock.ec-up{transform:translateY(0);}',

    '.ec-seek{position:relative;height:4px;background:rgba(0,0,0,.1);cursor:pointer;}',

    'html.dark .ec-seek{background:rgba(255,255,255,.12);}',

    '.ec-seek i{position:absolute;left:0;top:0;bottom:0;width:0;display:block;background:' +
      CFG.accent + ';',
    'transition:width .12s linear;}',

    '.ec-main{max-width:68rem;margin:0 auto;padding:.5rem .9rem;display:flex;align-items:center;gap:.7rem;}',

    '.ec-art{width:44px;height:44px;flex:0 0 auto;object-fit:cover;display:block;background:rgba(0,0,0,.08);}',

    'html.dark .ec-art{background:rgba(255,255,255,.08);}',

    '.ec-meta{flex:1 1 auto;min-width:0;}',

    '.ec-l1{display:flex;align-items:center;gap:.4rem;min-width:0;}',

    '.ec-num{flex:0 0 auto;background:' + CFG.accent +
      ';color:#fff;font-size:.54rem;font-weight:700;',
    'letter-spacing:.03em;padding:.24rem .3rem;line-height:1;',
    'font-family:var(--font-brown-bold),system-ui,sans-serif;}',

    '.ec-title{font-size:.86rem;font-family:var(--font-brown-bold),system-ui,sans-serif;',
    'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',

    '.ec-sub{margin-top:.14rem;font-size:.7rem;opacity:.55;overflow:hidden;',
    'text-overflow:ellipsis;white-space:nowrap;}',

    '.ec-ctl{display:flex;align-items:center;gap:.1rem;flex:0 0 auto;}',

    '.ec-cb{background:none;border:0;padding:.3rem;cursor:pointer;color:inherit;display:flex;opacity:.7;',
    'transition:opacity .15s ease;-webkit-tap-highlight-color:transparent;}',

    '.ec-cb:hover{opacity:1;}.ec-cb:disabled{opacity:.2;cursor:default;}',

    '.ec-cb svg{width:19px;height:19px;display:block;fill:currentColor;}',

    '.ec-cb.ec-big svg{width:26px;height:26px;}',

    '.ec-time{flex:0 0 auto;font-size:.65rem;opacity:.5;font-variant-numeric:tabular-nums;',
    'min-width:60px;text-align:right;}',

    '.ec-tb{background:none;border:0;padding:.3rem .35rem;cursor:pointer;font:inherit;font-size:.58rem;',
    'opacity:.55;flex:0 0 auto;white-space:nowrap;}',

    '.ec-tb:hover{opacity:1;color:' + CFG.accent + ';}',

    '.ec-dock.ec-open .ec-flagb{color:' + CFG.accent + ';opacity:1;}',

    '.ec-panel{max-height:0;overflow:hidden;transition:max-height .28s ease;}',

    '.ec-dock.ec-open .ec-panel{max-height:250px;border-bottom:1px solid rgba(0,0,0,.08);}',

    'html.dark .ec-dock.ec-open .ec-panel{border-bottom-color:rgba(255,255,255,.1);}',

    '.ec-pin{max-width:68rem;margin:0 auto;padding:.85rem .9rem .75rem;display:flex;flex-wrap:wrap;',
    'gap:.6rem .9rem;align-items:flex-end;position:relative;}',

    '.ec-lab{display:block;margin-bottom:.26rem;font-size:.55rem;letter-spacing:.06em;',
    'text-transform:uppercase;opacity:.5;}',

    '.ec-says{font-size:.8rem;font-family:var(--font-brown-bold),system-ui,sans-serif;}',

    '.ec-fld{flex:1 1 250px;min-width:0;}',

    '.ec-inp{width:100%;background:transparent;color:inherit;font:inherit;font-size:.78rem;',
    'padding:.44rem .5rem;border:1px solid rgba(0,0,0,.18);outline:none;}',

    'html.dark .ec-inp{border-color:rgba(255,255,255,.2);}',

    '.ec-inp:focus{border-color:' + CFG.accent + ';}',

    '.ec-btn{background:' + CFG.accent + ';color:#fff;border:0;font:inherit;font-size:.62rem;',
    'font-weight:700;letter-spacing:.03em;padding:.52rem .72rem;cursor:pointer;',
    'font-family:var(--font-brown-bold),system-ui,sans-serif;}',

    '.ec-btn.ec-ghost{background:none;color:inherit;border:1px solid rgba(0,0,0,.2);font-weight:400;}',

    'html.dark .ec-btn.ec-ghost{border-color:rgba(255,255,255,.22);}',

    '.ec-btn:hover{opacity:.86;}',

    '.ec-msg{flex:1 1 100%;font-size:.65rem;opacity:.55;}',

    '.ec-msg b{color:' + CFG.accent + ';font-weight:400;}',

    '.ec-close{position:absolute;right:.9rem;top:.5rem;background:none;border:0;cursor:pointer;',
    'font:inherit;font-size:.58rem;letter-spacing:.1em;text-transform:uppercase;opacity:.5;',
    'display:flex;align-items:center;gap:.3rem;padding:.2rem;color:inherit;}',

    '.ec-close:hover{opacity:1;color:' + CFG.accent + ';}',

    '.ec-close svg{width:11px;height:11px;fill:currentColor;}',

    '@media (max-width:640px){.ec-time{display:none;}.ec-main{padding:.45rem .6rem;gap:.5rem;}',
    '.ec-art{width:38px;height:38px;}}',

    '@media (prefers-reduced-motion:reduce){.ec-dock,.ec-seek i,.ec-prog{transition:none;}}'
  ].join('');

  var st = document.createElement('style');
  st.setAttribute('data-ec', '1');
  st.textContent = css;
  document.head.appendChild(st);

  /* --------------------------------------------------------------- helpers */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function stripDia(s) {
    try {
      return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (e) {
      return s;
    }
  }

  function norm(s) {
    s = stripDia(String(s || '').toLowerCase());

    s = s
      .replace(/&/g, ' and ')
      .replace(/\$/g, 's')
      .replace(/[\u2018\u2019\u00b4`]/g, "'");

    s = s
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ');

    s = s.replace(
      /\s-\s*(remaster|remastered|single version|radio edit|explicit|clean).*$/,
      ' '
    );

    s = s.replace(/[^a-z0-9']+/g, ' ').replace(/'/g, '');

    return s.trim().replace(/\s+/g, ' ');
  }

  function splitArtists(a) {
    return String(a || '')
      .split(
        /\s*(?:\bfeaturing\b|\bfeat\.?\b|\bft\.?\b|\bwith\b|&|,|\+|\/)\s*/i
      )
      .map(function (x) {
        return x.trim();
      })
      .filter(Boolean);
  }

  function bigrams(s) {
    var o = [],
      i;

    for (i = 0; i < s.length - 1; i++) {
      o.push(s.slice(i, i + 2));
    }

    return o;
  }

  function dice(a, b) {
    if (a === b) return 1;
    if (!a || !b || a.length < 2 || b.length < 2) return 0;

    var A = bigrams(a);
    var B = bigrams(b);
    var m = Object.create(null);
    var i, g, hit = 0;

    for (i = 0; i < A.length; i++) {
      g = A[i];
      m[g] = (m[g] || 0) + 1;
    }

    for (i = 0; i < B.length; i++) {
      g = B[i];

      if (m[g] > 0) {
        hit++;
        m[g]--;
      }
    }

    return (2 * hit) / (A.length + B.length);
  }

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;

    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);

    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function art200(u) {
    return u ? String(u).replace(/\/\d+x\d+bb/, '/200x200bb') : '';
  }

  /* ----------------------------------------------------------------- cache */

  var cache = {};

  try {
    cache =
      JSON.parse(localStorage.getItem(CFG.cacheKey) || '{}') || {};
  } catch (e) {
    cache = {};
  }

  var saveTimer = null;

  function writeNow() {
    try {
      localStorage.setItem(
        CFG.cacheKey,
        JSON.stringify(cache)
      );
    } catch (e) {}
  }

  function saveCache() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(writeNow, 400);
  }

  window.addEventListener('pagehide', function () {
    clearTimeout(saveTimer);
    writeNow();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      clearTimeout(saveTimer);
      writeNow();
    }
  });

  /* ---------------------------------------------------------------- JSONP */

  var jseq = 0;

  function jsonp(url, ms) {
    return new Promise(function (res, rej) {
      var cb =
        'ecjp' +
        ++jseq +
        '_' +
        (Date.now() % 100000);

      var sc = document.createElement('script');
      var done = false;

      var timer = setTimeout(function () {
        fin(null, new Error('timeout'));
      }, ms || 12000);

      function fin(d, e) {
        if (done) return;

        done = true;
        clearTimeout(timer);

        try {
          delete window[cb];
        } catch (x) {
          window[cb] = undefined;
        }

        if (sc.parentNode) {
          sc.parentNode.removeChild(sc);
        }

        e ? rej(e) : res(d);
      }

      window[cb] = function (d) {
        fin(d, null);
      };

      sc.onerror = function () {
        fin(null, new Error('network'));
      };

      sc.src = url + '&callback=' + cb;
      document.head.appendChild(sc);
    });
  }

  /* -------------------------------------------------------------- matching */

  function scoreCand(c, want) {
    if (!c || !c.previewUrl) return -1;
    if (c.kind && c.kind !== 'song') return -1;

    var ct = norm(c.trackName);
    var ca = norm(c.artistName);

    var t = dice(ct, want.t);

    if (ct === want.t) {
      t = 1;
    } else if (
      ct.indexOf(want.t) === 0 ||
      want.t.indexOf(ct) === 0
    ) {
      t = Math.max(t, 0.9);
    }

    var a = Math.max(
      dice(ca, want.a),
      dice(ca, want.prim)
    );

    if (ca === want.prim || ca === want.a) {
      a = 1;
    } else if (
      ca.indexOf(want.prim) >= 0 ||
      want.prim.indexOf(ca) >= 0
    ) {
      a = Math.max(a, 0.88);
    }

    var s = 0.60 * t + 0.40 * a;

    var blob = (
      (c.trackName || '') +
      ' ' +
      (c.artistName || '') +
      ' ' +
      (c.collectionName || '')
    ).toLowerCase();

    var src = want.raw.toLowerCase();

    if (
      /karaoke|tribute|made famous|originally performed|instrumental/.test(
        blob
      ) &&
      !/karaoke|tribute|instrumental/.test(src)
    ) {
      s -= 0.55;
    }

    if (
      /\bremix\b|sped up|slowed|nightcore/.test(blob) &&
      !/\bremix\b|sped up|slowed|nightcore/.test(src)
    ) {
      s -= 0.18;
    }

    if (
      /\blive\b/.test(blob) &&
      !/\blive\b/.test(src)
    ) {
      s -= 0.12;
    }

    return s;
  }

  function toCand(c, s) {
    return {
      id: c.trackId,
      name: c.trackName,
      artist: c.artistName,
      album: c.collectionName,
      url: c.previewUrl,
      art: art200(
        c.artworkUrl100 ||
        c.artworkUrl60 ||
        ''
      ),
      score: Math.round((s || 0) * 1000) / 1000
    };
  }

  function pickCands(results, want) {
    var out = [];

    for (
      var i = 0;
      i < (results || []).length;
      i++
    ) {
      var s = scoreCand(results[i], want);

      if (s > 0) {
        out.push({
          s: s,
          c: results[i]
        });
      }
    }

    out.sort(function (x, y) {
      return y.s - x.s;
    });

    return out
      .slice(0, MAX_CAND)
      .map(function (o) {
        return toCand(o.c, o.s);
      });
  }

  /* --------------------------------------------------------------- catalog */

  var catalog = Object.create(null);

  function trackFor(title, artist) {
    var ak = title + '|' + artist;

    if (catalog[ak]) {
      return catalog[ak];
    }

    var key = norm(title) + '|' + norm(artist);
    var e = cache[key];
    var p = splitArtists(artist);

    catalog[ak] = {
      title: title,
      artist: artist,
      key: key,
      ak: ak,
      rank: 0,

      want: {
        t: norm(title),
        a: norm(artist),
        prim: norm(p[0] || artist),
        raw: title + ' ' + artist
      },

      cands:
        e && e.c
          ? e.c
          : null,

      pick:
        e && e.p
          ? e.p
          : 0,

      manual:
        e && e.m
          ? e.m
          : null,

      state:
        e &&
        (e.m || (e.c && e.c.length))
          ? 'ready'
          : 'idle',

      tries: 0
    };

    return catalog[ak];
  }

  function chosen(t) {
    return t
      ? t.manual ||
          (t.cands && t.cands[t.pick]) ||
          null
      : null;
  }

  /* -------------------------------------------------------------- resolver */

  var interval = 900;
  var floorInt = 900;
  var MAXINT = 15000;
  var resolved = 0;
  var inFlight = false;

  var wanted = [];

  function needs(t) {
    return (
      t &&
      (t.state === 'idle' ||
        t.state === 'retry')
    );
  }

  function want(t, front) {
    if (!needs(t) || wanted.indexOf(t) >= 0) {
      return;
    }

    front
      ? wanted.unshift(t)
      : wanted.push(t);

    pump();
  }

  function termFor(t) {
    if (t.tries >= 2) {
      return t.title;
    }

    return (
      t.title +
      ' ' +
      (splitArtists(t.artist)[0] ||
        t.artist)
    );
  }

  function resolve(t) {
    t.state = 'fetching';
    busy(t, true);

    var u =
      'https://itunes.apple.com/search?media=music&entity=song&limit=15&term=' +
      encodeURIComponent(termFor(t));

    return jsonp(u, 12000)
      .then(function (d) {
        var c = pickCands(
          d && d.results,
          t.want
        );

        if (
          c.length &&
          c[0].score >= ACCEPT
        ) {
          t.cands = c;
          t.pick = 0;
          t.state = 'ready';

          var e =
            cache[t.key] || {};

          e.c = c;
          e.p = 0;

          cache[t.key] = e;

          saveCache();

          resolved++;

          if (resolved === 12) {
            floorInt = 3100;
          }

          interval = Math.max(
            floorInt,
            interval * 0.92
          );
        } else if (t.tries < 2) {
          t.tries++;
          t.state = 'retry';
          wanted.push(t);
        } else if (c.length) {
          t.cands = c;
          t.pick = 0;
          t.state = 'ready';

          var e2 =
            cache[t.key] || {};

          e2.c = c;
          e2.p = 0;

          cache[t.key] = e2;

          saveCache();
        } else {
          t.state = 'dead';
        }

        busy(t, false);
        paintBtn(t);

        if (t === cur()) {
          updateDock();
        }
      })
      .catch(function () {
        interval = Math.min(
          MAXINT,
          interval * 1.8
        );

        t.tries++;

        if (t.tries >= 4) {
          t.state = 'dead';
        } else {
          t.state = 'retry';
          wanted.push(t);
        }

        busy(t, false);
        paintBtn(t);
      });
  }

  function pump() {
    if (inFlight) {
      return;
    }

    var t = null;

    while (wanted.length && !t) {
      var c = wanted.shift();

      if (needs(c)) {
        t = c;
      }
    }

    if (!t) {
      return;
    }

    inFlight = true;

    resolve(t).then(function () {
      inFlight = false;
      setTimeout(pump, interval);
    });
  }

  /* --------------------------------------------------------- button plumbing */

  var SVGNS = 'http://www.w3.org/2000/svg';

  var refs = Object.create(null);

  function reindex() {
    refs = Object.create(null);

    var all =
      document.querySelectorAll(
        '.ec-wrap[data-ec-key]'
      );

    for (var i = 0; i < all.length; i++) {
      var w = all[i];
      var k =
        w.getAttribute('data-ec-key');

      (refs[k] = refs[k] || []).push({
        pw: w,
        btn: w.querySelector('.ec-play'),
        ring: w.querySelector('.ec-prog'),
        gp: w.querySelector('.ec-gplay'),
        gz: w.querySelector('.ec-gpause')
      });
    }
  }

  function each(t, fn) {
    (refs[t.ak] || []).forEach(fn);
  }

  function busy(t, on) {
    each(t, function (r) {
      r.pw.classList.toggle(
        'ec-busy',
        !!on
      );
    });
  }

  function paintBtn(t) {
    var c = chosen(t);

    each(t, function (r) {
      r.pw.classList.toggle(
        'ec-dead',
        t.state === 'dead' &&
          !t.manual
      );

      r.btn.title =
        t.state === 'dead' &&
        !t.manual
          ? 'No preview found'
          : c
          ? 'Play preview — ' +
            c.name +
            ' · ' +
            c.artist
          : 'Play 30 second preview';
    });
  }

  function setRing(t, f) {
    each(t, function (r) {
      r.ring.setAttribute(
        'stroke-dashoffset',
        String(
          125.664 *
            (1 -
              Math.max(
                0,
                Math.min(1, f)
              ))
        )
      );
    });
  }

  function setGlyph(t, playing) {
    each(t, function (r) {
      r.gp.style.display =
        playing ? 'none' : '';

      r.gz.style.display =
        playing ? '' : 'none';
    });
  }

  function markCur(t, on) {
    each(t, function (r) {
      r.pw.classList.toggle(
        'ec-cur',
        !!on
      );
    });

    if (!on) {
      setRing(t, 0);
      setGlyph(t, false);
    }
  }

  function makeWrap(t, big) {
    var wrap = el(
      'span',
      'ec-wrap ' +
        (big ? 'ec-lg' : 'ec-sm')
    );

    wrap.setAttribute(
      'data-ec-key',
      t.ak
    );

    var btn =
      document.createElement(
        'button'
      );

    btn.type = 'button';
    btn.className = 'ec-play';

    btn.setAttribute(
      'aria-label',
      'Play 30 second preview of ' +
        t.title
    );

    var s =
      document.createElementNS(
        SVGNS,
        'svg'
      );

    s.setAttribute(
      'viewBox',
      '0 0 44 44'
    );

    s.setAttribute(
      'aria-hidden',
      'true'
    );

    function circ(cls, stroke) {
      var c =
        document.createElementNS(
          SVGNS,
          'circle'
        );

      c.setAttribute(
        'class',
        cls
      );

      c.setAttribute(
        'cx',
        '22'
      );

      c.setAttribute(
        'cy',
        '22'
      );

      c.setAttribute(
        'r',
        '20'
      );

      c.setAttribute(
        'fill',
        'none'
      );

      c.setAttribute(
        'stroke',
        stroke
      );

      c.setAttribute(
        'stroke-width',
        '2.5'
      );

      return c;
    }

    var tr = circ(
      'ec-track',
      'currentColor'
    );

    var pr = circ(
      'ec-prog',
      CFG.accent
    );

    pr.setAttribute(
      'stroke-linecap',
      'round'
    );

    pr.setAttribute(
      'transform',
      'rotate(-90 22 22)'
    );

    pr.setAttribute(
      'stroke-dasharray',
      '125.664'
    );

    pr.setAttribute(
      'stroke-dashoffset',
      '125.664'
    );

    var gp =
      document.createElementNS(
        SVGNS,
        'path'
      );

    gp.setAttribute(
      'class',
      'ec-gplay'
    );

    gp.setAttribute(
      'd',
      'M18 14 L30.5 22 L18 30 Z'
    );

    gp.setAttribute(
      'fill',
      'currentColor'
    );

    var gz =
      document.createElementNS(
        SVGNS,
        'g'
      );

    gz.setAttribute(
      'class',
      'ec-gpause'
    );

    gz.setAttribute(
      'fill',
      'currentColor'
    );

    gz.style.display = 'none';

    ['17.5', '23.5'].forEach(
      function (x) {
        var r =
          document.createElementNS(
            SVGNS,
            'rect'
          );

        r.setAttribute(
          'x',
          x
        );

        r.setAttribute(
          'y',
          '15'
        );

        r.setAttribute(
          'width',
          '3'
        );

        r.setAttribute(
          'height',
          '14'
        );

        gz.appendChild(r);
      }
    );

    s.appendChild(tr);
    s.appendChild(pr);
    s.appendChild(gp);
    s.appendChild(gz);

    btn.appendChild(s);

    btn.addEventListener(
      'click',
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        clickTrack(t);
      }
    );

    wrap.appendChild(btn);

    return wrap;
  }

  /* ------------------------------------------------------------------ scan */

  var page = [];
  var seen = null;

  function scan() {
    var rows =
      document.querySelectorAll(
        CFG.row
      );

    if (!rows.length) {
      page = [];
      reindex();
      return;
    }

    var list = [];

    for (
      var i = 0;
      i < rows.length;
      i++
    ) {
      var row = rows[i];

      var img =
        row.querySelector(
          CFG.artwork
        );

      var ap =
        row.querySelector(
          CFG.artist
        );

      if (!img || !ap) {
        continue;
      }

      var alt =
        img.getAttribute(
          'alt'
        ) || '';

      var title =
        alt
          .slice(
            0,
            -' artwork'.length
          )
          .trim();

      var artist =
        ap.textContent.trim();

      if (!title || !artist) {
        continue;
      }

      /* artist charts repeat the name in both slots — nothing to preview there */

      if (
        norm(title) ===
        norm(artist)
      ) {
        continue;
      }

      var t = trackFor(
        title,
        artist
      );

      t.rank =
        list.length + 1;

      list.push(t);

      var anchors =
        row.querySelectorAll(
          CFG.anchor
        );

      for (
        var k = 0;
        k < anchors.length;
        k++
      ) {
        var a = anchors[k];

        if (
          a.getAttribute(
            'data-ec'
          ) === '1' &&
          a.previousSibling
        ) {
          continue;
        }

        if (
          a.getAttribute(
            'data-ec'
          ) === '1'
        ) {
          continue;
        }

        var big =
          /\bh-10\b/.test(
            a.className
          );

        var wrap =
          makeWrap(t, big);

        if (big) {
          /* the wide layout pushes its button right with ml-auto; group them
             so the play button sits beside it instead of drifting left */

          var g = el(
            'div',
            'ec-group'
          );

          a.parentNode.insertBefore(
            g,
            a
          );

          g.appendChild(wrap);
          g.appendChild(a);
        } else {
          a.parentNode.insertBefore(
            wrap,
            a
          );
        }

        a.setAttribute(
          'data-ec',
          '1'
        );
      }

      if (seen) {
        seen.observe(row);
      }
    }

    page = list;

    reindex();

    for (
      var j = 0;
      j < page.length;
      j++
    ) {
      paintBtn(page[j]);
    }

    var c = cur();

    if (c) {
      markCur(c, true);
      setGlyph(
        c,
        !audio.paused
      );
    }
  }

  if (window.IntersectionObserver) {
    seen =
      new IntersectionObserver(
        function (entries) {
          entries.forEach(
            function (en) {
              if (
                !en.isIntersecting
              ) {
                return;
              }

              var img =
                en.target.querySelector(
                  CFG.artwork
                );

              var ap =
                en.target.querySelector(
                  CFG.artist
                );

              if (!img || !ap) {
                return;
              }

              var t =
                catalog[
                  (
                    img.getAttribute(
                      'alt'
                    ) || ''
                  ).slice(
                    0,
                    -8
                  ).trim() +
                    '|' +
                    ap.textContent.trim()
                ];

              if (t) {
                want(t);
              }

              seen.unobserve(
                en.target
              );
            }
          );
        },
        {
          rootMargin:
            '300px 0px'
        }
      );
  }

  /* ----------------------------------------------------------------- audio */

  var audio = new Audio();

  audio.preload = 'auto';

  var canVol = true;

  try {
    audio.volume = 0.42;

    canVol =
      Math.abs(
        audio.volume - 0.42
      ) < 0.02;

    audio.volume = 1;
  } catch (e) {
    canVol = false;
  }

  var qi = -1;
  var rafId = null;
  var mFade = 0;
  var started = false;
  var errStreak = 0;
  var quiet = false;

  function cur() {
    return qi >= 0
      ? page[qi]
      : null;
  }

  function tick() {
    rafId =
      requestAnimationFrame(
        tick
      );

    var t = cur();

    if (!t) {
      return;
    }

    var d = audio.duration;

    if (!isFinite(d) || d <= 0) {
      d = 30;
    }

    var p =
      audio.currentTime;

    setRing(
      t,
      p / d
    );

    if (seekFill) {
      seekFill.style.width =
        100 *
          Math.max(
            0,
            Math.min(
              1,
              p / d
            )
          ) +
        '%';
    }

    if (dTimeText) {
      dTimeText.nodeValue =
        fmt(p) +
        ' / ' +
        fmt(d);
    }

    if (
      canVol &&
      !mFade &&
      !audio.paused
    ) {
      audio.volume =
        Math.max(
          0,
          Math.min(
            1,
            Math.min(
              p / CFG.fade,
              (d - p) /
                CFG.fade,
              1
            )
          )
        );
    }
  }

  function startRaf() {
    if (!rafId) {
      rafId =
        requestAnimationFrame(
          tick
        );
    }
  }

  function stopRaf() {
    if (rafId) {
      cancelAnimationFrame(
        rafId
      );

      rafId = null;
    }
  }

  function fadeOut(ms) {
    return new Promise(
      function (done) {
        if (
          !canVol ||
          audio.paused
        ) {
          audio.pause();
          return done();
        }

        mFade = 1;

        var v0 =
          audio.volume;

        var t0 =
          (
            window.performance ||
            Date
          ).now();

        var guard =
          setTimeout(
            function () {
              mFade = 0;
              audio.pause();
              done();
            },
            ms + 400
          );

        (function step() {
          var k =
            (
              (
                window.performance ||
                Date
              ).now() -
              t0
            ) / ms;

          if (k >= 1) {
            clearTimeout(
              guard
            );

            audio.pause();
            mFade = 0;

            return done();
          }

          audio.volume =
            Math.max(
              0,
              v0 * (1 - k)
            );

          requestAnimationFrame(
            step
          );
        })();
      }
    );
  }

  function stopAll() {
    quiet = true;

    audio.pause();
    stopRaf();

    var t = cur();

    if (t) {
      markCur(t, false);
    }

    qi = -1;
    errStreak = 0;
    started = false;

    hideDock();

    setTimeout(
      function () {
        quiet = false;
      },
      700
    );
  }

  function startTrack(t) {
    if (
      !t ||
      (
        t.state === 'dead' &&
        !t.manual
      )
    ) {
      return;
    }

    if (!chosen(t)) {
      /* jump the queue, then play */

      busy(t, true);
      want(t, true);

      var waited = 0;

      var poll =
        setInterval(
          function () {
            waited += 150;

            if (chosen(t)) {
              clearInterval(
                poll
              );

              busy(
                t,
                false
              );

              startTrack(t);
            } else if (
              t.state === 'dead' ||
              waited > 20000
            ) {
              clearInterval(
                poll
              );

              busy(
                t,
                false
              );

              paintBtn(t);
            }
          },
          150
        );

      return;
    }

    var prev = cur();

    if (
      prev &&
      prev !== t
    ) {
      markCur(
        prev,
        false
      );
    }

    qi =
      page.indexOf(t);

    started = false;

    markCur(
      t,
      true
    );

    setGlyph(
      t,
      true
    );

    setRing(
      t,
      0
    );

    if (canVol) {
      audio.volume = 0;
    }

    audio.src =
      chosen(t).url;

    try {
      audio.currentTime = 0;
    } catch (e) {}

    var pr =
      audio.play();

    if (
      pr &&
      pr.catch
    ) {
      pr.catch(
        function () {
          setGlyph(
            t,
            false
          );

          updateDock();
        }
      );
    }

    startRaf();
    showDock();
    updateDock();

    for (
      var k = qi + 1;
      k <
      Math.min(
        qi + 4,
        page.length
      );
      k++
    ) {
      want(page[k]);
    }
  }

  function advance(dir) {
    dir = dir || 1;

    var n =
      qi + dir;

    while (
      n >= 0 &&
      n < page.length &&
      page[n].state ===
        'dead' &&
      !page[n].manual
    ) {
      n += dir;
    }

    if (
      n < 0 ||
      n >= page.length
    ) {
      stopAll();
      return;
    }

    startTrack(
      page[n]
    );
  }

  audio.addEventListener(
    'ended',
    function () {
      advance(1);
    }
  );

  audio.addEventListener(
    'playing',
    function () {
      started = true;
      errStreak = 0;
    }
  );

  audio.addEventListener(
    'error',
    function () {
      if (
        quiet ||
        qi < 0
      ) {
        return;
      }

      if (!audio.error) {
        return;
      }

      if (started) {
        started = false;
        advance(1);
        return;
      }

      if (++errStreak > 3) {
        errStreak = 0;
        stopAll();
        return;
      }

      advance(1);
    }
  );

  function togglePlay() {
    var t = cur();

    if (!t) {
      return;
    }

    if (audio.paused) {
      var pr =
        audio.play();

      if (
        pr &&
        pr.catch
      ) {
        pr.catch(
          function () {}
        );
      }

      setGlyph(
        t,
        true
      );

      startRaf();
      updateDock();
    } else {
      fadeOut(140).then(
        function () {
          setGlyph(
            t,
            false
          );

          updateDock();
        }
      );
    }
  }

  function clickTrack(t) {
    errStreak = 0;

    if (
      t.state === 'dead' &&
      !t.manual
    ) {
      return;
    }

    if (cur() === t) {
      togglePlay();
      return;
    }

    if (
      cur() &&
      !audio.paused
    ) {
      var from = cur();

      fadeOut(140).then(
        function () {
          markCur(
            from,
            false
          );

          startTrack(t);
        }
      );
    } else {
      startTrack(t);
    }
  }

  function prevTrack() {
    if (qi < 0) {
      return;
    }

    if (
      audio.currentTime > 3 ||
      qi === 0
    ) {
      try {
        audio.currentTime = 0;
      } catch (e) {}

      return;
    }

    advance(-1);
  }

  /* ----------------------------------------------------------- corrections */

  function nextMatch() {
    var t = cur();

    if (!t) {
      return;
    }

    if (t.manual) {
      t.manual = null;

      var e0 =
        cache[t.key] || {};

      delete e0.m;

      cache[t.key] = e0;

      saveCache();

      if (
        t.cands &&
        t.cands.length
      ) {
        startTrack(t);
        msg(
          'Pinned song removed.'
        );
        return;
      }
    }

    if (
      !t.cands ||
      !t.cands.length
    ) {
      return;
    }

    var e =
      cache[t.key] || {
        c: t.cands,
        p: 0
      };

    if (
      t.pick + 1 <
      t.cands.length
    ) {
      t.pick++;

      e.p = t.pick;
      e.c = t.cands;

      cache[t.key] = e;

      saveCache();

      startTrack(t);

      msg(
        'Trying match ' +
          (t.pick + 1) +
          ' of ' +
          t.cands.length +
          '.'
      );
    } else {
      t.cands = null;
      t.pick = 0;
      t.tries = 2;
      t.state = 'idle';

      delete cache[t.key];

      saveCache();

      msg(
        'Out of matches — searching again.'
      );

      want(t, true);
    }
  }

  function parseAppleId(s) {
    s = String(s || '').trim();

    if (!s) {
      return null;
    }

    if (/^\d{6,}$/.test(s)) {
      return s;
    }

    var m =
      /[?&]i=(\d+)/.exec(s);

    if (m) {
      return m[1];
    }

    m =
      /\/(?:id)?(\d{6,})(?:[?#]|$)/.exec(
        s
      );

    if (m) {
      return m[1];
    }

    m =
      /(\d{8,})/.exec(s);

    return m
      ? m[1]
      : null;
  }

  function applyLink(raw) {
    var t = cur();

    if (!t) {
      return;
    }

    var id =
      parseAppleId(raw);

    if (!id) {
      msg(
        'That does not look like an Apple Music link.',
        1
      );

      return;
    }

    msg(
      'Looking it up…'
    );

    jsonp(
      'https://itunes.apple.com/lookup?id=' +
        encodeURIComponent(id) +
        '&entity=song',
      12000
    )
      .then(function (d) {
        var r =
          (
            (d &&
              d.results) ||
            []
          ).filter(
            function (x) {
              return x.previewUrl;
            }
          )[0];

        if (!r) {
          msg(
            'No preview on that one — link the song, not the album.',
            1
          );

          return;
        }

        t.manual =
          toCand(r, 1);

        var e =
          cache[t.key] || {};

        e.m = t.manual;

        cache[t.key] = e;

        saveCache();

        if (
          t.state === 'dead'
        ) {
          t.state = 'ready';
        }

        paintBtn(t);
        startTrack(t);

        msg(
          'Pinned — saved for next time.'
        );

        if (linkInp) {
          linkInp.value = '';
        }
      })
      .catch(function () {
        msg(
          'Lookup failed — check the link and try again.',
          1
        );
      });
  }

  /* ------------------------------------------------------------------ dock */

  var dock,
    seekFill,
    dTime,
    dTimeText,
    dArt,
    dTitle,
    dSub,
    dNum,
    dToggle,
    dPrev,
    dNext,
    linkInp,
    msgEl,
    saysEl;

  var msgTimer = null;

  var I_PREV =
    '<path d="M7 6h2.2v12H7z"/><path d="M19.5 6v12l-9.2-6z"/>';

  var I_NEXT =
    '<path d="M14.8 6H17v12h-2.2z"/><path d="M4.5 6v12l9.2-6z"/>';

  var I_PLAY =
    '<path d="M7.5 5v14l11.5-7z"/>';

  var I_PAUSE =
    '<rect x="6.6" y="5" width="3.6" height="14"/><rect x="13.8" y="5" width="3.6" height="14"/>';

  var I_X =
    '<path d="M18.3 6.7l-1-1-5.3 5.3-5.3-5.3-1 1 5.3 5.3-5.3 5.3 1 1 5.3-5.3 5.3 5.3 1-1-5.3-5.3z"/>';

  function cbtn(paths, cls) {
    var b =
      document.createElement(
        'button'
      );

    b.type = 'button';

    b.className =
      'ec-cb' +
      (cls
        ? ' ' + cls
        : '');

    b.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      paths +
      '</svg>';

    return b;
  }

  function msg(text, warn) {
    if (!msgEl) {
      return;
    }

    msgEl.textContent = '';

    msgEl.appendChild(
      el(
        'b',
        null,
        text
      )
    );

    clearTimeout(
      msgTimer
    );

    msgTimer = setTimeout(
      function () {
        if (msgEl) {
          msgEl.textContent =
            '';
        }
      },
      warn ? 7000 : 4000
    );
  }

  function buildDock() {
    if (dock) {
      return;
    }

    dock = el(
      'div',
      'ec-dock'
    );

    dock.setAttribute(
      'role',
      'region'
    );

    dock.setAttribute(
      'aria-label',
      'Preview player'
    );

    var panel = el(
      'div',
      'ec-panel'
    );

    var pin = el(
      'div',
      'ec-pin'
    );

    var closeP =
      document.createElement(
        'button'
      );

    closeP.className =
      'ec-close';

    closeP.type = 'button';

    closeP.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      I_X +
      '</svg>';

    closeP.appendChild(
      document.createTextNode(
        'Close'
      )
    );

    closeP.addEventListener(
      'click',
      function () {
        dock.classList.remove(
          'ec-open'
        );

        pad();
      }
    );

    var says = el(
      'div'
    );

    says.style.cssText =
      'flex:1 1 180px;min-width:0';

    says.appendChild(
      el(
        'span',
        'ec-lab',
        'Chart entry'
      )
    );

    saysEl = el(
      'div',
      'ec-says'
    );

    says.appendChild(
      saysEl
    );

    var tryB = el(
      'button',
      'ec-btn ec-ghost',
      'Try next match'
    );

    tryB.type = 'button';

    tryB.addEventListener(
      'click',
      nextMatch
    );

    var fld = el(
      'div',
      'ec-fld'
    );

    fld.appendChild(
      el(
        'span',
        'ec-lab',
        'Or pin the right song'
      )
    );

    linkInp =
      document.createElement(
        'input'
      );

    linkInp.className =
      'ec-inp';

    linkInp.type = 'text';

    linkInp.placeholder =
      'Paste an Apple Music song link';

    linkInp.addEventListener(
      'keydown',
      function (e) {
        if (
          e.key ===
          'Enter'
        ) {
          e.preventDefault();
          applyLink(
            linkInp.value
          );
        }
      }
    );

    fld.appendChild(
      linkInp
    );

    var pinB = el(
      'button',
      'ec-btn',
      'Pin'
    );

    pinB.type = 'button';

    pinB.addEventListener(
      'click',
      function () {
        applyLink(
          linkInp.value
        );
      }
    );

    msgEl = el(
      'div',
      'ec-msg'
    );

    pin.appendChild(
      closeP
    );

    pin.appendChild(
      says
    );

    pin.appendChild(
      tryB
    );

    pin.appendChild(
      fld
    );

    pin.appendChild(
      pinB
    );

    pin.appendChild(
      msgEl
    );

    panel.appendChild(
      pin
    );

    var seek = el(
      'div',
      'ec-seek'
    );

    seekFill =
      document.createElement(
        'i'
      );

    seek.appendChild(
      seekFill
    );

    seek.addEventListener(
      'click',
      function (e) {
        if (qi < 0) {
          return;
        }

        var r =
          seek.getBoundingClientRect();

        var d =
          isFinite(
            audio.duration
          ) &&
          audio.duration >
            0
            ? audio.duration
            : 30;

        try {
          audio.currentTime =
            Math.max(
              0,
              Math.min(
                d - 0.05,
                (
                  (
                    e.clientX -
                    r.left
                  ) /
                  r.width
                ) *
                  d
              )
            );
        } catch (x) {}
      }
    );

    var main = el(
      'div',
      'ec-main'
    );

    dArt =
      document.createElement(
        'img'
      );

    dArt.className =
      'ec-art';

    dArt.alt = '';

    var dm = el(
      'div',
      'ec-meta'
    );

    var l1 = el(
      'div',
      'ec-l1'
    );

    dNum = el(
      'span',
      'ec-num'
    );

    dTitle = el(
      'span',
      'ec-title'
    );

    l1.appendChild(
      dNum
    );

    l1.appendChild(
      dTitle
    );

    dSub = el(
      'div',
      'ec-sub'
    );

    dm.appendChild(
      l1
    );

    dm.appendChild(
      dSub
    );

    var ctl = el(
      'div',
      'ec-ctl'
    );

    dPrev = cbtn(
      I_PREV
    );

    dPrev.title =
      'Previous';

    dToggle = cbtn(
      I_PLAY,
      'ec-big'
    );

    dToggle.title =
      'Play or pause';

    dNext = cbtn(
      I_NEXT
    );

    dNext.title =
      'Next';

    dPrev.addEventListener(
      'click',
      prevTrack
    );

    dToggle.addEventListener(
      'click',
      togglePlay
    );

    dNext.addEventListener(
      'click',
      function () {
        advance(1);
      }
    );

    ctl.appendChild(
      dPrev
    );

    ctl.appendChild(
      dToggle
    );

    ctl.appendChild(
      dNext
    );

    dTime = el(
      'div',
      'ec-time'
    );

    dTimeText =
      document.createTextNode(
        '0:00 / 0:30'
      );

    dTime.appendChild(
      dTimeText
    );

    var flag = el(
      'button',
      'ec-tb ec-flagb',
      'Wrong track?'
    );

    flag.type = 'button';

    flag.addEventListener(
      'click',
      function () {
        dock.classList.toggle(
          'ec-open'
        );

        setTimeout(
          pad,
          300
        );
      }
    );

    var x = cbtn(
      I_X
    );

    x.title =
      'Close player';

    x.setAttribute(
      'aria-label',
      'Close player'
    );

    x.addEventListener(
      'click',
      function () {
        fadeOut(140).then(
          stopAll
        );
      }
    );

    main.appendChild(
      dArt
    );

    main.appendChild(
      dm
    );

    main.appendChild(
      ctl
    );

    main.appendChild(
      dTime
    );

    main.appendChild(
      flag
    );

    main.appendChild(
      x
    );

    dock.appendChild(
      panel
    );

    dock.appendChild(
      seek
    );

    dock.appendChild(
      main
    );

    document.body.appendChild(
      dock
    );
  }

  function dockUp() {
    return (
      !!dock &&
      dock.classList.contains(
        'ec-up'
      )
    );
  }

  function pad() {
    document.body.style.paddingBottom =
      dockUp()
        ? dock.offsetHeight +
          'px'
        : '';
  }

  function showDock() {
    buildDock();

    if (dockUp()) {
      return;
    }

    void dock.offsetHeight;

    dock.classList.add(
      'ec-up'
    );

    setTimeout(
      pad,
      380
    );
  }

  function hideDock() {
    if (!dock) {
      return;
    }

    dock.classList.remove(
      'ec-up'
    );

    dock.classList.remove(
      'ec-open'
    );

    document.body.style.paddingBottom =
      '';
  }

  function updateDock() {
    var t = cur();

    if (!dock || !t) {
      return;
    }

    var c = chosen(t);

    if (!c) {
      return;
    }

    if (
      dArt.getAttribute(
        'src'
      ) !== c.art
    ) {
      dArt.setAttribute(
        'src',
        c.art || ''
      );
    }

    if (t.rank) {
      dNum.style.display =
        '';

      dNum.textContent =
        'No.' + t.rank;
    } else {
      dNum.style.display =
        'none';
    }

    dTitle.textContent =
      c.name;

    dSub.textContent =
      (c.artist || '') +
      (c.album
        ? ' · ' +
          c.album
        : '') +
      (t.manual
        ? ' · pinned'
        : '');

    dToggle.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      (audio.paused
        ? I_PLAY
        : I_PAUSE) +
      '</svg>';

    dNext.disabled =
      qi >=
      page.length - 1;

    if (saysEl) {
      saysEl.textContent =
        t.title +
        ' — ' +
        t.artist;
    }
  }

  audio.addEventListener(
    'play',
    updateDock
  );

  audio.addEventListener(
    'pause',
    updateDock
  );

  window.addEventListener(
    'resize',
    pad
  );

  /* ------------------------------------------------------------------ boot */

  var pending = null;

  function later() {
    clearTimeout(
      pending
    );

    pending = setTimeout(
      scan,
      120
    );
  }

  /* Our own dock and buttons mutate constantly while a preview plays.
     Ignoring them keeps the debounce from being reset on every frame,
     which would stop us ever noticing a real navigation. */

  function ours(n) {
    while (
      n &&
      n !== document.body
    ) {
      if (
        n.nodeType === 1 &&
        n.classList &&
        (
          n.classList.contains(
            'ec-dock'
          ) ||
          n.classList.contains(
            'ec-wrap'
          )
        )
      ) {
        return true;
      }

      n = n.parentNode;
    }

    return false;
  }

  function boot() {
    scan();

    new MutationObserver(
      function (muts) {
        for (
          var i = 0;
          i < muts.length;
          i++
        ) {
          var m =
            muts[i];

          if (
            m.type !==
            'childList'
          ) {
            continue;
          }

          if (
            ours(
              m.target
            )
          ) {
            continue;
          }

          if (
            m.addedNodes
              .length ||
            m.removedNodes
              .length
          ) {
            later();
            return;
          }
        }
      }
    ).observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    [
      'pushState',
      'replaceState'
    ].forEach(
      function (fn) {
        var orig =
          history[fn];

        if (
          typeof orig !==
          'function'
        ) {
          return;
        }

        history[fn] =
          function () {
            var r =
              orig.apply(
                this,
                arguments
              );

            later();

            return r;
          };
      }
    );

    window.addEventListener(
      'popstate',
      later
    );
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      function () {
        setTimeout(
          boot,
          60
        );
      }
    );
  } else {
    setTimeout(
      boot,
      60
    );
  }

  window.elioPreview = {
    rows: function () {
      return page;
    },

    audio: audio,

    rescan: scan,

    stop: stopAll,

    clearCache: function () {
      cache = {};

      try {
        localStorage.removeItem(
          CFG.cacheKey
        );
      } catch (e) {}
    }
  };
})();