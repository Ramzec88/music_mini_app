// Initialize Lottie animation with fallback
let envelope;
try {
  envelope = lottie.loadAnimation({
    container: document.getElementById('envelope'),
    renderer: 'svg',
    loop: false,
    autoplay: false,
    path: 'assets/envelope_open.json'
  });
} catch (error) {
  console.log('Lottie failed to load, using fallback');
  document.getElementById('envelope').innerHTML = `
    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 120px; background: linear-gradient(135deg, #fdd39e, #fbb47a); border-radius: 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); transition: all 0.3s ease;">
      💌
    </div>
  `;
}

// Window load effect
window.addEventListener('load', () => {
  document.getElementById('envelope').style.transform = 'scale(0.95)';
  setTimeout(() => {
    document.getElementById('envelope').style.transform = 'scale(1)';
  }, 400);
});

// State variables
let isOpen = false;
let isPlaying = false;
const songCard = document.getElementById('song-card');
const audio = document.getElementById('audio');
const playBtn = document.getElementById('play-btn');
const openBtn = document.getElementById('open-btn');
const closeBtn = document.getElementById('close-btn');
const waveAnimation = document.getElementById('wave-animation');

// Theme switching functionality
const themeToggle = document.getElementById('theme-toggle');
const themeSwitcher = document.getElementById('theme-switcher');
const applyThemeBtn = document.getElementById('apply-theme');
const peachOption = document.querySelector('[data-theme="peach"]');
const cosmicOption = document.querySelector('[data-theme="cosmic"]');
const peachPreview = document.querySelector('.peach-preview');
const cosmicPreview = document.querySelector('.cosmic-preview');

// Initialize theme state
let currentTheme = 'peach';

function updateThemeUI() {
  if (currentTheme === 'peach') {
    peachOption.classList.add('active');
    cosmicOption.classList.remove('active');
    peachPreview.classList.add('active');
    cosmicPreview.classList.remove('active');
    themeToggle.checked = false;
  } else {
    cosmicOption.classList.add('active');
    peachOption.classList.remove('active');
    cosmicPreview.classList.add('active');
    peachPreview.classList.remove('active');
    themeToggle.checked = true;
  }
}

function applyTheme(theme) {
  if (theme === 'cosmic') {
    document.body.classList.add('cosmic-theme');
  } else {
    document.body.classList.remove('cosmic-theme');
  }
  currentTheme = theme;
  updateThemeUI();
  updateConfettiColors();
}

function updateConfettiColors() {
  if (currentTheme === 'cosmic') {
    window.confettiColors = ['#667eea', '#764ba2', '#f093fb', '#ffffff', '#e0c3fc'];
  } else {
    window.confettiColors = ['#fdd39e', '#fbb47a', '#f46b8a', '#e64d6e', '#ffffff'];
  }
}

// Theme toggle event listener
themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked ? 'cosmic' : 'peach');
});

// Theme preview click handlers
peachPreview.addEventListener('click', () => {
  applyTheme('peach');
});

cosmicPreview.addEventListener('click', () => {
  applyTheme('cosmic');
});

// Apply and hide theme switcher
applyThemeBtn.addEventListener('click', () => {
  themeSwitcher.classList.add('hidden');
  localStorage.setItem('gift-theme', currentTheme);
  
  const originalText = applyThemeBtn.textContent;
  applyThemeBtn.textContent = '✨ Тема сохранена!';
  setTimeout(() => {
    applyThemeBtn.textContent = originalText;
  }, 2000);
});

// Show theme switcher on double click (only if not locked)
document.addEventListener('dblclick', (e) => {
  if (e.ctrlKey || e.metaKey) {
    const isThemeLocked = localStorage.getItem('theme-locked') === 'true';
    if (!isThemeLocked) {
      themeSwitcher.classList.remove('hidden');
    } else {
      console.log('Theme is locked - cannot change theme');
    }
  }
});

// Initialize theme from URL parameter or localStorage
function initializeTheme() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlTheme = urlParams.get('theme');
  const savedTheme = localStorage.getItem('gift-theme');
  const isThemeLocked = urlParams.get('locked') === 'true' || localStorage.getItem('theme-locked') === 'true';
  
  // Priority: URL > localStorage > default
  const initialTheme = urlTheme || savedTheme || 'peach';
  applyTheme(initialTheme);
  
  // If theme is locked, hide the theme switcher immediately
  if (isThemeLocked) {
    themeSwitcher.classList.add('hidden');
    localStorage.setItem('theme-locked', 'true');
    console.log('Theme locked:', initialTheme);
  } else {
    // Auto-hide theme switcher after 10 seconds if no interaction
    setTimeout(() => {
      if (!themeSwitcher.classList.contains('hidden')) {
        themeSwitcher.style.opacity = '0.7';
      }
    }, 10000);
  }
}

// Create enhanced floating particles
function createParticles() {
  const particles = document.getElementById('particles');
  for (let i = 0; i < 60; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 8 + 's';
    particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
    particles.appendChild(particle);
  }
}

// Enhanced confetti celebration
function celebrationEffect() {
  const duration = 1800; // Сократили до 1.8 секунд (чуть больше задержки окна)
  const animationEnd = Date.now() + duration;
  const colors = window.confettiColors || ['#fdd39e', '#fbb47a', '#f46b8a', '#e64d6e', '#ffffff'];
  
  // Более интенсивные настройки для фейерверка
  const defaults = { 
    startVelocity: 45,
    spread: 360, 
    ticks: 100, // Немного сократили время жизни частиц
    zIndex: 999,
    colors: colors,
    gravity: 1.0, // Чуть быстрее падение
    scalar: 1.2
  };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Первый мощный залп
  function initialBurst() {
    const count = 120; // Немного уменьшили
    confetti(Object.assign({}, defaults, {
      particleCount: count,
      spread: 100,
      origin: { x: 0.5, y: 0.6 }
    }));
  }

  // Непрерывный фейерверк
  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 60 * (timeLeft / duration); // Уменьшили интенсивность

    // Боковые залпы
    confetti(Object.assign({}, defaults, {
      particleCount: particleCount,
      spread: 80,
      origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.5, 0.7) }
    }));
    confetti(Object.assign({}, defaults, {
      particleCount: particleCount,
      spread: 80,
      origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.5, 0.7) }
    }));
    
    // Центральные взрывы (только в первую половину)
    if (timeLeft > duration * 0.5) {
      confetti(Object.assign({}, defaults, {
        particleCount: particleCount * 1.5,
        spread: 120,
        origin: { x: randomInRange(0.4, 0.6), y: randomInRange(0.4, 0.6) }
      }));
    }
  }, 300); // Реже запускаем залпы

  // Запускаем только 2 мощных залпа вместо 3
  initialBurst();
  setTimeout(() => initialBurst(), 600);
}

// Open envelope with enhanced animation
openBtn.addEventListener('click', () => {
  if (!isOpen) {
    openBtn.classList.add('loading');
    openBtn.textContent = '✨ Загружается...';
    openBtn.disabled = true;

    if (envelope && envelope.totalFrames) {
      envelope.play();
      envelope.addEventListener('complete', showSongCard, { once: true });
    } else {
      const envelopeEl = document.getElementById('envelope');
      envelopeEl.style.transform = 'rotateY(180deg) scale(1.1)';
      setTimeout(showSongCard, 800);
    }
  } else {
    // Close envelope
    closeSongCard();
  }
});

function showSongCard() {
  isOpen = true;
  
  // Сначала запускаем мощный фейерверк
  celebrationEffect();
  
  // Показываем модальное окно с задержкой, чтобы фейерверк был заметен
  setTimeout(() => {
    songCard.classList.remove('hidden');
    setTimeout(() => songCard.classList.add('show'), 50);
  }, 1500); // Задержка 1.5 секунды для наслаждения фейерверком
  
  // Сбрасываем кнопку еще позже
  setTimeout(() => {
    openBtn.classList.remove('loading');
    openBtn.textContent = '🔒 Закрыть подарок';
    openBtn.disabled = false;
  }, 2000);
}

function closeSongCard() {
  console.log('Closing song card...'); // Для отладки
  songCard.classList.remove('show');
  setTimeout(() => {
    songCard.classList.add('hidden');
    isOpen = false;
    openBtn.textContent = '🎵 Открыть подарок';
    
    document.getElementById('envelope').style.transform = 'rotateY(0deg) scale(1)';
    
    if (isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      isPlaying = false;
      playBtn.textContent = '▶️';
      waveAnimation.classList.remove('playing');
    }
  }, 500);
}

// Закрытие модалки при клике вне её содержимого
songCard.addEventListener('click', (e) => {
  if (e.target === songCard) {
    closeSongCard();
  }
});

// Enhanced play/pause functionality
playBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play().then(() => {
      isPlaying = true;
      playBtn.textContent = '⏸️';
      waveAnimation.classList.add('playing');
    }).catch(error => {
      console.log('Audio play failed:', error);
      playBtn.textContent = '❌';
      setTimeout(() => {
        playBtn.textContent = '▶️';
      }, 2000);
    });
  } else {
    audio.pause();
    isPlaying = false;
    playBtn.textContent = '▶️';
    waveAnimation.classList.remove('playing');
  }
});

// Audio event handlers
audio.addEventListener('ended', () => {
  isPlaying = false;
  playBtn.textContent = '🔁';
  waveAnimation.classList.remove('playing');
});

// Share functionality using existing modal in HTML
const shareModal = document.getElementById('share-modal');
const shareOptionsContainer = document.getElementById('share-options');
const shareModalCloseBtn = document.getElementById('share-modal-close-btn');
const shareBtn = document.getElementById('share-btn');

shareBtn.addEventListener('click', async () => {
  const shareUrl = generateShareUrl();
  const shareData = {
    title: '🎁 Персональный музыкальный подарок!',
    text: 'Посмотри, какой невероятный персональный подарок я получил! Это моя собственная песня! 🎵✨',
    url: shareUrl
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      
      // Lock theme after successful share
      localStorage.setItem('theme-locked', 'true');
      themeSwitcher.classList.add('hidden');
      
      const originalText = shareBtn.innerHTML;
      shareBtn.innerHTML = '<span>✅</span><span>Поделился!</span>';
      setTimeout(() => {
        shareBtn.innerHTML = originalText;
      }, 2000);
    } catch (err) {
      if (err.name !== 'AbortError') {
        showFallbackShareModal();
      }
    }
  } else {
    showFallbackShareModal();
  }
});

function generateShareUrl() {
  const baseUrl = window.location.origin + window.location.pathname;
  const theme = currentTheme;
  const locked = 'true'; // Always lock theme when sharing
  
  return `${baseUrl}?theme=${theme}&locked=${locked}`;
}

function showFallbackShareModal() {
  const shareUrl = generateShareUrl();
  const text = 'Посмотри, какой невероятный персональный музыкальный подарок я получил! Это моя собственная песня! 🎵✨';

  const shareOptions = [
    { name: '📱 WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(text)}%20${encodeURIComponent(shareUrl)}` },
    { name: '✈️ Telegram', url: `https://telegram.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}` },
    { name: '🔵 VKontakte', url: `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(text)}` },
    { name: '📋 Скопировать ссылку', action: 'copy', url: '#' }
  ];

  shareOptionsContainer.innerHTML = shareOptions.map(option => `
    <a href="${option.url}" 
       class="share-modal-btn" 
       data-action="${option.action || 'link'}"
       data-share-url="${shareUrl}">
      ${option.name}
    </a>
  `).join('');

  shareModal.classList.remove('hidden');
}

// Handle copy action
shareOptionsContainer.addEventListener('click', (e) => {
  const btn = e.target.closest('.share-modal-btn');
  if (btn && btn.dataset.action === 'copy') {
    e.preventDefault();
    const shareUrl = btn.dataset.shareUrl || generateShareUrl();
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      // Lock theme after copying share URL
      localStorage.setItem('theme-locked', 'true');
      themeSwitcher.classList.add('hidden');
      
      const originalText = btn.innerHTML;
      btn.innerHTML = '✅ Скопировано!';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2500);
    });
  } else if (btn && btn.dataset.action === 'link') {
    // Lock theme when sharing via social networks
    localStorage.setItem('theme-locked', 'true');
    themeSwitcher.classList.add('hidden');
  }
});

shareModalCloseBtn.addEventListener('click', () => {
  shareModal.classList.add('hidden');
});

// Enhanced download functionality
document.getElementById('download-link').addEventListener('click', (e) => {
  e.preventDefault();
  
  const a = document.createElement('a');
  a.href = 'assets/song.mp3';
  a.download = 'my_personalized_birthday_song.mp3';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  const btn = e.target.closest('.download-btn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span>✅</span><span>Загружено!</span>';
  setTimeout(() => {
    btn.innerHTML = originalText;
  }, 3000);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && isOpen) {
    e.preventDefault();
    playBtn.click();
  }
  if (e.code === 'Escape' && isOpen) {
    closeSongCard();
  }
  if (e.code === 'Enter' && !isOpen) {
    openBtn.click();
  }
});

// Click envelope to open
document.getElementById('envelope').addEventListener('click', () => {
  if (!isOpen) {
    openBtn.click();
  }
});

// Initialize everything
createParticles();
initializeTheme();
