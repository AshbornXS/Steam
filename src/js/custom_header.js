(() => {
  const isMain = /^Steam$/.test(document.title) || (document.body && /SteamUIPopupWindowBody/.test(document.body.className));
  if (!isMain) return;

  const shared = () => {
    try { return window.opener && window.opener.appStore ? window.opener : null; } catch (e) { return null; }
  };

  const locale = () => {
    const lang = (document.documentElement.lang || 'en').toLowerCase();
    return lang.includes('pt') ? 'pt' : 'en';
  };

  const WORDS = {
    en: {
      cont: 'Continue', recent: 'Recently played', play: 'Play', games: 'Games', hours: 'Hours played',
      disk: 'On disk', today: 'Today', yday: 'Yesterday', inGame: 'played',
      hello: h => (h < 5 ? 'Good night,' : h < 12 ? 'Good morning,' : h < 18 ? 'Good afternoon,' : h < 23 ? 'Good evening,' : 'Good night,')
    },
    pt: {
      cont: 'Continuar', recent: 'Jogados recentemente', play: 'Jogar', games: 'Jogos', hours: 'Horas registadas',
      disk: 'No disco', today: 'Hoje', yday: 'Ontem', inGame: 'em jogo',
      hello: h => (h < 5 ? 'Boa madrugada,' : h < 12 ? 'Bom dia,' : h < 18 ? 'Boa tarde,' : h < 23 ? 'Boa noite,' : 'Boa madrugada,')
    },
  };

  const W = () => WORDS[locale()];
  const dayShort = { format: d => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' }).format(d) };
  const clock = { format: d => new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' }).format(d) };

  const relDay = ts => {
    const d = new Date(ts * 1000), now = new Date();
    const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
      new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    if (days === 0) return W().today;
    if (days === 1) return W().yday;
    return dayShort.format(d);
  };
  const hoursOf = min => (min < 60 ? `${min} min` : `${(min / 60).toLocaleString(locale(), { maximumFractionDigits: 1 })} h`);

  const CDN = id => `https://shared.steamstatic.com/store_item_assets/steam/apps/${id}`;
  const listFrom = (o, fn, app) => {
    try { const v = o.appStore[fn](app); return Array.isArray(v) ? v : v ? [v] : []; } catch (e) { return []; }
  };
  const artFor = (o, app) => {
    const id = app.appid;
    const custom = fn => (app.rt_custom_image_mtime ? listFrom(o, fn, app) : []);
    return {
      portrait: [...custom('GetCustomVerticalCapsuleURLs'), ...listFrom(o, 'GetCachedVerticalCapsuleURL', app),
      ...listFrom(o, 'GetVerticalCapsuleURLForApp', app), `${CDN(id)}/library_600x900.jpg`],
      hero: [...custom('GetCustomHeroImageURLs'), `/assets/${id}/library_hero.jpg`, `${CDN(id)}/library_hero.jpg`],
      logo: [...custom('GetCustomLogoImageURLs'), `/assets/${id}/logo.png`, `${CDN(id)}/logo.png`],
    };
  };

  const chain = (img, urls, none) => {
    let i = 0;
    const next = () => { if (i >= urls.length) { img.onerror = null; if (none) none(); return; } img.src = urls[i++]; };
    img.onerror = next;
    next();
  };

  const gameIdOf = app => String(app.gameid || app.m_gameid || app.appid || '');
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const installedApps = o => o.appStore.allApps.filter(a => {
    try { return a.per_client_data && [...a.per_client_data].some(c => c.installed); } catch (e) { return false; }
  });

  const lastPlayed = o => {
    const apps = installedApps(o);
    const games = apps.filter(a => a.app_type === 1);
    return (games.length ? games : apps).filter(a => a.rt_last_time_played).sort((a, b) => b.rt_last_time_played - a.rt_last_time_played)[0] || null;
  };

  let homeChecked = 0;
  let homeSig = '';

  const buildHome = () => {
    const o = shared();
    const host = document.querySelector('.LibraryHome');
    if (!o || !host) return;
    const anchor = host.closest('.Body.InnerContainer') || host.parentElement || host;
    const existing = anchor.querySelector(':scope > .gd-home');
    if (existing && anchor.firstElementChild !== existing) anchor.insertBefore(existing, anchor.firstElementChild);

    const now = Date.now();
    if (existing && now - homeChecked < 2500) return;
    homeChecked = now;

    const apps = installedApps(o);
    const last = lastPlayed(o);
    if (!apps.length || !last) return;

    const shelf = apps.filter(a => a.rt_last_time_played && a.appid !== last.appid)
      .sort((a, b) => b.rt_last_time_played - a.rt_last_time_played).slice(0, 7);
    const minutes = apps.reduce((s, a) => s + (a.minutes_playtime_forever || 0), 0);
    const bytes = apps.reduce((s, a) => s + Number(a.size_on_disk || 0), 0);
    const name = (document.querySelector('.SuperNav .MenuButton span') || {}).textContent || '';

    const sig = [locale(), new Date().getHours(), name, apps.length, Math.round(minutes / 60), Math.round(bytes / 2 ** 30),
    last.rt_last_time_played, last.minutes_playtime_forever,
    ...[last, ...shelf].map(a => `${a.appid}:${a.rt_custom_image_mtime || 0}`)].join('|');
    if (existing && sig === homeSig) return;
    homeSig = sig;

    const block = document.createElement('div');
    block.className = 'gd-home';
    block.innerHTML = `
      <div class="gd-top">
        <div class="gd-hello">
          <small>${W().hello(new Date().getHours())}</small>
          <strong>${esc(name)}</strong>
        </div>
        <div class="gd-stats">
          <div><small>${W().games}</small><b class="gd-num">${apps.length}</b></div>
          <div><small>${W().hours}</small><b class="gd-num">${Math.round(minutes / 60)}<small>h</small></b></div>
          <div><small>${W().disk}</small><b class="gd-num">${Math.round(bytes / 2 ** 30)}<small>GB</small></b></div>
        </div>
      </div>
      <div class="gd-continue" data-app="${last.appid}">
        <img class="gd-cont-art" alt="">
        <div class="gd-cont-body">
          <small>${W().cont}</small>
          <img class="gd-cont-logo" alt="">
          <span class="gd-cont-name">${esc(last.display_name)}</span>
          <div class="gd-cont-meta">${relDay(last.rt_last_time_played)}, ${clock.format(new Date(last.rt_last_time_played * 1000))}
            · ${hoursOf(last.minutes_playtime_forever || 0)} ${W().inGame}</div>
          <button class="gd-play" data-game="${esc(gameIdOf(last))}">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.9-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z"/></svg>
            ${W().play}
          </button>
        </div>
      </div>
      <h4 class="gd-label">${W().recent}</h4>
      <div class="gd-shelf">
        ${shelf.map(a => `
          <button class="gd-cap" data-app="${a.appid}" title="${esc(a.display_name)}">
            <img alt="">
            <span>${relDay(a.rt_last_time_played)}</span>
          </button>`).join('')}
      </div>`;

    const art = artFor(o, last);
    const hero = block.querySelector('.gd-cont-art');

    // Função para extrair a cor dominante da imagem do banner via Canvas
    const applyHeroAccent = (imgElement) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 50; // Diminuímos para performance
        canvas.height = 30;
        ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let r = 0, g = 0, b = 0, count = 0;

        // Amostragem de píxeis ignorando tons excessivamente escuros ou claros demais
        for (let i = 0; i < data.length; i += 16) {
          const red = data[i], green = data[i + 1], blue = data[i + 2];
          const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
          if (brightness > 20 && brightness < 240) {
            r += red; g += green; b += blue;
            count++;
          }
        }

        if (count > 0) {
          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);

          const playBtn = block.querySelector('.gd-play');
          if (playBtn) {
            playBtn.style.setProperty('background-color', `rgb(${r}, ${g}, ${b})`, 'important');
            playBtn.style.setProperty('border-color', `rgb(${r}, ${g}, ${b})`, 'important');
          }
        }
      } catch (err) {
        // Falhas de CORS ou canvas isolado revertem para o padrão do tema
      }
    };

    // Quando o hero carregar com sucesso, extraímos a cor e aplicamos no botão
    hero.addEventListener('load', () => applyHeroAccent(hero), { once: true });
    chain(hero, art.hero, () => hero.remove());
    chain(hero, art.hero, () => hero.remove());
    const logo = block.querySelector('.gd-cont-logo');
    const title = block.querySelector('.gd-cont-name');
    logo.addEventListener('load', () => title.remove(), { once: true });
    chain(logo, art.logo, () => { logo.remove(); title.classList.add('on'); });

    block.querySelectorAll('.gd-cap').forEach((cap, i) => {
      const img = cap.querySelector('img');
      chain(img, artFor(o, shelf[i]).portrait, () => {
        const tile = document.createElement('span');
        tile.className = 'gd-cap-text';
        tile.textContent = shelf[i].display_name;
        img.replaceWith(tile);
      });
    });

    block.addEventListener('click', e => {
      const play = e.target.closest('.gd-play');
      if (play) {
        e.stopPropagation();
        const id = play.dataset.game;
        if (!id) return;
        try { o.SteamClient.Apps.RunGame(id, '', -1, 100); } catch (err) { }
        return;
      }
      const card = e.target.closest('[data-app]');
      if (card) {
        try { o.SteamClient.URL.ExecuteSteamURL('steam://nav/games/details/' + card.dataset.app); } catch (err) { }
      }
    });

    // Interceta o clique direito (contextmenu)
    block.addEventListener('contextmenu', e => {
      const card = e.target.closest('[data-app]');
      if (!card) return;
      e.preventDefault(); // Bloqueia o menu padrão

      // Remove qualquer menu nosso que tenha ficado aberto
      const existing = document.querySelector('.gd-custom-menu');
      if (existing) existing.remove();

      const appid = card.dataset.app;
      const menu = document.createElement('div');
      menu.className = 'gd-custom-menu';

      menu.style.cssText = `position: fixed; top: ${e.clientY}px; left: ${e.clientX}px; z-index: 9999;`;

      const createItem = (text, action, isPlay = false) => {
        const item = document.createElement('div');
        item.className = 'gd-custom-menu-item' + (isPlay ? ' gd-custom-menu-item--play' : '');
        item.textContent = text;

        item.onclick = (ev) => { ev.stopPropagation(); action(); menu.remove(); };
        return item;
      };

      // Adiciona as opções comunicando diretamente com a API do cliente Steam
      menu.appendChild(createItem('Jogar', () => o.SteamClient.Apps.RunGame(appid, '', -1, 100), true));
      menu.appendChild(createItem('Ir para a página', () => o.SteamClient.URL.ExecuteSteamURL('steam://nav/games/details/' + appid)));
      menu.appendChild(createItem('Página da Loja', () => o.SteamClient.URL.ExecuteSteamURL('steam://url/StoreAppPage/' + appid)));
      const removeItem = createItem('Desinstalar...', () => o.SteamClient.URL.ExecuteSteamURL('steam://uninstall/' + appid));
      removeItem.classList.add('gd-custom-menu-item--remove');
      menu.appendChild(removeItem);

      document.body.appendChild(menu);

      // Fecha o menu ao clicar fora dele
      const closeMenu = () => { menu.remove(); document.removeEventListener('click', closeMenu); };
      setTimeout(() => document.addEventListener('click', closeMenu), 0);
    });

    if (existing) existing.replaceWith(block);
    else anchor.insertBefore(block, anchor.firstElementChild);
  };

  const tick = () => { try { buildHome(); } catch (e) { } };
  let queued = 0;
  const soon = () => { if (queued) return; queued = requestAnimationFrame(() => { queued = 0; tick(); }); };
  const watch = () => {
    const target = document.querySelector('.MainPanel') || document.body;
    if (!target) return;
    new MutationObserver(soon).observe(target, { childList: true, subtree: true });
  };

  setInterval(tick, 1000);
  if (document.body) { tick(); watch(); }
  else addEventListener('DOMContentLoaded', () => { tick(); watch(); });
})();
