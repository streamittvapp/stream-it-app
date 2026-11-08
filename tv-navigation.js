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
    return el.offsetWidth > 2 && el.offsetHeight > 2;
  }

  function getActiveScope() {
    var vk = document.getElementById('tvVirtualKeyboard');
    if (vk && !vk.classList.contains('hidden')) return vk;

    var player = document.getElementById('playerModal');
    if (player && !player.classList.contains('hidden')) return player;

    var auth = document.getElementById('authModal');
    if (auth && !auth.classList.contains('hidden')) return auth;

    var details = document.getElementById('detailsModal');
    if (details && !details.classList.contains('hidden')) return details;

    var search = document.getElementById('searchModal');
    if (search && !search.classList.contains('hidden')) return search;

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

    try {
      el.focus({ preventScroll: true });
    } catch (e) {}

    if (el.closest('#mainStage')) {
      lastMainFocus = el;
    }

    var isTv = document.body && document.body.classList.contains('tv-mode');
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

    // Vertical scrolling inside #catalogMain, #detailsModal, #searchModal, or open dropdown panel
    if (options.scroll !== false) {
      var prevRow = prevFocused ? prevFocused.closest('.netflix-row') : null;
      var curRow = el.closest('.netflix-row');
      var sameNetflixRow = Boolean(prevRow && curRow && prevRow === curRow);
      if (!sameNetflixRow) {
        var scrollTarget = curRow || el;
        var inCatalog = el.closest('#catalogMain');
        var inDetails = el.closest('.details-modal-sheet');
        var inSearch = el.closest('#searchModal');
        var inDropdown = el.closest('.explorer-dropdown-panel');
        if (inCatalog || inDetails || inSearch || inDropdown) {
          try {
            scrollTarget.scrollIntoView({ block: 'nearest', behavior: scrollBehavior });
          } catch (e) {}
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
      }, 200);
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

    // Direct Remote Control of Subtitle Vertical Position when Player Controls are idle-hidden!
    if (controlsOverlay && controlsOverlay.classList.contains('idle-hidden') && (!subsMenu || subsMenu.classList.contains('hidden'))) {
      if (direction === 'down' && typeof window.adjustSubtitleVerticalPosition === 'function') {
        window.adjustSubtitleVerticalPosition(-1.5);
        return true;
      }
      if (direction === 'up' && typeof window.adjustSubtitleVerticalPosition === 'function') {
        window.adjustSubtitleVerticalPosition(1.5);
        return true;
      }
    }

    if (typeof window.wakePlayerControls === 'function') {
      window.wakePlayerControls();
    }

    var skipBtn = document.getElementById('skipIntroOverlayBtn');
    var closeBtn = document.getElementById('closePlayerBtn');
    var seekSlider = document.getElementById('playerSeekSlider');
    var playPauseBtn = document.getElementById('playerPlayPauseBtn');
    var rewindBtn = document.getElementById('playerRewindBtn');
    var forwardBtn = document.getElementById('playerForwardBtn');
    var nextEpBtn = document.getElementById('playerNextEpBtn');
    var subsBtn = document.getElementById('playerSubsBtn');

    if (subsMenu && !subsMenu.classList.contains('hidden')) {
      var subItems = Array.prototype.slice.call(subsMenu.querySelectorAll('button')).filter(isElementVisible);
      var nearSub = findNearestPhysical(currentFocused, direction, subItems);
      if (nearSub) return setFocus(nearSub);
      var sIdx = subItems.indexOf(currentFocused);
      if (direction === 'down') {
        if (sIdx < subItems.length - 1) return setFocus(subItems[sIdx + 1]);
        subsMenu.classList.add('hidden');
        return setFocus(subsBtn);
      }
      if (direction === 'up') {
        if (sIdx > 0) return setFocus(subItems[sIdx - 1]);
        return true;
      }
      return true;
    }

    var topBarBtns = Array.prototype.slice.call(player.querySelectorAll('#closePlayerBtn, #playerSourceTabs .source-tab-btn')).filter(isElementVisible);
    var transportBtns = [playPauseBtn, rewindBtn, forwardBtn, nextEpBtn, subsBtn].filter(function (b) {
      return b && !b.classList.contains('hidden');
    });

    if (!currentFocused || !player.contains(currentFocused)) {
      if (skipBtn && !skipBtn.classList.contains('hidden')) return setFocus(skipBtn);
      if (playPauseBtn) return setFocus(playPauseBtn);
      if (closeBtn) return setFocus(closeBtn);
      return true;
    }

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
        if (playPauseBtn) return setFocus(playPauseBtn);
        return true;
      }
      if (direction === 'up') {
        if (skipBtn && !skipBtn.classList.contains('hidden')) return setFocus(skipBtn);
        if (topBarBtns.length) return setFocus(topBarBtns[0]);
        return true;
      }
    }

    if (currentFocused === skipBtn) {
      if (direction === 'down') {
        if (seekSlider) return setFocus(seekSlider);
        if (playPauseBtn) return setFocus(playPauseBtn);
        return true;
      }
      if (direction === 'up') {
        if (topBarBtns.length) return setFocus(topBarBtns[0]);
        return true;
      }
      return true;
    }

    if (topBarBtns.indexOf(currentFocused) !== -1) {
      if (direction === 'left' || direction === 'right') {
        var nearTop = findNearestPhysical(currentFocused, direction, topBarBtns);
        if (nearTop) return setFocus(nearTop);
        return true;
      }
      if (direction === 'down') {
        if (skipBtn && !skipBtn.classList.contains('hidden')) return setFocus(skipBtn);
        if (seekSlider) return setFocus(seekSlider);
        if (playPauseBtn) return setFocus(playPauseBtn);
        return true;
      }
      return true;
    }

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
        if (seekSlider) return setFocus(seekSlider);
        if (closeBtn) return setFocus(closeBtn);
        return true;
      }
      return true;
    }

    if (playPauseBtn) return setFocus(playPauseBtn);
    return true;
  }

  /**
   * Deterministic Navigation on Home Stage
   * Handles: Side Rail, Hero Stage, 3-Strip Explorer Bar, Horizontal Rows, and Multi-Row/Column Poster Grid
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

    var sideRail = document.getElementById('tvSideRail');
    var heroStage = document.getElementById('heroBillboard');
    var explorerBar = document.getElementById('catalogExplorerBar');
    var catalogMain = document.getElementById('catalogMain');

    var railBtns = sideRail ? Array.prototype.slice.call(sideRail.querySelectorAll('.tv-rail-btn')).filter(isElementVisible) : [];
    var heroBtns = heroStage ? Array.prototype.slice.call(heroStage.querySelectorAll('.tv-focusable')).filter(isElementVisible) : [];
    var rows = catalogMain ? Array.prototype.slice.call(catalogMain.querySelectorAll('.netflix-row')).filter(isElementVisible) : [];
    var wallGrid = catalogMain ? catalogMain.querySelector('.catalog-poster-grid') : null;
    var loadMoreBtn = document.getElementById('loadMoreCatalogBtn');

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
      return false;
    }

    // A. Inside TV Right Side Rail (#tvSideRail)
    if (sideRail && sideRail.contains(currentFocused)) {
      var rIdx = railBtns.indexOf(currentFocused);
      if (direction === 'down') {
        if (rIdx < railBtns.length - 1) return setFocus(railBtns[rIdx + 1]);
        return true;
      }
      if (direction === 'up') {
        if (rIdx > 0) return setFocus(railBtns[rIdx - 1]);
        return true;
      }
      if (direction === 'left') {
        if (lastMainFocus && isElementVisible(lastMainFocus)) {
          return setFocus(lastMainFocus);
        }
        if (rows.length) {
          var c = rows[0].querySelector('.poster-card');
          if (c) return setFocus(c);
        }
        if (wallGrid) {
          var wc = wallGrid.querySelector('.poster-card');
          if (wc) return setFocus(wc);
        }
        if (heroBtns.length) return setFocus(heroBtns[0]);
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
        if (railBtns.length) {
          var activeRail = sideRail.querySelector('.tv-rail-btn.active') || railBtns[1] || railBtns[0];
          return setFocus(activeRail);
        }
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
        var topNav = document.querySelector('#topHeader .nav-link.active, #topHeader .nav-link');
        if (topNav && isElementVisible(topNav)) return setFocus(topNav);
        return true;
      }
    }

    // C. Inside Reorganized Explorer Bar (#genreFilterStrip + #explorerDropdownsBar + Open Dropdown Panels)
    if (explorerBar && explorerBar.contains(currentFocused)) {
      var openPanel = currentFocused.closest('.explorer-dropdown-panel:not(.hidden)');
      if (openPanel) {
        var panelItems = Array.prototype.slice.call(openPanel.querySelectorAll('.tv-focusable')).filter(isElementVisible);
        var nearInPanel = findNearestPhysical(currentFocused, direction, panelItems);
        if (nearInPanel) return setFocus(nearInPanel);
        if (direction === 'up') {
          var wrap = openPanel.closest('.explorer-dropdown-wrap');
          var trigBtn = wrap ? wrap.querySelector('.explorer-dropdown-btn') : null;
          if (typeof window.closeAllExplorerDropdowns === 'function') window.closeAllExplorerDropdowns();
          if (trigBtn) return setFocus(trigBtn);
        }
        return true;
      }

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
          if (railBtns.length) {
            var actRail = sideRail.querySelector('.tv-rail-btn.active') || railBtns[1] || railBtns[0];
            return setFocus(actRail);
          }
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
        return true;
      }
    }

    // D. Inside Horizontal Poster Rows (.netflix-row)
    var currentRow = currentFocused.closest('.netflix-row');
    if (currentRow) {
      var rowIdx = rows.indexOf(currentRow);
      var cards = Array.prototype.slice.call(currentRow.querySelectorAll('.poster-card')).filter(isElementVisible);
      var cIdx = cards.indexOf(currentFocused);

      if (direction === 'left') {
        if (cIdx < cards.length - 1) return setFocus(cards[cIdx + 1]);
        return true;
      }
      if (direction === 'right') {
        if (cIdx > 0) return setFocus(cards[cIdx - 1]);
        if (railBtns.length) {
          var activeRailBtn = sideRail.querySelector('.tv-rail-btn.active') || railBtns[1] || railBtns[0];
          return setFocus(activeRailBtn);
        }
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
        return true;
      }
    }

    // E. Inside Multi-Row & Multi-Column Poster Wall Grid (.catalog-poster-grid), #clearActorFilterBtn, or #loadMoreCatalogBtn
    var clearActorBtn = document.getElementById('clearActorFilterBtn');
    if ((wallGrid && wallGrid.contains(currentFocused)) || currentFocused === loadMoreBtn || currentFocused === clearActorBtn) {
      var gridCandidates = catalogMain
        ? Array.prototype.slice.call(catalogMain.querySelectorAll('.catalog-poster-grid .poster-card, #clearActorFilterBtn, #loadMoreCatalogBtn, .youtube-hub-bar .tv-focusable')).filter(isElementVisible)
        : [];

      var nearGridEl = findNearestPhysical(currentFocused, direction, gridCandidates);
      if (nearGridEl) {
        return setFocus(nearGridEl);
      }

      if (direction === 'right' && railBtns.length) {
        var rBtn = sideRail.querySelector('.tv-rail-btn.active') || railBtns[1] || railBtns[0];
        return setFocus(rBtn);
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
    var vk = document.getElementById('tvVirtualKeyboard');
    if (vk && !vk.classList.contains('hidden')) {
      return closeVirtualKeyboard();
    }

    var subsMenu = document.getElementById('playerSubsMenu');
    if (subsMenu && !subsMenu.classList.contains('hidden')) {
      subsMenu.classList.add('hidden');
      var subsBtn = document.getElementById('playerSubsBtn');
      if (subsBtn) setFocus(subsBtn);
      return true;
    }

    var player = document.getElementById('playerModal');
    if (player && !player.classList.contains('hidden')) {
      if (typeof window.closeVideoPlayer === 'function') {
        window.closeVideoPlayer();
      } else {
        player.classList.add('hidden');
      }
      if (lastMainFocus && isElementVisible(lastMainFocus)) setFocus(lastMainFocus);
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

    var openDropdown = document.querySelector('.explorer-dropdown-panel:not(.hidden)');
    if (openDropdown) {
      var wrap = openDropdown.closest('.explorer-dropdown-wrap');
      var trig = wrap ? wrap.querySelector('.explorer-dropdown-btn') : null;
      if (typeof window.closeAllExplorerDropdowns === 'function') window.closeAllExplorerDropdowns();
      else openDropdown.classList.add('hidden');
      if (trig && isElementVisible(trig)) setFocus(trig);
      return true;
    }

    var sideRail = document.getElementById('tvSideRail');
    if (sideRail && isElementVisible(sideRail) && !sideRail.contains(currentFocused)) {
      var activeRail = sideRail.querySelector('.tv-rail-btn.active') || sideRail.querySelector('.tv-rail-btn');
      if (activeRail) return setFocus(activeRail);
    }

    return false;
  }

  /**
   * Master Remote D-Pad & Keyboard Dispatcher
   */
  function handleRemoteCommand(directionOrAction) {
    if (directionOrAction === 'back') {
      return handleBackButton();
    }

    if (directionOrAction === 'select') {
      var player = document.getElementById('playerModal');
      if (player && !player.classList.contains('hidden')) {
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
        openVirtualKeyboard(currentFocused);
        return true;
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
    ensureInitialFocus: ensureInitialTvFocus,
    openKeyboard: openVirtualKeyboard,
    closeKeyboard: closeVirtualKeyboard
  };

  window.addEventListener('keydown', function (e) {
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

    if (isTextInput && !vkOpen && (dir === 'left' || dir === 'right') && !document.body.classList.contains('tv-mode')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    handleRemoteCommand(dir);
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    applyTvModeClass();
    bindVirtualKeyboardActions();
    ensureInitialTvFocus();
    setTimeout(ensureInitialTvFocus, 350);
    setTimeout(ensureInitialTvFocus, 900);
  });
})();
