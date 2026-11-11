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
  var activeVkInputId = '';
  var vkLang = 'EN';
  var vkRevealPass = true;
  var lastVkActionAt = 0;
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
    if (el.classList.contains('poster-card')) {
      var modalParent = el.closest('.modal-overlay');
      return !modalParent || !modalParent.classList.contains('hidden');
    }
    if (el.closest('.hidden')) return false;
    if (el.closest('.tv-rail-sec-list:not(.open)')) return false;
    return el.offsetWidth > 2 && el.offsetHeight > 2;
  }

  function getActiveScope() {
    var vk = document.getElementById('tvVirtualKeyboard');
    if (vk && !vk.classList.contains('hidden')) return vk;

    var clearCwModal = document.getElementById('clearCwConfirmModal');
    if (clearCwModal && !clearCwModal.classList.contains('hidden')) return clearCwModal;

    var parentalModal = document.getElementById('parentalControlModal');
    if (parentalModal && !parentalModal.classList.contains('hidden')) return parentalModal;

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
    var sideRailEl = document.getElementById('tvSideRail');
    var inRailNow = Boolean(sideRailEl && sideRailEl.contains(el));
    if (sideRailEl) {
      sideRailEl.classList.toggle('rail-open', inRailNow);
      if (document.body) {
        document.body.classList.remove('tv-rail-expanded');
      }
    }

    var tag = (el.tagName || '').toUpperCase();
    var inputType = (el.getAttribute('type') || '').toLowerCase();
    if (!isTv || tag === 'SELECT' || (tag === 'INPUT' && inputType === 'range')) {
      try {
        el.focus({ preventScroll: true });
      } catch (e) {}
    } else {
      var actEl = document.activeElement;
      if (actEl && actEl !== document.body && actEl !== el) {
        var actTag = (actEl.tagName || '').toUpperCase();
        try {
          actEl.blur();
        } catch (e) {}
        if (actTag === 'INPUT' || actTag === 'TEXTAREA') {
          try {
            if (window.AndroidTvBridge && typeof window.AndroidTvBridge.hideSoftKeyboard === 'function') {
              window.AndroidTvBridge.hideSoftKeyboard();
            }
          } catch (e) {}
        }
      }
    }

    if (el.closest('#mainStage')) {
      lastMainFocus = el;
    }

    // Record lightweight O(1) descriptor without querying full DOM on every key press
    var pRow = el.closest('.netflix-row');
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
      rowIdx: pRow ? 0 : -1,
      colIdx: 0,
      inSideRail: Boolean(inRailNow),
      inTopHeader: Boolean(el.closest('#topHeader')),
      inHero: Boolean(el.closest('#heroBillboard'))
    };

    // Horizontal strip or row scrolling — only scroll when the focused card is actually clipped at the left/right edge!
    // Never shift the track when moving among the 6 already-visible cards on screen.
    var stripOrTrack = el.closest('.row-track, .genre-filter-strip');
    if (stripOrTrack && options.scroll !== false) {
      var itemRect = el.getBoundingClientRect();
      var trackRect = stripOrTrack.getBoundingClientRect();
      var edgePad = 10;
      var shiftX = 0;
      if (itemRect.left < trackRect.left + edgePad) {
        shiftX = itemRect.left - (trackRect.left + edgePad);
      } else if (itemRect.right > trackRect.right - edgePad) {
        shiftX = itemRect.right - (trackRect.right - edgePad);
      }
      if (Math.abs(shiftX) > 2) {
        stripOrTrack.scrollLeft += shiftX;
      }
    }

    // Vertical scrolling — clean, non-jerky viewport alignment
    if (options.scroll !== false) {
      var prevRow = prevFocused ? prevFocused.closest('.netflix-row') : null;
      var curRow = pRow;
      var sameNetflixRow = Boolean(prevRow && curRow && prevRow === curRow);
      if (!sameNetflixRow) {
        var scrollTarget = curRow || el;
        var scrollContainer = el.closest('#tvRailListsScroll, #catalogMain, .details-modal-sheet, .search-modal-sheet, .auth-modal-card, .parental-modal-card, #parentalControlModal, #searchModal, #tvMoreModal, .explorer-dropdown-panel');
        if (scrollContainer) {
          var cRect = scrollContainer.getBoundingClientRect();
          var tRect = scrollTarget.getBoundingClientRect();
          var pad = 20;
          var isTopFirstRow = Boolean(curRow && !curRow.previousElementSibling && curRow.parentElement && curRow.parentElement.id === 'catalogRowsContainer');
          if (scrollContainer.id === 'catalogMain' && (el.closest('#heroBillboard') || isTopFirstRow)) {
            if (scrollContainer.scrollTop > 0) {
              scrollContainer.scrollTop = 0;
            }
          } else if (tRect.bottom > cRect.bottom - pad) {
            scrollContainer.scrollTop += (tRect.bottom - (cRect.bottom - pad));
          } else if (tRect.top < cRect.top + pad) {
            scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - ((cRect.top + pad) - tRect.top));
          }
        } else if (el.closest('#heroBillboard') || el.closest('#topHeader')) {
          var catMainEl = document.getElementById('catalogMain');
          if (catMainEl && catMainEl.scrollTop > 0) catMainEl.scrollTop = 0;
          if (window.scrollY > 0) window.scrollTo(0, 0);
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
      }, isTv ? 650 : 280);
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
  function sortRowByPhysicalLeft(arr) {
    return arr.slice().sort(function (a, b) {
      return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
    });
  }

  function getVirtualKeyboardRows(vk) {
    var rows = [];
    var topActs = Array.prototype.slice.call(vk.querySelectorAll('.vk-header-actions .vk-top-act-btn')).filter(isElementVisible);
    if (topActs.length) {
      rows.push(sortRowByPhysicalLeft(topActs));
    }
    var keys = Array.prototype.slice.call(vk.querySelectorAll('#vkKeysGrid .vk-key')).filter(isElementVisible);
    var cols = 10;
    for (var i = 0; i < keys.length; i += cols) {
      rows.push(keys.slice(i, i + cols));
    }
    var actionBtns = Array.prototype.slice.call(vk.querySelectorAll('.vk-actions-row .vk-action-btn')).filter(isElementVisible);
    if (actionBtns.length) {
      rows.push(actionBtns);
    }
    return rows;
  }

  function navigateVirtualKeyboard(direction) {
    var vk = document.getElementById('tvVirtualKeyboard');
    if (!vk || vk.classList.contains('hidden')) return false;

    var rows = getVirtualKeyboardRows(vk);
    if (!rows.length) return false;

    if (!currentFocused || !vk.contains(currentFocused) || !isElementVisible(currentFocused)) {
      var firstKey = vk.querySelector('#vkKeysGrid .vk-key');
      if (firstKey && isElementVisible(firstKey)) return setFocus(firstKey, { scroll: false });
      return setFocus(rows[0][0], { scroll: false });
    }

    var curRow = -1;
    var curCol = -1;
    for (var r = 0; r < rows.length; r++) {
      var idx = rows[r].indexOf(currentFocused);
      if (idx !== -1) {
        curRow = r;
        curCol = idx;
        break;
      }
    }

    if (curRow === -1) {
      var fk = vk.querySelector('#vkKeysGrid .vk-key');
      if (fk && isElementVisible(fk)) return setFocus(fk, { scroll: false });
      return setFocus(rows[0][0], { scroll: false });
    }

    if (direction === 'right') {
      if (curCol < rows[curRow].length - 1) {
        return setFocus(rows[curRow][curCol + 1], { scroll: false });
      }
      return true;
    }

    if (direction === 'left') {
      if (curCol > 0) {
        return setFocus(rows[curRow][curCol - 1], { scroll: false });
      }
      return true;
    }

    if (direction === 'up') {
      if (curRow > 0) {
        var targetRowUp = rows[curRow - 1];
        var nextColUp = Math.min(
          targetRowUp.length - 1,
          Math.floor((curCol / Math.max(1, rows[curRow].length)) * targetRowUp.length)
        );
        return setFocus(targetRowUp[Math.max(0, nextColUp)], { scroll: false });
      }
      closeVirtualKeyboard();
      return true;
    }

    if (direction === 'down') {
      if (curRow < rows.length - 1) {
        var targetRowDown = rows[curRow + 1];
        var nextColDown = Math.min(
          targetRowDown.length - 1,
          Math.floor((curCol / Math.max(1, rows[curRow].length)) * targetRowDown.length)
        );
        return setFocus(targetRowDown[Math.max(0, nextColDown)], { scroll: false });
      }
      // Pressing Down on the bottom row of the keyboard closes it and moves down to the next field/submit button!
      var prevInput = getActiveVkInput();
      closeVirtualKeyboard();
      if (prevInput && prevInput.id === 'authEmailInput') {
        var passField = document.getElementById('authPasswordInput');
        if (passField && isElementVisible(passField)) return setFocus(passField);
      } else if (prevInput && prevInput.id === 'authPasswordInput') {
        var subBtn = document.getElementById('authSubmitBtn');
        if (subBtn && isElementVisible(subBtn)) return setFocus(subBtn);
      }
      return true;
    }

    return true;
  }

  /**
   * Deterministic Vertical & Horizontal Navigation inside Login & Profiles Modal (#authModal)
   * Guarantees Remote D-Pad Down/Up moves smoothly all the way to #authSubmitBtn ("התחבר לחשבון") without stopping!
   */
  function getAuthModalNavigationRows() {
    var authModal = document.getElementById('authModal');
    if (!authModal || authModal.classList.contains('hidden')) return [];

    var rows = [];
    var closeBtn = document.getElementById('closeAuthModalBtn');
    if (closeBtn && isElementVisible(closeBtn)) {
      rows.push([closeBtn]);
    }

    var subUsersSec = document.getElementById('subUsersSection');
    if (subUsersSec && isElementVisible(subUsersSec)) {
      var profCards = Array.prototype.slice.call(subUsersSec.querySelectorAll('#subUsersGrid .sub-user-card')).filter(isElementVisible);
      if (profCards.length) rows.push(profCards);

      var delBtns = Array.prototype.slice.call(subUsersSec.querySelectorAll('#subUsersGrid .sub-user-delete-btn')).filter(isElementVisible);
      if (delBtns.length) rows.push(delBtns);

      var actBtns = Array.prototype.slice.call(subUsersSec.querySelectorAll('.sub-users-actions button')).filter(isElementVisible);
      if (actBtns.length) rows.push(actBtns);

      var addForm = document.getElementById('addSubUserForm');
      if (addForm && isElementVisible(addForm)) {
        var nameIn = document.getElementById('newSubUserNameInput');
        var kidsBtn = document.getElementById('newSubUserKidsBtn');
        var saveBtn = document.getElementById('saveNewSubUserBtn');
        var cancelBtn = document.getElementById('cancelNewSubUserBtn');
        if (nameIn && isElementVisible(nameIn)) rows.push([nameIn]);
        if (kidsBtn && isElementVisible(kidsBtn)) rows.push([kidsBtn]);
        var formBtns = [saveBtn, cancelBtn].filter(isElementVisible);
        if (formBtns.length) rows.push(formBtns);
      }
    }

    var authForm = document.getElementById('authForm');
    if (authForm && isElementVisible(authForm)) {
      var emailIn = document.getElementById('authEmailInput');
      var passIn = document.getElementById('authPasswordInput');
      var submitBtn = document.getElementById('authSubmitBtn');
      if (emailIn && isElementVisible(emailIn)) rows.push([emailIn]);
      if (passIn && isElementVisible(passIn)) rows.push([passIn]);
      if (submitBtn && isElementVisible(submitBtn)) rows.push([submitBtn]);
    }

    var accountBox = document.getElementById('authAccountBox');
    if (accountBox && isElementVisible(accountBox)) {
      var tgAuthBtn = document.getElementById('openTelegramFromAuthBtn');
      var logoutBtn = document.getElementById('logoutBtn');
      if (tgAuthBtn && isElementVisible(tgAuthBtn)) rows.push([tgAuthBtn]);
      if (logoutBtn && isElementVisible(logoutBtn)) rows.push([logoutBtn]);
    }

    return rows;
  }

  function navigateAuthModal(direction) {
    var authModal = document.getElementById('authModal');
    if (!authModal || authModal.classList.contains('hidden')) return false;

    var rows = getAuthModalNavigationRows();
    if (!rows.length) return false;

    var activeEl = currentFocused;
    if ((!activeEl || !authModal.contains(activeEl) || !isElementVisible(activeEl)) && document.activeElement && authModal.contains(document.activeElement)) {
      activeEl = document.activeElement;
    }

    var curRow = -1;
    var curCol = -1;
    for (var r = 0; r < rows.length; r++) {
      var cIdx = rows[r].indexOf(activeEl);
      if (cIdx !== -1) {
        curRow = r;
        curCol = cIdx;
        break;
      }
    }

    if (curRow === -1) {
      var emailField = document.getElementById('authEmailInput');
      if (emailField && isElementVisible(emailField)) {
        return setFocus(emailField);
      }
      return setFocus(rows[0][0]);
    }

    if (direction === 'down') {
      if (curRow < rows.length - 1) {
        var nextRowD = rows[curRow + 1];
        var nextColD = Math.min(curCol, nextRowD.length - 1);
        return setFocus(nextRowD[Math.max(0, nextColD)]);
      }
      return setFocus(rows[rows.length - 1][Math.min(curCol, rows[rows.length - 1].length - 1)]);
    }

    if (direction === 'up') {
      if (curRow > 0) {
        var nextRowU = rows[curRow - 1];
        var nextColU = Math.min(curCol, nextRowU.length - 1);
        return setFocus(nextRowU[Math.max(0, nextColU)]);
      }
      return setFocus(rows[0][Math.min(curCol, rows[0].length - 1)]);
    }

    if (direction === 'left') {
      if (curCol < rows[curRow].length - 1) {
        return setFocus(rows[curRow][curCol + 1]);
      }
      return true;
    }

    if (direction === 'right') {
      if (curCol > 0) {
        return setFocus(rows[curRow][curCol - 1]);
      }
      return true;
    }

    return true;
  }

  /**
   * Deterministic Navigation inside Video Player (#playerModal)
   */
  function navigatePlayerModal(direction) {
    var player = document.getElementById('playerModal');
    if (!player || player.classList.contains('hidden')) return false;

    // 00. Exit Confirmation Dialog (#playerExitConfirmModal)
    var exitConfirmModal = document.getElementById('playerExitConfirmModal');
    if (exitConfirmModal && !exitConfirmModal.classList.contains('hidden')) {
      var cancelExitBtn = document.getElementById('playerExitCancelBtn');
      var confirmExitBtn = document.getElementById('playerExitConfirmBtn');
      var exitBtns = [cancelExitBtn, confirmExitBtn].filter(isElementVisible);
      if (!exitBtns.length) return true;
      if (!currentFocused || !exitConfirmModal.contains(currentFocused)) {
        return setFocus(exitBtns[0], { scroll: false });
      }
      if (direction === 'left' || direction === 'down') {
        if (currentFocused === cancelExitBtn && confirmExitBtn && isElementVisible(confirmExitBtn)) {
          return setFocus(confirmExitBtn, { scroll: false });
        }
        return true;
      }
      if (direction === 'right' || direction === 'up') {
        if (currentFocused === confirmExitBtn && cancelExitBtn && isElementVisible(cancelExitBtn)) {
          return setFocus(cancelExitBtn, { scroll: false });
        }
        return true;
      }
      return true;
    }

    var controlsOverlay = document.getElementById('playerControlsOverlay');
    var subsMenu = document.getElementById('playerSubsMenu');
    var parentalMenu = document.getElementById('playerParentalMenu');
    var sourceTabsPanel = document.getElementById('playerSourceTabs');
    var seekSlider = document.getElementById('playerSeekSlider');
    var shieldSkipBtn = document.getElementById('parentalShieldSkipNowBtn');

    if (shieldSkipBtn && isElementVisible(shieldSkipBtn)) {
      return setFocus(shieldSkipBtn, { scroll: false });
    }

    var isMenusClosed =
      (!subsMenu || subsMenu.classList.contains('hidden')) &&
      (!parentalMenu || parentalMenu.classList.contains('hidden')) &&
      (!sourceTabsPanel || sourceTabsPanel.classList.contains('hidden'));

    // Direct Remote Control when Player Controls are idle-hidden OR when no button is focused yet (including Fullscreen):
    // Right/Left = Instant ±10s Seek + Live Time/Subtitle HUD without exiting fullscreen!
    if (isMenusClosed && controlsOverlay && controlsOverlay.classList.contains('idle-hidden')) {
      if (direction === 'down' && typeof window.adjustSubtitleVerticalPosition === 'function') {
        window.adjustSubtitleVerticalPosition(-1.5);
        return true;
      }
      if (direction === 'up' && typeof window.adjustSubtitleVerticalPosition === 'function') {
        window.adjustSubtitleVerticalPosition(1.5);
        return true;
      }
      if ((direction === 'right' || direction === 'left') && typeof window.seekVideoBy === 'function') {
        window.seekVideoBy(direction === 'right' ? 10 : -10);
        if (seekSlider && isElementVisible(seekSlider)) {
          setFocus(seekSlider, { scroll: false });
        }
        return true;
      }
    }

    if (typeof window.wakePlayerControls === 'function') {
      window.wakePlayerControls();
    }

    // Even when controls overlay is visible, if nothing is focused yet and user presses Left/Right on the remote, seek immediately!
    if (isMenusClosed && (!currentFocused || !player.contains(currentFocused) || !isElementVisible(currentFocused))) {
      if ((direction === 'right' || direction === 'left') && typeof window.seekVideoBy === 'function') {
        window.seekVideoBy(direction === 'right' ? 10 : -10);
        if (seekSlider && isElementVisible(seekSlider)) {
          setFocus(seekSlider, { scroll: false });
        }
        return true;
      }
    }

    var skipBtn = document.getElementById('skipIntroOverlayBtn');
    var resumeRestartBtn = document.getElementById('resumeRestartFromZeroBtn');
    var topParentalBtn = document.getElementById('playerTopParentalBtn');
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

    // 0. Open SafeWatch Parental Menu (#playerParentalMenu)
    if (parentalMenu && !parentalMenu.classList.contains('hidden')) {
      var parItems = Array.prototype.slice.call(parentalMenu.querySelectorAll('button')).filter(isElementVisible);
      if (!parItems.length) return true;
      if (!currentFocused || !parentalMenu.contains(currentFocused)) {
        return setFocus(parItems[0]);
      }
      var nearPar = findNearestPhysical(currentFocused, direction, parItems);
      if (nearPar) return setFocus(nearPar);
      var pIdx = parItems.indexOf(currentFocused);
      if (direction === 'down') {
        if (pIdx < parItems.length - 1) return setFocus(parItems[pIdx + 1]);
        return setFocus(parItems[parItems.length - 1]);
      }
      if (direction === 'up') {
        if (pIdx > 0) return setFocus(parItems[pIdx - 1]);
        parentalMenu.classList.add('hidden');
        return setFocus(topParentalBtn && isElementVisible(topParentalBtn) ? topParentalBtn : closeBtn);
      }
      return true;
    }

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

    var topBarBtns = [topParentalBtn, topSubsBtn, sourcesDropBtn, topFsBtn, closeBtn].filter(isElementVisible);
    var transportBtns = [playPauseBtn, rewindBtn, forwardBtn, nextEpBtn, subsBtn, fullscreenBtn].filter(isElementVisible);
    var embedOverlayBtns = [embedCcBtn, embedFsBtn].filter(isElementVisible);

    if (!currentFocused || !player.contains(currentFocused) || !isElementVisible(currentFocused)) {
      if (direction === 'up' && topBarBtns.length) return setFocus(topBarBtns[0], { scroll: false });
      if (resumeRestartBtn && isElementVisible(resumeRestartBtn)) return setFocus(resumeRestartBtn, { scroll: false });
      if (seekSlider && isElementVisible(seekSlider)) return setFocus(seekSlider, { scroll: false });
      if (playPauseBtn && isElementVisible(playPauseBtn)) return setFocus(playPauseBtn, { scroll: false });
      if (topBarBtns.length) return setFocus(topBarBtns[0], { scroll: false });
      if (closeBtn) return setFocus(closeBtn, { scroll: false });
      return true;
    }

    // 3. Resume Playback Toast Button (#resumeRestartFromZeroBtn)
    if (currentFocused === resumeRestartBtn) {
      if (direction === 'up') {
        if (topBarBtns.length) return setFocus(topBarBtns[0], { scroll: false });
        return true;
      }
      if (direction === 'down') {
        if (seekSlider && isElementVisible(seekSlider)) return setFocus(seekSlider, { scroll: false });
        if (playPauseBtn && isElementVisible(playPauseBtn)) return setFocus(playPauseBtn, { scroll: false });
        if (transportBtns.length) return setFocus(transportBtns[0], { scroll: false });
        return true;
      }
      if (direction === 'right' || direction === 'left') {
        if (typeof window.seekVideoBy === 'function') window.seekVideoBy(direction === 'right' ? 10 : -10);
        if (seekSlider && isElementVisible(seekSlider)) return setFocus(seekSlider, { scroll: false });
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
        if (playPauseBtn && isElementVisible(playPauseBtn)) return setFocus(playPauseBtn, { scroll: false });
        if (transportBtns.length) return setFocus(transportBtns[0], { scroll: false });
        return true;
      }
      if (direction === 'up') {
        if (resumeRestartBtn && isElementVisible(resumeRestartBtn)) return setFocus(resumeRestartBtn, { scroll: false });
        if (topBarBtns.length) return setFocus(topBarBtns[0], { scroll: false });
        return true;
      }
    }

    // 5. Skip Intro Button (#skipIntroOverlayBtn)
    if (currentFocused === skipBtn) {
      if (direction === 'down') {
        if (seekSlider && isElementVisible(seekSlider)) return setFocus(seekSlider, { scroll: false });
        if (playPauseBtn && isElementVisible(playPauseBtn)) return setFocus(playPauseBtn, { scroll: false });
        return true;
      }
      if (direction === 'up') {
        if (resumeRestartBtn && isElementVisible(resumeRestartBtn)) return setFocus(resumeRestartBtn, { scroll: false });
        if (topBarBtns.length) return setFocus(topBarBtns[0], { scroll: false });
        return true;
      }
      return true;
    }

    // 6. Top Bar Buttons (#playerTopParentalBtn, #playerTopSubsBtn, #playerSourcesDropdownBtn, #playerTopFullscreenBtn, #closePlayerBtn)
    if (topBarBtns.indexOf(currentFocused) !== -1) {
      if (direction === 'left' || direction === 'right') {
        var nearTop = findNearestPhysical(currentFocused, direction, topBarBtns);
        if (nearTop) return setFocus(nearTop, { scroll: false });
        return true;
      }
      if (direction === 'down') {
        if (resumeRestartBtn && isElementVisible(resumeRestartBtn)) return setFocus(resumeRestartBtn, { scroll: false });
        if (seekSlider && isElementVisible(seekSlider)) return setFocus(seekSlider, { scroll: false });
        if (playPauseBtn && isElementVisible(playPauseBtn)) return setFocus(playPauseBtn, { scroll: false });
        if (transportBtns.length) return setFocus(transportBtns[0], { scroll: false });
        return true;
      }
      return true;
    }

    // 7. Embed Mode Bottom-Right Overlay Buttons (#embedCcOverlayBtn, #embedFullscreenOverlayBtn)
    var eIdx = embedOverlayBtns.indexOf(currentFocused);
    if (eIdx !== -1) {
      if (direction === 'left' || direction === 'right') {
        var nearEmbedBtn = findNearestPhysical(currentFocused, direction, embedOverlayBtns);
        if (nearEmbedBtn) return setFocus(nearEmbedBtn, { scroll: false });
        return true;
      }
      if (direction === 'up') {
        if (seekSlider && isElementVisible(seekSlider)) return setFocus(seekSlider, { scroll: false });
        if (topBarBtns.length) return setFocus(topBarBtns[0], { scroll: false });
        return true;
      }
      return true;
    }

    // 8. Bottom Transport Row Buttons (#playerPlayPauseBtn, -10s, +10s, NextEp, Subs, Fullscreen)
    var tIdx = transportBtns.indexOf(currentFocused);
    if (tIdx !== -1) {
      if (direction === 'left' || direction === 'right') {
        var nearTrans = findNearestPhysical(currentFocused, direction, transportBtns);
        if (nearTrans) return setFocus(nearTrans, { scroll: false });
        return true;
      }
      if (direction === 'up') {
        if (seekSlider && isElementVisible(seekSlider)) return setFocus(seekSlider, { scroll: false });
        if (topBarBtns.length) return setFocus(topBarBtns[0], { scroll: false });
        return true;
      }
      return true;
    }

    if (seekSlider && isElementVisible(seekSlider)) return setFocus(seekSlider, { scroll: false });
    if (playPauseBtn && isElementVisible(playPauseBtn)) return setFocus(playPauseBtn, { scroll: false });
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
    // Ultra-fast O(1) sibling shortcut when moving horizontally or vertically between shelf rows
    if (currentFocused && currentFocused.classList.contains('poster-card') && currentFocused.parentElement && currentFocused.parentElement.classList.contains('row-track')) {
      var parentTrack = currentFocused.parentElement;
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
      var parentRowFast = parentTrack.closest('.netflix-row');
      if (parentRowFast && !currentFocused.classList.contains('cw-poster-card')) {
        if (direction === 'down') {
          var nextRowFast = parentRowFast.nextElementSibling;
          if (nextRowFast && nextRowFast.classList.contains('netflix-row')) {
            var curIdxDown = Array.prototype.indexOf.call(parentTrack.children, currentFocused);
            var nextTrackCards = nextRowFast.querySelectorAll('.poster-card');
            if (nextTrackCards.length) {
              return setFocus(nextTrackCards[Math.min(Math.max(0, curIdxDown), nextTrackCards.length - 1)]);
            }
          }
        } else if (direction === 'up') {
          var prevRowFast = parentRowFast.previousElementSibling;
          if (prevRowFast && prevRowFast.classList.contains('netflix-row')) {
            var curIdxUp = Array.prototype.indexOf.call(parentTrack.children, currentFocused);
            var prevTrackCards = prevRowFast.querySelectorAll('.poster-card');
            if (prevTrackCards.length) {
              return setFocus(prevTrackCards[Math.min(Math.max(0, curIdxUp), prevTrackCards.length - 1)]);
            }
          }
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
      sideRail.classList.add('rail-open');
      if (document.body) document.body.classList.remove('tv-rail-expanded');
      var activeListBtn = sideRail.querySelector('#tvRailListsScroll .tv-rail-sec-list.open .tv-rail-item.active');
      if (activeListBtn && isElementVisible(activeListBtn)) {
        return setFocus(activeListBtn, { scroll: false });
      }
      var searchBtn = document.getElementById('tvRailSearchBtn');
      if (searchBtn && isElementVisible(searchBtn)) {
        return setFocus(searchBtn, { scroll: false });
      }
      var freshRailBtns = Array.prototype.slice.call(sideRail.querySelectorAll('.tv-focusable')).filter(isElementVisible);
      if (freshRailBtns.length) {
        return setFocus(freshRailBtns[0], { scroll: false });
      }
      return false;
    }

    function focusMainStageFromRail() {
      if (sideRail) sideRail.classList.remove('rail-open');
      if (document.body) document.body.classList.remove('tv-rail-expanded');
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

      // A4. Any 2-Column Open Section List inside #tvRailListsScroll (#tvRailCategoriesList, #tvRailYearsList, #tvRailActorsList, #tvRailPlatformsList)
      var openSecList = currentFocused.closest('.tv-rail-sec-list.open');
      if (openSecList) {
        var secItems = Array.prototype.slice.call(openSecList.querySelectorAll('.tv-rail-item')).filter(isElementVisible);
        var sItemIdx = secItems.indexOf(currentFocused);
        if (sItemIdx !== -1 && secItems.length > 0) {
          var isTwoColSec = secItems.length > 1 && Math.abs(secItems[0].offsetTop - secItems[1].offsetTop) <= 12;
          if (isTwoColSec) {
            var isRightCol = (sItemIdx % 2 === 0);
            if (direction === 'left') {
              if (isRightCol && sItemIdx + 1 < secItems.length) {
                return setFocus(secItems[sItemIdx + 1], { scroll: false });
              }
              return focusMainStageFromRail();
            }
            if (direction === 'right') {
              if (!isRightCol && sItemIdx - 1 >= 0) {
                return setFocus(secItems[sItemIdx - 1], { scroll: false });
              }
              return true;
            }
            if (direction === 'down') {
              if (sItemIdx + 2 < secItems.length) {
                return setFocus(secItems[sItemIdx + 2]);
              }
              var parentSecDown = openSecList.closest('.tv-rail-section');
              var nextSecDown = parentSecDown ? parentSecDown.nextElementSibling : null;
              if (nextSecDown) {
                var nextHeader = nextSecDown.querySelector('.tv-rail-sec-header');
                if (nextHeader && isElementVisible(nextHeader)) return setFocus(nextHeader);
              }
              if (!isRightCol && railSettingsBtn && isElementVisible(railSettingsBtn)) {
                return setFocus(railSettingsBtn, { scroll: false });
              }
              if (railProfileBtn && isElementVisible(railProfileBtn)) {
                return setFocus(railProfileBtn, { scroll: false });
              }
              return true;
            }
            if (direction === 'up') {
              if (sItemIdx - 2 >= 0) {
                return setFocus(secItems[sItemIdx - 2]);
              }
              var ownSecHeader = openSecList.closest('.tv-rail-section')
                ? openSecList.closest('.tv-rail-section').querySelector('.tv-rail-sec-header')
                : null;
              if (ownSecHeader && isElementVisible(ownSecHeader)) {
                return setFocus(ownSecHeader);
              }
              return true;
            }
            return true;
          }
        }
      }

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
   * Deterministic Navigation inside Search Modal (#searchModal — 6-Column Grid + Filter Tabs + Top Input)
   */
  function navigateSearchModal(direction) {
    var searchModal = document.getElementById('searchModal');
    if (!searchModal || searchModal.classList.contains('hidden')) return false;

    var searchInput = document.getElementById('searchInput');
    var clearBtn = document.getElementById('clearSearchBtn');
    var closeBtn = document.getElementById('closeSearchBtn');
    var topRow = [searchInput, clearBtn, closeBtn].filter(isElementVisible);
    var filterTabs = Array.prototype.slice.call(searchModal.querySelectorAll('#searchFilterTabs .filter-tab')).filter(isElementVisible);
    var resultCards = Array.prototype.slice.call(searchModal.querySelectorAll('#searchResultsGrid .poster-card, #searchResultsGrid .channel-tile-card')).filter(isElementVisible);

    if (!currentFocused || !searchModal.contains(currentFocused) || !isElementVisible(currentFocused)) {
      if (resultCards.length) return setFocus(resultCards[0]);
      if (searchInput && isElementVisible(searchInput)) return setFocus(searchInput, { scroll: false });
      return false;
    }

    var tIdx = topRow.indexOf(currentFocused);
    if (tIdx !== -1) {
      if (direction === 'left') {
        if (tIdx < topRow.length - 1) return setFocus(topRow[tIdx + 1], { scroll: false });
        return true;
      }
      if (direction === 'right') {
        if (tIdx > 0) return setFocus(topRow[tIdx - 1], { scroll: false });
        return true;
      }
      if (direction === 'down') {
        if (filterTabs.length) {
          var activeTab = searchModal.querySelector('#searchFilterTabs .filter-tab.active') || filterTabs[0];
          return setFocus(activeTab, { scroll: false });
        }
        if (resultCards.length) return setFocus(resultCards[0]);
        return true;
      }
      return true;
    }

    var fIdx = filterTabs.indexOf(currentFocused);
    if (fIdx !== -1) {
      if (direction === 'left') {
        if (fIdx < filterTabs.length - 1) return setFocus(filterTabs[fIdx + 1], { scroll: false });
        return true;
      }
      if (direction === 'right') {
        if (fIdx > 0) return setFocus(filterTabs[fIdx - 1], { scroll: false });
        return true;
      }
      if (direction === 'up') {
        if (searchInput && isElementVisible(searchInput)) return setFocus(searchInput, { scroll: false });
        if (topRow.length) return setFocus(topRow[0], { scroll: false });
        return true;
      }
      if (direction === 'down') {
        if (resultCards.length) return setFocus(resultCards[0]);
        return true;
      }
      return true;
    }

    var rIdx = resultCards.indexOf(currentFocused);
    if (rIdx !== -1) {
      var cols = 1;
      var row0Top = resultCards[0].offsetTop;
      for (var ci = 1; ci < Math.min(12, resultCards.length); ci++) {
        if (Math.abs(resultCards[ci].offsetTop - row0Top) <= 18) cols++;
        else break;
      }
      var col = rIdx % cols;
      if (direction === 'left') {
        if (col < cols - 1 && rIdx + 1 < resultCards.length) return setFocus(resultCards[rIdx + 1]);
        return true;
      }
      if (direction === 'right') {
        if (col > 0) return setFocus(resultCards[rIdx - 1]);
        return true;
      }
      if (direction === 'down') {
        if (rIdx + cols < resultCards.length) return setFocus(resultCards[rIdx + cols]);
        var lastRowIdx = Math.floor((resultCards.length - 1) / cols);
        if (Math.floor(rIdx / cols) < lastRowIdx) return setFocus(resultCards[resultCards.length - 1]);
        return true;
      }
      if (direction === 'up') {
        if (rIdx - cols >= 0) return setFocus(resultCards[rIdx - cols]);
        if (filterTabs.length) {
          var actTabUp = searchModal.querySelector('#searchFilterTabs .filter-tab.active') || filterTabs[0];
          return setFocus(actTabUp, { scroll: false });
        }
        if (searchInput && isElementVisible(searchInput)) return setFocus(searchInput, { scroll: false });
        return true;
      }
      return true;
    }

    return false;
  }

  /**
   * Deterministic Navigation inside Movie / Series Details Modal (#detailsModal)
   */
  function navigateDetailsModal(direction) {
    var details = document.getElementById('detailsModal');
    if (!details || details.classList.contains('hidden')) return false;

    var sourcesPanel = document.getElementById('detailsStreamsDropdownPanel');
    if (sourcesPanel && !sourcesPanel.classList.contains('hidden')) {
      var streamBtns = Array.prototype.slice.call(sourcesPanel.querySelectorAll('.stream-source-card, button')).filter(isElementVisible);
      var stIdx = streamBtns.indexOf(currentFocused);
      if (stIdx === -1 && streamBtns.length) return setFocus(streamBtns[0]);
      if (direction === 'down') {
        if (stIdx < streamBtns.length - 1) return setFocus(streamBtns[stIdx + 1]);
        return true;
      }
      if (direction === 'up') {
        if (stIdx > 0) return setFocus(streamBtns[stIdx - 1]);
        sourcesPanel.classList.add('hidden');
        var srcTrig = document.getElementById('detailsSourcesDropdownBtn');
        if (srcTrig && isElementVisible(srcTrig)) return setFocus(srcTrig);
        return true;
      }
      return true;
    }

    var closeBtn = document.getElementById('closeDetailsBtn');
    var actionBtns = Array.prototype.slice.call(details.querySelectorAll('.details-actions button')).filter(isElementVisible);
    var sourcesBtn = document.getElementById('detailsSourcesDropdownBtn');
    var seasonBtns = Array.prototype.slice.call(details.querySelectorAll('#seasonSelector .season-tab-btn')).filter(isElementVisible);
    var midRow = ([sourcesBtn].concat(seasonBtns)).filter(isElementVisible);
    var epCards = Array.prototype.slice.call(details.querySelectorAll('#episodesGrid .episode-card')).filter(isElementVisible);

    if (!currentFocused || !details.contains(currentFocused) || !isElementVisible(currentFocused)) {
      if (actionBtns.length) return setFocus(actionBtns[0], { scroll: false });
      if (closeBtn && isElementVisible(closeBtn)) return setFocus(closeBtn, { scroll: false });
      return false;
    }

    if (currentFocused === closeBtn) {
      if (direction === 'down' || direction === 'right') {
        if (actionBtns.length) return setFocus(actionBtns[0], { scroll: false });
      }
      return true;
    }

    var aIdx = actionBtns.indexOf(currentFocused);
    if (aIdx !== -1) {
      if (direction === 'left') {
        if (aIdx < actionBtns.length - 1) return setFocus(actionBtns[aIdx + 1], { scroll: false });
        if (closeBtn && isElementVisible(closeBtn)) return setFocus(closeBtn, { scroll: false });
        return true;
      }
      if (direction === 'right') {
        if (aIdx > 0) return setFocus(actionBtns[aIdx - 1], { scroll: false });
        return true;
      }
      if (direction === 'up') {
        if (closeBtn && isElementVisible(closeBtn)) return setFocus(closeBtn, { scroll: false });
        return true;
      }
      if (direction === 'down') {
        if (midRow.length) return setFocus(midRow[0]);
        if (epCards.length) return setFocus(epCards[0]);
        return true;
      }
      return true;
    }

    var mIdx = midRow.indexOf(currentFocused);
    if (mIdx !== -1) {
      if (direction === 'left') {
        if (mIdx < midRow.length - 1) return setFocus(midRow[mIdx + 1], { scroll: false });
        return true;
      }
      if (direction === 'right') {
        if (mIdx > 0) return setFocus(midRow[mIdx - 1], { scroll: false });
        return true;
      }
      if (direction === 'up') {
        if (actionBtns.length) return setFocus(actionBtns[0]);
        return true;
      }
      if (direction === 'down') {
        if (epCards.length) return setFocus(epCards[0]);
        return true;
      }
      return true;
    }

    var eIdx = epCards.indexOf(currentFocused);
    if (eIdx !== -1) {
      var epCols = 1;
      var ep0Top = epCards[0].offsetTop;
      for (var ei = 1; ei < Math.min(8, epCards.length); ei++) {
        if (Math.abs(epCards[ei].offsetTop - ep0Top) <= 18) epCols++;
        else break;
      }
      var eCol = eIdx % epCols;
      if (direction === 'left') {
        if (eCol < epCols - 1 && eIdx + 1 < epCards.length) return setFocus(epCards[eIdx + 1]);
        return true;
      }
      if (direction === 'right') {
        if (eCol > 0) return setFocus(epCards[eIdx - 1]);
        return true;
      }
      if (direction === 'down') {
        if (eIdx + epCols < epCards.length) return setFocus(epCards[eIdx + epCols]);
        return true;
      }
      if (direction === 'up') {
        if (eIdx - epCols >= 0) return setFocus(epCards[eIdx - epCols]);
        if (midRow.length) return setFocus(midRow[0]);
        if (actionBtns.length) return setFocus(actionBtns[0]);
        return true;
      }
      return true;
    }

    return false;
  }

  /**
   * Universal On-Screen TV Keyboard Builder & Controller (v9.8.0 Streamer Edition)
   */
  function ensureRubikFontLink() {
    try {
      if (!document.getElementById('streamitRubikFontLink')) {
        var link = document.createElement('link');
        link.id = 'streamitRubikFontLink';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600&display=swap';
        document.head.appendChild(link);
      }
    } catch (e) {}
  }

  function removeLegacySideRailTabHandle() {
    var oldHandles = document.querySelectorAll('#tvSideRailTabHandle, .tv-side-rail-tab-handle');
    for (var i = 0; i < oldHandles.length; i++) {
      if (oldHandles[i] && oldHandles[i].parentNode) {
        oldHandles[i].parentNode.removeChild(oldHandles[i]);
      }
    }
    if (document.body) {
      document.body.classList.remove('tv-rail-expanded');
    }
  }

  function ensureAuthFormDomUpgraded() {
    var authModal = document.getElementById('authModal');
    if (!authModal) return;

    // Remove any quick-access / inline helper buttons so the login form stays 100% clean
    var toRemove = authModal.querySelectorAll(
      '#authQuickAccountsBar, #quickTestLoginBtn, .form-field-inline-actions, .form-inline-btn, .auth-quick-accounts-bar'
    );
    for (var i = 0; i < toRemove.length; i++) {
      if (toRemove[i] && toRemove[i].parentNode) {
        toRemove[i].parentNode.removeChild(toRemove[i]);
      }
    }

    var emailIn = document.getElementById('authEmailInput');
    if (emailIn) {
      emailIn.removeAttribute('readonly');
      emailIn.removeAttribute('disabled');
      emailIn.removeAttribute('placeholder');
      emailIn.placeholder = '';
      emailIn.classList.add('tv-focusable');
    }

    var passIn = document.getElementById('authPasswordInput');
    if (passIn) {
      passIn.removeAttribute('readonly');
      passIn.removeAttribute('disabled');
      passIn.removeAttribute('placeholder');
      passIn.placeholder = '';
      passIn.classList.add('tv-focusable');
    }

    var subBtn = document.getElementById('authSubmitBtn');
    if (subBtn) {
      subBtn.removeAttribute('disabled');
      subBtn.classList.add('tv-focusable');
    }

    var authForm = document.getElementById('authForm');
    if (authForm && !document.getElementById('qrMobileApproveBanner')) {
      var banner = document.createElement('div');
      banner.id = 'qrMobileApproveBanner';
      banner.className = 'qr-mobile-approve-banner hidden';
      banner.innerHTML =
        '<div class="qr-mobile-approve-badge">📱 חיבור מהיר של מסך באמצעות QR</div>' +
        '<p id="qrMobileApproveDesc" class="qr-mobile-approve-desc">הזן את פרטי המנוי שלך בטלפון ולחץ על <strong>"התחבר לחשבון"</strong> כדי לחבר את המסך שסרקת באופן אוטומטי.</p>';
      authForm.insertBefore(banner, authForm.firstChild);
    }
    if (authForm && !document.getElementById('authQrPairBox')) {
      var qrBox = document.createElement('div');
      qrBox.id = 'authQrPairBox';
      qrBox.className = 'auth-qr-pair-box';
      qrBox.innerHTML =
        '<div class="auth-qr-img-wrap">' +
          '<img id="authQrCodeImg" class="auth-qr-img" src="" alt="קוד QR להתחברות מהירה מהטלפון" />' +
        '</div>' +
        '<div class="auth-qr-info">' +
          '<div class="auth-qr-title">התחברות מהירה באמצעות QR מהטלפון</div>' +
          '<p class="auth-qr-sub">סרוק את קוד ה-QR עם מצלמת הטלפון והתחבר מהנייד — המסך יתחבר אוטומטית תוך שניות.</p>' +
          '<div class="auth-qr-code-pill">קוד צימוד מסך: <strong id="authQrPairCodeLabel" dir="ltr">----</strong></div>' +
        '</div>';
      authForm.appendChild(qrBox);
    }
  }

  function ensureVirtualKeyboardDom() {
    ensureRubikFontLink();
    removeLegacySideRailTabHandle();
    ensureAuthFormDomUpgraded();
    var vk = document.getElementById('tvVirtualKeyboard');
    if (!vk) return null;
    var oldQuickBar = document.getElementById('vkQuickBar');
    if (oldQuickBar && oldQuickBar.parentNode) {
      oldQuickBar.parentNode.removeChild(oldQuickBar);
    }
    if (!document.getElementById('vkTopBackspaceBtn')) {
      vk.innerHTML =
        '<div class="vk-container" dir="ltr">' +
          '<div class="vk-header" dir="ltr">' +
            '<span id="vkFieldBadge" class="vk-field-badge" dir="rtl">שדה הקלדה</span>' +
            '<div id="vkPreviewText" class="vk-preview-text" dir="ltr"></div>' +
            '<div class="vk-header-actions" dir="rtl">' +
              '<button type="button" id="vkTopPassBtn" class="vk-top-act-btn tv-focusable hidden" data-vk-action="toggle-pass">הצג/הסתר</button>' +
              '<button type="button" id="vkTopBackspaceBtn" class="vk-top-act-btn vk-top-del-btn tv-focusable" data-vk-action="backspace">⌫ מחק אות</button>' +
              '<button type="button" id="vkTopClearBtn" class="vk-top-act-btn vk-top-clear-btn tv-focusable" data-vk-action="clear">נקה הכל</button>' +
              '<button type="button" id="vkTopCloseBtn" class="vk-top-act-btn vk-top-close-btn tv-focusable" data-vk-action="close">סגור ✕</button>' +
            '</div>' +
          '</div>' +
          '<div id="vkKeysGrid" class="vk-grid ltr-mode" dir="ltr"></div>' +
          '<div class="vk-actions-row" dir="ltr">' +
            '<button type="button" id="vkLangBtn" class="vk-action-btn tv-focusable" data-vk-action="lang">EN / עברית</button>' +
            '<button type="button" id="vkSpaceBtn" class="vk-action-btn vk-space-btn tv-focusable" data-vk-action="space">רווח / SPACE</button>' +
            '<button type="button" id="vkBackspaceBtn" class="vk-action-btn vk-del-action-btn tv-focusable" data-vk-action="backspace">⌫ מחיקה</button>' +
            '<button type="button" id="vkClearBtn" class="vk-action-btn vk-clear-action-btn tv-focusable" data-vk-action="clear">נקה הכל</button>' +
            '<button type="button" id="vkDoneBtn" class="vk-action-btn vk-done-btn tv-focusable" data-vk-action="done">✓ אישור</button>' +
          '</div>' +
        '</div>';
    }
    return vk;
  }

  function getActiveVkInput() {
    if (activeVkInputId) {
      var byId = document.getElementById(activeVkInputId);
      if (byId) {
        activeVkInput = byId;
        return byId;
      }
    }
    if (activeVkInput && activeVkInput.isConnected) {
      return activeVkInput;
    }
    return null;
  }

  function isPasswordField(inputEl) {
    if (!inputEl) return false;
    var id = (inputEl.id || '').toLowerCase();
    var type = (inputEl.getAttribute('type') || '').toLowerCase();
    return type === 'password' || id.indexOf('pass') !== -1 || id.indexOf('pin') !== -1;
  }

  function openVirtualKeyboard(inputEl) {
    if (typeof inputEl === 'string') {
      inputEl = document.getElementById(inputEl);
    }
    if (!inputEl) return;
    if (inputEl.id) {
      var liveEl = document.getElementById(inputEl.id);
      if (liveEl) inputEl = liveEl;
    }
    // Never add tv-mode on Desktop browsers — only mark vk-open while keyboard is displayed
    if (document.body) {
      document.body.classList.add('vk-open');
    }
    try {
      if (window.AndroidTvBridge && typeof window.AndroidTvBridge.hideSoftKeyboard === 'function') {
        window.AndroidTvBridge.hideSoftKeyboard();
      }
    } catch (e) {}

    inputEl.removeAttribute('readonly');
    activeVkInput = inputEl;
    activeVkInputId = inputEl.id || '';

    var vk = ensureVirtualKeyboardDom();
    if (!vk) return;

    var type = (inputEl.getAttribute('type') || 'text').toLowerCase();
    var id = (inputEl.id || '').toLowerCase();
    var dir = (inputEl.getAttribute('dir') || '').toLowerCase();
    if (type === 'email' || type === 'password' || id.indexOf('email') !== -1 || id.indexOf('pass') !== -1 || id.indexOf('pin') !== -1 || id.indexOf('tgchannel') !== -1 || dir === 'ltr') {
      vkLang = 'EN';
    } else {
      vkLang = 'HE';
    }

    renderVirtualKeyboardKeys();
    updateVkContextUi();
    updateVkPreview();
    vk.classList.remove('hidden');

    var firstKey = vk.querySelector('#vkKeysGrid .vk-key');
    if (firstKey) setFocus(firstKey, { scroll: false });
  }

  function closeVirtualKeyboard() {
    var vk = document.getElementById('tvVirtualKeyboard');
    if (document.body) {
      document.body.classList.remove('vk-open');
    }
    if (!vk || vk.classList.contains('hidden')) return false;
    vk.classList.add('hidden');
    var returnTarget = getActiveVkInput();
    activeVkInput = null;
    activeVkInputId = '';
    if (returnTarget && isElementVisible(returnTarget)) {
      setFocus(returnTarget, { scroll: false });
    }
    return true;
  }

  function updateVkContextUi() {
    var inputEl = getActiveVkInput();
    if (!inputEl) return;
    var id = inputEl.id || '';

    var badge = document.getElementById('vkFieldBadge');
    if (badge) {
      if (id === 'authEmailInput') badge.textContent = 'אימייל:';
      else if (id === 'authPasswordInput') badge.textContent = 'סיסמה:';
      else if (id.toLowerCase().indexOf('pin') !== -1) badge.textContent = 'קוד PIN:';
      else badge.textContent = 'הקלדה:';
    }

    var topPassBtn = document.getElementById('vkTopPassBtn');
    if (topPassBtn) {
      var isPass = isPasswordField(inputEl);
      topPassBtn.classList.toggle('hidden', !isPass);
      topPassBtn.textContent = vkRevealPass ? 'הסתר סיסמה' : 'הצג סיסמה';
    }

    var doneBtn = document.getElementById('vkDoneBtn');
    if (doneBtn) {
      if (id === 'authEmailInput') {
        doneBtn.textContent = 'הבא: לסיסמה ↵';
      } else if (id === 'authPasswordInput') {
        doneBtn.textContent = '✓ התחבר לחשבון';
      } else {
        doneBtn.textContent = '✓ אישור וסיום';
      }
    }
  }

  function updateVkPreview() {
    var preview = document.getElementById('vkPreviewText');
    var inputEl = getActiveVkInput();
    if (!preview || !inputEl) return;
    var isPass = isPasswordField(inputEl);
    var val = inputEl.value || '';
    if (!val) {
      preview.textContent = inputEl.getAttribute('placeholder') || 'הקלד כאן...';
      preview.style.color = '#94a3b8';
      return;
    }
    preview.style.color = '#ffffff';
    if (isPass && !vkRevealPass) {
      preview.textContent = val.replace(/./g, '•') + ' |';
    } else {
      preview.textContent = val + ' |';
    }
  }

  function dispatchInputUpdate(inputEl) {
    var target = inputEl || getActiveVkInput();
    if (!target) return;
    updateVkPreview();
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function renderVirtualKeyboardKeys() {
    ensureVirtualKeyboardDom();
    var grid = document.getElementById('vkKeysGrid');
    var langBtn = document.getElementById('vkLangBtn');
    if (!grid) return;

    grid.setAttribute('dir', 'ltr');
    grid.style.direction = 'ltr';
    if (langBtn) {
      langBtn.textContent = vkLang === 'HE' ? '🌐 EN / אנגלית' : '🌐 HE / עברית';
    }

    var rows = VK_LAYOUTS[vkLang] || VK_LAYOUTS.EN;
    var html = '';
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        var ch = rows[r][c];
        var safeAttr = ch === '"' ? '&quot;' : ch;
        html += '<button type="button" class="vk-key tv-focusable" data-char="' + safeAttr + '">' + ch + '</button>';
      }
    }
    grid.innerHTML = html;
  }

  function handleVkInteractiveElement(el) {
    if (!el) return false;
    var now = Date.now();
    if (now - lastVkActionAt < 55) return true;

    // 1. Inside #tvVirtualKeyboard: Character Key (.vk-key[data-char])
    if (el.hasAttribute('data-char')) {
      lastVkActionAt = now;
      var inputCharEl = getActiveVkInput();
      if (inputCharEl) {
        var ch = el.getAttribute('data-char') || '';
        var maxLen = Number(inputCharEl.getAttribute('maxlength') || 0);
        var curVal = inputCharEl.value || '';
        if (!maxLen || curVal.length < maxLen) {
          inputCharEl.value = curVal + ch;
          dispatchInputUpdate(inputCharEl);
        }
      }
      return true;
    }

    // 2. Inside #tvVirtualKeyboard: Action Buttons (backspace, clear, space, lang, toggle-pass, close, done)
    var vkAction = el.getAttribute('data-vk-action') || '';
    if (!vkAction) {
      if (el.id === 'vkBackspaceBtn' || el.id === 'vkTopBackspaceBtn') vkAction = 'backspace';
      else if (el.id === 'vkClearBtn' || el.id === 'vkTopClearBtn') vkAction = 'clear';
      else if (el.id === 'vkSpaceBtn') vkAction = 'space';
      else if (el.id === 'vkLangBtn') vkAction = 'lang';
      else if (el.id === 'vkDoneBtn') vkAction = 'done';
      else if (el.id === 'vkTopCloseBtn') vkAction = 'close';
      else if (el.id === 'vkTopPassBtn') vkAction = 'toggle-pass';
    }

    if (vkAction) {
      lastVkActionAt = now;
      var targetIn = getActiveVkInput();

      if (vkAction === 'backspace') {
        if (targetIn) {
          var v = targetIn.value || '';
          targetIn.value = v.slice(0, -1);
          dispatchInputUpdate(targetIn);
        }
        return true;
      }

      if (vkAction === 'clear') {
        if (targetIn) {
          targetIn.value = '';
          dispatchInputUpdate(targetIn);
        }
        return true;
      }

      if (vkAction === 'space') {
        if (targetIn) {
          targetIn.value = (targetIn.value || '') + ' ';
          dispatchInputUpdate(targetIn);
        }
        return true;
      }

      if (vkAction === 'lang') {
        vkLang = vkLang === 'HE' ? 'EN' : 'HE';
        renderVirtualKeyboardKeys();
        var langBtnEl = document.getElementById('vkLangBtn');
        if (langBtnEl && isElementVisible(langBtnEl)) {
          setFocus(langBtnEl, { scroll: false });
        }
        return true;
      }

      if (vkAction === 'toggle-pass') {
        vkRevealPass = !vkRevealPass;
        if (targetIn && isPasswordField(targetIn)) {
          targetIn.setAttribute('type', vkRevealPass ? 'text' : 'password');
        }
        updateVkContextUi();
        updateVkPreview();
        return true;
      }

      if (vkAction === 'close') {
        closeVirtualKeyboard();
        return true;
      }

      if (vkAction === 'done') {
        if (targetIn && targetIn.id === 'authEmailInput') {
          closeVirtualKeyboard();
          var nextPass = document.getElementById('authPasswordInput');
          if (nextPass && isElementVisible(nextPass)) {
            setFocus(nextPass);
            if (document.body && document.body.classList.contains('tv-mode') && !nextPass.value) {
              openVirtualKeyboard(nextPass);
            }
          }
          return true;
        }
        if (targetIn && targetIn.id === 'authPasswordInput') {
          closeVirtualKeyboard();
          var authSub = document.getElementById('authSubmitBtn');
          if (authSub && isElementVisible(authSub)) {
            setFocus(authSub);
            if (typeof window.submitAuthLoginForm === 'function') {
              window.submitAuthLoginForm();
            } else {
              authSub.click();
            }
          }
          return true;
        }
        closeVirtualKeyboard();
        return true;
      }
    }

    return false;
  }

  function bindVirtualKeyboardActions() {
    ensureVirtualKeyboardDom();
    if (window.__streamItVkDocClickHandler) {
      try {
        document.removeEventListener('click', window.__streamItVkDocClickHandler, true);
      } catch (e) {}
    }
    window.__streamItVkDocClickHandler = function (e) {
      var target = e.target;
      if (!target || typeof target.closest !== 'function') return;

      var actionBtn = target.closest(
        '[data-vk-action], [data-char], #vkLangBtn, #vkSpaceBtn, #vkBackspaceBtn, #vkClearBtn, #vkDoneBtn'
      );
      if (actionBtn) {
        if (handleVkInteractiveElement(actionBtn)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      var clickedInput = target.closest('input');
      if (clickedInput) {
        var inType = (clickedInput.getAttribute('type') || 'text').toLowerCase();
        if (inType !== 'range' && inType !== 'checkbox' && inType !== 'submit') {
          clickedInput.removeAttribute('readonly');
          var isTvNow = Boolean(document.body && document.body.classList.contains('tv-mode'));
          if (isTvNow) {
            e.preventDefault();
            openVirtualKeyboard(clickedInput);
          } else {
            // Desktop / Mobile Browser: let native input focus & typing work normally!
            if (currentFocused && currentFocused !== clickedInput) {
              currentFocused.classList.remove('tv-focused');
            }
            currentFocused = clickedInput;
            clickedInput.classList.add('tv-focused');
          }
        }
      }
    };
    document.addEventListener('click', window.__streamItVkDocClickHandler, true);

    if (window.__streamItDocFocusInHandler) {
      try {
        document.removeEventListener('focusin', window.__streamItDocFocusInHandler, true);
      } catch (e) {}
    }
    window.__streamItDocFocusInHandler = function (e) {
      var isTvNow = Boolean(document.body && document.body.classList.contains('tv-mode'));
      if (isTvNow) return;
      var el = e.target;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || (el.classList && el.classList.contains('tv-focusable')))) {
        if (currentFocused && currentFocused !== el) {
          currentFocused.classList.remove('tv-focused');
        }
        currentFocused = el;
        el.classList.add('tv-focused');
      }
    };
    document.addEventListener('focusin', window.__streamItDocFocusInHandler, true);
  }

  /**
   * Handle Back / Escape Deterministically
   */
  function handleBackButton() {
    var isTv = Boolean(document.body && document.body.classList.contains('tv-mode'));
    var now = Date.now();
    var playerCheck = document.getElementById('playerModal');
    var isPlayerActive = Boolean(playerCheck && !playerCheck.classList.contains('hidden'));
    var isQuickDoubleBackInPlayer = isPlayerActive && (now - lastBackHandledAt < 520);

    // Do not block double-press Back inside the video player so double-Back exits immediately!
    if (isTv && !isPlayerActive && now - lastBackHandledAt < 220) {
      return true;
    }
    lastBackHandledAt = now;

    // Fast Double-Click Back inside a movie/series: immediately exit the player and skip the exit menu!
    if (isQuickDoubleBackInPlayer) {
      if (typeof window.confirmExitVideoPlayer === 'function') {
        window.confirmExitVideoPlayer();
      } else if (typeof window.closeVideoPlayer === 'function') {
        window.closeVideoPlayer();
      } else if (playerCheck) {
        playerCheck.classList.add('hidden');
      }
      if (lastMainFocus && isElementVisible(lastMainFocus)) setFocus(lastMainFocus);
      return true;
    }

    var vk = document.getElementById('tvVirtualKeyboard');
    if (vk && !vk.classList.contains('hidden')) {
      return closeVirtualKeyboard();
    }

    var clearCwModal = document.getElementById('clearCwConfirmModal');
    if (clearCwModal && !clearCwModal.classList.contains('hidden')) {
      if (typeof window.cancelClearAllContinueWatching === 'function') {
        window.cancelClearAllContinueWatching();
      } else {
        clearCwModal.classList.add('hidden');
        if (lastMainFocus && isElementVisible(lastMainFocus)) setFocus(lastMainFocus);
      }
      return true;
    }

    var parentalModal = document.getElementById('parentalControlModal');
    if (parentalModal && !parentalModal.classList.contains('hidden')) {
      if (typeof window.closeParentalControlModal === 'function') {
        window.closeParentalControlModal();
      } else {
        parentalModal.classList.add('hidden');
      }
      var playerOpen = document.getElementById('playerModal');
      if (playerOpen && !playerOpen.classList.contains('hidden')) {
        var topPar = document.getElementById('playerTopParentalBtn');
        if (topPar && isElementVisible(topPar)) setFocus(topPar);
      } else if (lastMainFocus && isElementVisible(lastMainFocus)) {
        setFocus(lastMainFocus);
      }
      return true;
    }

    var parentalMenu = document.getElementById('playerParentalMenu');
    if (parentalMenu && !parentalMenu.classList.contains('hidden')) {
      parentalMenu.classList.add('hidden');
      if (isTv) {
        lastPlayerOverlayDismissedAt = now;
        var controlsOverlayPar = document.getElementById('playerControlsOverlay');
        if (controlsOverlayPar) controlsOverlayPar.classList.add('idle-hidden');
        clearPlayerFocus();
        if (typeof window.resumePlaybackIfPaused === 'function') {
          window.resumePlaybackIfPaused();
        }
        return true;
      }
      var topParBtn = document.getElementById('playerTopParentalBtn');
      if (topParBtn && isElementVisible(topParBtn)) setFocus(topParBtn);
      return true;
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
      // 1. If the Exit Confirmation Modal (#playerExitConfirmModal) is already open, pressing Back a second time exits the movie immediately!
      var exitConfirmModal = document.getElementById('playerExitConfirmModal');
      if (exitConfirmModal && !exitConfirmModal.classList.contains('hidden')) {
        if (typeof window.confirmExitVideoPlayer === 'function') {
          window.confirmExitVideoPlayer();
        } else if (typeof window.closeVideoPlayer === 'function') {
          window.closeVideoPlayer();
        } else {
          exitConfirmModal.classList.add('hidden');
          player.classList.add('hidden');
        }
        if (lastMainFocus && isElementVisible(lastMainFocus)) setFocus(lastMainFocus);
        return true;
      }

      // 2. Otherwise, first Back press in the player opens the Exit Confirmation Dialog ("לצאת מהצפייה?")
      if (typeof window.requestCloseVideoPlayer === 'function') {
        window.requestCloseVideoPlayer();
        return true;
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

    // If inside #tvSideRail or #tvSideRail is open, Back closes the side menu and returns to the catalog!
    var sideRail = document.getElementById('tvSideRail');
    if (sideRail && (sideRail.classList.contains('rail-open') || (currentFocused && sideRail.contains(currentFocused)))) {
      sideRail.classList.remove('rail-open');
      if (document.body) document.body.classList.remove('tv-rail-expanded');
      if (lastMainFocus && isElementVisible(lastMainFocus)) {
        return setFocus(lastMainFocus);
      }
      var firstTile = document.querySelector('#catalogMain .poster-card');
      if (firstTile && isElementVisible(firstTile)) {
        return setFocus(firstTile);
      }
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

    return false;
  }

  /**
   * Master Remote D-Pad & Keyboard Dispatcher
   */
  function handleRemoteCommand(directionOrAction) {
    var nowCmd = Date.now();
    if (directionOrAction === lastCmdDir && nowCmd - lastCmdAt < 22) {
      return true;
    }
    lastCmdDir = directionOrAction;
    lastCmdAt = nowCmd;

    if (directionOrAction === 'back') {
      return handleBackButton();
    }

    if (directionOrAction === 'select') {
      var parentalModalOpen = document.getElementById('parentalControlModal');
      var player = document.getElementById('playerModal');
      var isTv = Boolean(document.body && document.body.classList.contains('tv-mode'));
      if (player && !player.classList.contains('hidden') && (!parentalModalOpen || parentalModalOpen.classList.contains('hidden'))) {
        var exitConfirmModal = document.getElementById('playerExitConfirmModal');
        if (exitConfirmModal && !exitConfirmModal.classList.contains('hidden')) {
          if (currentFocused && exitConfirmModal.contains(currentFocused) && isElementVisible(currentFocused)) {
            currentFocused.click();
          } else {
            var cancelExitBtn = document.getElementById('playerExitCancelBtn');
            if (cancelExitBtn) cancelExitBtn.click();
          }
          return true;
        }
        if (isTv) {
          var shieldSkipBtn = document.getElementById('parentalShieldSkipNowBtn');
          if (shieldSkipBtn && isElementVisible(shieldSkipBtn)) {
            shieldSkipBtn.click();
            return true;
          }

          var parentalMenu = document.getElementById('playerParentalMenu');
          var subsMenu = document.getElementById('playerSubsMenu');
          var sourceTabsPanel = document.getElementById('playerSourceTabs');
          var controlsOverlay = document.getElementById('playerControlsOverlay');
          var playPauseBtn = document.getElementById('playerPlayPauseBtn');
          var seekSlider = document.getElementById('playerSeekSlider');

          if (parentalMenu && !parentalMenu.classList.contains('hidden')) {
            if (typeof window.wakePlayerControls === 'function') window.wakePlayerControls();
            if (currentFocused && parentalMenu.contains(currentFocused) && isElementVisible(currentFocused)) {
              currentFocused.click();
            } else {
              var firstPar = parentalMenu.querySelector('button');
              if (firstPar && isElementVisible(firstPar)) setFocus(firstPar);
            }
            return true;
          }

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

      if (handleVkInteractiveElement(currentFocused)) {
        return true;
      }

      var tag = (currentFocused.tagName || '').toUpperCase();
      var type = (currentFocused.getAttribute('type') || '').toLowerCase();
      if (tag === 'INPUT' && type !== 'range' && type !== 'checkbox' && type !== 'submit') {
        if (isTv) {
          openVirtualKeyboard(currentFocused);
        } else {
          try {
            currentFocused.focus();
          } catch (e) {}
        }
        return true;
      }

      if (currentFocused.id === 'authSubmitBtn' && typeof window.submitAuthLoginForm === 'function') {
        window.submitAuthLoginForm();
        return true;
      }

      currentFocused.click();
      return true;
    }

    var vk = document.getElementById('tvVirtualKeyboard');
    if (vk && !vk.classList.contains('hidden')) {
      return navigateVirtualKeyboard(directionOrAction);
    }

    var clearCwModalNav = document.getElementById('clearCwConfirmModal');
    if (clearCwModalNav && !clearCwModalNav.classList.contains('hidden')) {
      var cwCancelBtn = document.getElementById('clearCwCancelBtn');
      var cwConfirmBtn = document.getElementById('clearCwConfirmBtn');
      if (currentFocused === cwCancelBtn && cwConfirmBtn && isElementVisible(cwConfirmBtn)) {
        return setFocus(cwConfirmBtn, { scroll: false });
      }
      if (cwCancelBtn && isElementVisible(cwCancelBtn)) {
        return setFocus(cwCancelBtn, { scroll: false });
      }
      return true;
    }

    var parentalModalNav = document.getElementById('parentalControlModal');
    var playerModal = document.getElementById('playerModal');
    if (playerModal && !playerModal.classList.contains('hidden') && (!parentalModalNav || parentalModalNav.classList.contains('hidden'))) {
      return navigatePlayerModal(directionOrAction);
    }

    var userSettingsPanel = document.getElementById('userSettingsDropdownPanel');
    if (userSettingsPanel && !userSettingsPanel.classList.contains('hidden')) {
      return navigateUserSettingsDropdown(directionOrAction);
    }

    var activeScope = getActiveScope();
    if (activeScope && activeScope.id === 'parentalControlModal') {
      var pCandidates = getFocusableElements(activeScope);
      if (!pCandidates.length) return true;
      if (!currentFocused || !activeScope.contains(currentFocused) || !isElementVisible(currentFocused)) {
        var firstP = document.getElementById('parentalMasterToggleBtn') || pCandidates[0];
        return setFocus(firstP);
      }
      var nearP = findNearestPhysical(currentFocused, directionOrAction, pCandidates);
      if (nearP) {
        return setFocus(nearP);
      }
      var pCurIdx = pCandidates.indexOf(currentFocused);
      if (directionOrAction === 'down' && pCurIdx < pCandidates.length - 1) {
        return setFocus(pCandidates[pCurIdx + 1]);
      }
      if (directionOrAction === 'up' && pCurIdx > 0) {
        return setFocus(pCandidates[pCurIdx - 1]);
      }
      return true;
    }
    if (activeScope && activeScope.id === 'authModal') {
      return navigateAuthModal(directionOrAction);
    }
    if (activeScope && activeScope.id === 'searchModal') {
      if (navigateSearchModal(directionOrAction)) return true;
    }
    if (activeScope && activeScope.id === 'detailsModal') {
      if (navigateDetailsModal(directionOrAction)) return true;
    }
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
    var authModal = document.getElementById('authModal');
    if (authModal && !authModal.classList.contains('hidden')) {
      if (currentFocused && authModal.contains(currentFocused) && isElementVisible(currentFocused)) {
        return true;
      }
      var emailIn = document.getElementById('authEmailInput');
      if (emailIn && isElementVisible(emailIn)) {
        return setFocus(emailIn, { scroll: false });
      }
      var authList = getFocusableElements(authModal);
      if (authList.length) {
        return setFocus(authList[0], { scroll: false });
      }
    }
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
    closeKeyboard: closeVirtualKeyboard,
    rebindAll: bindVirtualKeyboardActions
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

    // When Virtual Keyboard is open, Backspace / Delete (8, 46, 67) deletes a character instead of closing the keyboard!
    if (vkOpen && (key === 'Backspace' || key === 'Delete' || code === 8 || code === 46 || code === 67)) {
      var targetIn = getActiveVkInput();
      if (targetIn) {
        e.preventDefault();
        e.stopPropagation();
        var curV = targetIn.value || '';
        targetIn.value = curV.slice(0, -1);
        dispatchInputUpdate(targetIn);
      }
      return;
    }

    // Support Android TV Back (4), LG webOS Back (461), Samsung Tizen Back (10009), and Escape
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
