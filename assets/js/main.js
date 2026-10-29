(function () {
  "use strict";

  var config = window.SITE_CONFIG || {};
  var presets = window.SITE_PRESETS || {};
  var demo = !!config.demoMode;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function icon(name) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-" + name);
    svg.appendChild(use);
    return svg;
  }

  // Текст с переносами строк "\n" → <br> без innerHTML.
  function setText(node, value) {
    node.textContent = "";
    String(value).split("\n").forEach(function (line, i) {
      if (i) node.appendChild(document.createElement("br"));
      node.appendChild(document.createTextNode(line));
    });
  }

  /* ---------- Тип бизнеса ---------- */

  function resolveType() {
    var fromUrl = demo ? new URLSearchParams(location.search).get("type") : null;
    if (fromUrl && presets[fromUrl]) return fromUrl;
    return presets[config.businessType] ? config.businessType : "universal";
  }

  var type = resolveType();
  var preset = presets[type] || {};
  var brand = config.brand || {};
  var hero = config.hero || {};
  var contacts = config.contacts || {};
  var sections = config.sections || {};

  var content = {
    "brand.name": brand.name || "Название студии",
    "hero.label": hero.label || preset.label || "",
    "hero.title": hero.title || preset.title || "",
    "hero.subtitle": hero.subtitle || preset.subtitle || "",
  };

  var services = (Array.isArray(config.services) ? config.services : preset.services || [])
    .filter(function (s) { return s && s.enabled !== false; });

  /* ---------- Тексты, цвета, изображения ---------- */

  function applyContent() {
    $$("[data-c]").forEach(function (node) {
      var value = content[node.getAttribute("data-c")];
      if (value) setText(node, value);
    });

    if (config.accent) document.documentElement.style.setProperty("--accent", config.accent);

    if (brand.logo) {
      var logoLink = $("[data-brand-logo]");
      logoLink.textContent = "";
      var img = el("img");
      img.src = brand.logo;
      img.alt = content["brand.name"];
      logoLink.appendChild(img);
    }

    var images = { "hero.image": hero.image };
    $$("[data-img]").forEach(function (img) {
      var data = images[img.getAttribute("data-img")];
      if (data && data.src) {
        img.src = data.src;
        img.alt = data.alt || "";
      }
    });

    // Отдельная вертикальная версия фото для телефонов; без неё телефон берёт основное фото.
    $$("[data-img-mobile]").forEach(function (source) {
      var data = images[source.getAttribute("data-img-mobile")];
      if (data && data.srcMobile) source.srcset = data.srcMobile;
      else source.remove();
    });

    // Подпись «фото для примера» — только в демо-режиме и только у стоковых фото.
    $$("[data-credit]").forEach(function (link) {
      var data = images[link.getAttribute("data-credit")];
      if (demo && data && data.credit) {
        link.textContent = "Фото для примера · " + data.credit.replace(/^Фото:\s*/, "");
        link.href = data.creditUrl || "#";
      } else {
        link.remove();
      }
    });

    document.title = content["brand.name"] + " — " + (preset.name || "студия красоты").toLowerCase();
    var desc = $('meta[name="description"]');
    if (desc && content["hero.subtitle"]) desc.setAttribute("content", content["hero.subtitle"]);

    $$("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
  }

  /* ---------- Разделы ---------- */

  function applySections() {
    Object.keys(sections).forEach(function (key) {
      if (sections[key] !== false) return;
      $$('[data-section="' + key + '"]').forEach(function (n) { n.remove(); });
      $$('[data-section-link="' + key + '"]').forEach(function (n) { n.remove(); });
    });
    if (sections.booking === false) {
      // Без формы кнопки записи ведут в контакты (или исчезают, если и их нет).
      $$("[data-book]").forEach(function (a) {
        if (sections.contacts !== false) a.href = "#contacts";
        else a.remove();
      });
    }
  }

  /* ---------- Подгонка крупного названия под ширину ---------- */

  function prepareWordmarks() {
    $$("[data-fit]").forEach(function (node) {
      var words = node.textContent.trim().split(/\s+/);
      node.textContent = "";
      words.forEach(function (w, i) {
        if (i) node.appendChild(document.createTextNode(" "));
        node.appendChild(el("span", "w", w));
      });
    });
  }

  function fitWordmarks() {
    $$("[data-fit]").forEach(function (node) {
      var style = getComputedStyle(node);
      var available = node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      var words = $$(".w", node);
      // Узко — каждое слово на своей строке, широко — всё в одну строку.
      var stacked = available < 760;
      node.classList.toggle("is-stacked", stacked);
      words.forEach(function (w) { w.style.display = stacked ? "block" : "inline"; });

      node.style.fontSize = "100px";
      var widest = 0;
      if (stacked) {
        words.forEach(function (w) {
          w.style.display = "inline-block";
          widest = Math.max(widest, w.getBoundingClientRect().width);
          w.style.display = "block";
        });
      } else {
        var probe = el("span", null, node.textContent);
        probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
        node.appendChild(probe);
        widest = probe.getBoundingClientRect().width;
        probe.remove();
      }
      if (widest > 0) node.style.fontSize = Math.floor(100 * available / widest * 0.995) + "px";
    });
  }

  /* ---------- Услуги ---------- */

  function placeholder(text, ratio) {
    var ph = el("div", "ph");
    var circle = el("span", "ph__icon");
    circle.appendChild(icon("image"));
    ph.appendChild(circle);
    ph.appendChild(el("span", "ph__text", text || "Место для фотографии"));
    if (ratio) ph.appendChild(el("span", "ph__ratio", ratio));
    return ph;
  }

  function renderServices() {
    var track = $("[data-services]");
    if (track) {
      services.forEach(function (s) {
        var li = el("li", "service-card reveal");
        var body = el("div", "service-card__body");
        // Без фото на настоящем сайте карточка остаётся текстовой, рамка «Место для фото» — только в демо.
        if (s.image || demo) {
          var media = el("div", "service-card__media");
          if (s.image) {
            var img = el("img");
            img.src = s.image;
            img.alt = s.imageAlt || s.title;
            img.loading = "lazy";
            if (s.imagePosition) img.style.objectPosition = s.imagePosition;
            media.appendChild(img);
          } else {
            media.appendChild(placeholder("Место для фото"));
          }
          if (s.tag) media.appendChild(el("span", "service-card__tag", s.tag));
          li.appendChild(media);
        } else {
          li.classList.add("service-card--text");
          if (s.tag) body.appendChild(el("span", "service-card__tag", s.tag));
        }

        body.appendChild(el("h3", "service-card__title", s.title));
        if (s.text) body.appendChild(el("p", "service-card__text", s.text));
        // Строка цены есть всегда; пока цены нет — после «Цена:» остаётся место, чтобы вписать её позже.
        var price = el("p", "service-card__price");
        price.appendChild(el("span", "service-card__price-label", "Цена:"));
        price.appendChild(el("span", "service-card__price-value" + (s.price ? "" : " is-empty"), s.price || ""));
        body.appendChild(price);
        li.appendChild(body);

        var cta = el("a", "service-card__foot");
        cta.href = sections.booking === false ? "#contacts" : "#booking";
        cta.setAttribute("data-book-service", s.title);
        cta.appendChild(el("span", null, "Записаться"));
        cta.appendChild(icon("arrow"));
        li.appendChild(cta);

        track.appendChild(li);
      });
      setupCarousel(track);
    }

    var tags = $("[data-hero-tags]");
    // Плашки на главном экране — направления салона (уникальные tag услуг), а не первые услуги.
    if (tags) {
      var seen = {};
      services.forEach(function (s) {
        var t = s.tag || s.title;
        if (seen[t]) return;
        seen[t] = true;
        tags.appendChild(el("li", null, t));
      });
    }

  }

  function setupCarousel(track) {
    var nav = $("[data-carousel-nav]");
    var prev = $("[data-carousel-prev]");
    var next = $("[data-carousel-next]");
    if (!nav) return;

    function step() {
      var card = track.firstElementChild;
      return card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 16) : 300;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      nav.hidden = max < 8;
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft > max - 8;
    }
    prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: "smooth" }); });
    next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: "smooth" }); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- Акции ---------- */

  var months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  function renderPromos() {
    var grid = $("[data-promos]");
    if (!grid) return;
    var d = new Date();
    var today = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    // Закончившаяся акция пропадает сама на следующий день после until.
    var promos = (config.promos || []).filter(function (p) { return p && (!p.until || p.until >= today); });
    if (!promos.length) { $$('[data-section="promos"], [data-section-link="promos"]').forEach(function (n) { n.remove(); }); return; }

    promos.forEach(function (p, i) {
      var li = el("li", "promo reveal" + (i === 0 ? " promo--accent" : "") + (p.image ? " promo--photo" : ""));
      // У карточки с фото текст и фото стоят рядом, поэтому текст собран в отдельный блок.
      var body = p.image ? el("div", "promo__body") : li;
      if (body !== li) li.appendChild(body);
      body.appendChild(el("h3", "promo__title", p.title));

      var list = el("dl", "promo__offers");
      (p.offers || []).forEach(function (o) {
        var row = el("div", "promo__offer");
        row.appendChild(el("dt", "promo__value", o[0]));
        row.appendChild(el("dd", "promo__cond", o[1]));
        list.appendChild(row);
      });
      body.appendChild(list);

      if (p.extra) {
        var extra = el("p", "promo__extra");
        extra.appendChild(icon("gift"));
        extra.appendChild(document.createTextNode(p.extra));
        body.appendChild(extra);
      }
      if (p.text) body.appendChild(el("p", "promo__text", p.text));
      if (p.image) {
        var media = el("div", "promo__media");
        var img = el("img");
        img.src = p.image;
        img.alt = p.imageAlt || "";
        img.loading = "lazy";
        if (p.imagePosition) img.style.objectPosition = p.imagePosition;
        media.appendChild(img);
        li.appendChild(media);
      }

      var foot = el("div", "promo__foot");
      if (p.until) {
        var parts = p.until.split("-");
        var until = el("p", "promo__until");
        until.appendChild(icon("calendar"));
        until.appendChild(document.createTextNode("До " + +parts[2] + " " + months[+parts[1] - 1] + " " + parts[0]));
        foot.appendChild(until);
      }
      var cta = el("a", "btn " + (i === 0 ? "btn--light" : "btn--dark") + " promo__cta");
      cta.href = sections.booking === false ? "#contacts" : "#booking";
      cta.setAttribute("data-book-service", p.service || "");
      cta.setAttribute("data-book-comment", "Акция: " + p.title);
      cta.appendChild(document.createTextNode("Записаться по акции"));
      var chip = el("span", "btn__chip");
      chip.appendChild(icon("arrow"));
      cta.appendChild(chip);
      foot.appendChild(cta);
      li.appendChild(foot);

      grid.appendChild(li);
    });
  }

  /* ---------- Цены ---------- */

  function renderPrices() {
    var grid = $("[data-prices]");
    if (!grid) return;
    var groups = config.priceList || [];
    if (!groups.length) { $$('[data-section="prices"], [data-section-link="prices"]').forEach(function (n) { n.remove(); }); return; }
    groups.forEach(function (g, i) {
      // Раскрывающиеся блоки: на телефоне прайс не растягивается на десятки экранов.
      var box = el("details", "price-group reveal");
      if (i === 0) box.open = true;
      var summary = el("summary", "price-group__head");
      summary.appendChild(el("span", "price-group__title", g.title));
      summary.appendChild(el("span", "price-group__toggle"));
      box.appendChild(summary);

      var list = el("div", "price-list");
      g.items.forEach(function (item) {
        if (typeof item === "string") { list.appendChild(el("p", "price-list__sub", item)); return; }
        var row = el("p", "price-list__row");
        row.appendChild(el("span", "price-list__name", item[0]));
        row.appendChild(el("span", "price-list__price", item[1]));
        list.appendChild(row);
      });
      box.appendChild(list);
      grid.appendChild(box);
    });
  }

  /* ---------- Галерея ---------- */

  var shapeRatio = { feature: "Крупное фото", tall: "Вертикальное фото", wide: "Горизонтальное фото", square: "Небольшое фото" };

  function renderGallery() {
    var grid = $("[data-gallery]");
    if (!grid) return;
    var captions = preset.gallery || [];
    (config.gallery || []).forEach(function (item, i) {
      var shape = shapeRatio[item.shape] ? item.shape : "square";
      var caption = item.caption || captions[i] || "";
      var li = el("li", "g-item g-item--" + shape + " reveal");

      if (item.src) {
        li.classList.add("g-item--photo");
        var btn = el("button", "g-item__btn");
        btn.type = "button";
        btn.setAttribute("aria-label", "Открыть фото" + (caption ? ": " + caption : ""));
        var img = el("img");
        img.src = item.src;
        img.alt = item.alt || caption;
        img.loading = "lazy";
        if (item.position) img.style.objectPosition = item.position;
        btn.appendChild(img);
        btn.addEventListener("click", function () { openLightbox(item.src, img.alt); });
        li.appendChild(btn);
      } else {
        li.appendChild(placeholder("Место для фотографии", shapeRatio[shape]));
      }
      if (caption) li.appendChild(el("span", "g-item__caption", caption));
      grid.appendChild(li);
    });
  }

  var lightbox = $("[data-lightbox]");
  function openLightbox(src, alt) {
    if (!lightbox || typeof lightbox.showModal !== "function") { window.open(src, "_blank", "noopener"); return; }
    var frame = $("[data-lightbox-frame]", lightbox);
    frame.textContent = "";
    var img = el("img");
    img.src = src;
    img.alt = alt || "";
    frame.appendChild(img);
    lightbox.showModal();
  }
  if (lightbox) {
    $("[data-lightbox-close]", lightbox).addEventListener("click", function () { lightbox.close(); });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) lightbox.close(); });
  }

  /* ---------- Контакты ---------- */

  function phoneLink() {
    return contacts.phone ? "tel:" + contacts.phone.replace(/[^\d+]/g, "") : "";
  }
  function messengerLinks() {
    var list = [];
    if (contacts.max) list.push({ label: "MAX", href: contacts.max, icon: "max" });
    if (contacts.whatsapp) list.push({ label: "WhatsApp", href: "https://wa.me/" + contacts.whatsapp.replace(/\D/g, ""), icon: "whatsapp" });
    if (contacts.telegram) list.push({ label: "Telegram", href: "https://t.me/" + contacts.telegram.replace(/^@/, ""), icon: "telegram" });
    if (contacts.vk) list.push({ label: "ВКонтакте", href: contacts.vk, icon: "chat" });
    return list;
  }
  function routeUrl() {
    if (contacts.routeUrl) return contacts.routeUrl;
    return contacts.address ? "https://yandex.ru/maps/?text=" + encodeURIComponent(contacts.address) : "";
  }

  function demoNote() { return el("span", "demo-note", "демо"); }

  function contactRow(list, iconName, label, valueNode, isDemo) {
    var wrap = el("div", "contact-row" + (isDemo ? " contact-row--demo" : ""));
    wrap.appendChild(icon(iconName));
    var dt = el("dt", null, label);
    if (isDemo) dt.appendChild(demoNote());
    wrap.appendChild(dt);
    var dd = el("dd");
    dd.appendChild(valueNode);
    wrap.appendChild(dd);
    list.appendChild(wrap);
  }

  function renderContacts() {
    var list = $("[data-contact-list]");
    var messengers = messengerLinks();
    var phone = phoneLink();
    var phoneText = contacts.phoneDisplay || contacts.phone;

    if (list) {
      if (contacts.address) contactRow(list, "pin", "Адрес", document.createTextNode(contacts.address));
      else if (demo) contactRow(list, "pin", "Адрес", document.createTextNode("Здесь будет адрес студии"), true);

      if (phone) {
        var a = el("a", null, phoneText);
        a.href = phone;
        contactRow(list, "phone", "Телефон", a);
      } else if (demo) contactRow(list, "phone", "Телефон", document.createTextNode("Здесь будет телефон для записи"), true);

      if (contacts.hours && contacts.hours.length) {
        var hours = el("span", "hours");
        contacts.hours.forEach(function (h) {
          hours.appendChild(el("span", null, h[0]));
          hours.appendChild(el("span", null, h[1]));
        });
        contactRow(list, "clock", "Режим работы", hours);
      } else if (demo) contactRow(list, "clock", "Режим работы", document.createTextNode("Здесь будут часы работы"), true);

      if (messengers.length) {
        var links = el("span");
        messengers.forEach(function (m, i) {
          if (i) links.appendChild(document.createTextNode(" · "));
          var ml = el("a", null, m.label);
          ml.href = m.href;
          ml.target = "_blank";
          ml.rel = "noopener";
          links.appendChild(ml);
        });
        contactRow(list, "chat", "Мессенджеры", links);
      } else if (demo) contactRow(list, "chat", "Мессенджеры", document.createTextNode("Здесь будут ссылки на мессенджеры"), true);

      if (!list.children.length) list.remove();
    }

    var actions = $("[data-contact-actions]");
    if (actions) {
      var route = routeUrl();
      var contactHref = messengers.length ? messengers[0].href : phone;
      if (route || demo) actions.appendChild(actionBtn("Построить маршрут", route, "btn--dark", true));
      if (contactHref || demo) actions.appendChild(actionBtn("Связаться", contactHref, "btn--outline", false));
      if (demo && (!route || !contactHref)) {
        var note = el("p", "section-lead");
        note.style.width = "100%";
        note.style.fontSize = "0.8125rem";
        note.textContent = "Кнопки заработают, когда в config.js будут указаны адрес и контакты.";
        actions.appendChild(note);
      }
    }

    var map = $("[data-map]");
    if (map) {
      if (contacts.mapImage) {
        var mapLink = el("a", "contacts__map-link");
        mapLink.href = routeUrl() || "#contacts";
        mapLink.target = "_blank";
        mapLink.rel = "noopener";
        var mapImg = el("img");
        mapImg.src = contacts.mapImage;
        mapImg.alt = "Карта: " + (contacts.address || "как нас найти");
        mapImg.loading = "lazy";
        mapLink.appendChild(mapImg);
        mapLink.appendChild(el("span", "contacts__map-cta", "Открыть в Яндекс Картах"));
        map.appendChild(mapLink);
      } else if (contacts.mapEmbed) {
        var frame = el("iframe");
        frame.src = contacts.mapEmbed;
        frame.title = "Карта: как нас найти";
        frame.loading = "lazy";
        map.appendChild(frame);
      } else if (demo) {
        map.appendChild(placeholder("Место для карты"));
      } else {
        map.remove();
      }
    }

    var footer = $("[data-footer-contacts]");
    if (footer) {
      if (contacts.address) footer.appendChild(el("span", null, contacts.address));
      if (phone) { var fp = el("a", null, phoneText); fp.href = phone; footer.appendChild(fp); }
      if (contacts.email) { var fe = el("a", null, contacts.email); fe.href = "mailto:" + contacts.email; footer.appendChild(fe); }
      messengers.forEach(function (m) {
        var fm = el("a", null, m.label);
        fm.href = m.href; fm.target = "_blank"; fm.rel = "noopener";
        footer.appendChild(fm);
      });
    }

    // Запись: по крупной кнопке на каждый мессенджер и звонок. Сайт не собирает данные — человек пишет сам.
    var channels = $("[data-booking-channels]");
    if (channels) {
      var ways = messengers.map(function (m) { return { name: m.label, hint: "Написать в " + m.label, href: m.href, icon: m.icon }; });
      if (phone) ways.push({ name: phoneText, hint: "Позвонить", href: phone, icon: "phone" });
      if (contacts.onlineBooking) ways.unshift({ name: "Записаться онлайн", hint: "Сами выберите мастера, услугу и время", href: contacts.onlineBooking, icon: "calendar", primary: true });
      ways.forEach(function (c) {
        var link = el("a", "channel" + (c.primary ? " channel--primary" : ""));
        link.href = c.href;
        if (c.href.indexOf("http") === 0) { link.target = "_blank"; link.rel = "noopener"; }
        var mark = el("span", "channel__icon");
        mark.appendChild(icon(c.icon));
        link.appendChild(mark);
        var text = el("span", "channel__text");
        text.appendChild(el("span", "channel__name", c.name));
        text.appendChild(el("span", "channel__hint", c.hint));
        link.appendChild(text);
        var chip = el("span", "btn__chip");
        chip.appendChild(icon("arrow"));
        link.appendChild(chip);
        channels.appendChild(link);
      });
      if (!ways.length) channels.appendChild(el("p", "booking__lead", "Контакты для записи скоро появятся."));
    }
  }

  function actionBtn(label, href, variant, external) {
    var a = el("a", "btn " + variant);
    a.textContent = label;
    if (href) {
      a.href = href;
      if (external || href.indexOf("http") === 0) { a.target = "_blank"; a.rel = "noopener"; }
    } else {
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("role", "link");
    }
    return a;
  }

  /* ---------- Меню и шапка ---------- */

  function setupHeader() {
    var header = $("[data-header]");
    var toggle = $("[data-menu-toggle]");
    var menu = $("[data-menu]");

    function setMenu(open) {
      toggle.setAttribute("aria-expanded", String(open));
      $(".visually-hidden", toggle).textContent = open ? "Закрыть меню" : "Открыть меню";
      $("use", toggle).setAttribute("href", open ? "#i-close" : "#i-menu");
      // Меню начинается сразу под шапкой, где бы она ни была (над ней может быть демо-полоса).
      if (open) menu.style.setProperty("--menu-top", $(".site-header__inner", header).getBoundingClientRect().bottom + "px");
      menu.hidden = !open;
      document.body.style.overflow = open ? "hidden" : "";
    }

    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { setMenu(false); toggle.focus(); }
    });
    window.matchMedia("(min-width: 1024px)").addEventListener("change", function (mq) { if (mq.matches) setMenu(false); });

    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Появление при прокрутке ---------- */

  function setupReveal() {
    var items = $$(".reveal");
    if (!("IntersectionObserver" in window)) { items.forEach(function (n) { n.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (n) { io.observe(n); });
  }

  /* ---------- Демо-панель ---------- */

  function setupDemoBar() {
    var bar = $("[data-demo-bar]");
    if (!bar) return;
    if (!demo) { bar.remove(); return; }
    var select = $("[data-type-switch]", bar);
    Object.keys(presets).forEach(function (key) {
      var opt = el("option", null, presets[key].name);
      opt.value = key;
      if (key === type) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", function () {
      var url = new URL(location.href);
      url.searchParams.set("type", select.value);
      url.hash = "";
      location.href = url.toString();
    });
    setupAccentSwitch($("[data-accent-switch]", bar));

    bar.hidden = false;
    document.documentElement.classList.add("is-demo");
    // Полоса на телефоне может занять две строки — первый экран учитывает её настоящую высоту.
    var syncHeight = function () { document.documentElement.style.setProperty("--demo-h", bar.offsetHeight + "px"); };
    syncHeight();
    window.addEventListener("resize", syncHeight);
  }

  // Цвета для показа клиенту. Белый текст читается на каждом из них.
  var demoAccents = [
    { id: "teal", name: "Бирюзовый", value: "#3f5d5a" },
    { id: "wine", name: "Бордовый", value: "#6b2e3a" },
    { id: "olive", name: "Оливковый", value: "#4f5a35" },
    { id: "graphite", name: "Графитовый", value: "#2f3437" },
    { id: "powder", name: "Пудровый", value: "#8a5a5f" },
  ];

  function setupAccentSwitch(group) {
    if (!group) return;
    var fromUrl = new URLSearchParams(location.search).get("accent");
    var current = demoAccents.filter(function (a) { return a.id === fromUrl; })[0] ||
      demoAccents.filter(function (a) { return a.value === String(config.accent).toLowerCase(); })[0];
    if (current) document.documentElement.style.setProperty("--accent", current.value);

    demoAccents.forEach(function (a) {
      var label = el("label", "swatch");
      label.title = a.name;
      var input = el("input");
      input.type = "radio";
      input.name = "accent";
      input.value = a.id;
      input.checked = !!current && current.id === a.id;
      input.setAttribute("aria-label", a.name);
      var dot = el("span", "swatch__dot");
      dot.style.background = a.value;
      label.appendChild(input);
      label.appendChild(dot);
      group.appendChild(label);

      input.addEventListener("change", function () {
        document.documentElement.style.setProperty("--accent", a.value);
        // Цвет попадает в адрес страницы — такой ссылкой можно сразу поделиться с клиентом.
        var url = new URL(location.href);
        url.searchParams.set("accent", a.id);
        history.replaceState(null, "", url.toString());
      });
    });
  }

  /* ---------- Запуск ---------- */

  applyContent();
  applySections();
  prepareWordmarks();
  renderPromos();
  renderServices();
  renderPrices();
  renderGallery();
  renderContacts();
  setupHeader();
  setupDemoBar();
  setupReveal();

  // Настройка закончена — включаем плавные переходы обратно.
  var booted = function () { document.documentElement.classList.remove("is-booting"); };
  requestAnimationFrame(function () { requestAnimationFrame(booted); });
  setTimeout(booted, 400); // на случай вкладки в фоне, где кадры не рисуются

  fitWordmarks();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWordmarks);
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitWordmarks, 120);
  });
})();
