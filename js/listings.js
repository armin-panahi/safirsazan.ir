(function () {
  'use strict';

  if (typeof PROPERTY_LISTINGS === 'undefined') return;

  var PAGE_SIZE = 12;

  /* ---------------------------------------------------
     State
  --------------------------------------------------- */
  var state = {
    search: '',
    dealType: 'all',
    propertyTypes: new Set(),
    priceMin: null,
    priceMax: null,
    areaMin: null,
    areaMax: null,
    bedrooms: 'any',
    amenities: new Set(),
    neighborhoods: new Set(),
    sort: 'newest',
    view: 'grid',
    page: 1
  };

  /* ---------------------------------------------------
     Helpers
  --------------------------------------------------- */
  function formatPrice(n) {
    if (n >= 1000000000) return (n / 1000000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) + ' میلیارد';
    if (n >= 1000000) return Math.round(n / 1000000).toLocaleString('fa-IR') + ' میلیون';
    return n.toLocaleString('fa-IR');
  }

  function toFaDigits(n) {
    return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
  }

  function timeAgoLabel(days) {
    if (days === 0) return 'امروز';
    if (days === 1) return 'دیروز';
    if (days < 7) return toFaDigits(days) + ' روز پیش';
    if (days < 30) return toFaDigits(Math.floor(days / 7)) + ' هفته پیش';
    return toFaDigits(Math.floor(days / 30)) + ' ماه پیش';
  }

  function dealBadgeLabel(deal) {
    return DEAL_LABELS[deal] || deal;
  }

  function specIcon(name) {
    var icons = {
      parking: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M5 11 6.6 6.2A2 2 0 0 1 8.5 5h7a2 2 0 0 1 1.9 1.2L19 11v7h-2v-2H7v2H5v-7z"/></svg>',
      bed: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M7 3a2 2 0 0 0-2 2v2H4v2h1v9a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-9h1V7h-1V5a2 2 0 0 0-2-2z"/></svg>',
      area: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z"/></svg>'
    };
    return icons[name] || '';
  }

  /* ---------------------------------------------------
     Filtering / sorting
  --------------------------------------------------- */
  function getFiltered() {
    return PROPERTY_LISTINGS.filter(function (item) {
      if (state.search) {
        var q = state.search.trim();
        var hay = item.title + ' ' + item.neighborhood + ' ' + item.city;
        if (hay.indexOf(q) === -1) return false;
      }
      if (state.dealType !== 'all' && item.dealType !== state.dealType) return false;
      if (state.propertyTypes.size && !state.propertyTypes.has(item.propertyType)) return false;

      var priceRef = item.dealType === 'rent' ? item.rentMonthly : item.price;
      if (state.priceMin !== null && priceRef < state.priceMin) return false;
      if (state.priceMax !== null && priceRef > state.priceMax) return false;

      if (state.areaMin !== null && item.area < state.areaMin) return false;
      if (state.areaMax !== null && item.area > state.areaMax) return false;

      if (state.bedrooms !== 'any') {
        var wanted = state.bedrooms === '4+' ? 4 : parseInt(state.bedrooms, 10);
        if (state.bedrooms === '4+') {
          if (item.bedrooms < 4) return false;
        } else if (item.bedrooms !== wanted) {
          return false;
        }
      }

      if (state.amenities.size) {
        for (var a of state.amenities) {
          if (item.amenities.indexOf(a) === -1) return false;
        }
      }

      if (state.neighborhoods.size && !state.neighborhoods.has(item.neighborhood)) return false;

      return true;
    });
  }

  function getSorted(list) {
    var arr = list.slice();
    switch (state.sort) {
      case 'newest':
        arr.sort(function (a, b) { return a.daysAgo - b.daysAgo; });
        break;
      case 'price-asc':
        arr.sort(function (a, b) {
          var pa = a.dealType === 'rent' ? a.rentMonthly : a.price;
          var pb = b.dealType === 'rent' ? b.rentMonthly : b.price;
          return pa - pb;
        });
        break;
      case 'price-desc':
        arr.sort(function (a, b) {
          var pa = a.dealType === 'rent' ? a.rentMonthly : a.price;
          var pb = b.dealType === 'rent' ? b.rentMonthly : b.price;
          return pb - pa;
        });
        break;
      case 'area-desc':
        arr.sort(function (a, b) { return b.area - a.area; });
        break;
    }
    return arr;
  }

  /* ---------------------------------------------------
     Rendering
  --------------------------------------------------- */
  var grid = document.getElementById('listingsGrid');
  var resultsCount = document.getElementById('resultsCount');
  var pagination = document.getElementById('pagination');
  var activeFiltersWrap = document.getElementById('activeFilters');
  var filterBadge = document.getElementById('filterBadgeCount');
  var modalApplyBtn = document.getElementById('modalApplyBtn');

  function cardHTML(item) {
    var priceHTML;
    if (item.dealType === 'rent') {
      priceHTML = '<div class="property-price">' + formatPrice(item.rentDeposit) + ' <span>رهن</span> / ' + formatPrice(item.rentMonthly) + ' <span>اجاره</span></div>';
    } else if (item.dealType === 'mortgage') {
      priceHTML = '<div class="property-price">' + formatPrice(item.price) + ' <span>تومان رهن کامل</span></div>';
    } else {
      priceHTML = '<div class="property-price">' + formatPrice(item.price) + ' <span>تومان</span></div>';
    }

    var specs = '';
    if (item.propertyType !== 'land') {
      specs += '<li>' + specIcon('parking') + toFaDigits(item.parking) + ' پارکینگ</li>';
      if (item.bedrooms > 0) specs += '<li>' + specIcon('bed') + toFaDigits(item.bedrooms) + ' خواب</li>';
    }
    specs += '<li>' + specIcon('area') + toFaDigits(item.area) + ' متر</li>';

    var badgeClass = item.dealType === 'sale' ? 'badge-gold' : 'badge-dark';

    return (
      '<li class="property-card" data-id="' + item.id + '">' +
        '<div class="property-media">' +
          '<img src="' + item.image + '" alt="' + item.title + '" loading="lazy" decoding="async">' +
          '<span class="badge ' + badgeClass + ' prop-tag">' + dealBadgeLabel(item.dealType) + '</span>' +
          '<button class="fav-btn" aria-label="افزودن به علاقه‌مندی‌ها" aria-pressed="false">' +
            '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.9-10.2-9C.1 9.2 1 5.5 4.4 4.4c2-.6 3.9.1 5.1 1.7l2.5 3.2 2.5-3.2c1.2-1.6 3.1-2.3 5.1-1.7C22.9 5.5 23.9 9.2 22.2 12 19.5 16.1 12 21 12 21z"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="property-body">' +
          '<h3>' + item.title + '</h3>' +
          '<p class="property-loc">' + item.city + '، ' + item.neighborhood + '</p>' +
          '<ul class="property-specs">' + specs + '</ul>' +
          priceHTML +
          '<div class="listing-time">' +
            '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 10.6 4 2.3-.7 1.3L11 13V6h2z"/></svg>' +
            timeAgoLabel(item.daysAgo) +
          '</div>' +
        '</div>' +
      '</li>'
    );
  }

  function skeletonHTML() {
    var out = '';
    for (var i = 0; i < 6; i++) {
      out +=
        '<li class="skeleton-card">' +
          '<div class="skeleton-media skeleton-shimmer"></div>' +
          '<div class="skeleton-body">' +
            '<div class="skeleton-line skeleton-shimmer" style="width:70%"></div>' +
            '<div class="skeleton-line skeleton-shimmer" style="width:40%"></div>' +
            '<div class="skeleton-line skeleton-shimmer" style="width:55%"></div>' +
          '</div>' +
        '</li>';
    }
    return out;
  }

  function emptyStateHTML() {
    return (
      '<div class="empty-state">' +
        '<span class="icon"><svg viewBox="0 0 24 24" width="30" height="30"><path fill="currentColor" d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5L20.5 19l-5-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg></span>' +
        '<h3>نتیجه‌ای پیدا نشد</h3>' +
        '<p>با این فیلترها ملکی موجود نیست. کمی فیلترها را تغییر دهید یا آن‌ها را پاک کنید.</p>' +
        '<button class="btn btn-dark btn-sm" id="emptyStateClearBtn">پاک کردن همه فیلترها</button>' +
      '</div>'
    );
  }

  function renderChips() {
    var chips = [];

    if (state.search) {
      chips.push({ key: 'search', label: 'جست‌وجو: «' + state.search + '»' });
    }
    state.propertyTypes.forEach(function (t) {
      chips.push({ key: 'propertyType:' + t, label: TYPE_LABELS[t] });
    });
    if (state.priceMin !== null || state.priceMax !== null) {
      var lbl = 'قیمت: ';
      lbl += state.priceMin !== null ? formatPrice(state.priceMin) : 'هر مقدار';
      lbl += ' تا ';
      lbl += state.priceMax !== null ? formatPrice(state.priceMax) : 'هر مقدار';
      chips.push({ key: 'price', label: lbl });
    }
    if (state.areaMin !== null || state.areaMax !== null) {
      var lbl2 = 'متراژ: ';
      lbl2 += state.areaMin !== null ? toFaDigits(state.areaMin) : '۰';
      lbl2 += ' تا ';
      lbl2 += state.areaMax !== null ? toFaDigits(state.areaMax) : '∞';
      chips.push({ key: 'area', label: lbl2 });
    }
    if (state.bedrooms !== 'any') {
      chips.push({ key: 'bedrooms', label: toFaDigits(state.bedrooms) + ' خوابه' });
    }
    state.amenities.forEach(function (a) {
      chips.push({ key: 'amenity:' + a, label: AMENITY_LABELS[a] });
    });
    state.neighborhoods.forEach(function (n) {
      chips.push({ key: 'hood:' + n, label: n });
    });

    activeFiltersWrap.innerHTML = chips.map(function (c) {
      return '<span class="filter-chip" data-chip="' + c.key + '">' + c.label +
        '<button aria-label="حذف فیلتر ' + c.label + '">' +
        '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M6 6 18 18M18 6 6 18" stroke="currentColor" stroke-width="2"/></svg>' +
        '</button></span>';
    }).join('') + (chips.length ? '<button class="clear-all-filters" id="clearAllBtn">پاک کردن همه</button>' : '');

    var count = chips.length;
    filterBadge.textContent = toFaDigits(count);
    filterBadge.style.display = count ? 'inline-flex' : 'none';
  }

  function render() {
    var filtered = getFiltered();
    var sorted = getSorted(filtered);
    var total = sorted.length;
    var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;

    var start = (state.page - 1) * PAGE_SIZE;
    var pageItems = sorted.slice(start, start + PAGE_SIZE);

    resultsCount.innerHTML = '<strong>' + toFaDigits(total) + '</strong> ملک پیدا شد';

    if (total === 0) {
      grid.innerHTML = '';
      grid.insertAdjacentHTML('afterend', '');
      document.getElementById('emptyStateSlot').innerHTML = emptyStateHTML();
      pagination.innerHTML = '';
    } else {
      document.getElementById('emptyStateSlot').innerHTML = '';
      grid.innerHTML = pageItems.map(cardHTML).join('');
      renderPagination(totalPages);
    }

    renderChips();
    if (modalApplyBtn) {
      modalApplyBtn.textContent = 'نمایش ' + toFaDigits(total) + ' نتیجه';
    }
    syncUrl();
    attachCardEvents();
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) { pagination.innerHTML = ''; return; }
    var html = '';
    html += '<button class="page-btn" data-page="prev" ' + (state.page === 1 ? 'disabled' : '') + ' aria-label="صفحه قبل">' +
      '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M13.7 6 15.1 7.4 10.5 12l4.6 4.6L13.7 18l-6-6z"/></svg></button>';

    var pages = [];
    for (var p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - state.page) <= 1) pages.push(p);
      else if (pages[pages.length - 1] !== '...') pages.push('...');
    }
    pages.forEach(function (p) {
      if (p === '...') { html += '<span class="page-dots">…</span>'; return; }
      html += '<button class="page-btn ' + (p === state.page ? 'active' : '') + '" data-page="' + p + '">' + toFaDigits(p) + '</button>';
    });

    html += '<button class="page-btn" data-page="next" ' + (state.page === totalPages ? 'disabled' : '') + ' aria-label="صفحه بعد">' +
      '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M10.3 6 8.9 7.4 13.5 12l-4.6 4.6L10.3 18l6-6z"/></svg></button>';

    pagination.innerHTML = html;
  }

  function attachCardEvents() {
    grid.querySelectorAll('.fav-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var active = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!active));
        btn.classList.toggle('is-active', !active);
      });
    });
    grid.querySelectorAll('.property-card').forEach(function (card) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function () {
        var id = Number(card.getAttribute('data-id'));
        openDetail(id, card.querySelector('.fav-btn').getAttribute('aria-pressed') === 'true');
      });
    });
  }

  /* ---------------------------------------------------
     Property detail modal
  --------------------------------------------------- */
  var detailBackdrop = document.getElementById('detailModalBackdrop');
  var detailModal = document.getElementById('detailModal');
  var detailBody = document.getElementById('detailModalBody');
  var detailCloseBtn = document.getElementById('detailCloseBtn');

  var DESC_TEMPLATES = {
    villa: 'این ویلا با معماری مدرن و نور طبیعی فراوان، فضایی آرام و خصوصی را برای زندگی خانوادگی فراهم می‌کند. حیاط اختصاصی، چیدمان اصولی فضاها و دسترسی آسان به مراکز خرید و امکانات رفاهی از ویژگی‌های شاخص این ملک است.',
    apartment: 'این واحد آپارتمانی با پلان بهینه و نورگیری مناسب، در یکی از برج‌های باکیفیت منطقه واقع شده است. نزدیکی به مراکز خرید، مترو و بزرگراه‌های اصلی، رفت‌وآمد را برای ساکنین بسیار راحت می‌کند.',
    penthouse: 'این پنت‌هاوس با ارتفاع بالا و ویو بی‌نظیر شهری، تجربه‌ای لوکس از زندگی مدرن را ارائه می‌دهد. طراحی داخلی شیک، سقف بلند و تراس اختصاصی از امکانات برجسته این واحد است.',
    land: 'این زمین با موقعیت مکانی مناسب و سند تک‌برگ، گزینه‌ای ایده‌آل برای ساخت‌وساز یا سرمایه‌گذاری بلندمدت است. دسترسی به معابر اصلی و زیرساخت‌های شهری از مزیت‌های این ملک به شمار می‌رود.',
    commercial: 'این ملک تجاری با موقعیت خط اول و تردد بالای مشتری، فرصتی مناسب برای راه‌اندازی کسب‌وکار یا سرمایه‌گذاری است. دسترسی آسان، ویترین مناسب و زیرساخت کامل از نقاط قوت این ملک است.',
    office: 'این واحد اداری با چیدمان کاربردی و دسترسی مناسب به مراکز تجاری منطقه، محیطی حرفه‌ای برای کسب‌وکار شما فراهم می‌کند.'
  };

  function amenityIcon() {
    return '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';
  }

  function detailHTML(item, isFav) {
    var priceHTML;
    if (item.dealType === 'rent') {
      priceHTML = '<span class="price">' + formatPrice(item.rentDeposit) + ' <span>تومان رهن</span> / ' + formatPrice(item.rentMonthly) + ' <span>تومان اجاره ماهانه</span></span>';
    } else if (item.dealType === 'mortgage') {
      priceHTML = '<span class="price">' + formatPrice(item.price) + ' <span>تومان رهن کامل</span></span>';
    } else {
      priceHTML = '<span class="price">' + formatPrice(item.price) + ' <span>تومان</span></span>';
    }

    var specItems = '';
    if (item.propertyType !== 'land') {
      specItems += '<div class="detail-spec-item">' + specIcon('area') + '<strong>' + toFaDigits(item.area) + '</strong><span>متراژ (متر)</span></div>';
      if (item.bedrooms > 0) specItems += '<div class="detail-spec-item">' + specIcon('bed') + '<strong>' + toFaDigits(item.bedrooms) + '</strong><span>اتاق خواب</span></div>';
      specItems += '<div class="detail-spec-item">' + specIcon('parking') + '<strong>' + toFaDigits(item.parking) + '</strong><span>پارکینگ</span></div>';
    } else {
      specItems += '<div class="detail-spec-item">' + specIcon('area') + '<strong>' + toFaDigits(item.area) + '</strong><span>متراژ (متر)</span></div>';
    }

    var amenitiesHTML = item.amenities.length
      ? item.amenities.map(function (a) {
          return '<span class="detail-amenity">' + amenityIcon() + AMENITY_LABELS[a] + '</span>';
        }).join('')
      : '<p class="detail-desc" style="margin:0">امکانات ویژه‌ای برای این ملک ثبت نشده است.</p>';

    var badgeClass = item.dealType === 'sale' ? 'badge-gold' : 'badge-dark';

    return (
      '<div class="detail-hero">' +
        '<img src="' + item.image + '" alt="' + item.title + '">' +
        '<span class="badge ' + badgeClass + '">' + dealBadgeLabel(item.dealType) + '</span>' +
      '</div>' +
      '<div class="detail-content">' +
        '<h2>' + item.title + '</h2>' +
        '<p class="detail-loc">' +
          '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>' +
          item.city + '، ' + item.neighborhood +
        '</p>' +

        '<div class="detail-price-row">' +
          priceHTML +
          '<span class="listing-time">' +
            '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 10.6 4 2.3-.7 1.3L11 13V6h2z"/></svg>' +
            'ثبت‌شده ' + timeAgoLabel(item.daysAgo) +
          '</span>' +
        '</div>' +

        '<div class="detail-specs">' + specItems + '</div>' +

        '<h3 class="detail-section-title">توضیحات</h3>' +
        '<p class="detail-desc">' + (DESC_TEMPLATES[item.propertyType] || '') + '</p>' +

        '<h3 class="detail-section-title">امکانات</h3>' +
        '<div class="detail-amenities">' + amenitiesHTML + '</div>' +

        '<div class="detail-agent">' +
          '<span class="avatar-circle" style="--c:#caa15c">م</span>' +
          '<span><strong>مشاوران خانه ایده‌آل</strong><small>پاسخگویی ۲۴/۷</small></span>' +
        '</div>' +

        '<div class="detail-cta">' +
          '<a href="tel:+982112345678" class="btn btn-dark">' +
            'تماس با مشاور' +
            '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.6c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8z"/></svg>' +
          '</a>' +
          '<button class="btn btn-outline" id="detailFavBtn" data-id="' + item.id + '" aria-pressed="' + isFav + '">' +
            (isFav ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها') +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function openDetail(id, isFav) {
    var item = PROPERTY_LISTINGS.find(function (p) { return p.id === id; });
    if (!item) return;
    detailBody.innerHTML = detailHTML(item, isFav);
    detailBackdrop.classList.add('open');
    detailModal.classList.add('open');
    document.body.style.overflow = 'hidden';

    var favBtn = document.getElementById('detailFavBtn');
    favBtn.addEventListener('click', function () {
      var active = favBtn.getAttribute('aria-pressed') === 'true';
      favBtn.setAttribute('aria-pressed', String(!active));
      favBtn.textContent = !active ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها';
      var cardBtn = grid.querySelector('.property-card[data-id="' + id + '"] .fav-btn');
      if (cardBtn) {
        cardBtn.setAttribute('aria-pressed', String(!active));
        cardBtn.classList.toggle('is-active', !active);
      }
    });
  }

  function closeDetail() {
    detailBackdrop.classList.remove('open');
    detailModal.classList.remove('open');
    if (!modal.classList.contains('open')) document.body.style.overflow = '';
  }

  detailCloseBtn.addEventListener('click', closeDetail);
  detailBackdrop.addEventListener('click', closeDetail);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (detailModal.classList.contains('open')) closeDetail();
    else if (modal.classList.contains('open')) closeModal();
  });

  /* ---------------------------------------------------
     URL sync (shareable filtered links)
  --------------------------------------------------- */
  function syncUrl() {
    var p = new URLSearchParams();
    if (state.search) p.set('q', state.search);
    if (state.dealType !== 'all') p.set('deal', state.dealType);
    if (state.propertyTypes.size) p.set('type', Array.from(state.propertyTypes).join(','));
    if (state.priceMin !== null) p.set('pmin', state.priceMin);
    if (state.priceMax !== null) p.set('pmax', state.priceMax);
    if (state.areaMin !== null) p.set('amin', state.areaMin);
    if (state.areaMax !== null) p.set('amax', state.areaMax);
    if (state.bedrooms !== 'any') p.set('beds', state.bedrooms);
    if (state.amenities.size) p.set('amenities', Array.from(state.amenities).join(','));
    if (state.neighborhoods.size) p.set('hood', Array.from(state.neighborhoods).join(','));
    if (state.sort !== 'newest') p.set('sort', state.sort);
    if (state.page !== 1) p.set('page', state.page);
    var qs = p.toString();
    var url = window.location.pathname + (qs ? '?' + qs : '');
    window.history.replaceState({}, '', url);
  }

  function readUrl() {
    var p = new URLSearchParams(window.location.search);
    if (p.has('q')) state.search = p.get('q');
    if (p.has('deal')) state.dealType = p.get('deal');
    if (p.has('type')) state.propertyTypes = new Set(p.get('type').split(','));
    if (p.has('pmin')) state.priceMin = Number(p.get('pmin'));
    if (p.has('pmax')) state.priceMax = Number(p.get('pmax'));
    if (p.has('amin')) state.areaMin = Number(p.get('amin'));
    if (p.has('amax')) state.areaMax = Number(p.get('amax'));
    if (p.has('beds')) state.bedrooms = p.get('beds');
    if (p.has('amenities')) state.amenities = new Set(p.get('amenities').split(','));
    if (p.has('hood')) state.neighborhoods = new Set(p.get('hood').split(','));
    if (p.has('sort')) state.sort = p.get('sort');
    if (p.has('page')) state.page = Number(p.get('page'));
  }

  /* ---------------------------------------------------
     Sync filter input controls (desktop + mobile) to state
  --------------------------------------------------- */
  function syncControlsFromState() {
    document.querySelectorAll('[data-search-input]').forEach(function (el) { el.value = state.search; });
    document.querySelectorAll('[data-deal-tab]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-deal-tab') === state.dealType);
    });
    document.querySelectorAll('[data-property-type]').forEach(function (el) {
      el.checked = state.propertyTypes.has(el.getAttribute('data-property-type'));
    });
    document.querySelectorAll('[data-price-min]').forEach(function (el) { el.value = state.priceMin === null ? '' : state.priceMin / 1000000; });
    document.querySelectorAll('[data-price-max]').forEach(function (el) { el.value = state.priceMax === null ? '' : state.priceMax / 1000000; });
    document.querySelectorAll('[data-area-min]').forEach(function (el) { el.value = state.areaMin === null ? '' : state.areaMin; });
    document.querySelectorAll('[data-area-max]').forEach(function (el) { el.value = state.areaMax === null ? '' : state.areaMax; });
    document.querySelectorAll('[data-bedrooms]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-bedrooms') === state.bedrooms);
    });
    document.querySelectorAll('[data-amenity]').forEach(function (el) {
      el.checked = state.amenities.has(el.getAttribute('data-amenity'));
    });
    document.querySelectorAll('[data-neighborhood]').forEach(function (el) {
      el.checked = state.neighborhoods.has(el.getAttribute('data-neighborhood'));
    });
    document.querySelectorAll('[data-sort-select]').forEach(function (el) { el.value = state.sort; });
    document.querySelectorAll('[data-view-btn]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-view-btn') === state.view);
    });
    grid.classList.toggle('is-list-view', state.view === 'list');
  }

  function update() {
    state.page = 1;
    syncControlsFromState();
    render();
  }

  /* ---------------------------------------------------
     Build dynamic filter option lists (types + neighborhoods)
  --------------------------------------------------- */
  function buildFilterOptions() {
    var typeWrap = document.getElementById('propertyTypeOptions');
    var typeCounts = {};
    PROPERTY_LISTINGS.forEach(function (i) { typeCounts[i.propertyType] = (typeCounts[i.propertyType] || 0) + 1; });
    var typeHTML = Object.keys(TYPE_LABELS).map(function (key) {
      return '<label class="checkbox-row"><input type="checkbox" data-property-type="' + key + '">' +
        TYPE_LABELS[key] + '<span class="count">' + toFaDigits(typeCounts[key] || 0) + '</span></label>';
    }).join('');
    document.querySelectorAll('[data-slot="propertyTypeOptions"]').forEach(function (el) { el.innerHTML = typeHTML; });

    var amenityHTML = Object.keys(AMENITY_LABELS).map(function (key) {
      return '<label class="checkbox-row"><input type="checkbox" data-amenity="' + key + '">' + AMENITY_LABELS[key] + '</label>';
    }).join('');
    document.querySelectorAll('[data-slot="amenityOptions"]').forEach(function (el) { el.innerHTML = amenityHTML; });

    var hoodHTML = NEIGHBORHOODS.slice().sort().map(function (h) {
      return '<label class="checkbox-row"><input type="checkbox" data-neighborhood="' + h + '">' + h + '</label>';
    }).join('');
    document.querySelectorAll('[data-slot="neighborhoodOptions"]').forEach(function (el) { el.innerHTML = hoodHTML; });
  }

  /* ---------------------------------------------------
     Event delegation for filter controls (works for both
     the desktop sidebar and the mobile modal, since both
     use the same data-* attributes).
  --------------------------------------------------- */
  function bindEvents() {
    document.body.addEventListener('input', function (e) {
      if (e.target.matches('[data-search-input]')) {
        state.search = e.target.value;
        document.querySelectorAll('[data-search-input]').forEach(function (el) {
          if (el !== e.target) el.value = state.search;
        });
        document.querySelectorAll('.clear-search').forEach(function (btn) {
          btn.classList.toggle('show', !!state.search);
        });
        debounce(update, 250)();
      }
      if (e.target.matches('[data-price-min]')) {
        state.priceMin = e.target.value ? Number(e.target.value) * 1000000 : null;
        debounce(update, 350)();
      }
      if (e.target.matches('[data-price-max]')) {
        state.priceMax = e.target.value ? Number(e.target.value) * 1000000 : null;
        debounce(update, 350)();
      }
      if (e.target.matches('[data-area-min]')) {
        state.areaMin = e.target.value ? Number(e.target.value) : null;
        debounce(update, 350)();
      }
      if (e.target.matches('[data-area-max]')) {
        state.areaMax = e.target.value ? Number(e.target.value) : null;
        debounce(update, 350)();
      }
    });

    document.body.addEventListener('change', function (e) {
      if (e.target.matches('[data-property-type]')) {
        var t = e.target.getAttribute('data-property-type');
        if (e.target.checked) state.propertyTypes.add(t); else state.propertyTypes.delete(t);
        update();
      }
      if (e.target.matches('[data-amenity]')) {
        var a = e.target.getAttribute('data-amenity');
        if (e.target.checked) state.amenities.add(a); else state.amenities.delete(a);
        update();
      }
      if (e.target.matches('[data-neighborhood]')) {
        var n = e.target.getAttribute('data-neighborhood');
        if (e.target.checked) state.neighborhoods.add(n); else state.neighborhoods.delete(n);
        update();
      }
      if (e.target.matches('[data-sort-select]')) {
        state.sort = e.target.value;
        update();
      }
    });

    document.body.addEventListener('click', function (e) {
      var dealTab = e.target.closest('[data-deal-tab]');
      if (dealTab) {
        state.dealType = dealTab.getAttribute('data-deal-tab');
        update();
        return;
      }

      var bedChip = e.target.closest('[data-bedrooms]');
      if (bedChip) {
        state.bedrooms = bedChip.getAttribute('data-bedrooms');
        update();
        return;
      }

      var viewBtn = e.target.closest('[data-view-btn]');
      if (viewBtn) {
        state.view = viewBtn.getAttribute('data-view-btn');
        syncControlsFromState();
        return;
      }

      var clearSearch = e.target.closest('.clear-search');
      if (clearSearch) {
        state.search = '';
        update();
        return;
      }

      var chipRemove = e.target.closest('.filter-chip button');
      if (chipRemove) {
        var key = chipRemove.parentElement.getAttribute('data-chip');
        removeChip(key);
        return;
      }

      if (e.target.id === 'clearAllBtn' || e.target.id === 'emptyStateClearBtn' || e.target.id === 'sidebarClearBtn') {
        resetAllFilters();
        return;
      }

      var groupTitle = e.target.closest('.filter-group-title');
      if (groupTitle) {
        groupTitle.closest('.filter-group').classList.toggle('collapsed');
        return;
      }

      var pageBtn = e.target.closest('.page-btn');
      if (pageBtn && !pageBtn.disabled) {
        var pv = pageBtn.getAttribute('data-page');
        if (pv === 'prev') state.page -= 1;
        else if (pv === 'next') state.page += 1;
        else state.page = Number(pv);
        render();
        document.getElementById('listingsTop').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      if (e.target.closest('#filterTriggerBtn')) { openModal(); return; }
      if (e.target.closest('#modalCloseBtn') || e.target.closest('#modalApplyBtn')) { closeModal(); return; }
      if (e.target.closest('#modalClearBtn')) { resetAllFilters(); return; }
      if (e.target.id === 'filtersModalBackdrop') { closeModal(); return; }
    });
  }

  function removeChip(key) {
    if (key === 'search') state.search = '';
    else if (key === 'price') { state.priceMin = null; state.priceMax = null; }
    else if (key === 'area') { state.areaMin = null; state.areaMax = null; }
    else if (key === 'bedrooms') state.bedrooms = 'any';
    else if (key.indexOf('propertyType:') === 0) state.propertyTypes.delete(key.split(':')[1]);
    else if (key.indexOf('amenity:') === 0) state.amenities.delete(key.split(':')[1]);
    else if (key.indexOf('hood:') === 0) state.neighborhoods.delete(key.split(':')[1]);
    update();
  }

  function resetAllFilters() {
    state.search = '';
    state.dealType = 'all';
    state.propertyTypes = new Set();
    state.priceMin = null;
    state.priceMax = null;
    state.areaMin = null;
    state.areaMax = null;
    state.bedrooms = 'any';
    state.amenities = new Set();
    state.neighborhoods = new Set();
    update();
  }

  /* ---------------------------------------------------
     Mobile filter modal open/close + reparenting the
     shared filters panel between sidebar and modal.
  --------------------------------------------------- */
  var filtersPanel = document.getElementById('filtersPanel');
  var sidebarSlot = document.getElementById('filtersSidebarSlot');
  var modalSlot = document.getElementById('filtersModalSlot');
  var backdrop = document.getElementById('filtersModalBackdrop');
  var modal = document.getElementById('filtersModal');

  function placeFiltersPanel() {
    if (window.innerWidth < 992) {
      if (filtersPanel.parentElement !== modalSlot) modalSlot.appendChild(filtersPanel);
    } else {
      if (filtersPanel.parentElement !== sidebarSlot) sidebarSlot.appendChild(filtersPanel);
      closeModal();
    }
    filtersPanel.style.display = '';
  }

  function openModal() {
    backdrop.classList.add('open');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    backdrop.classList.remove('open');
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  window.addEventListener('resize', debounce(placeFiltersPanel, 150));

  /* ---------------------------------------------------
     Utility: debounce
  --------------------------------------------------- */
  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments, ctx = this;
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  /* ---------------------------------------------------
     Init
  --------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    var totalStat = document.getElementById('totalListingsStat');
    if (totalStat) totalStat.textContent = toFaDigits(PROPERTY_LISTINGS.length);
    buildFilterOptions();
    readUrl();
    placeFiltersPanel();
    syncControlsFromState();
    document.querySelectorAll('.clear-search').forEach(function (btn) {
      btn.classList.toggle('show', !!state.search);
    });
    bindEvents();
    render();
  });

})();
