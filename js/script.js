document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const body = document.body;
  const storage = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  };

  // Mobile navigation
  const menu = document.querySelector('.menu');
  const nav = document.querySelector('.nav');
  if (menu && nav) {
    menu.setAttribute('aria-expanded', 'false');
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
    });
  }

  // Theme switch (works offline and remembers the choice in this browser)
  const header = document.querySelector('.header');
  let themeButton = document.querySelector('.theme-toggle');
  if (header && !themeButton) {
    themeButton = document.createElement('button');
    themeButton.className = 'theme-toggle';
    themeButton.type = 'button';
    themeButton.setAttribute('aria-label', 'Переключить тему');
    themeButton.title = 'Переключить тему';
    themeButton.innerHTML = '<span class="theme-toggle__icon" aria-hidden="true">☾</span><span class="theme-toggle__text">Тёмная тема</span>';
    header.appendChild(themeButton);
  }
  const applyTheme = theme => {
    root.dataset.theme = theme;
    if (themeButton) {
      const dark = theme === 'dark';
      themeButton.innerHTML = dark
        ? '<span class="theme-toggle__icon" aria-hidden="true">☀</span><span class="theme-toggle__text">Светлая тема</span>'
        : '<span class="theme-toggle__icon" aria-hidden="true">☾</span><span class="theme-toggle__text">Тёмная тема</span>';
      themeButton.setAttribute('aria-pressed', String(dark));
    }
  };
  applyTheme(storage.get('ps_theme', 'light'));
  if (themeButton) themeButton.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    storage.set('ps_theme', next);
    applyTheme(next);
  });

  // Back to top
  const topButton = document.querySelector('.top');
  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (topButton) topButton.classList.toggle('show', y > 420);
    const readingFills = document.querySelectorAll('.reading-progress__fill');
    if (readingFills.length) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const percent = max > 0 ? Math.min(100, Math.max(0, y / max * 100)) : 100;
      readingFills.forEach(fill => { fill.style.width = percent + '%'; fill.parentElement.setAttribute('aria-valuenow', String(Math.round(percent))); });
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  if (topButton) topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Course completion state
  const readDone = () => {
    try { const parsed = JSON.parse(storage.get('ps_done', '[]')); return Array.isArray(parsed) ? parsed : []; }
    catch (_) { return []; }
  };
  const updateCourseProgress = () => {
    const count = readDone().length;
    document.querySelectorAll('[data-fill]').forEach(el => el.style.width = (count / 16 * 100) + '%');
    document.querySelectorAll('[data-count]').forEach(el => el.textContent = count + ' / 16');
    document.querySelectorAll('[data-course-percent]').forEach(el => el.textContent = Math.round(count / 16 * 100) + '%');
  };
  document.querySelectorAll('[data-check]').forEach(control => {
    const id = control.dataset.check;
    const sync = () => {
      const checked = readDone().includes(id);
      control.classList.toggle('is-complete', checked);
      control.setAttribute('aria-pressed', String(checked));
      control.innerHTML = checked ? '✓ Лекция изучена' : 'Отметить лекцию как изученную';
    };
    sync();
    control.addEventListener('click', () => {
      const done = readDone().filter(x => x !== id);
      if (!readDone().includes(id)) done.push(id);
      storage.set('ps_done', JSON.stringify(done));
      sync(); updateCourseProgress();
    });
  });
  updateCourseProgress();
  if (/program\.html$/i.test(location.pathname) && !document.querySelector('[data-course-progress-panel]')) {
    const intro = document.querySelector('.intro');
    if (intro) {
      const panel = document.createElement('section');
      panel.className = 'course-progress-panel';
      panel.setAttribute('data-course-progress-panel', '');
      panel.innerHTML = '<div class=\"course-progress-panel__top\"><strong>Ваш прогресс курса</strong><span data-count>0 / 16</span></div><div class=\"bar\"><span data-fill></span></div><p class=\"muted\">Отмечайте лекции как изученные — результат сохранится в этом браузере.</p>';
      intro.appendChild(panel);
      updateCourseProgress();
    }
  }

  // Add a reading progress indicator and completion control to lecture pages
  const match = location.pathname.match(/lecture-(\d+)\.html$/i);
  if (match) {
    const number = String(Number(match[1])).padStart(2, '0');
    const intro = document.querySelector('.intro');
    if (intro) {
      const progress = document.createElement('div');
      progress.className = 'lecture-tools';
      progress.innerHTML = `<div class="lecture-tools__meta"><span>Прогресс чтения</span><span class="lecture-tools__hint">Отметьте лекцию после изучения</span></div><div class="reading-progress" role="progressbar" aria-label="Прогресс чтения страницы" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="reading-progress__fill"></span></div><button class="complete-lecture" type="button" data-check="${number}" aria-pressed="false">Отметить лекцию как изученную</button>`;
      intro.appendChild(progress);
    }
    const readingBar = document.createElement('div');
    readingBar.className = 'reading-progress reading-progress--fixed';
    readingBar.setAttribute('role', 'progressbar');
    readingBar.setAttribute('aria-label', 'Прогресс чтения страницы');
    readingBar.setAttribute('aria-valuemin', '0'); readingBar.setAttribute('aria-valuemax', '100'); readingBar.setAttribute('aria-valuenow', '0');
    readingBar.innerHTML = '<span class="reading-progress__fill"></span>';
    body.prepend(readingBar);
    // Rebind the newly-created completion control
    const control = intro && intro.querySelector('[data-check]');
    if (control) {
      const sync = () => {
        const checked = readDone().includes(control.dataset.check);
        control.classList.toggle('is-complete', checked);
        control.setAttribute('aria-pressed', String(checked));
        control.innerHTML = checked ? '✓ Лекция изучена' : 'Отметить лекцию как изученную';
      };
      sync();
      control.addEventListener('click', () => {
        const done = readDone().filter(x => x !== control.dataset.check);
        if (!readDone().includes(control.dataset.check)) done.push(control.dataset.check);
        storage.set('ps_done', JSON.stringify(done)); sync(); updateCourseProgress();
      });
    }
  }

  // Keep optional explanatory notes compact, without hiding core lesson content
  document.querySelectorAll('.callout').forEach(box => {
    const heading = box.querySelector('b,strong');
    if (!heading || heading.textContent.trim().toLocaleLowerCase('ru') !== 'главная мысль') return;
    const details = document.createElement('details');
    details.className = 'note-details';
    const summary = document.createElement('summary');
    summary.textContent = 'Главная мысль раздела';
    details.appendChild(summary);
    [...box.childNodes].forEach(node => { if (node !== heading) details.appendChild(node.cloneNode(true)); });
    box.replaceWith(details);
  });

  // Lecture search
  const search = document.querySelector('#search');
  if (search) {
    const box = document.querySelector('#search-results');
    const entries = [...document.querySelectorAll('.lecture')].map(a => ({
      title: a.querySelector('h3')?.textContent.trim() || a.textContent.trim(),
      searchText: a.textContent.toLocaleLowerCase('ru'), href: a.getAttribute('href'), el: a
    }));
    const find = () => {
      const q = search.value.trim().toLocaleLowerCase('ru');
      entries.forEach(x => x.el.hidden = !!q && !x.searchText.includes(q));
      box.innerHTML = '';
      if (!q) return;
      const found = entries.filter(x => x.searchText.includes(q));
      if (!found.length) { box.innerHTML = '<div class="search-empty">Ничего не найдено. Попробуйте другое слово.</div>'; return; }
      found.forEach(x => { const a = document.createElement('a'); a.className = 'search-result'; a.href = x.href; a.textContent = x.title + ' →'; box.appendChild(a); });
    };
    search.addEventListener('input', find);
    search.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = box.querySelector('a'); if (a) location.href = a.href; } });
  }

  // Final project checklist: remember checked items in this browser
  const finalChecks = [...document.querySelectorAll('.checklist-items input[type="checkbox"]')];
  if (finalChecks.length) {
    const key = 'ps_final_checklist';
    let saved = [];
    try { const value = JSON.parse(storage.get(key, '[]')); if (Array.isArray(value)) saved = value; } catch (_) {}
    finalChecks.forEach((input, index) => {
      input.checked = saved.includes(index);
      input.addEventListener('change', () => {
        const current = finalChecks.map((item, i) => item.checked ? i : -1).filter(i => i >= 0);
        storage.set(key, JSON.stringify(current));
      });
    });
  }

  // Final project side planner: drawer controls and live completion counter
  const planner = document.querySelector('.project-planner');
  if (planner) {
    const toggle = document.querySelector('.planner-toggle');
    const close = document.querySelector('.planner-close');
    const backdrop = document.querySelector('.planner-backdrop');
    const checks = [...planner.querySelectorAll('.checklist-items input[type="checkbox"]')];
    const count = document.getElementById('planner-count');
    const fill = document.getElementById('planner-progress-fill');
    const label = document.getElementById('planner-progress-label');
    const updatePlanner = () => {
      const done = checks.filter(input => input.checked).length;
      if (count) count.textContent = `${done}/${checks.length}`;
      if (fill) fill.style.width = `${checks.length ? done / checks.length * 100 : 0}%`;
      if (label) label.textContent = `Выполнено ${done} из ${checks.length}`;
    };
    const openPlanner = () => {
      planner.classList.add('is-open');
      planner.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      backdrop.hidden = false;
      requestAnimationFrame(() => backdrop.classList.add('is-visible'));
      document.body.style.overflow = 'hidden';
      close.focus();
    };
    const closePlanner = () => {
      planner.classList.remove('is-open');
      planner.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      backdrop.classList.remove('is-visible');
      document.body.style.overflow = '';
      window.setTimeout(() => { if (!planner.classList.contains('is-open')) backdrop.hidden = true; }, 230);
      toggle.focus();
    };
    toggle.addEventListener('click', openPlanner);
    close.addEventListener('click', closePlanner);
    backdrop.addEventListener('click', closePlanner);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && planner.classList.contains('is-open')) closePlanner(); });
    checks.forEach(input => input.addEventListener('change', updatePlanner));
    updatePlanner();
  }

  // Quiz feedback
  document.querySelectorAll('.quiz').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    const questions = [...form.querySelectorAll('.question')];
    let score = 0, answered = 0;
    questions.forEach(q => { const answer = q.querySelector('input:checked'); if (answer) { answered++; if (+answer.value === +q.dataset.correct) score++; } });
    const result = form.querySelector('.result');
    if (answered < questions.length) { result.textContent = 'Ответьте на все вопросы: ' + answered + ' из ' + questions.length + '.'; return; }
    result.textContent = 'Результат: ' + score + ' из ' + questions.length + '. ' + (score === questions.length ? 'Отлично! Все ответы верны.' : score > 0 ? 'Повторите вопросы, в которых были ошибки.' : 'Вернитесь к материалу и попробуйте ещё раз.');
  }));
  onScroll();
});
