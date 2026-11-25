// Ink-based clip finder. For each word, its letter shapes (canvas actualBoundingBox) are placed on the
// word's line box via the font's ascent, then compared with every clipping ancestor. A word fully outside
// a clip is a deliberate cut (clamp, truncation) and is ignored; a word partly cut is reported.
((rootSel) => {
  const root = rootSel ? document.querySelector(rootSel) : document.body; if (!root) return [];
  const pe = document.createElement('style'); pe.textContent = '*{pointer-events:auto!important}'; document.head.appendChild(pe);
  const out = [], cvs = document.createElement('canvas').getContext('2d');
  const isClip = cs => /(hidden|clip)/.test(cs.overflowX + ' ' + cs.overflowY) || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none');
  const name = e => (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : (e.id ? '' : e.tagName.toLowerCase()));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent.trim() ? 1 : 2 });
  for (let n; (n = walker.nextNode());) {
    const el = n.parentElement; if (!el) continue;
    if (el.closest('svg, .sq-visually-hidden, [hidden], [inert]')) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    // skip the back of a flipped card and anything else not painted
    let hiddenFace = false; for (let a = el; a; a = a.parentElement) { const s = getComputedStyle(a); if (+s.opacity === 0 || s.visibility === 'hidden' || s.display === 'none') { hiddenFace = true; break } }
    if (hiddenFace) continue;
    const clips = []; for (let a = el; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (isClip(s)) clips.push(a) }
    const rotated = (() => { for (let a = el; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/vertical/.test(s.writingMode) || (s.transform !== 'none' && !/^matrix\(1, 0, 0, 1,|^matrix\(([\d.]+), 0, 0, \1,/.test(s.transform))) return true } return false })();
    if (rotated) continue;
    cvs.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const text = n.textContent, re = /\S+/g; let m;
    while ((m = re.exec(text))) {
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const rects = [...r.getClientRects()].filter(x => x.width > 0.5); if (rects.length !== 1) continue; // a word split over two lines at its hyphen
      const box = rects[0], mt = cvs.measureText(m[0]);
      const z = box.height / ((mt.fontBoundingBoxAscent + mt.fontBoundingBoxDescent) || box.height); // page zoom
      const base = box.top + mt.fontBoundingBoxAscent * z;
      const ink = { top: base - mt.actualBoundingBoxAscent * z, bottom: base + mt.actualBoundingBoxDescent * z, left: box.left - mt.actualBoundingBoxLeft * z, right: box.left + mt.actualBoundingBoxRight * z };
      if (ink.bottom < 0 || ink.top > innerHeight) continue; // offscreen rows may skip layout (content-visibility)
      const fullyHidden = clips.some(c => { const cr = c.getBoundingClientRect(); return ink.bottom <= cr.top + 1 || ink.top >= cr.bottom - 1 || ink.right <= cr.left + 1 || ink.left >= cr.right - 1 });
      if (fullyHidden) continue;
      let hit = null;
      for (const c of clips) {
        const cr = c.getBoundingClientRect(), s = getComputedStyle(c);
        const v = /(hidden|clip)/.test(s.overflowY) || (s.webkitLineClamp && s.webkitLineClamp !== 'none'), h = /(hidden|clip)/.test(s.overflowX);
        const cut = v && ink.bottom > cr.bottom + .75 ? ['bottom', ink.bottom - cr.bottom] : v && ink.top < cr.top - .75 ? ['top', cr.top - ink.top] : h && ink.right > cr.right + .75 && s.textOverflow !== 'ellipsis' && cs.textOverflow !== 'ellipsis' ? ['right', ink.right - cr.right] : null;
        if (cut) { hit = { clip: name(c), side: cut[0], by: Math.round(cut[1] * 10) / 10 }; break }
      }
      if (!hit) {
        // covered: another element painted over the letters
        const ys = [ (ink.top + ink.bottom) / 2 ], xs = [.1, .3, .5, .7, .9].map(f => ink.left + (ink.right - ink.left) * f);
        for (const y of ys) for (const x of xs) {
          if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
          const top = document.elementFromPoint(x, y);
          if (top && top !== el && !el.contains(top) && !top.contains(el) && !top.closest('.sq-nav, .sq-masthead, dialog:not([open])') && !(top.parentElement === el.parentElement && [...top.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()))) {
            const shown = t => { for (let a = t; a && a !== document.body; a = a.parentElement) { const ts = getComputedStyle(a); if (+ts.opacity < .05 || ts.visibility === 'hidden') return false } return true };
            const paints = t => { if (!shown(t)) return false; for (let a = t; a && a !== document.body && !a.contains(el); a = a.parentElement) { const ts = getComputedStyle(a); if (+ts.opacity < .05) return false; if (/^(svg|img|canvas|path|g|text|circle|rect|polygon|use)$/i.test(a.tagName) || ts.backgroundImage !== 'none' || !/rgba\(.*, 0\)|transparent/.test(ts.backgroundColor) || [...a.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) return true } return false };
            if (paints(top)) { hit = { clip: 'covered by ' + name(top.closest('[class]') || top), side: 'over', by: 0 }; break }
          }
        }
      }
      if (hit) out.push({ word: m[0], text: text.trim().slice(0, 40), el: name(el), ...hit, font: cs.fontSize + '/' + cs.lineHeight });
    }
  }
  pe.remove();
  return out;
})
