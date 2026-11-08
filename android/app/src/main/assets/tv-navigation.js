/**
 * STREAM IT — Smart TV 10-Foot Spatial Navigation & Universal Keyboard Engine (v9.4.0)
 * Ultra-fast 60fps D-Pad routing (< 0.2ms visibility check + debounced hero preview + instant TV scroll) across:
 * - Side Rail (#tvSideRail)
 * - Live Hero Stage (#heroBillboard)
 * - Reorganized Explorer (#genreFilterStrip + #explorerDropdownsBar + Open Dropdown Panels)
 * - Horizontal Shelves (.netflix-row) & Multi-Row/Column Poster Wall Grid (.catalog-poster-grid + #loadMoreCatalogBtn)
 * - Details Modal (#detailsTrailerBtn, #detailsStreamsSection, Seasons & Episodes)
 * - Video Player (#playerSourceTabs, #playerSubsMenu with vertical position/background/size/color/sync, #skipIntroOverlayBtn)
 * - Universal Physical LTR Virtual Keyboard (#tvVirtualKeyboard)
 */
(function () {
  'use strict';

  var currentFocused = null;
  var lastMainFocus = null;
  var activeVkInput = null;
  var vkLang = 'HE';
  var heroPreviewDebounceTimer = null;
  var lastPlayerOverlayDismissedAt = 0;
  var lastBackHandledAt = 0;
  var lastCmdAt = 0;
  var lastCmdDir = '';
  var lastFocusedDescriptor = null;

  function clearPlayerFocus() {
    var player = document.getElementById('playerModal');
    if (currentFocused && player && player.contains(currentFocused)) {
      currentFocused.classList.remove('tv-focused');
      try {
        currentFocused.blur();
      } catch (e) {}
      currentFocused = null;
    }
  }

  // Exact Physical Left-to-Right Standard Keyboard Layouts (10 columns per row)
  var VK_LAYOUTS = {
    HE: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['/', "'", 'ק', 'ר', 'א', 'ט', 'ו', 'ן', 'ם', 'פ'],
      ['ש', 'ד', 'ג', 'כ', 'ע', 'י', 'ח', 'ל', 'ך', 'ף'],
      ['ז', 'ס', 'ב', 'ה', 'נ', 'מ', 'צ', 'ת', 'ץ', '.']
    ],
    EN: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '@'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '-', '_']
    ]
  };

  function detectTvEnvironment() {
    var ua = (navigator.userAgent || '').toLowerCase();
    var params = new URLSearchParams(window.location.search);
    if (params.get('tv') === '1') return true;
    if (params.get('tv') === '0') return false;
    try {
      if (window.AndroidTvBridge && typeof window.AndroidTvBridge.isAndroidTv === 'function') {
        if (window.AndroidTvBridge.isAndroidTv()) return true;
      }
    } catch (e) {}
    return /android tv|smarttv|smart-tv|googletv|bravia|aft|shield|mibox|chromecast|leanback|tizen|web0s|webos|netcast|vidaa|hisense|viera|aquos|wv/i.test(ua);
  }

  function applyTvModeClass() {
    if (!document.body) return;
    if (detectTvEnvironment()) {
      document.body.classList.add('tv-mode');
    }
  }

  function isElementVisible(el) {
    if (!el || !el.isConnected || el.disabled) return false;
    if (el.classList.contains('hidden')) return false;
    if (el.closest('.hidden')) return false;
    if (el.closest('.tv-rail-sec-list:not(.open)')) return false;
    return el.offsetWidth > 2 && el.offsetHeight > 2;
  }

  function getActiveScope() {
    var vk = document.getElementById('tvVirtualKeyboard');
    if (vk && !vk.classList.contains('hidden')) return vk;

    var player = document.getElementById('playerModal');
    if (player && !player.classList.contains('hidden')) return player;

    var tgModal = document.getElementById('telegramModal');
    if (tgModal && !tgModal.classList.contains('hidden')) return tgModal;

    var tvMoreModal = document.getElementById('tvMoreModal');
    if (tvMoreModal && !tvMoreModal.classList.contains('hidden')) return tvMoreModal;

    var auth = document.getElementById('authModal');
    if (auth && !auth.classList.contains('hidden')) return auth;

    var details = document.getElementById('detailsModal');
    if (details && !details.classList.contains('hidden')) {
      var detailsSourcesPanel = document.getElementById('detailsStreamsDropdownPanel');
      if (detailsSourcesPanel && !detailsSourcesPanel.classList.contains('hidden')) {
        return detailsSourcesPanel;
      }
      return details;
    }

    var search = document.getElementById('searchModal');
    if (search && !search.classList.contains('hidden')) return search;

    var userSettingsPanel = document.getElementById('userSettingsDropdownPanel');
    if (userSettingsPanel && !userSettingsPanel.classList.contains('hidden')) return userSettingsPanel;

    var openDropdown = document.querySelector('.explorer-dropdown-panel:not(.hidden)');
    if (openDropdown) return openDropdown;

    return document.body;
  }

  function getFocusableElements(scope) {
    var root = scope || getActiveScope();
    var nodes = root.querySelectorAll(
      '.tv-focusable, button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'
    );
    var list = [];
    for (var i = 0; i < nodes.length; i++) {
      if (isElementVisible(nodes[i])) {
        list.push(nodes[i]);
      }
    }
    return list;
  }

  function setFocus(el, options) {
    if (!el || !isElementVisible(el)) return false;
    options = options || {};

    var prevFocused = currentFocused;
    if (prevFocused && prevFocused !== el) {
      prevFocused.classList.remove('tv-focused');
    }

    currentFocused = el;
    el.classList.add('tv-focused');
    if (!el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '0');
    }

    var isTv = Boolean(document.body && document.body.classList.contains('tv-mode'));
    var tag = (el.tagName || '').toUpperCase();
    if (!isTv || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
      try {
        el.focus({ preventScroll: true });
      } catch (e) {}
    } else if (document.activeElement && document.activeElement !== document.body && document.activeElement !== el) {
      try {
        document.activeElement.blur();
      } catch (e) {}
    }

    if (el.closest('#mainStage')) {
      lastMainFocus = el;
    }

    // Record descriptor so if a container re-renders in the background, focus recovers in-place without jumping
    var pRow = el.closest('.netflix-row');
    var allR = pRow ? Array.prototype.slice.call(document.querySelectorAll('#catalogMain .netflix-row')) : [];
    var rIdx = pRow ? allR.indexOf(pRow) : -1;
    var cIdx = -1;
    if (pRow) {
      cIdx = Array.prototype.slice.call(pRow.querySelectorAll('.poster-card')).indexOf(el);
    } else if (el.closest('.catalog-poster-grid')) {
      cIdx = Array.prototype.slice.call(document.querySelectorAll('#catalogMain .catalog-poster-grid .poster-card')).indexOf(el);
    }
    lastFocusedDescriptor = {
      id: el.id || '',
      itemId: el.getAttribute('data-item-id') || '',
      tvGenre: el.getAttribute('data-tv-genre') || '',
      tvProvider: el.getAttribute('data-tv-provider') || '',
      tvYear: el.getAttribute('data-tv-year') || '',
      tvActor: el.getAttribute('data-tv-actor-id') || '',
      miniChar: el.getAttribute('data-mini-char') || '',
      miniAct: el.getAttribute('data-mini-act') || '',
      category: el.getAttribute('data-category') || '',
      rowIdx: rIdx,
      colIdx: cIdx,
      inSideRail: Boolean(el.closest('#tvSideRail')),
      inTopHeader: Boolean(el.closest('#topHeader')),
      inHero: Boolean(el.closest('#heroBillboard'))
    };

    var scrollBehavior = isTv ? 'auto' : 'smooth';

    // Horizontal strip or row scrolling
    var stripOrTrack = el.closest('.row-track, .genre-filter-strip');
    if (stripOrTrack && options.scroll !== false) {
      var itemRect = el.getBoundingClientRect();
      var trackRect = stripOrTrack.getBoundingClientRect();
      var deltaX = (itemRect.left + itemRect.width / 2) - (trackRect.left + trackRect.width / 2);
      if (Math.abs(deltaX) > 36) {
        if (isTv) {
          stripOrTrack.scrollLeft += deltaX;
        } else {
          stripOrTrack.scrollBy({ left: deltaX, behavior: scrollBehavior });
        }
      }
    }

    // Vertical scrolling inside #tvRailListsScroll, #catalogMain, #detailsModal, #searchModal, #tvMoreModal, or open dropdown panel
    if (options.scroll !== false) {
      var prevRow = prevFocused ? prevFocused.closest('.netflix-row') : null;
      var curRow = el.closest('.netflix-row');
      var sameNetflixRow = Boolean(prevRow && curRow && prevRow === curRow);
      if (!sameNetflixRow) {
        var scrollTarget = curRow || el;
        var scrollContainer = el.closest('#tvRailListsScroll, #catalogMain, .details-modal-sheet, #searchModal, #tvMoreModal, .explorer-dropdown-panel');
        if (scrollContainer) {
          if (isTv) {
            var cRect = scrollContainer.getBoundingClientRect();
            var tRect = scrollTarget.getBoundingClientRect();
            var pad = 14;
            if (tRect.bottom > cRect.bottom - pad) {
              scrollContainer.scrollTop += (tRect.bottom - (cRect.bottom - pad));
            } else if (tRect.top < cRect.top + pad) {
              scrollContainer.scrollTop -= ((cRect.top + pad) - tRect.top);
            }
          } else {
            try {
              scrollTarget.scrollIntoView({ block: 'nearest', behavior: scrollBehavior });
            } catch (e) {}
          }
        }
      }
    }

    // Debounced Live Hero Stage update when focusing a poster card on Smart TV (prevents backdrop decode stutter!)
    if (el.classList.contains('poster-card') && typeof window.previewCardInHero === 'function') {
      if (heroPreviewDebounceTimer) clearTimeout(heroPreviewDebounceTimer);
      heroPreviewDebounceTimer = setTimeout(function () {
        if (currentFocused === el) {
          window.previewCardInHero(el);
        }
      }, isTv ? 260 : 200);
    }

    return true;
  }

  /**
   * Pure Physical Screen-Coordinate Nearest Neighbor Finder
   */
  function findNearestPhysical(origin, direction, candidates) {
    if (!origin || !candidates || !candidates.length) return null;
    var r1 = origin.getBoundingClientRect();
    var cx1 = r1.left + r1.width / 2;
    var cy1 = r1.top + r1.height / 2;

    var best = null;
    var bestScore = Infinity;

    for (var i = 0; i < candidates.length; i++) {
      var cand = candidates[i];
      if (cand === origin) continue;
      var r2 = cand.getBoundingClientRect();
      var cx2 = r2.left + r2.width / 2;
      var cy2 = r2.top + r2.height / 2;

      var dx = cx2 - cx1;
      var dy = cy2 - cy1;

      var primaryDist = 0;
      var crossDist = 0;

      if (direction === 'right') {
        if (dx <= 6) continue;
        primaryDist = dx;
        crossDist = Math.abs(dy);
      } else if (direction === 'left') {
        if (dx >= -6) continue;
        primaryDist = Math.abs(dx);
        crossDist = Math.abs(dy);
      } else if (direction === 'down') {
        if (dy <= 6) continue;
        primaryDist = dy;
        crossDist = Math.abs(dx);
      } else if (direction === 'up') {
        if (dy >= -6) continue;
        primaryDist = Math.abs(dy);
        crossDist = Math.abs(dx);
      } else {
        continue;
      }

      var score = primaryDist + crossDist * 2.5;
      if (score < bestScore) {
        bestScore = score;
        best = cand;
      }
    }

    return best;
  }

  /**
   * Deterministic Navigation inside Universal TV Keyboard (#tvVirtualKeyboard)
   */
  function navigateVirtualKeyboard(direction) {
    var vk = document.getElementById('tvVirtualKeyboard');
    if (!vk || vk.classList.contains('hidden')) return false;

    var keys = Array.prototype.slice.call(vk.querySelectorAll('.vk-key'));
    var actionBtns = Array.prototype.slice.call(vk.querySelectorAll('.vk-action-btn'));

    if (!currentFocused || !vk.contains(currentFocused)) {
      if (keys.length) return setFocus(keys[0]);
      return false;
    }

    var keyIdx = keys.indexOf(currentFocused);
    var actIdx = actionBtns.indexOf(currentFocused);

    var cols = 10;
    if (keyIdx !== -1) {
      var row = Math.floor(keyIdx / cols);
      var col = keyIdx % cols;
      var totalRows = Math.ceil(keys.length / cols);

      if (direction === 'right') {
        if (col < cols - 1 && keyIdx + 1 < keys.length) return setFocus(keys[keyIdx + 1]);
        return true;
      }
      if (direction === 'left') {
        if (col > 0) return setFocus(keys[keyIdx - 1]);
        return true;
      }
      if (direction === 'down') {
        if (row < totalRows - 1 && keyIdx + cols < keys.length) {
          return setFocus(keys[keyIdx + cols]);
        }
        if (actionBtns.length) {
          var mappedIdx = Math.min(actionBtns.length - 1, Math.floor((col / cols) * actionBtns.length));
          return setFocus(actionBtns[mappedIdx]);
        }
        return true;
      }
      if (direction === 'up') {
        if (row > 0) return setFocus(keys[keyIdx - cols]);
        return true;
      }
    }

    if (actIdx !== -1) {
      if (direction === 'right') {
        if (actIdx < actionBtns.length - 1) return setFocus(actionBtns[actIdx + 1]);
        return true;
      }
      if (direction === 'left') {
        if (actIdx > 0) return setFocus(actionBtns[actIdx - 1]);
        return true;
      }
      if (direction === 'up') {
        if (keys.length >= cols) {
          var targetCol = Math.min(cols - 1, Math.floor((actIdx / Math.max(1, actionBtns.length)) * cols) + 2);
          var lastRowStart = keys.length - cols;
          return setFocus(keys[lastRowStart + targetCol]);
        }
        return true;
      }
      if (direction === 'down') {
        return true;
      }
    }

    return false;
  }

  /**
   * Deterministic Navigation inside Video Player (#playerModal)
   */
  function navigatePlayerModal(direction) {
    var player = document.getElementById('playerModal');
    if (!player || player.classList.contains('hidden')) return false;

    var controlsOverlay = document.getElementById('playerControlsOverlay');
    var subsMenu = document.getElementById('playerSubsMenu');
    var sourceTabsPanel = document.getElementById('playerSourceTabs');
    var seekSlider = document.getElementById('playerSeekSlider');

    // Direct Remote Control when Player Controls are idle-hidden:
    // Up/Down = Subtitle Vertical Position; Right/Left = Instant ±10s Seek + Netflix Scene Thumbnail Preview!
    if (
      controlsOverlay &&
      controlsOverlay.classList.contains('idle-hidden') &&
      (!subsMenu || subsMenu.classList.contains('hidden')) &&
      (!sourceTabsPanel || sourceTabsPanel.classList.contains('hidden'))
    ) {
      if (direction === 'down' && typeof window.adjustSubtitleVerticalPosition === 'function') {
        window.adjustSubtitleVerticalPosition(-1.5);
        return true;
      }
      if (direction === 'up' && typeof window.adjustSubtitleVerticalPosition === 'function') {
        window.adjustSubtitleVerticalPosition(1.5);
        return true;
      }
      if (direction === 'right' && typeof window.seekVideoBy === 'function') {
        window.seekVideoBy(10);
        if (seekSlider && isElementVisible(seekSlider)) setFocus(seekSlider, { scroll: false });
        return true;
      }
      if (direction === 'left' && typeof window.seekVideoBy === 'function') {
        window.seekVideoBy(-10);
        if (seekSlider && isElementVisible(seekSlider)) setFocus(seekSlider, { scroll: false });
        return true;
      }
    }

    if (typeof window.wakePlayerControls === 'function') {
      window.wakePlayerControls();
    }

    var skipBtn = document.getElementById('skipIntroOverlayBtn');
    var resumeRestartBtn = document.getElementById('resumeRestartFromZeroBtn');
    var topSubsBtn = document.getElementById('playerTopSubsBtn');
    var sourcesDropBtn = document.getElementById('playerSourcesDropdownBtn');
    var topFsBtn = document.getElementById('playerTopFullscreenBtn');
    var closeBtn = document.getElementById('closePlayerBtn');
    var playPauseBtn = document.getElementById('playerPlayPauseBtn');
    var rewindBtn = document.getElementById('playerRewindBtn');
    var forwardBtn = document.getElementById('playerForwardBtn');
    var nextEpBtn = document.getElementById('playerNextEpBtn');
    var subsBtn = document.getElementById('playerSubsBtn');
    var fullscreenBtn = document.getElementById('playerFullscreenBtn');
    var embedCcBtn = document.getElementById('embedCcOverlayBtn');
    var embedFsBtn = document.getElementById('embedFullscreenOverlayBtn');

    // 1. Open Subtitles Menu (#playerSubsMenu)
    if (subsMenu && !subsMenu.classList.contains('hidden')) {
      var subItems = Array.prototype.slice.call(subsMenu.querySelectorAll('button')).filter(isElementVisible);
      if (!subItems.length) return true;
      if (!currentFocused || !subsMenu.contains(currentFocused)) {
        return setFocus(subItems[0]);
      }
      var nearSub = findNearestPhysical(currentFocused, direction, subItems);
      if (nearSub) return setFocus(nearSub);
      var sIdx = subItems.indexOf(currentFocused);
      if (direction === 'down') {
        if (sIdx < subItems.length - 1) return setFocus(subItems[sIdx + 1]);
        if (document.body && document.body.classList.contains('tv-mode')) {
          return setFocus(subItems[subItems.length - 1]);
        }
        subsMenu.classList.add('hidden');
        return setFocus(subsBtn && isElementVisible(subsBtn) ? subsBtn : (topSubsBtn || closeBtn));
      }
      if (direction === 'up') {
        if (sIdx > 0) return setFocus(subItems[sIdx - 1]);
        if (document.body && document.body.classList.contains('tv-mode')) {
          return setFocus(subItems[0]);
        }
        subsMenu.classList.add('hidden');
        return setFocus(topSubsBtn && isElementVisible(topSubsBtn) ? topSubsBtn : (subsBtn || closeBtn));
      }
      return true;
    }

    // 2. Open Player Sources Dropdown (#playerSourceTabs)
    if (sourceTabsPanel && !sourceTabsPanel.classList.contains('hidden')) {
      var srcItems = Array.prototype.slice.call(sourceTabsPanel.querySelectorAll('.source-tab-btn')).filter(isElementVisible);
      var srcIdx = srcItems.indexOf(currentFocused);
      if (srcIdx === -1 && srcItems.length) {
        return setFocus(srcItems[0]);
      }
      if (direction === 'down') {
        if (srcIdx < srcItems.length - 1) return setFocus(srcItems[srcIdx + 1]);
        return true;
      }
      if (direction === 'up') {
        if (srcIdx > 0) return setFocus(srcItems[srcIdx - 1]);
        if (document.body && document.body.classList.contains('tv-mode')) {
          return setFocus(srcItems[0]);
        }
        sourceTabsPanel.classList.add('hidden');
        if (sourcesDropBtn) {
          sourcesDropBtn.setAttribute('aria-expanded', 'false');
          return setFocus(sourcesDropBtn);
        }
        return true;
      }
      if (direction === 'left' || direction === 'right') {
        if (document.body && document.body.classList.contains('tv-mode')) {
          return true;
        }
        sourceTabsPanel.classList.add('hidden');
        if (sourcesDropBtn) {
          sourcesDropBtn.setAttribute('aria-expanded', 'false');
          return setFocus(sourcesDropBtn);
        }
        return true;
      }
      return true;
    }

    var topBarBtns = [topSubsBtn, sourcesDropBtn, topFsBtn, closeBtn].filter(isElementVisible);
    var transportBtns = [playPauseBtn, rewindBtn, forwardBtn, nextEpBtn, subsBtn, fullscreenBtn].filter(isElementVisible);
    var embedOverlayBtns = [embedCcBtn, embedFsBtn].filter(isElementVisible);
    var isEmbedMode = player.classList.contains('embed-mode-active');

    if (!currentFocused || !player.contains(currentFocused) || !isElementVisible(currentFocused)) {
      if (skipBtn && isElementVisible(skipBtn)) return setFocus(skipBtn);
      if (resumeRestartBtn && isElementVisible(resumeRestartBtn)) return setFocus(resumeRestartBtn);
      if (!isEmbedMode && playPauseBtn && isElementVisible(playPauseBtn)) return setFocus(playPauseBtn);
      if (topBarBtns.length) return setFocus(topBarBtns[0]);
      if (closeBtn) return setFocus(closeBtn);
      return true;
    }

    // 3. Resume Playback Toast Button (#resumeRestartFromZeroBtn)
    if (currentFocused === resumeRestartBtn) {
      if (direction === 'up') {
        if (topBarBtns.length) return setFocus(topBarBtns[0]);
        return true;
      }
      if (direction === 'down') {
        if (skipBtn && isElementVisible(skipBtn)) return setFocus(skipBtn);
        if (!isEmbedMode && seekSlider && isElementVisible(seekSlider)) return setFocus(seekSlider);
        if (!isEmbedMode && playPauseBtn && isElementVisible(playPauseBtn)) return setFocus(playPauseBtn);
        if (isEmbedMode && embedOverlayBtns.length) return setFocus(embedOverlayBtns[0]);
        return true;
      }
      return true;
    }

    // 4. Timeline Seek Slider (#playerSeekSlider)
    if (currentFocused === seekSlider) {
      if (direction === 'right') {
        if (typeof window.seekVideoBy === 'function') window.seekVideoBy(10);
        return true;
      }
      if (direction === 'left') {
        if (typeof window.seekVideoBy === 'function') window.seekVideoBy(-10);
        return true;
      }
      if (direction === 'down') {
        if (playPauseBtn && isElementVisible(playPauseBtn)) return setFocus(playPauseBtn);
        if (transportBtns.length) return setFocus(transportBtns[0]);
        return true;
      }
      if (direction === 'up') {
        if (skipBtn && isElementVisible(skipBtn)) return setFocus(skipBtn);
        if (resumeRestartBtn && isElementVisible(resumeRestartBtn)) return setFocus(resumeRestartBtn);
        if (topBarBtns.length) return setFocus(topBarBtns[0]);
        return true;
      }
    }

    // 5. Skip Intro Button (#skipIntroOverlayBtn)
    if (currentFocused === skipBtn) {
      if (direction === 'down') {
        if (!isEmbedMode && seekSlider && isElementVisible(seekSlider)) return setFocus(seekSlider);
        if (!isEmbedMode && playPauseBtn && isElementVisible(playPauseBtn)) return setFocus(playPauseBtn);
        if (isEmbedMode && embedOverlayBtns.length) return setFocus(embedOverlayBtns[0]);
        return true;
      }
      if (direction === 'up') {
        if (resumeRestartBtn && isElementVisible(resumeRestartBtn)) return setFocus(resumeRestartBtn);
        if (topBarBtns.length) return setFocus(topBarBtns[0]);
        return true;
      }
      return true;
    }

    // 6. Top Bar Buttons (#playerTopSubsBtn, #playerSourcesDropdownBtn, #playerTopFullscreenBtn, #closePlayerBtn)
    if (topBarBtns.indexOf(currentFocused) !== -1) {
      if (direction === 'left' || direction === 'right') {
        var nearTop = findNearestPhysical(currentFocused, direction, topBarBtns);
        if (nearTop) return setFocus(nearTop);
        return true;
      }
      if (direction === 'down') {
        if (resumeRestartBtn && isElementVisible(resumeRestartBtn)) return setFocus(resumeRestartBtn);
        if (skipBtn && isElementVisible(skipBtn)) return setFocus(skipBtn);
        if (!isEmbedMode && seekSlider && isElementVisible(seekSlider)) return setFocus(seekSlider);
        if (!isEmbedMode && playPauseBtn && isElementVisible(playPauseBtn)) return setFocus(playPauseBtn);
        if (isEmbedMode && embedOverlayBtns.length) return setFocus(embedOverlayBtns[0]);
        return true;
      }
      return true;
    }

    // 7. Embed Mode Bottom-Right Overlay Buttons (#embedCcOverlayBtn, #embedFullscreenOverlayBtn)
    var eIdx = embedOverlayBtns.indexOf(currentFocused);
    if (eIdx !== -1) {
      if (direction === 'left' || direction === 'right') {
        var nearEmbedBtn = findNearestPhysical(currentFocused, direction, embedOverlayBtns);
        if (nearEmbedBtn) return setFocus(nearEmbedBtn);
        return true;
      }
      if (direction === 'up') {
        if (skipBtn && isElementVisible(skipBtn)) return setFocus(skipBtn);
        if (resumeRestartBtn && isElementVisible(resumeRestartBtn)) return setFocus(resumeRestartBtn);
        if (topBarBtns.length) return setFocus(topBarBtns[0]);
        return true;
      }
      return true;
    }

    // 8. Bottom Transport Row Buttons (#playerPlayPauseBtn, -10s, +10s, NextEp, Subs, Fullscreen)
    var tIdx = transportBtns.indexOf(currentFocused);
    if (tIdx !== -1) {
      if (direction === 'right') {
        if (tIdx < transportBtns.length - 1) return setFocus(transportBtns[tIdx + 1]);
        return true;
      }
      if (direction === 'left') {
        if (tIdx > 0) return setFocus(transportBtns[tIdx - 1]);
        return true;
      }
      if (direction === 'up') {
        if (seekSlider && isElementVisible(seekSlider)) return setFocus(seekSlider);
        if (topBarBtns.length) return setFocus(topBarBtns[0]);
        return true;
      }
      return true;
    }

    if (!isEmbedMode && playPauseBtn && isElementVisible(playPauseBtn)) return setFocus(playPauseBtn);
    if (topBarBtns.length) return setFocus(topBarBtns[0]);
    return true;
  }

  /**
   * Deterministic Navigation inside User Settings Dropdown Menu (#userSettingsDropdownPanel)
   */
  function navigateUserSettingsDropdown(direction) {
    var panel = document.getElementById('userSettingsDropdownPanel');
    var triggerBtn = document.getElementById('userSettingsMenuBtn');
    if (!panel || panel.classList.contains('hidden')) return false;

    var profileChips = Array.prototype.slice.call(panel.querySelectorAll('.user-menu-prof-chip, .user-menu-profile-chip')).filter(isElementVisible);
    var menuItems = Array.prototype.slice.call(panel.querySelectorAll('.user-menu-item')).filter(isElementVisible);

    if (!currentFocused || !panel.contains(currentFocused) || !isElementVisible(currentFocused)) {
      if (menuItems.length) return setFocus(menuItems[0], { scroll: false });
      if (profileChips.length) return setFocus(profileChips[0], { scroll: false });
      return false;
    }

    var pIdx = profileChips.indexOf(currentFocused);
    if (pIdx !== -1) {
      if (direction === 'left') {
        if (pIdx < profileChips.length - 1) return setFocus(profileChips[pIdx + 1], { scroll: false });
        return true;
      }
      if (direction === 'right') {
        if (pIdx > 0) return setFocus(profileChips[pIdx - 1], { scroll: false });
        return true;
      }
      if (direction === 'down') {
        if (menuItems.length) return setFocus(menuItems[0], { scroll: false });
        return true;
      }
      if (direction === 'up') {
        if (typeof window.closeUserSettingsDropdown === 'function') window.closeUserSettingsDropdown();
        else panel.classList.add('hidden');
        if (triggerBtn && isElementVisible(triggerBtn)) return setFocus(triggerBtn, { scroll: false });
        return true;
      }
      return true;
    }

    var mIdx = menuItems.indexOf(currentFocused);
    if (mIdx !== -1) {
      if (direction === 'down') {
        if (mIdx < menuItems.length - 1) return setFocus(menuItems[mIdx + 1], { scroll: false });
        return true;
      }
      if (direction === 'up') {
        if (mIdx > 0) return setFocus(menuItems[mIdx - 1], { scroll: false });
        if (profileChips.length) return setFocus(profileChips[0], { scroll: false });
        if (typeof window.closeUserSettingsDropdown === 'function') window.closeUserSettingsDropdown();
        else panel.classList.add('hidden');
        if (triggerBtn && isElementVisible(triggerBtn)) return setFocus(triggerBtn, { scroll: false });
        return true;
      }
      return true;
    }

    return true;
  }

  /**
   * Helper to focus the active or first navigation item inside Top Header (#topHeader)
   */
  function focusTopHeaderNav(preferLeftSide) {
    var topHeader = document.getElementById('topHeader');
    if (!topHeader || !isElementVisible(topHeader)) return false;
    if (preferLeftSide) {
      var userBtn = document.getElementById('userSettingsMenuBtn');
      var searchIn = document.getElementById('headerQuickSearchInput');
      if (searchIn && isElementVisible(searchIn)) return setFocus(searchIn, { scroll: false });
      if (userBtn && isElementVisible(userBtn)) return setFocus(userBtn, { scroll: false });
    }
    var activeNav = topHeader.querySelector('.main-nav .nav-link.active') ||
      topHeader.querySelector('.main-nav .nav-link') ||
      document.getElementById('brandLogo');
    if (activeNav && isElementVisible(activeNav)) {
      return setFocus(activeNav, { scroll: false });
    }
    return false;
  }

  /**
   * Deterministic Navigation on Home Stage
   * Handles: Top Header, Side Rail, Hero Stage, Explorer Bar, Continue Watching Actions, Horizontal Rows, and Poster Grid
   */
  function navigateHomeStage(direction) {
    // Ultra-fast O(1) sibling shortcut when moving horizontally inside a shelf row-track
    if (currentFocused && currentFocused.classList.contains('poster-card') && currentFocused.parentElement && currentFocused.parentElement.classList.contains('row-track')) {
      if (direction === 'left') {
        var nextSiblingCard = currentFocused.nextElementSibling;
        if (nextSiblingCard && nextSiblingCard.classList.contains('poster-card')) {
          return setFocus(nextSiblingCard);
        }
        return true;
      }
      if (direction === 'right') {
        var prevSiblingCard = currentFocused.previousElementSibling;
        if (prevSiblingCard && prevSiblingCard.classList.contains('poster-card')) {
          return setFocus(prevSiblingCard);
        }
      }
    }

    var topHeader = document.getElementById('topHeader');
    var sideRail = document.getElementById('tvSideRail');
    var heroStage = document.getElementById('heroBillboard');
    var explorerBar = document.getElementById('catalogExplorerBar');
    var catalogMain = document.getElementById('catalogMain');

    var isTvMode = Boolean(document.body && document.body.classList.contains('tv-mode'));
    var headerSelector = isTvMode
      ? '.main-nav .nav-link, #headerQuickSearchInput, #openSearchBtn, #userSettingsMenuBtn'
      : '#brandLogo, .main-nav .nav-link, #headerQuickSearchInput, #openSearchBtn, #userSettingsMenuBtn';
    var headerItems = topHeader
      ? Array.prototype.slice.call(
          topHeader.querySelectorAll(headerSelector)
        ).filter(isElementVisible)
      : [];
    var railBtns = sideRail ? Array.prototype.slice.call(sideRail.querySelectorAll('.tv-focusable')).filter(isElementVisible) : [];
    var heroBtns = heroStage ? Array.prototype.slice.call(heroStage.querySelectorAll('.tv-focusable')).filter(isElementVisible) : [];
    var rows = catalogMain ? Array.prototype.slice.call(catalogMain.querySelectorAll('.netflix-row')).filter(isElementVisible) : [];
    var wallGrid = catalogMain ? catalogMain.querySelector('.catalog-poster-grid') : null;
    var loadMoreBtn = document.getElementById('loadMoreCatalogBtn');

    function focusPreferredRailItem() {
      if (!sideRail) return false;
      var searchBtn = document.getElementById('tvRailSearchBtn');
      if (searchBtn && isElementVisible(searchBtn)) {
        return setFocus(searchBtn, { scroll: false });
      }
      var activeListBtn = sideRail.querySelector('#tvRailListsScroll .tv-rail-sec-list.open .tv-rail-item.active');
      if (activeListBtn && isElementVisible(activeListBtn)) {
        return setFocus(activeListBtn, { scroll: false });
      }
      if (railBtns.length) {
        return setFocus(railBtns[0], { scroll: false });
      }
      return false;
    }

    function focusMainStageFromRail() {
      if (lastMainFocus && isElementVisible(lastMainFocus)) {
        return setFocus(lastMainFocus);
      }
      if (rows.length) {
        var c = rows[0].querySelector('.poster-card');
        if (c && isElementVisible(c)) return setFocus(c);
      }
      if (wallGrid) {
        var wc = wallGrid.querySelector('.poster-card');
        if (wc && isElementVisible(wc)) return setFocus(wc);
      }
      if (heroBtns.length) return setFocus(heroBtns[0]);
      return true;
    }

    if ((!currentFocused || !isElementVisible(currentFocused)) && lastFocusedDescriptor) {
      var d = lastFocusedDescriptor;
      var recovered = null;
      if (d.id) recovered = document.getElementById(d.id);
      if (!recovered && d.inSideRail && sideRail) {
        if (d.miniChar) recovered = sideRail.querySelector('[data-mini-char="' + d.miniChar.replace(/"/g, '\\"') + '"]');
        else if (d.miniAct) recovered = sideRail.querySelector('[data-mini-act="' + d.miniAct + '"]');
        else if (d.tvGenre) recovered = sideRail.querySelector('[data-tv-genre="' + d.tvGenre + '"]');
        else if (d.tvProvider) recovered = sideRail.querySelector('[data-tv-provider="' + d.tvProvider + '"]');
        else if (d.tvYear) recovered = sideRail.querySelector('[data-tv-year="' + d.tvYear + '"]');
        else if (d.tvActor) recovered = sideRail.querySelector('[data-tv-actor-id="' + d.tvActor + '"]');
      }
      if (!recovered && d.rowIdx >= 0 && rows.length) {
        var rTarget = rows[Math.min(d.rowIdx, rows.length - 1)];
        if (rTarget) {
          if (d.itemId) recovered = rTarget.querySelector('.poster-card[data-item-id="' + d.itemId.replace(/"/g, '\\"') + '"]');
          if (!recovered && d.colIdx >= 0) {
            var rCards = rTarget.querySelectorAll('.poster-card');
            if (rCards.length) recovered = rCards[Math.min(d.colIdx, rCards.length - 1)];
          }
        }
      }
      if (!recovered && d.colIdx >= 0 && wallGrid) {
        if (d.itemId) recovered = wallGrid.querySelector('.poster-card[data-item-id="' + d.itemId.replace(/"/g, '\\"') + '"]');
        if (!recovered) {
          var wCards = wallGrid.querySelectorAll('.poster-card');
          if (wCards.length) recovered = wCards[Math.min(d.colIdx, wCards.length - 1)];
        }
      }
      if (recovered && isElementVisible(recovered)) {
        setFocus(recovered, { scroll: false });
      }
    }

    if (!currentFocused || !isElementVisible(currentFocused)) {
      if (rows.length) {
        var firstCard = rows[0].querySelector('.poster-card');
        if (firstCard) return setFocus(firstCard);
      }
      if (wallGrid) {
        var firstWallCard = wallGrid.querySelector('.poster-card');
        if (firstWallCard) return setFocus(firstWallCard);
      }
      if (heroBtns.length) return setFocus(heroBtns[0]);
      if (headerItems.length) return setFocus(headerItems[0]);
      return false;
    }

    // A0. Inside Top Header (#topHeader: Brand Logo, Category Nav Links)
    if (topHeader && topHeader.contains(currentFocused)) {
      var topIdx = headerItems.indexOf(currentFocused);
      if (direction === 'left') {
        if (topIdx !== -1 && topIdx < headerItems.length - 1) {
          return setFocus(headerItems[topIdx + 1], { scroll: false });
        }
        return true;
      }
      if (direction === 'right') {
        if (topIdx > 0) {
          return setFocus(headerItems[topIdx - 1], { scroll: false });
        }
        if (focusPreferredRailItem()) return true;
        return true;
      }
      if (direction === 'down') {
        if (heroBtns.length) return setFocus(heroBtns[0]);
        var genreStripTop = document.getElementById('genreFilterStrip');
        if (genreStripTop && isElementVisible(genreStripTop)) {
          var gActive = genreStripTop.querySelector('.genre-chip-btn.active') || genreStripTop.querySelector('.genre-chip-btn');
          if (gActive && isElementVisible(gActive)) return setFocus(gActive);
        }
        var dropBarTop = document.getElementById('explorerDropdownsBar');
        if (dropBarTop && isElementVisible(dropBarTop)) {
          var dBtnTop = dropBarTop.querySelector('.explorer-dropdown-btn');
          if (dBtnTop && isElementVisible(dBtnTop)) return setFocus(dBtnTop);
        }
        if (rows.length) {
          var r0Card = rows[0].querySelector('.poster-card');
          if (r0Card) return setFocus(r0Card);
        }
        if (wallGrid) {
          var w0Card = wallGrid.querySelector('.poster-card');
          if (w0Card) return setFocus(w0Card);
        }
        return true;
      }
      if (direction === 'up') {
        return true;
      }
    }

    // A. Inside TV Right Side Rail (#tvSideRail: חיפוש + מקלדת מובנית | אקורדיון קטגוריות / פלטפורמות / לפי שנה / שחקנים | פרופיל והגדרות)
    if (sideRail && sideRail.contains(currentFocused)) {
      var railSearchBtn = document.getElementById('tvRailSearchBtn');
      var railSearchClearBtn = document.getElementById('tvRailSearchClearBtn');
      var miniVk = document.getElementById('tvRailMiniKeyboard');
      var miniVkOpen = Boolean(miniVk && !miniVk.classList.contains('hidden') && isElementVisible(miniVk));
      var railListItems = Array.prototype.slice.call(
        sideRail.querySelectorAll('#tvRailListsScroll .tv-rail-sec-header, #tvRailListsScroll .tv-rail-sec-list.open .tv-rail-item')
      ).filter(isElementVisible);
      var railProfileBtn = document.getElementById('tvRailProfileBtn');
      var railSettingsBtn = document.getElementById('tvRailSettingsBtn');

      // A1. Search Header Row (#tvRailSearchBtn, #tvRailSearchClearBtn)
      if (currentFocused === railSearchBtn || currentFocused === railSearchClearBtn) {
        if (direction === 'left') {
          if (currentFocused === railSearchBtn && railSearchClearBtn && isElementVisible(railSearchClearBtn)) {
            return setFocus(railSearchClearBtn, { scroll: false });
          }
          return focusMainStageFromRail();
        }
        if (direction === 'right') {
          if (currentFocused === railSearchClearBtn && railSearchBtn && isElementVisible(railSearchBtn)) {
            return setFocus(railSearchBtn, { scroll: false });
          }
          return true;
        }
        if (direction === 'up') {
          if (focusTopHeaderNav(false)) return true;
          return true;
        }
        if (direction === 'down') {
          if (miniVkOpen) {
            var firstVkKey = miniVk.querySelector('.tv-mini-vk-key');
            if (firstVkKey && isElementVisible(firstVkKey)) return setFocus(firstVkKey, { scroll: false });
          }
          if (railListItems.length) return setFocus(railListItems[0]);
          if (railProfileBtn && isElementVisible(railProfileBtn)) return setFocus(railProfileBtn, { scroll: false });
          return true;
        }
      }

      // A2. Inline Mini-Keyboard (#tvRailMiniKeyboard — Deterministic 6-Column Grid + 4-Button Action Row)
      if (miniVkOpen && miniVk.contains(currentFocused)) {
        var charKeys = Array.prototype.slice.call(miniVk.querySelectorAll('.tv-mini-vk-key')).filter(isElementVisible);
        var actKeys = Array.prototype.slice.call(miniVk.querySelectorAll('.tv-mini-vk-act')).filter(isElementVisible);
        var chIdx = charKeys.indexOf(currentFocused);
        if (chIdx !== -1) {
          var vkCols = 6;
          var chRow = Math.floor(chIdx / vkCols);
          var chCol = chIdx % vkCols;
          if (direction === 'right') {
            if (chCol < vkCols - 1 && chIdx + 1 < charKeys.length) {
              return setFocus(charKeys[chIdx + 1], { scroll: false });
            }
            return true;
          }
          if (direction === 'left') {
            if (chCol > 0) {
              return setFocus(charKeys[chIdx - 1], { scroll: false });
            }
            return focusMainStageFromRail();
          }
          if (direction === 'up') {
            if (chIdx - vkCols >= 0) {
              return setFocus(charKeys[chIdx - vkCols], { scroll: false });
            }
            if (railSearchBtn && isElementVisible(railSearchBtn)) return setFocus(railSearchBtn, { scroll: false });
            return true;
          }
          if (direction === 'down') {
            if (chIdx + vkCols < charKeys.length) {
              return setFocus(charKeys[chIdx + vkCols], { scroll: false });
            }
            if (actKeys.length) {
              var targetActIdx = Math.min(actKeys.length - 1, Math.floor((chCol * actKeys.length) / vkCols));
              return setFocus(actKeys[targetActIdx], { scroll: false });
            }
            if (railListItems.length) return setFocus(railListItems[0]);
            return true;
          }
          return true;
        }

        var actIdx = actKeys.indexOf(currentFocused);
        if (actIdx !== -1) {
          if (direction === 'right') {
            if (actIdx < actKeys.length - 1) return setFocus(actKeys[actIdx + 1], { scroll: false });
            return true;
          }
          if (direction === 'left') {
            if (actIdx > 0) return setFocus(actKeys[actIdx - 1], { scroll: false });
            return focusMainStageFromRail();
          }
          if (direction === 'up') {
            if (charKeys.length >= 6) {
              var lastRowStart = Math.floor((charKeys.length - 1) / 6) * 6;
              var colMap = Math.min(5, Math.round((actIdx * 5) / Math.max(1, actKeys.length - 1)));
              var upChar = charKeys[Math.min(charKeys.length - 1, lastRowStart + colMap)];
              if (upChar) return setFocus(upChar, { scroll: false });
            }
            if (railSearchBtn && isElementVisible(railSearchBtn)) return setFocus(railSearchBtn, { scroll: false });
            return true;
          }
          if (direction === 'down') {
            if (railListItems.length) return setFocus(railListItems[0]);
            if (railProfileBtn && isElementVisible(railProfileBtn)) return setFocus(railProfileBtn, { scroll: false });
            return true;
          }
          return true;
        }
      }

      // A3. Bottom Profile & Settings Bar (#tvRailProfileBtn, #tvRailSettingsBtn)
      if (currentFocused === railProfileBtn || currentFocused === railSettingsBtn) {
        if (direction === 'left') {
          if (currentFocused === railProfileBtn && railSettingsBtn && isElementVisible(railSettingsBtn)) {
            return setFocus(railSettingsBtn, { scroll: false });
          }
          return focusMainStageFromRail();
        }
        if (direction === 'right') {
          if (currentFocused === railSettingsBtn && railProfileBtn && isElementVisible(railProfileBtn)) {
            return setFocus(railProfileBtn, { scroll: false });
          }
          return true;
        }
        if (direction === 'up') {
          if (railListItems.length) return setFocus(railListItems[railListItems.length - 1]);
          if (railSearchBtn && isElementVisible(railSearchBtn)) return setFocus(railSearchBtn, { scroll: false });
          return true;
        }
        return true;
      }

      // A4. Scrollable Accordion Headers & Open Section Items (#tvRailListsScroll)
      var lIdx = railListItems.indexOf(currentFocused);
      if (lIdx !== -1) {
        if (direction === 'down') {
          if (lIdx < railListItems.length - 1) return setFocus(railListItems[lIdx + 1]);
          if (railProfileBtn && isElementVisible(railProfileBtn)) return setFocus(railProfileBtn, { scroll: false });
          return true;
        }
        if (direction === 'up') {
          if (lIdx > 0) return setFocus(railListItems[lIdx - 1]);
          if (miniVkOpen) {
            var vkActs = miniVk.querySelectorAll('.tv-mini-vk-act');
            if (vkActs.length) return setFocus(vkActs[0], { scroll: false });
          }
          if (railSearchBtn && isElementVisible(railSearchBtn)) return setFocus(railSearchBtn, { scroll: false });
          if (focusTopHeaderNav(false)) return true;
          return true;
        }
        if (direction === 'left') {
          return focusMainStageFromRail();
        }
        return true;
      }

      return true;
    }

    // B. Inside Hero Billboard Buttons
    if (heroStage && heroStage.contains(currentFocused)) {
      var hIdx = heroBtns.indexOf(currentFocused);
      if (direction === 'left') {
        if (hIdx < heroBtns.length - 1) return setFocus(heroBtns[hIdx + 1]);
        return true;
      }
      if (direction === 'right') {
        if (hIdx > 0) return setFocus(heroBtns[hIdx - 1]);
        if (focusPreferredRailItem()) return true;
        return true;
      }
      if (direction === 'down') {
        var genreStrip = document.getElementById('genreFilterStrip');
        if (genreStrip && isElementVisible(genreStrip)) {
          var gBtn = genreStrip.querySelector('.genre-chip-btn.active') || genreStrip.querySelector('.genre-chip-btn');
          if (gBtn && isElementVisible(gBtn)) return setFocus(gBtn);
        }
        if (rows.length) {
          var card0 = rows[0].querySelector('.poster-card');
          if (card0) return setFocus(card0);
        }
        if (wallGrid) {
          var wCard0 = wallGrid.querySelector('.poster-card');
          if (wCard0) return setFocus(wCard0);
        }
        return true;
      }
      if (direction === 'up') {
        if (focusTopHeaderNav(false)) return true;
        return true;
      }
    }

    // C. Inside Reorganized Explorer Bar (#genreFilterStrip + #explorerDropdownsBar + Open Dropdown Panels)
    var openExplorerPanel = currentFocused ? currentFocused.closest('.explorer-dropdown-panel:not(.hidden)') : null;
    if (openExplorerPanel) {
      var panelItems = Array.prototype.slice.call(openExplorerPanel.querySelectorAll('.tv-focusable')).filter(isElementVisible);
      var nearInPanel = findNearestPhysical(currentFocused, direction, panelItems);
      if (nearInPanel) return setFocus(nearInPanel);
      if (direction === 'up' || direction === 'right') {
        var wrap = openExplorerPanel.closest('.explorer-dropdown-wrap');
        var trigBtn = wrap ? wrap.querySelector('.explorer-dropdown-btn') : null;
        var tvRailTarget = openExplorerPanel.id === 'providerDropdownPanel'
          ? document.getElementById('tvPlatformsRailBtn')
          : (openExplorerPanel.id === 'yearDropdownPanel' ? document.getElementById('tvYearsRailBtn') : null);
        if (typeof window.closeAllExplorerDropdowns === 'function') window.closeAllExplorerDropdowns();
        if (tvRailTarget && isElementVisible(tvRailTarget)) return setFocus(tvRailTarget, { scroll: false });
        if (trigBtn && isElementVisible(trigBtn)) return setFocus(trigBtn);
      }
      return true;
    }

    if (explorerBar && explorerBar.contains(currentFocused)) {
      var stripContainer = currentFocused.closest('#genreFilterStrip, #explorerDropdownsBar');
      if (stripContainer && (direction === 'left' || direction === 'right')) {
        var stripItems = Array.prototype.slice.call(stripContainer.querySelectorAll(':scope > .tv-focusable, :scope > .explorer-dropdown-wrap > .explorer-dropdown-btn, .actor-search-box .tv-focusable')).filter(isElementVisible);
        var sIdx = stripItems.indexOf(currentFocused);
        if (direction === 'left') {
          if (sIdx < stripItems.length - 1) return setFocus(stripItems[sIdx + 1]);
          return true;
        }
        if (direction === 'right') {
          if (sIdx > 0) return setFocus(stripItems[sIdx - 1]);
          if (focusPreferredRailItem()) return true;
          return true;
        }
      }

      if (direction === 'down') {
        var gStrip = document.getElementById('genreFilterStrip');
        var dropBar = document.getElementById('explorerDropdownsBar');

        if (gStrip && gStrip.contains(currentFocused) && dropBar && isElementVisible(dropBar)) {
          var firstDropBtn = dropBar.querySelector('.explorer-dropdown-btn') || dropBar.querySelector('.tv-focusable');
          if (firstDropBtn) return setFocus(firstDropBtn);
        }
        // Move down into first shelf or multi-row poster grid
        if (rows.length) {
          var rCard = rows[0].querySelector('.poster-card');
          if (rCard) return setFocus(rCard);
        }
        if (wallGrid) {
          var gCard = wallGrid.querySelector('.poster-card');
          if (gCard) return setFocus(gCard);
        }
        return true;
      }

      if (direction === 'up') {
        var gStripUp = document.getElementById('genreFilterStrip');
        var dropBarUp = document.getElementById('explorerDropdownsBar');

        if (dropBarUp && dropBarUp.contains(currentFocused) && gStripUp && isElementVisible(gStripUp)) {
          var gBtnUp = gStripUp.querySelector('.genre-chip-btn.active') || gStripUp.querySelector('.genre-chip-btn');
          if (gBtnUp) return setFocus(gBtnUp);
        }
        if (heroBtns.length) return setFocus(heroBtns[0]);
        if (focusTopHeaderNav(false)) return true;
        return true;
      }
    }

    // D. Inside Horizontal Poster Rows (.netflix-row), including Continue Watching Card Action Buttons (.cw-card-info-btn, .cw-card-remove-btn, #clearContinueWatchingBtn)
    var currentRow = currentFocused.closest('.netflix-row');
    if (currentRow) {
      var rowIdx = rows.indexOf(currentRow);
      var cards = Array.prototype.slice.call(currentRow.querySelectorAll('.poster-card')).filter(isElementVisible);
      var clearCwBtn = document.getElementById('clearContinueWatchingBtn');

      // Sub-case D1: Focused on #clearContinueWatchingBtn ("נקה רשימת המשך צפייה")
      if (currentFocused === clearCwBtn) {
        if (direction === 'down' || direction === 'right') {
          if (cards.length) return setFocus(cards[0]);
          return true;
        }
        if (direction === 'up') {
          var dropBarCw = document.getElementById('explorerDropdownsBar');
          if (dropBarCw && isElementVisible(dropBarCw)) {
            var dBtnCw = dropBarCw.querySelector('.explorer-dropdown-btn');
            if (dBtnCw) return setFocus(dBtnCw);
          }
          if (heroBtns.length) return setFocus(heroBtns[0]);
          if (focusTopHeaderNav(false)) return true;
        }
        return true;
      }

      // Sub-case D2: Focused on Continue Watching Card Action Badge (.cw-card-info-btn ⓘ or .cw-card-remove-btn ✕)
      if (currentFocused.classList.contains('cw-card-info-btn') || currentFocused.classList.contains('cw-card-remove-btn')) {
        var parentCard = currentFocused.closest('.poster-card');
        var infoBtn = parentCard ? parentCard.querySelector('.cw-card-info-btn') : null;
        var remBtn = parentCard ? parentCard.querySelector('.cw-card-remove-btn') : null;
        if (direction === 'down') {
          if (parentCard && isElementVisible(parentCard)) return setFocus(parentCard);
          if (cards.length) return setFocus(cards[0]);
          return true;
        }
        if (direction === 'left') {
          if (currentFocused === infoBtn && remBtn && isElementVisible(remBtn)) {
            return setFocus(remBtn);
          }
          if (clearCwBtn && isElementVisible(clearCwBtn)) {
            return setFocus(clearCwBtn);
          }
          return true;
        }
        if (direction === 'right') {
          if (currentFocused === remBtn && infoBtn && isElementVisible(infoBtn)) {
            return setFocus(infoBtn);
          }
          return true;
        }
        if (direction === 'up') {
          if (clearCwBtn && isElementVisible(clearCwBtn)) {
            return setFocus(clearCwBtn);
          }
          var dropBarFromBadge = document.getElementById('explorerDropdownsBar');
          if (dropBarFromBadge && isElementVisible(dropBarFromBadge)) {
            var dBtnFromBadge = dropBarFromBadge.querySelector('.explorer-dropdown-btn');
            if (dBtnFromBadge) return setFocus(dBtnFromBadge);
          }
          if (heroBtns.length) return setFocus(heroBtns[0]);
          if (focusTopHeaderNav(false)) return true;
        }
        return true;
      }

      var cIdx = cards.indexOf(currentFocused);

      if (direction === 'left') {
        if (cIdx < cards.length - 1) return setFocus(cards[cIdx + 1]);
        return true;
      }
      if (direction === 'right') {
        if (cIdx > 0) return setFocus(cards[cIdx - 1]);
        if (focusPreferredRailItem()) return true;
        return true;
      }
      if (direction === 'down') {
        if (rowIdx < rows.length - 1) {
          var nextCards = Array.prototype.slice.call(rows[rowIdx + 1].querySelectorAll('.poster-card')).filter(isElementVisible);
          if (nextCards.length) {
            var targetIdx = Math.min(cIdx, nextCards.length - 1);
            return setFocus(nextCards[Math.max(0, targetIdx)]);
          }
        }
        // Move from last horizontal shelf down into the Multi-Row Poster Wall Grid if present!
        if (wallGrid) {
          var wallCards = Array.prototype.slice.call(wallGrid.querySelectorAll('.poster-card')).filter(isElementVisible);
          if (wallCards.length) return setFocus(wallCards[0]);
        }
        return true;
      }
      if (direction === 'up') {
        // If focused on a Continue Watching card (.cw-poster-card), pressing Up focuses its ⓘ Info / ✕ Remove buttons on the card!
        if (currentFocused.classList.contains('cw-poster-card')) {
          var cwInfoBtn = currentFocused.querySelector('.cw-card-info-btn');
          var cwRemBtn = currentFocused.querySelector('.cw-card-remove-btn');
          if (cwInfoBtn && isElementVisible(cwInfoBtn)) return setFocus(cwInfoBtn);
          if (cwRemBtn && isElementVisible(cwRemBtn)) return setFocus(cwRemBtn);
          if (clearCwBtn && isElementVisible(clearCwBtn)) return setFocus(clearCwBtn);
        }
        if (rowIdx > 0) {
          var prevCards = Array.prototype.slice.call(rows[rowIdx - 1].querySelectorAll('.poster-card')).filter(isElementVisible);
          if (prevCards.length) {
            var pIdx = Math.min(cIdx, prevCards.length - 1);
            return setFocus(prevCards[Math.max(0, pIdx)]);
          }
        }
        var dropBarTarget = document.getElementById('explorerDropdownsBar');
        if (dropBarTarget && isElementVisible(dropBarTarget)) {
          var dBtn = dropBarTarget.querySelector('.explorer-dropdown-btn');
          if (dBtn) return setFocus(dBtn);
        }
        var genreBar = document.getElementById('genreFilterStrip');
        if (genreBar && isElementVisible(genreBar)) {
          var activeG = genreBar.querySelector('.genre-chip-btn.active') || genreBar.querySelector('.genre-chip-btn');
          if (activeG && isElementVisible(activeG)) return setFocus(activeG);
        }
        if (heroBtns.length) return setFocus(heroBtns[0]);
        if (focusTopHeaderNav(false)) return true;
        return true;
      }
    }

    // E. Inside Multi-Row & Multi-Column Poster Wall Grid (.catalog-poster-grid), Live TV Hub Banner, Telegram Banner, #clearActorFilterBtn, or #loadMoreCatalogBtn
    var clearActorBtn = document.getElementById('clearActorFilterBtn');
    if (wallGrid && wallGrid.contains(currentFocused) && currentFocused.classList.contains('poster-card')) {
      var wallCards = Array.prototype.slice.call(wallGrid.querySelectorAll('.poster-card')).filter(isElementVisible);
      var wIdx = wallCards.indexOf(currentFocused);
      if (wIdx !== -1 && wallCards.length > 0) {
        var cols = 1;
        var row0Top = wallCards[0].offsetTop;
        for (var ci = 1; ci < Math.min(12, wallCards.length); ci++) {
          if (Math.abs(wallCards[ci].offsetTop - row0Top) <= 18) cols++;
          else break;
        }
        var wCol = wIdx % cols;
        var wRow = Math.floor(wIdx / cols);
        if (direction === 'left') {
          if (wCol < cols - 1 && wIdx + 1 < wallCards.length) {
            return setFocus(wallCards[wIdx + 1]);
          }
          return true;
        }
        if (direction === 'right') {
          if (wCol > 0) {
            return setFocus(wallCards[wIdx - 1]);
          }
          if (focusPreferredRailItem()) return true;
          return true;
        }
        if (direction === 'down') {
          if (wIdx + cols < wallCards.length) {
            return setFocus(wallCards[wIdx + cols]);
          }
          var lastRowIdx = Math.floor((wallCards.length - 1) / cols);
          if (wRow < lastRowIdx) {
            return setFocus(wallCards[wallCards.length - 1]);
          }
          if (loadMoreBtn && isElementVisible(loadMoreBtn)) {
            return setFocus(loadMoreBtn);
          }
          return true;
        }
        if (direction === 'up') {
          if (wIdx - cols >= 0) {
            return setFocus(wallCards[wIdx - cols]);
          }
          if (clearActorBtn && isElementVisible(clearActorBtn)) {
            return setFocus(clearActorBtn);
          }
          if (rows.length) {
            var lastRowCardsUp = Array.prototype.slice.call(rows[rows.length - 1].querySelectorAll('.poster-card')).filter(isElementVisible);
            if (lastRowCardsUp.length) {
              return setFocus(lastRowCardsUp[Math.min(wCol, lastRowCardsUp.length - 1)]);
            }
          }
          var dropBarGridUp0 = document.getElementById('explorerDropdownsBar');
          if (dropBarGridUp0 && isElementVisible(dropBarGridUp0)) {
            var dbBtn0 = dropBarGridUp0.querySelector('.explorer-dropdown-btn');
            if (dbBtn0) return setFocus(dbBtn0);
          }
          if (heroBtns.length) return setFocus(heroBtns[0]);
          if (focusTopHeaderNav(false)) return true;
          return true;
        }
      }
    }

    if (
      (wallGrid && wallGrid.contains(currentFocused)) ||
      (catalogMain && catalogMain.contains(currentFocused)) ||
      currentFocused === loadMoreBtn ||
      currentFocused === clearActorBtn
    ) {
      var gridCandidates = catalogMain
        ? Array.prototype.slice.call(
            catalogMain.querySelectorAll(
              '.catalog-poster-grid .poster-card, #clearActorFilterBtn, #loadMoreCatalogBtn, .youtube-hub-bar .tv-focusable, .live-hub-banner .tv-focusable, #liveM3uImporterPanel .tv-focusable, .tg-category-banner .tv-focusable'
            )
          ).filter(isElementVisible)
        : [];

      var nearGridEl = findNearestPhysical(currentFocused, direction, gridCandidates);
      if (nearGridEl) {
        return setFocus(nearGridEl);
      }

      if (direction === 'right') {
        if (focusPreferredRailItem()) return true;
      }

      if (direction === 'up') {
        if (rows.length) {
          var lastRowCards = Array.prototype.slice.call(rows[rows.length - 1].querySelectorAll('.poster-card')).filter(isElementVisible);
          if (lastRowCards.length) return setFocus(lastRowCards[0]);
        }
        var dropBarGridUp = document.getElementById('explorerDropdownsBar');
        if (dropBarGridUp && isElementVisible(dropBarGridUp)) {
          var dbBtn = dropBarGridUp.querySelector('.explorer-dropdown-btn');
          if (dbBtn) return setFocus(dbBtn);
        }
        if (heroBtns.length) return setFocus(heroBtns[0]);
        if (focusTopHeaderNav(false)) return true;
      }
      return true;
    }

    return false;
  }

  /**
   * Universal On-Screen TV Keyboard Builder & Controller
   */
  function openVirtualKeyboard(inputEl) {
    if (!inputEl) return;
    if (!document.body || !document.body.classList.contains('tv-mode')) return;
    activeVkInput = inputEl;
    var vk = document.getElementById('tvVirtualKeyboard');
    if (!vk) return;

    var type = (inputEl.getAttribute('type') || 'text').toLowerCase();
    var id = (inputEl.id || '').toLowerCase();
    if (type === 'email' || type === 'password' || id.indexOf('email') !== -1 || id.indexOf('pass') !== -1) {
      vkLang = 'EN';
    } else {
      vkLang = 'HE';
    }

    renderVirtualKeyboardKeys();
    updateVkPreview();
    vk.classList.remove('hidden');

    var firstKey = vk.querySelector('.vk-key');
    if (firstKey) setFocus(firstKey);
  }

  function closeVirtualKeyboard() {
    var vk = document.getElementById('tvVirtualKeyboard');
    if (!vk || vk.classList.contains('hidden')) return false;
    vk.classList.add('hidden');
    var returnTarget = activeVkInput;
    activeVkInput = null;
    if (returnTarget && isElementVisible(returnTarget)) {
      setFocus(returnTarget);
    }
    return true;
  }

  function updateVkPreview() {
    var preview = document.getElementById('vkPreviewText');
    if (!preview || !activeVkInput) return;
    var isPass = (activeVkInput.getAttribute('type') || '').toLowerCase() === 'password';
    var val = activeVkInput.value || '';
    preview.textContent = isPass ? val.replace(/./g, '•') : (val || activeVkInput.getAttribute('placeholder') || '');
  }

  function dispatchInputUpdate(inputEl) {
    if (!inputEl) return;
    updateVkPreview();
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function renderVirtualKeyboardKeys() {
    var grid = document.getElementById('vkKeysGrid');
    var langBtn = document.getElementById('vkLangBtn');
    if (!grid) return;

    grid.setAttribute('dir', 'ltr');
    grid.style.direction = 'ltr';
    if (langBtn) {
      langBtn.textContent = vkLang === 'HE' ? 'EN / אנגלית' : 'HE / עברית';
    }

    var rows = VK_LAYOUTS[vkLang] || VK_LAYOUTS.HE;
    var html = '';
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        var ch = rows[r][c];
        html += '<button type="button" class="vk-key tv-focusable" data-char="' + ch.replace(/"/g, '&quot;') + '">' + ch + '</button>';
      }
    }
    grid.innerHTML = html;

    var keyBtns = grid.querySelectorAll('.vk-key');
    for (var i = 0; i < keyBtns.length; i++) {
      keyBtns[i].addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!activeVkInput) return;
        var ch = this.getAttribute('data-char') || '';
        activeVkInput.value = (activeVkInput.value || '') + ch;
        dispatchInputUpdate(activeVkInput);
      });
    }
  }

  function bindVirtualKeyboardActions() {
    var langBtn = document.getElementById('vkLangBtn');
    var spaceBtn = document.getElementById('vkSpaceBtn');
    var backBtn = document.getElementById('vkBackspaceBtn');
    var clearBtn = document.getElementById('vkClearBtn');
    var doneBtn = document.getElementById('vkDoneBtn');

    if (langBtn) {
      langBtn.addEventListener('click', function (e) {
        e.preventDefault();
        vkLang = vkLang === 'HE' ? 'EN' : 'HE';
        renderVirtualKeyboardKeys();
        var firstKey = document.querySelector('#vkKeysGrid .vk-key');
        if (firstKey) setFocus(firstKey);
      });
    }
    if (spaceBtn) {
      spaceBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (!activeVkInput) return;
        activeVkInput.value = (activeVkInput.value || '') + ' ';
        dispatchInputUpdate(activeVkInput);
      });
    }
    if (backBtn) {
      backBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (!activeVkInput) return;
        var v = activeVkInput.value || '';
        activeVkInput.value = v.slice(0, -1);
        dispatchInputUpdate(activeVkInput);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (!activeVkInput) return;
        activeVkInput.value = '';
        dispatchInputUpdate(activeVkInput);
      });
    }
    if (doneBtn) {
      doneBtn.addEventListener('click', function (e) {
        e.preventDefault();
        closeVirtualKeyboard();
      });
    }
  }

  /**
   * Handle Back / Escape Deterministically
   */
  function handleBackButton() {
    var isTv = Boolean(document.body && document.body.classList.contains('tv-mode'));
    var now = Date.now();
    if (isTv && now - lastBackHandledAt < 220) {
      return true;
    }
    lastBackHandledAt = now;

    var vk = document.getElementById('tvVirtualKeyboard');
    if (vk && !vk.classList.contains('hidden')) {
      return closeVirtualKeyboard();
    }

    var subsMenu = document.getElementById('playerSubsMenu');
    if (subsMenu && !subsMenu.classList.contains('hidden')) {
      subsMenu.classList.add('hidden');
      if (isTv) {
        lastPlayerOverlayDismissedAt = now;
        var controlsOverlay = document.getElementById('playerControlsOverlay');
        if (controlsOverlay) controlsOverlay.classList.add('idle-hidden');
        clearPlayerFocus();
        if (typeof window.resumePlaybackIfPaused === 'function') {
          window.resumePlaybackIfPaused();
        }
        return true;
      }
      var subsBtn = document.getElementById('playerSubsBtn') || document.getElementById('playerTopSubsBtn');
      if (subsBtn && isElementVisible(subsBtn)) setFocus(subsBtn);
      return true;
    }

    var sourceTabsPanel = document.getElementById('playerSourceTabs');
    if (sourceTabsPanel && !sourceTabsPanel.classList.contains('hidden')) {
      sourceTabsPanel.classList.add('hidden');
      var srcDropBtn = document.getElementById('playerSourcesDropdownBtn');
      if (srcDropBtn) {
        srcDropBtn.setAttribute('aria-expanded', 'false');
      }
      if (isTv) {
        lastPlayerOverlayDismissedAt = now;
        var controlsOverlaySrc = document.getElementById('playerControlsOverlay');
        if (controlsOverlaySrc) controlsOverlaySrc.classList.add('idle-hidden');
        clearPlayerFocus();
        return true;
      }
      if (srcDropBtn && isElementVisible(srcDropBtn)) setFocus(srcDropBtn);
      return true;
    }

    var player = document.getElementById('playerModal');
    if (player && !player.classList.contains('hidden')) {
      if (isTv) {
        if (now - lastPlayerOverlayDismissedAt < 850) {
          return true;
        }
        var pOverlay = document.getElementById('playerControlsOverlay');
        if (
          pOverlay &&
          !pOverlay.classList.contains('idle-hidden') &&
          currentFocused &&
          player.contains(currentFocused) &&
          currentFocused.id !== 'closePlayerBtn'
        ) {
          lastPlayerOverlayDismissedAt = now;
          pOverlay.classList.add('idle-hidden');
          clearPlayerFocus();
          return true;
        }
      }
      if (typeof window.closeVideoPlayer === 'function') {
        window.closeVideoPlayer();
      } else {
        player.classList.add('hidden');
      }
      if (lastMainFocus && isElementVisible(lastMainFocus)) setFocus(lastMainFocus);
      return true;
    }

    var tgModal = document.getElementById('telegramModal');
    if (tgModal && !tgModal.classList.contains('hidden')) {
      tgModal.classList.add('hidden');
      if (lastMainFocus && isElementVisible(lastMainFocus)) setFocus(lastMainFocus);
      return true;
    }

    var tvMoreModal = document.getElementById('tvMoreModal');
    if (tvMoreModal && !tvMoreModal.classList.contains('hidden')) {
      tvMoreModal.classList.add('hidden');
      var moreRailBtn = document.getElementById('tvMoreRailBtn');
      if (moreRailBtn && isElementVisible(moreRailBtn)) {
        setFocus(moreRailBtn, { scroll: false });
      } else if (lastMainFocus && isElementVisible(lastMainFocus)) {
        setFocus(lastMainFocus);
      }
      return true;
    }

    var auth = document.getElementById('authModal');
    if (auth && !auth.classList.contains('hidden')) {
      if (document.body.classList.contains('auth-gate-locked')) {
        return true;
      }
      auth.classList.add('hidden');
      if (lastMainFocus && isElementVisible(lastMainFocus)) setFocus(lastMainFocus);
      return true;
    }

    var details = document.getElementById('detailsModal');
    if (details && !details.classList.contains('hidden')) {
      var detailsSourcesPanel = document.getElementById('detailsStreamsDropdownPanel');
      if (detailsSourcesPanel && !detailsSourcesPanel.classList.contains('hidden')) {
        if (typeof window.closeDetailsSourcesDropdown === 'function') {
          window.closeDetailsSourcesDropdown();
        } else {
          detailsSourcesPanel.classList.add('hidden');
        }
        var srcBtn = document.getElementById('detailsSourcesDropdownBtn');
        if (srcBtn && isElementVisible(srcBtn)) setFocus(srcBtn);
        return true;
      }
      details.classList.add('hidden');
      if (lastMainFocus && isElementVisible(lastMainFocus)) setFocus(lastMainFocus);
      return true;
    }

    var search = document.getElementById('searchModal');
    if (search && !search.classList.contains('hidden')) {
      search.classList.add('hidden');
      if (lastMainFocus && isElementVisible(lastMainFocus)) setFocus(lastMainFocus);
      return true;
    }

    var userSettingsPanel = document.getElementById('userSettingsDropdownPanel');
    if (userSettingsPanel && !userSettingsPanel.classList.contains('hidden')) {
      if (typeof window.closeUserSettingsDropdown === 'function') {
        window.closeUserSettingsDropdown();
      } else {
        userSettingsPanel.classList.add('hidden');
      }
      var railSetBtn = document.getElementById('tvRailSettingsBtn');
      var userMenuBtn = document.getElementById('userSettingsMenuBtn');
      if (railSetBtn && isElementVisible(railSetBtn)) setFocus(railSetBtn, { scroll: false });
      else if (userMenuBtn && isElementVisible(userMenuBtn)) setFocus(userMenuBtn, { scroll: false });
      return true;
    }

    var miniVkBack = document.getElementById('tvRailMiniKeyboard');
    if (miniVkBack && !miniVkBack.classList.contains('hidden')) {
      miniVkBack.classList.add('hidden');
      var rSearchBtn = document.getElementById('tvRailSearchBtn');
      if (rSearchBtn) {
        rSearchBtn.setAttribute('aria-expanded', 'false');
        if (isElementVisible(rSearchBtn)) setFocus(rSearchBtn, { scroll: false });
      }
      return true;
    }

    var openDropdown = document.querySelector('.explorer-dropdown-panel:not(.hidden)');
    if (openDropdown) {
      var wrap = openDropdown.closest('.explorer-dropdown-wrap');
      var trig = wrap ? wrap.querySelector('.explorer-dropdown-btn') : null;
      if (typeof window.closeAllExplorerDropdowns === 'function') window.closeAllExplorerDropdowns();
      else openDropdown.classList.add('hidden');
      if (trig && isElementVisible(trig)) setFocus(trig);
      return true;
    }

    var liveImporter = document.getElementById('liveM3uImporterPanel');
    if (liveImporter && !liveImporter.classList.contains('hidden')) {
      liveImporter.classList.add('hidden');
      var impBtn = document.getElementById('openLiveImporterBtn');
      if (impBtn && isElementVisible(impBtn)) setFocus(impBtn);
      return true;
    }

    // On Home Stage: if scrolled down or not inside #topHeader, Back scrolls to top & focuses Top Header!
    var catalogMain = document.getElementById('catalogMain');
    var topHeader = document.getElementById('topHeader');
    if (catalogMain && catalogMain.scrollTop > 60) {
      catalogMain.scrollTop = 0;
      if (focusTopHeaderNav(false)) return true;
    }
    if (topHeader && isElementVisible(topHeader) && (!currentFocused || !topHeader.contains(currentFocused))) {
      if (focusTopHeaderNav(false)) return true;
    }

    var sideRail = document.getElementById('tvSideRail');
    if (sideRail && isElementVisible(sideRail) && !sideRail.contains(currentFocused)) {
      var activeRail = sideRail.querySelector('#tvRailSearchBtn') || sideRail.querySelector('.tv-rail-item.active') || sideRail.querySelector('.tv-focusable');
      if (activeRail) return setFocus(activeRail, { scroll: false });
    }

    return false;
  }

  /**
   * Master Remote D-Pad & Keyboard Dispatcher
   */
  function handleRemoteCommand(directionOrAction) {
    var nowCmd = Date.now();
    if (directionOrAction === lastCmdDir && nowCmd - lastCmdAt < 45) {
      return true;
    }
    lastCmdDir = directionOrAction;
    lastCmdAt = nowCmd;

    if (directionOrAction === 'back') {
      return handleBackButton();
    }

    if (directionOrAction === 'select') {
      var player = document.getElementById('playerModal');
      var isTv = Boolean(document.body && document.body.classList.contains('tv-mode'));
      if (player && !player.classList.contains('hidden')) {
        if (isTv) {
          var subsMenu = document.getElementById('playerSubsMenu');
          var sourceTabsPanel = document.getElementById('playerSourceTabs');
          var controlsOverlay = document.getElementById('playerControlsOverlay');
          var playPauseBtn = document.getElementById('playerPlayPauseBtn');
          var seekSlider = document.getElementById('playerSeekSlider');

          if (subsMenu && !subsMenu.classList.contains('hidden')) {
            if (typeof window.wakePlayerControls === 'function') window.wakePlayerControls();
            if (currentFocused && subsMenu.contains(currentFocused) && isElementVisible(currentFocused)) {
              currentFocused.click();
            } else {
              var firstSub = subsMenu.querySelector('button');
              if (firstSub && isElementVisible(firstSub)) setFocus(firstSub);
            }
            return true;
          }

          if (sourceTabsPanel && !sourceTabsPanel.classList.contains('hidden')) {
            if (typeof window.wakePlayerControls === 'function') window.wakePlayerControls();
            if (currentFocused && sourceTabsPanel.contains(currentFocused) && isElementVisible(currentFocused)) {
              currentFocused.click();
            } else {
              var firstSrc = sourceTabsPanel.querySelector('.source-tab-btn');
              if (firstSrc && isElementVisible(firstSrc)) setFocus(firstSrc);
            }
            return true;
          }

          if (
            controlsOverlay &&
            !controlsOverlay.classList.contains('idle-hidden') &&
            currentFocused &&
            player.contains(currentFocused) &&
            isElementVisible(currentFocused) &&
            currentFocused !== playPauseBtn &&
            currentFocused !== seekSlider
          ) {
            if (typeof window.wakePlayerControls === 'function') window.wakePlayerControls();
            currentFocused.click();
            return true;
          }

          if (typeof window.togglePlayPause === 'function') {
            window.togglePlayPause();
          }
          return true;
        }
        if (typeof window.wakePlayerControls === 'function') window.wakePlayerControls();
      }

      if (!currentFocused || !isElementVisible(currentFocused)) {
        var scope = getActiveScope();
        var list = getFocusableElements(scope);
        if (list.length) setFocus(list[0]);
        return true;
      }

      var tag = (currentFocused.tagName || '').toUpperCase();
      var type = (currentFocused.getAttribute('type') || '').toLowerCase();
      if (tag === 'INPUT' && type !== 'range' && type !== 'checkbox' && type !== 'submit') {
        if (isTv) {
          openVirtualKeyboard(currentFocused);
          return true;
        }
        return false;
      }

      currentFocused.click();
      return true;
    }

    var vk = document.getElementById('tvVirtualKeyboard');
    if (vk && !vk.classList.contains('hidden')) {
      return navigateVirtualKeyboard(directionOrAction);
    }

    var playerModal = document.getElementById('playerModal');
    if (playerModal && !playerModal.classList.contains('hidden')) {
      return navigatePlayerModal(directionOrAction);
    }

    var userSettingsPanel = document.getElementById('userSettingsDropdownPanel');
    if (userSettingsPanel && !userSettingsPanel.classList.contains('hidden')) {
      return navigateUserSettingsDropdown(directionOrAction);
    }

    var activeScope = getActiveScope();
    if (activeScope === document.body || (activeScope && activeScope.classList && activeScope.classList.contains('explorer-dropdown-panel'))) {
      if (navigateHomeStage(directionOrAction)) return true;
    }

    var candidates = getFocusableElements(activeScope);
    if (!candidates.length) return false;

    if (!currentFocused || !activeScope.contains(currentFocused) || !isElementVisible(currentFocused)) {
      return setFocus(candidates[0]);
    }

    var next = findNearestPhysical(currentFocused, directionOrAction, candidates);
    if (next) {
      return setFocus(next);
    }
    return false;
  }

  function ensureInitialTvFocus() {
    if (currentFocused && isElementVisible(currentFocused)) return true;
    var firstCard = document.querySelector('#catalogRowsContainer .poster-card') ||
      document.querySelector('#continueWatchingRow .poster-card') ||
      document.getElementById('heroPlayBtn');
    if (firstCard && isElementVisible(firstCard)) {
      return setFocus(firstCard, { scroll: false });
    }
    return false;
  }

  window.streamItTvKey = function (action) {
    return handleRemoteCommand(action);
  };
  window.streamItFocusElement = setFocus;
  window.openStreamItKeyboard = openVirtualKeyboard;
  window.closeStreamItKeyboard = closeVirtualKeyboard;

  // Expose exact MainActivity.java Android Bridge API (window.TVNavigation)
  window.TVNavigation = {
    handleRemoteDirection: function (dir) {
      return handleRemoteCommand(String(dir || '').toLowerCase());
    },
    handleRemoteOk: function () {
      return handleRemoteCommand('select');
    },
    handleAndroidBackButton: function () {
      return handleBackButton();
    },
    focusElement: setFocus,
    clearPlayerFocus: clearPlayerFocus,
    ensureInitialFocus: ensureInitialTvFocus,
    openKeyboard: openVirtualKeyboard,
    closeKeyboard: closeVirtualKeyboard
  };

  if (window.__streamItTvKeydownHandler) {
    try {
      window.removeEventListener('keydown', window.__streamItTvKeydownHandler, true);
    } catch (e) {}
  }

  window.__streamItTvKeydownHandler = function (e) {
    var key = e.key;
    var code = e.keyCode;

    var vk = document.getElementById('tvVirtualKeyboard');
    var vkOpen = vk && !vk.classList.contains('hidden');
    var activeTag = document.activeElement ? (document.activeElement.tagName || '').toUpperCase() : '';
    var activeType = document.activeElement ? (document.activeElement.getAttribute('type') || '').toLowerCase() : '';
    var isTextInput = activeTag === 'INPUT' && activeType !== 'range';

    // Support Android TV Back (4), LG webOS Back (461), Samsung Tizen Back (10009), and Escape/Backspace
    if (key === 'Escape' || key === 'Backspace' || key === 'GoBack' || key === 'BrowserBack' || code === 27 || code === 4 || code === 461 || code === 10009) {
      if (isTextInput && !vkOpen && key === 'Backspace') {
        return;
      }
      if (handleBackButton()) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    // Support Smart TV Media Keys (Samsung Tizen / LG webOS / Android TV: Play=415, Pause=19, PlayPause=10252/179, Rewind=412, FastForward=417)
    if (code === 415 || code === 10252 || code === 179 || key === 'MediaPlayPause' || key === 'MediaPlay' || key === 'MediaPause') {
      var v = document.getElementById('videoElement');
      if (v && !v.classList.contains('hidden')) {
        e.preventDefault();
        if (v.paused) v.play().catch(function () {});
        else v.pause();
        return;
      }
    }
    if (code === 417 || key === 'MediaFastForward') {
      if (typeof window.seekVideoBy === 'function') {
        e.preventDefault();
        window.seekVideoBy(10);
        return;
      }
    }
    if (code === 412 || key === 'MediaRewind') {
      if (typeof window.seekVideoBy === 'function') {
        e.preventDefault();
        window.seekVideoBy(-10);
        return;
      }
    }

    var dir = null;
    if (key === 'ArrowUp' || code === 38 || code === 19) dir = 'up';
    else if (key === 'ArrowDown' || code === 40 || code === 20) dir = 'down';
    else if (key === 'ArrowLeft' || code === 37 || code === 21) dir = 'left';
    else if (key === 'ArrowRight' || code === 39 || code === 22) dir = 'right';
    else if (key === 'Enter' || code === 13 || code === 23 || code === 66) dir = 'select';

    if (!dir) return;

    if (isTextInput && !vkOpen && !document.body.classList.contains('tv-mode')) {
      if (dir === 'left' || dir === 'right' || dir === 'select') {
        return;
      }
    }

    e.preventDefault();
    e.stopPropagation();
    handleRemoteCommand(dir);
  };

  window.addEventListener('keydown', window.__streamItTvKeydownHandler, true);

  function initTvNavigationEngine() {
    applyTvModeClass();
    bindVirtualKeyboardActions();
    ensureInitialTvFocus();
    setTimeout(ensureInitialTvFocus, 350);
    setTimeout(ensureInitialTvFocus, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTvNavigationEngine);
  } else {
    initTvNavigationEngine();
  }
})();
