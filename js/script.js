(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------
     Mobile navigation
  --------------------------------------------------- */
  var hamburger = document.getElementById('hamburger');
  var mainNav = document.getElementById('mainNav');

  function closeNav() {
    hamburger.classList.remove('open');
    mainNav.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  if (hamburger && mainNav) {
    hamburger.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('click', function (e) {
      if (!mainNav.contains(e.target) && !hamburger.contains(e.target)) {
        closeNav();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 992) closeNav();
    });
  }

  /* ---------------------------------------------------
     Unified scroll handler (rAF-throttled)
     Drives: header shrink, top progress bar,
     active nav link, scroll-to-top visibility.
  --------------------------------------------------- */
  var siteHeader = document.getElementById('siteHeader');
  var scrollProgress = document.getElementById('scrollProgress');
  var scrollTopBtn = document.getElementById('scrollTop');
  var sections = Array.prototype.slice.call(document.querySelectorAll('section[id], footer[id]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.main-nav a'));

  var ticking = false;

  function updateOnScroll() {
    var y = window.scrollY || window.pageYOffset;

    if (siteHeader) siteHeader.classList.toggle('scrolled', y > 8);
    if (scrollTopBtn) scrollTopBtn.classList.toggle('show', y > 480);

    if (scrollProgress) {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = docHeight > 0 ? Math.min(1, y / docHeight) : 0;
      scrollProgress.style.transform = 'scaleX(' + ratio + ')';
    }

    if (sections.length && navLinks.length) {
      var scrollPos = y + 120;
      var current = sections[0];
      sections.forEach(function (sec) {
        if (sec.offsetTop <= scrollPos) current = sec;
      });
      navLinks.forEach(function (link) {
        var match = link.getAttribute('href') === '#' + current.id;
        link.classList.toggle('active', match);
      });
    }

    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(updateOnScroll);
      ticking = true;
    }
  }, { passive: true });

  updateOnScroll();

  /* ---------------------------------------------------
     Search form (front-end only demo)
  --------------------------------------------------- */
  var searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var target = document.getElementById('properties');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---------------------------------------------------
     Featured properties carousel
  --------------------------------------------------- */
  var track = document.getElementById('carouselTrack');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var progressBar = document.getElementById('carouselProgressBar');

  function scrollByCard(direction) {
    if (!track) return;
    var card = track.querySelector('.property-card');
    if (!card) return;
    var gap = parseFloat(getComputedStyle(track).columnGap || 22);
    var amount = (card.getBoundingClientRect().width + gap) * direction;
    /* RTL: "next" should move content visually to the left,
       which in RTL scroll coordinates is a negative direction */
    track.scrollBy({ left: amount * -1, behavior: 'smooth' });
  }

  if (prevBtn && nextBtn && track) {
    prevBtn.addEventListener('click', function () { scrollByCard(-1); });
    nextBtn.addEventListener('click', function () { scrollByCard(1); });
  }

  function updateCarouselProgress() {
    if (!track || !progressBar) return;
    var maxScroll = track.scrollWidth - track.clientWidth;
    if (maxScroll <= 0) {
      progressBar.style.width = '100%';
      return;
    }
    var percent = Math.min(1, Math.max(0, Math.abs(track.scrollLeft) / maxScroll));
    progressBar.style.width = (25 + percent * 75) + '%';
  }

  if (track && progressBar) {
    var carouselTicking = false;
    track.addEventListener('scroll', function () {
      if (!carouselTicking) {
        window.requestAnimationFrame(function () {
          updateCarouselProgress();
          carouselTicking = false;
        });
        carouselTicking = true;
      }
    }, { passive: true });
    updateCarouselProgress();
  }

  /* ---------------------------------------------------
     FAQ accordion — native <details>/<summary>
     Works with zero JS (the browser handles open/close);
     this only adds "close the others" + icon swap.
  --------------------------------------------------- */
  var accItems = Array.prototype.slice.call(document.querySelectorAll('.acc-item'));

  function syncIcon(item) {
    var icon = item.querySelector('.acc-icon');
    if (icon) icon.textContent = item.open ? '\u2212' : '+';
  }

  accItems.forEach(function (item) {
    syncIcon(item);
    item.addEventListener('toggle', function () {
      syncIcon(item);
      if (item.open) {
        accItems.forEach(function (other) {
          if (other !== item && other.open) {
            other.open = false;
          }
        });
      }
    });
  });

  /* ---------------------------------------------------
     Testimonial slider — directional slide transition
  --------------------------------------------------- */
  var testimonials = [
    {
      text: 'از مشاوره حرفه‌ای و پیگیری دقیق تیم خانه ایده‌آل بسیار راضی هستم. در کوتاه‌ترین زمان، ملک مورد نظرم را پیدا کردم. پیشنهاد می‌کنم.',
      name: 'محمد رضایی',
      role: 'خریدار ملک',
      initial: 'م',
      color: '#caa15c'
    },
    {
      text: 'فروش ملکم را به تیم خانه ایده‌آل سپردم و در کمتر از دو هفته با قیمت عالی معامله انجام شد. کاملاً شفاف و حرفه‌ای بودند.',
      name: 'سارا احمدی',
      role: 'فروشنده ملک',
      initial: 'س',
      color: '#7c8471'
    },
    {
      text: 'مشاوره رایگان و بازدید دقیق کارشناسان باعث شد بهترین تصمیم را برای سرمایه‌گذاری بگیرم. ممنون از همراهی‌تان.',
      name: 'علی حسینی',
      role: 'سرمایه‌گذار',
      initial: 'ع',
      color: '#4a5568'
    }
  ];

  var testimonialCard = document.getElementById('testimonialCard');
  var dotsWrap = document.getElementById('testimonialDots');
  var dots = dotsWrap ? Array.prototype.slice.call(dotsWrap.querySelectorAll('.dot')) : [];
  var currentTestimonial = 0;
  var testimonialTimer;
  var testimonialAnimating = false;

  function applyTestimonialContent(index) {
    var t = testimonials[index];
    var textEl = testimonialCard.querySelector('.testimonial-text');
    var avatarEl = testimonialCard.querySelector('.avatar-circle');
    var nameEl = testimonialCard.querySelector('.testimonial-author strong');
    var roleEl = testimonialCard.querySelector('.testimonial-author small');
    textEl.textContent = t.text;
    avatarEl.textContent = t.initial;
    avatarEl.style.setProperty('--c', t.color);
    nameEl.textContent = t.name;
    roleEl.textContent = t.role;
  }

  function renderTestimonial(index, direction) {
    if (!testimonialCard || index === currentTestimonial) return;
    direction = direction || 'next';

    dots.forEach(function (d, i) {
      d.classList.toggle('active', i === index);
      d.setAttribute('aria-selected', String(i === index));
    });

    if (prefersReducedMotion) {
      applyTestimonialContent(index);
      currentTestimonial = index;
      return;
    }

    if (testimonialAnimating) return;
    testimonialAnimating = true;

    var outClass = direction === 'prev' ? 'dir-prev' : 'dir-next';
    var inClass = direction === 'prev' ? 'dir-next' : 'dir-prev';

    testimonialCard.classList.add(outClass);

    setTimeout(function () {
      applyTestimonialContent(index);
      currentTestimonial = index;

      testimonialCard.classList.remove(outClass);
      testimonialCard.classList.add(inClass);
      void testimonialCard.offsetWidth; /* force reflow so the transition runs */
      testimonialCard.classList.remove(inClass);

      setTimeout(function () { testimonialAnimating = false; }, 320);
    }, 260);
  }

  function nextTestimonial() {
    renderTestimonial((currentTestimonial + 1) % testimonials.length, 'next');
  }

  if (testimonialCard && dots.length) {
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        var dir = i > currentTestimonial ? 'next' : 'prev';
        renderTestimonial(i, dir);
        resetTimer();
      });
    });

    function resetTimer() {
      clearInterval(testimonialTimer);
      testimonialTimer = setInterval(nextTestimonial, 6000);
    }
    resetTimer();
  }

  /* ---------------------------------------------------
     Scroll-to-top button
  --------------------------------------------------- */
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------------------------------------------------
     Animated stat counters (count up when visible once)
  --------------------------------------------------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll('.stat-num[data-count]'));

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';

    if (prefersReducedMotion) {
      el.textContent = target + suffix;
      return;
    }

    var duration = 1400;
    var startTime = null;

    function tick(ts) {
      if (startTime === null) startTime = ts;
      var progress = Math.min(1, (ts - startTime) / duration);
      var eased = 1 - Math.pow(1 - progress, 3); /* ease-out cubic */
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        el.textContent = target + suffix;
      }
    }
    window.requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window && counters.length) {
    counters.forEach(function (el) {
      if (!prefersReducedMotion) el.textContent = '0' + (el.getAttribute('data-suffix') || '');
    });
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { counterObserver.observe(el); });
  }

  /* ---------------------------------------------------
     Reveal-on-scroll for cards, with a staggered
     cascade for elements that share a grid/row parent.
  --------------------------------------------------- */
  var revealGroups = [
    '.services-grid > .service-card',
    '.carousel-track > .property-card',
    '.process-steps > .step',
    '.check-list > li'
  ];
  var revealSingles = ['.testimonial-card', '.acc-item', '.skyline'];

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.transitionDelay = entry.target.getAttribute('data-reveal-delay') || '0ms';
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealGroups.forEach(function (selector) {
      var els = Array.prototype.slice.call(document.querySelectorAll(selector));
      els.forEach(function (el, i) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(18px)';
        el.style.transition = 'opacity .5s ease, transform .5s ease';
        el.setAttribute('data-reveal-delay', Math.min(i * 90, 360) + 'ms');
        observer.observe(el);
      });
    });

    revealSingles.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(18px)';
        el.style.transition = 'opacity .5s ease, transform .5s ease';
        observer.observe(el);
      });
    });
  }

  /* ---------------------------------------------------
     Footer year
  --------------------------------------------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear() - 621);

  /* ---------------------------------------------------
     Favorite (heart) buttons — local UI state only
  --------------------------------------------------- */
  document.querySelectorAll('.fav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var active = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!active));
      btn.classList.toggle('is-active', !active);
    });
  });

})();
