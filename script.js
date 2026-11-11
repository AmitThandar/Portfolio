(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const loader = $('#loader');

  // Intro stack: staged entrance, then reveal the page.
  let count = 0;
  loader.classList.add('show');
  const counter = $('#loaderCount');
  const countTimer = setInterval(() => {
    count = Math.min(100, count + Math.ceil(Math.random() * 9));
    counter.textContent = String(count).padStart(3, '0');
    if (count >= 100) {
      clearInterval(countTimer);
      setTimeout(() => {
        loader.classList.add('out');
        document.body.classList.add('ready');
        setTimeout(() => loader.remove(), 1100);
      }, 380);
    }
  }, 75);

  // Local clock.
  const clock = $('#localTime');
  const updateClock = () => {
    clock.textContent = new Intl.DateTimeFormat('en-IN', {hour:'2-digit', minute:'2-digit', hour12:false}).format(new Date());
  };
  updateClock(); setInterval(updateClock, 30000);

  // Theme rope: damped spring follows pointer/touch; a deliberate pull toggles theme.
  const cord = $('#pullCord');
  cord.setAttribute('aria-label', root.dataset.mode === 'dark' ? 'Pull down to switch to light mode' : 'Pull down to switch to dark mode');
  let dragging = false, startY = 0, displacement = 0, velocity = 0, lastY = 0, lastT = 0, raf = 0;
  const springBack = () => {
    cancelAnimationFrame(raf);
    const step = () => {
      const force = -0.16 * displacement - 0.22 * velocity;
      velocity += force;
      displacement += velocity;
      cord.style.setProperty('--pull', `${Math.max(0, displacement)}px`);
      if (Math.abs(displacement) > .2 || Math.abs(velocity) > .2) raf = requestAnimationFrame(step);
      else { displacement = velocity = 0; cord.style.setProperty('--pull', '0px'); cord.classList.remove('pulled'); }
    };
    raf = requestAnimationFrame(step);
  };
  const toggleTheme = () => {
    const next = root.dataset.mode === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.dataset.mode = next;
      cord.setAttribute('aria-label', next === 'light' ? 'Pull down to switch to dark mode' : 'Pull down to switch to light mode');
      try { localStorage.setItem('amit-mode', next); } catch(e) {}
    };
    if (document.startViewTransition && !reduced) document.startViewTransition(apply); else apply();
  };
  cord.addEventListener('pointerdown', e => {
    dragging = true; startY = lastY = e.clientY; lastT = performance.now(); velocity = 0;
    cord.setPointerCapture(e.pointerId); cord.classList.add('pulled'); cancelAnimationFrame(raf);
  });
  cord.addEventListener('pointermove', e => {
    if (!dragging) return;
    const now = performance.now(), dt = Math.max(1, now-lastT);
    velocity = (e.clientY-lastY)/dt*16; lastY = e.clientY; lastT = now;
    displacement = Math.max(0, Math.min(105, e.clientY-startY));
    cord.style.setProperty('--pull', `${displacement}px`);
  });
  const releaseCord = () => {
    if (!dragging) return;
    dragging = false;
    const pulled = displacement > 32;
    springBack();
    if (pulled) toggleTheme();
  };
  cord.addEventListener('pointerup', releaseCord);
  cord.addEventListener('pointercancel', releaseCord);

  // Calendar page flip.
  const focuses = [
    ['Web Developer','Building for the web.'],
    ['App Developer','Useful ideas, made real.'],
    ['Cyber Security','Learning to build securely.'],
    ['Graphic Designer','Visuals with a purpose.'],
    ['AI / ML Explorer','Curiosity meets intelligence.']
  ];
  let focusIndex = 0;
  const cal = $('#calendar'), calContent = $('.cal-content');
  cal.addEventListener('click', () => {
    calContent.classList.remove('flip'); void calContent.offsetWidth; calContent.classList.add('flip');
    setTimeout(() => {
      focusIndex = (focusIndex+1)%focuses.length;
      $('#calendarRole').textContent = focuses[focusIndex][0];
      $('#calendarSub').textContent = focuses[focusIndex][1];
      $('#calendarCount').textContent = `${String(focusIndex+1).padStart(2,'0')} / 05`;
    }, 330);
  });

  // Local colour reveal on the portrait, following the pointer.
  const portrait = $('#portraitStage');
  portrait.addEventListener('pointermove', e => {
    const r = portrait.getBoundingClientRect();
    portrait.style.setProperty('--mx', `${e.clientX-r.left}px`);
    portrait.style.setProperty('--my', `${e.clientY-r.top}px`);
  });
  portrait.addEventListener('pointerleave', () => {
    portrait.style.setProperty('--mx','50%'); portrait.style.setProperty('--my','40%');
  });

  // Smooth reveal and line growth on scroll.
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {threshold:.13, rootMargin:'0px 0px -35px 0px'});
  $$('.reveal,.section-head').forEach(el => revealObserver.observe(el));

  // Active nav, header state and back-to-top.
  const header = $('#header'), backTop = $('#backTop');
  let previousY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 25);
    header.classList.toggle('hidden', y > previousY && y > 500);
    if (y < 120) header.classList.remove('hidden');
    backTop.classList.toggle('show', y > 700);
    previousY = y;
  };
  addEventListener('scroll', onScroll, {passive:true}); onScroll();
  backTop.addEventListener('click', () => window.scrollTo({top:0,behavior:reduced?'auto':'smooth'}));
  const sections = $$('main section[id]');
  const navObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) $$('.nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`));
  }), {rootMargin:'-35% 0px -55% 0px'});
  sections.forEach(s => navObserver.observe(s));

  // Mobile menu.
  const menu = $('#mobileMenu');
  $('#menuBtn').addEventListener('click', () => menu.classList.add('open'));
  $('#menuClose').addEventListener('click', () => menu.classList.remove('open'));
  $$('.mobile-menu a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));

  // Walk-through doors: hinge the chosen door, zoom through its opening, reveal a room.
  const roomData = {
    web:{title:'Web Development',desc:'Designing and building responsive websites and web applications with clean structure, thoughtful interactions and accessible interfaces.',tags:['HTML','CSS','JavaScript','Responsive Design','Firebase']},
    app:{title:'App Development',desc:'Turning everyday problems into focused digital products, from early interface ideas to useful working prototypes.',tags:['Product Thinking','UI Design','JavaScript','Prototyping']},
    cyber:{title:'Cyber Security',desc:'Learning how systems work, how vulnerabilities appear and how to make digital experiences safer through defensive security.',tags:['Networking','Linux','Web Security','OWASP Basics']},
    design:{title:'Graphic Design',desc:'Creating visual identities and communication pieces that feel clear, balanced and memorable.',tags:['Visual Design','Typography','Branding','Poster Design']}
  };
  const transition = $('#doorTransition'), scene = $('#doorScene');
  let entering = false;
  $$('.door').forEach(door => door.addEventListener('click', () => {
    if (entering) return;
    entering = true;
    const key = door.dataset.door, data = roomData[key];
    const rect = door.getBoundingClientRect();
    const originX = rect.left + rect.width/2, originY = rect.top + rect.height/2;
    scene.style.transformOrigin = `${originX}px ${originY}px`;
    door.classList.add('open');
    transition.classList.add('active');
    document.body.classList.add('locked');
    $('#sceneTitle').textContent = data.title;
    $('#sceneDescription').textContent = data.desc;
    $('#sceneTags').innerHTML = data.tags.map(tag => `<span>${tag}</span>`).join('');
    $('#sceneEyebrow').textContent = `AMIT THANDAR / 0${Object.keys(roomData).indexOf(key)+1}`;
    setTimeout(() => { door.classList.remove('open'); }, 1250);
  }));
  const exitRoom = () => {
    if (!entering) return;
    transition.classList.remove('active');
    document.body.classList.remove('locked');
    setTimeout(() => { entering = false; scene.style.transformOrigin = '50% 50%'; }, 900);
  };
  $('#sceneClose').addEventListener('click', exitRoom);
  addEventListener('keydown', e => { if (e.key === 'Escape') { exitRoom(); menu.classList.remove('open'); } });
})();
