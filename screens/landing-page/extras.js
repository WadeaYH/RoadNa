// Landing page extras: count-up numbers, before/after slider, sample community vote, scroll guide.
// Presentation only. Nothing is stored or sent; the vote below is a visual preview.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Count-up numbers start when they scroll into view.
const format = (value, decimals) => value.toLocaleString('en', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const countUp = (el) => {
  const target = Number(el.dataset.count);
  const decimals = Number(el.dataset.decimals || 0);
  if (reduceMotion) { el.textContent = format(target, decimals); return; }
  const start = performance.now();
  const duration = 1400;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = format(target * (1 - Math.pow(1 - t, 3)), decimals);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const counters = document.querySelectorAll('[data-count]');
if ('IntersectionObserver' in window) {
  const seen = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    seen.unobserve(entry.target);
    countUp(entry.target);
  }), { threshold: 0.6 });
  counters.forEach((el) => { el.textContent = format(0, Number(el.dataset.decimals || 0)); seen.observe(el); });
}

// Before / after slider. The range input is the accessible control; dragging anywhere works.
const ba = document.getElementById('ba');
const range = document.getElementById('ba-range');
if (ba && range) {
  range.addEventListener('input', () => { ba.dataset.touched = '1'; ba.style.setProperty('--pos', `${range.value}%`); });
  if (!reduceMotion && 'IntersectionObserver' in window) {
    // A gentle sweep the first time it is seen, so the control is obvious.
    const sweep = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      sweep.disconnect();
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / 2200);
        const pos = 50 + Math.sin(t * Math.PI * 2) * 28 * (1 - t);
        ba.style.setProperty('--pos', `${pos.toFixed(1)}%`);
        range.value = String(Math.round(pos));
        if (t < 1 && !ba.dataset.touched) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.7 });
    sweep.observe(ba);
  }
}

// Sample community vote: one choice, changeable until the vote closes. Nothing is recorded.
const proposal = document.getElementById('proposal');
if (proposal) {
  const meta = document.getElementById('proposal-meta');
  const button = proposal.querySelector('button[type="submit"]');
  proposal.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!proposal.reportValidity()) return;
    button.textContent = 'Change my vote';
    meta.textContent = 'Vote saved (preview). You can change it until Oct 31. Results appear after voting closes.';
  });
}

// Guide pin: appears after the story, comments on the section you are reading, tilts as you scroll.
const guide = document.getElementById('guide');
if (guide) {
  const bubble = document.getElementById('guide-bubble');
  const tips = [
    ['explore', 'Ready? Tap to report an issue.'],
    ['how-it-works', 'Three steps. That is all it takes.'],
    ['impact', 'These numbers update as streets get fixed.'],
    ['before-after', 'Drag the line to see a fix.'],
    ['recent-fixes', 'Follow any report you like.'],
    ['voices', 'Neighbours decide together.'],
  ].map(([id, text]) => [document.getElementById(id), text]).filter(([el]) => el);
  guide.hidden = false;
  let talkTimer = 0;
  let current = null;
  const say = (text) => {
    bubble.textContent = text;
    guide.classList.add('is-talking');
    window.clearTimeout(talkTimer);
    talkTimer = window.setTimeout(() => guide.classList.remove('is-talking'), 4200);
  };
  const explore = document.getElementById('explore');
  let lastY = window.scrollY;
  let tilt = 0;
  let frame = 0;
  const update = () => {
    frame = 0;
    const y = window.scrollY;
    const mid = window.innerHeight * 0.5;
    const afterStory = explore ? explore.getBoundingClientRect().top < window.innerHeight * 0.8 : true;
    guide.classList.toggle('is-on', afterStory);
    if (afterStory) {
      const active = tips.filter(([el]) => { const r = el.getBoundingClientRect(); return r.top < mid && r.bottom > mid; }).pop();
      if (active && active[0] !== current) { current = active[0]; say(active[1]); }
    }
    if (!reduceMotion) {
      tilt = Math.max(-14, Math.min(14, tilt * 0.6 + (y - lastY) * 0.35));
      guide.style.setProperty('--tilt', `${tilt.toFixed(1)}deg`);
    }
    lastY = y;
    if (Math.abs(tilt) > 0.5) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', update);
  update();
}
