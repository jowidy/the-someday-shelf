(() => {
  'use strict';
  const form = document.getElementById('bookmark-form');
  if (!form || !document.getElementById('ticket')) return;

  document.documentElement.classList.add('js');
  const answer = document.getElementById('answer');
  const verdict = document.getElementById('verdict');
  document.querySelectorAll('[data-guess]').forEach(button => {
    button.addEventListener('click', () => {
      const guess = button.dataset.guess;
      if (!['short', 'long', 'same'].includes(guess)) return;
      document.querySelectorAll('[data-guess]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      if (verdict) verdict.textContent = guess === 'short'
        ? 'You picked the shorter deadline. Ten of 32 students with three weeks redeemed their $6 pastry voucher, compared with 2 of 32 given two months.'
        : guess === 'long'
          ? 'You picked the longer deadline. Two of 32 students with two months redeemed their $6 pastry voucher, compared with 10 of 32 given three weeks.'
          : 'You expected no difference. Ten of 32 students with three weeks redeemed their $6 pastry voucher, compared with 2 of 32 given two months.';
      if (answer) answer.open = true;
    });
  });

  document.querySelectorAll('details.mechanism').forEach(detail => {
    detail.addEventListener('toggle', () => {
      if (!detail.open || !detail.parentElement) return;
      Array.from(detail.parentElement.children).forEach(sibling => {
        if (sibling !== detail && sibling.matches('details.mechanism')) sibling.open = false;
      });
    });
  });

  const output = document.getElementById('bookmark-out');
  const planText = document.getElementById('plan-text');
  const title = document.getElementById('bookmark-title');
  const status = document.getElementById('plan-status');
  const pastime = form.elements.namedItem('pastime');
  const cue = form.elements.namedItem('cue');
  const pastimes = { book: 'read one page', game: 'load my saved game and play one turn', music: 'put on the first song of an album', draw: 'draw one object on my desk', guitar: 'pick up the guitar and play the first few bars', friend: 'send a friend a short hello' };
  const cues = { tea: 'after tea', dinner: 'after dinner', weekend: 'this weekend' };
  const key = 'someday-shelf-plan-v1';
  let plan = null;
  const valid = (p, c) => Object.hasOwn(pastimes, p) && Object.hasOwn(cues, c);
  function render(p, c) {
    if (!valid(p, c) || !planText || !output) return false;
    plan = { pastime: p, cue: c };
    planText.textContent = `I’ll ${pastimes[p]} ${cues[c]}. After that, I can stop or keep going.`;
    output.hidden = false;
    return true;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!pastime || !cue || !render(pastime.value, cue.value)) return;
    if (status) status.textContent = '';
    if (title) title.focus();
  });
  document.getElementById('keep-plan')?.addEventListener('click', () => {
    if (!plan) return;
    try {
      localStorage.setItem(key, JSON.stringify(plan));
      if (status) status.textContent = 'Your plan is saved on this device.';
    } catch {
      if (status) status.textContent = 'Your browser could not save the plan. You can still use it here.';
    }
  });
  document.getElementById('clear-plan')?.addEventListener('click', () => {
    try {
      localStorage.removeItem(key);
      if (status) status.textContent = 'Saved plan removed from this device.';
    } catch {
      if (status) status.textContent = 'Your browser could not remove the saved plan.';
    }
  });
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && valid(saved.pastime, saved.cue) && pastime && cue && render(saved.pastime, saved.cue)) {
      pastime.value = saved.pastime;
      cue.value = saved.cue;
      if (status) status.textContent = 'Your saved plan is ready.';
    }
  } catch { /* Storage may be unavailable or contain invalid data. */ }

  const menu = document.getElementById('chapter-menu');
  if (menu) {
    menu.addEventListener('click', event => {
      if (event.target.closest('a[href^="#"]')) menu.open = false;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary')?.focus();
      }
    });
    document.addEventListener('click', event => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  }
  const progress = document.getElementById('progress');
  if (progress) {
    const update = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      progress.value = distance > 0 ? Math.max(0, Math.min(100, window.scrollY / distance * 100)) : 0;
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  const sceneToggle = document.getElementById('scene-toggle');
  const note = document.getElementById('later-caption');
  if (sceneToggle && note) sceneToggle.addEventListener('click', () => {
    const expanded = sceneToggle.getAttribute('aria-expanded') !== 'true';
    sceneToggle.setAttribute('aria-expanded', String(expanded));
    note.hidden = !expanded;
    document.querySelector('#evening-scene picture').setAttribute('aria-hidden', String(expanded));
    document.getElementById('early-caption').hidden = expanded;
    document.getElementById('evening-scene').classList.toggle('later', expanded);
    sceneToggle.querySelector('.frame-label').textContent = expanded ? 'Earlier that evening' : 'Later that evening';
  });
})();
