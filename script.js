/* ==========================================================================
   WORLD OF WARCRAFT: FOREVER — COUNTDOWN & AUDIO CONTROLLER
   Official Infinity Edition
   ========================================================================== */

(function () {
  'use strict';

  // --- CONFIGURATION & CONSTANTS ---
  const OFFICIAL_LAUNCH_UTC = '2026-11-04T23:00:00Z'; // 4 Nov 2026, 23:00 UTC (Locked Official Date)
  const CAMPAIGN_START_UTC  = '2026-10-01T00:00:00Z'; // Reference start for progress calculation
  const YOUTUBE_VIDEO_ID    = 'VWQrvUe_jbo';           // Two Steps From Hell - Victory
  const DEFAULT_VOLUME      = 35;                      // Moderated volume default (35%)

  // --- SVG ICONS (Zero Emojis) ---
  const SVG_PLAY = '<svg viewBox="0 0 24 24" class="ctrl-svg"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
  const SVG_PAUSE = '<svg viewBox="0 0 24 24" class="ctrl-svg"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
  const SVG_VOL_HIGH = '<svg viewBox="0 0 24 24" class="ctrl-svg-sm"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
  const SVG_VOL_LOW = '<svg viewBox="0 0 24 24" class="ctrl-svg-sm"><path fill="currentColor" d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>';
  const SVG_VOL_MUTE = '<svg viewBox="0 0 24 24" class="ctrl-svg-sm"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';

  // --- FACTION LORE & METADATA ---
  const FACTION_DATA = {
    titans: {
      banner: 'TWO OLD ROADS \u2022 A POSSIBLE NEW JOURNEY',
      tagline: 'El renacimiento definitivo de Azeroth. El lazo del infinito une el pasado y el futuro de los campeones.',
      status: 'SINCRONIZANDO PORTALES TEMPORALES'
    },
    alliance: {
      banner: 'POR EL REY \u2022 POR LA ALIANZA',
      tagline: 'Por la gloria de la Alianza y la defensa de Ventormenta. La luz sagrada gu\u00eda nuestro destino eterno.',
      status: 'ALIANZA: REINO DE VENTORMENTA PREPARADO'
    },
    horde: {
      banner: 'LOK\'TAR OGAR \u2022 SANGRE Y GLORIA',
      tagline: '\u00a1Por la Horda! La fuerza del acero y el rugido de los clanes marcan el regreso definitivo a Azeroth.',
      status: 'HORDA: PREPARANDO TROPAS DE ORGRIMMAR'
    }
  };

  // --- STATE ---
  const targetDate = new Date(OFFICIAL_LAUNCH_UTC);
  let currentTheme = localStorage.getItem('wow_theme') || 'titans';
  let isMuted = false;
  let previousVolume = DEFAULT_VOLUME;
  let hasCelebrated = false;
  let hasUserInteracted = false;

  // --- DOM ELEMENTS ---
  const elNumDays = document.getElementById('num-days');
  const elNumHours = document.getElementById('num-hours');
  const elNumMinutes = document.getElementById('num-minutes');
  const elNumSeconds = document.getElementById('num-seconds');
  const elNumMs = document.getElementById('num-ms');
  
  const elOfficialDateDisplay = document.getElementById('official-date-display');
  const elLocalDateDisplay = document.getElementById('local-date-display');
  const elProgressFill = document.getElementById('progress-fill-bar');
  const elProgressPercent = document.getElementById('progress-percent-text');
  const elCelebration = document.getElementById('launch-celebration');
  const elRealmStatus = document.getElementById('realm-status-text');
  const elHeroBannerText = document.getElementById('hero-banner-text');
  const elHeroTaglineText = document.getElementById('hero-tagline-text');

  // Audio DOM
  const elBtnTogglePlay = document.getElementById('btn-toggle-play');
  const elPlayIconContainer = document.getElementById('play-icon-container');
  const elBtnToggleMute = document.getElementById('btn-toggle-mute');
  const elVolumeIconContainer = document.getElementById('volume-icon-container');
  const elVolumeSlider = document.getElementById('volume-slider');
  const elVolumePercent = document.getElementById('volume-percent');
  const elEqualizer = document.getElementById('equalizer-bars');
  const elAudioStatus = document.getElementById('audio-status-label');

  // Faction buttons
  const factionButtons = document.querySelectorAll('.faction-btn');

  // Canvas
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');

  // ==========================================================================
  // 1. YOUTUBE IFRAME API & AUDIO ENGINE (SILENT UI, AUTO-START)
  // ==========================================================================
  let ytPlayer = null;
  let isPlayerReady = false;

  window.onYouTubeIframeAPIReady = function () {
    const playerConfig = {
      height: '200',
      width: '320',
      videoId: YOUTUBE_VIDEO_ID,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        loop: 1,
        playlist: YOUTUBE_VIDEO_ID,
        modestbranding: 1,
        rel: 0,
        playsinline: 1
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    };

    if (window.location.protocol && window.location.protocol.startsWith('http')) {
      playerConfig.playerVars.origin = window.location.origin;
    }

    ytPlayer = new YT.Player('youtube-player', playerConfig);
  };

  const ytTag = document.createElement('script');
  ytTag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(ytTag, firstScriptTag);

  function onPlayerReady(event) {
    isPlayerReady = true;
    ytPlayer.setVolume(DEFAULT_VOLUME);
    startMusicPlayback();
  }

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
      elPlayIconContainer.innerHTML = SVG_PAUSE;
      elEqualizer.classList.add('playing');
      elAudioStatus.textContent = 'Banda Sonora en Reproducción Continua';
    } else if (event.data === YT.PlayerState.PAUSED) {
      elPlayIconContainer.innerHTML = SVG_PLAY;
      elEqualizer.classList.remove('playing');
      elAudioStatus.textContent = 'Música en Pausa';
    } else if (event.data === YT.PlayerState.ENDED) {
      ytPlayer.seekTo(0);
      ytPlayer.playVideo();
    }
  }

  function onPlayerError(err) {
    elAudioStatus.textContent = 'Banda Sonora Lista';
  }

  function startMusicPlayback() {
    if (isPlayerReady && ytPlayer && typeof ytPlayer.playVideo === 'function') {
      ytPlayer.setVolume(elVolumeSlider.value || DEFAULT_VOLUME);
      ytPlayer.playVideo();
      elPlayIconContainer.innerHTML = SVG_PAUSE;
      elEqualizer.classList.add('playing');
      elAudioStatus.textContent = 'Banda Sonora en Reproducción Continua';
    }
  }

  function pauseMusicPlayback() {
    if (isPlayerReady && ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      ytPlayer.pauseVideo();
      elPlayIconContainer.innerHTML = SVG_PLAY;
      elEqualizer.classList.remove('playing');
      elAudioStatus.textContent = 'Música en Pausa';
    }
  }

  function toggleMusic() {
    if (!isPlayerReady || !ytPlayer) return;
    const playerState = ytPlayer.getPlayerState();
    if (playerState === YT.PlayerState.PLAYING) {
      pauseMusicPlayback();
    } else {
      startMusicPlayback();
    }
  }

  function setVolume(val) {
    const num = Math.max(0, Math.min(100, parseInt(val, 10)));
    elVolumeSlider.value = num;
    elVolumePercent.textContent = num + '%';

    if (num === 0) {
      isMuted = true;
      elVolumeIconContainer.innerHTML = SVG_VOL_MUTE;
    } else if (num < 40) {
      isMuted = false;
      elVolumeIconContainer.innerHTML = SVG_VOL_LOW;
    } else {
      isMuted = false;
      elVolumeIconContainer.innerHTML = SVG_VOL_HIGH;
    }

    if (isPlayerReady && ytPlayer && typeof ytPlayer.setVolume === 'function') {
      ytPlayer.setVolume(num);
      if (num > 0 && ytPlayer.isMuted()) {
        ytPlayer.unMute();
      }
    }
  }

  function toggleMute() {
    if (isMuted) {
      setVolume(previousVolume > 0 ? previousVolume : DEFAULT_VOLUME);
    } else {
      previousVolume = parseInt(elVolumeSlider.value, 10) || DEFAULT_VOLUME;
      setVolume(0);
    }
  }

  // Auto-unlock sound on first user gesture if browser blocked unmuted autoplay
  function handleFirstUserGesture() {
    if (!hasUserInteracted) {
      hasUserInteracted = true;
      startMusicPlayback();
      document.removeEventListener('click', handleFirstUserGesture);
      document.removeEventListener('keydown', handleFirstUserGesture);
      document.removeEventListener('touchstart', handleFirstUserGesture);
    }
  }
  document.addEventListener('click', handleFirstUserGesture);
  document.addEventListener('keydown', handleFirstUserGesture);
  document.addEventListener('touchstart', handleFirstUserGesture);

  // ==========================================================================
  // 2. COUNTDOWN TIMER ENGINE
  // ==========================================================================
  let lastDays = -1;
  let lastHours = -1;
  let lastMinutes = -1;
  let lastSeconds = -1;

  function updateLocalTimeDisplay() {
    try {
      const options = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      };
      const formatted = new Intl.DateTimeFormat(navigator.language || 'es-ES', options).format(targetDate);
      elLocalDateDisplay.textContent = formatted;

      const utcFormatted = targetDate.toUTCString().replace('GMT', 'UTC');
      elOfficialDateDisplay.textContent = utcFormatted;
    } catch (e) {
      elLocalDateDisplay.textContent = targetDate.toLocaleString();
    }
  }

  function updateCountdown() {
    const now = new Date().getTime();
    const target = targetDate.getTime();
    const diff = target - now;

    if (diff <= 0) {
      elNumDays.textContent = '00';
      elNumHours.textContent = '00';
      elNumMinutes.textContent = '00';
      elNumSeconds.textContent = '00';
      elNumMs.textContent = '000';

      elCelebration.classList.remove('hidden');
      elRealmStatus.textContent = 'LOS REINOS ESTAN EN VIVO';
      elRealmStatus.style.color = '#34d399';
      document.querySelector('.status-gem').classList.add('live-green');

      elProgressFill.style.width = '100%';
      elProgressPercent.textContent = '100%';

      if (!hasCelebrated) {
        hasCelebrated = true;
        triggerCelebrationFireworks();
      }
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const ms = Math.floor(diff % 1000);

    const pad = (n, len = 2) => String(n).padStart(len, '0');

    if (days !== lastDays) {
      elNumDays.textContent = pad(days);
      animateCardTick(elNumDays);
      lastDays = days;
    }
    if (hours !== lastHours) {
      elNumHours.textContent = pad(hours);
      animateCardTick(elNumHours);
      lastHours = hours;
    }
    if (minutes !== lastMinutes) {
      elNumMinutes.textContent = pad(minutes);
      animateCardTick(elNumMinutes);
      lastMinutes = minutes;
    }
    if (seconds !== lastSeconds) {
      elNumSeconds.textContent = pad(seconds);
      animateCardTick(elNumSeconds);
      lastSeconds = seconds;
    }
    elNumMs.textContent = pad(ms, 3);

    // Campaign Progress
    const campaignStart = new Date(CAMPAIGN_START_UTC).getTime();
    const totalDuration = target - campaignStart;
    const elapsed = now - campaignStart;
    if (totalDuration > 0) {
      const pct = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
      elProgressFill.style.width = pct.toFixed(1) + '%';
      elProgressPercent.textContent = pct.toFixed(1) + '%';
    }
  }

  function animateCardTick(elem) {
    elem.classList.remove('tick');
    void elem.offsetWidth;
    elem.classList.add('tick');
  }

  // ==========================================================================
  // 3. FACTION & THEME SYSTEM (Silent, Deep Atmospheric Switch)
  // ==========================================================================
  function applyTheme(themeName) {
    document.body.classList.remove('theme-titans', 'theme-alliance', 'theme-horde');
    document.body.classList.add('theme-' + themeName);
    currentTheme = themeName;
    localStorage.setItem('wow_theme', themeName);

    // Update active button state
    factionButtons.forEach(btn => {
      if (btn.dataset.theme === themeName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update mottos, taglines, and realm status
    const data = FACTION_DATA[themeName] || FACTION_DATA.titans;
    if (elHeroBannerText) elHeroBannerText.textContent = data.banner;
    if (elHeroTaglineText) elHeroTaglineText.textContent = data.tagline;
    if (elRealmStatus) elRealmStatus.textContent = data.status;

    updateParticleColors();
  }

  // ==========================================================================
  // 4. CANVAS PARTICLE SYSTEM (Adapted to Active Faction)
  // ==========================================================================
  let particles = [];
  let fireworks = [];
  const MAX_PARTICLES = 80;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function getThemeColors() {
    if (currentTheme === 'alliance') {
      return ['#3b82f6', '#60a5fa', '#93c5fd', '#fbbf24', '#ffffff'];
    } else if (currentTheme === 'horde') {
      return ['#b91c1c', '#dc2626', '#f59e0b', '#d97706', '#78350f'];
    }
    // Titans (Default)
    return ['#d4af37', '#f3cf65', '#00e5ff', '#67e8f9', '#ffffff'];
  }

  let themeColors = getThemeColors();

  function updateParticleColors() {
    themeColors = getThemeColors();
    particles.forEach(p => {
      p.color = themeColors[Math.floor(Math.random() * themeColors.length)];
      if (currentTheme === 'horde') {
        p.speedY = -(Math.random() * 1.8 + 0.8);
      } else {
        p.speedY = -(Math.random() * 1.2 + 0.5);
      }
    });
  }

  class EmberParticle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * canvas.width;
      this.y = initial ? Math.random() * canvas.height : canvas.height + 15;
      this.size = Math.random() * 2.8 + 1.2;
      this.speedY = currentTheme === 'horde' ? -(Math.random() * 1.8 + 0.8) : -(Math.random() * 1.2 + 0.6);
      this.speedX = (Math.random() - 0.5) * 0.9;
      this.opacity = Math.random() * 0.75 + 0.25;
      this.fadeSpeed = Math.random() * 0.003 + 0.001;
      this.color = themeColors[Math.floor(Math.random() * themeColors.length)];
      this.wobble = Math.random() * Math.PI * 2;
      this.wobbleSpeed = Math.random() * 0.03 + 0.01;
    }

    update() {
      this.y += this.speedY;
      this.wobble += this.wobbleSpeed;
      this.x += this.speedX + Math.sin(this.wobble) * 0.5;
      this.opacity -= this.fadeSpeed;

      if (this.y < -20 || this.opacity <= 0) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.opacity);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = this.size * 3;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class FireworkParticle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.color = color;
      this.alpha = 1;
      this.decay = Math.random() * 0.02 + 0.012;
      this.gravity = 0.12;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.alpha -= this.decay;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function triggerCelebrationFireworks() {
    for (let b = 0; b < 6; b++) {
      setTimeout(() => {
        const x = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
        const y = Math.random() * canvas.height * 0.4 + canvas.height * 0.15;
        const colors = ['#f59e0b', '#00e5ff', '#10b981', '#fbbf24', '#ffffff'];
        for (let i = 0; i < 60; i++) {
          fireworks.push(new FireworkParticle(x, y, colors[Math.floor(Math.random() * colors.length)]));
        }
      }, b * 350);
    }
  }

  for (let i = 0; i < MAX_PARTICLES; i++) {
    particles.push(new EmberParticle());
  }

  function renderParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }

    for (let i = fireworks.length - 1; i >= 0; i--) {
      fireworks[i].update();
      fireworks[i].draw();
      if (fireworks[i].alpha <= 0) {
        fireworks.splice(i, 1);
      }
    }

    requestAnimationFrame(renderParticles);
  }
  requestAnimationFrame(renderParticles);

  // ==========================================================================
  // 5. EVENT LISTENERS & INITIALIZATION (Completely Silent Buttons)
  // ==========================================================================
  elBtnTogglePlay.addEventListener('click', toggleMusic);
  elBtnToggleMute.addEventListener('click', toggleMute);
  elVolumeSlider.addEventListener('input', (e) => {
    setVolume(e.target.value);
  });

  factionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
    });
  });

  // Init Theme & Displays
  applyTheme(currentTheme);
  updateLocalTimeDisplay();
  setVolume(DEFAULT_VOLUME);

  // High-frequency countdown loop (every 30ms for smooth millisecond display)
  setInterval(updateCountdown, 30);
  updateCountdown();

})();
