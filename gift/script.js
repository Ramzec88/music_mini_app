// Обновленный script.js с исправленной генерацией URL
// Конфигурация бэкенда
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbyeucdkcWx77xVXOOZ3qdNjNPerPISwMeBNlvlZif2aRJmseUS4orglZxDJmVqOlJf-Yw/exec';
const DEFAULT_SONG_URL = 'assets/song.mp3'; // Fallback для локального файла

// Базовый URL для формирования ссылок
const BASE_APP_URL = 'https://music-mini-app-omega.vercel.app/gift/';

// Глобальные переменные для данных подарка
let giftData = {
  recipientName: 'Алексей',
  occasion: 'День рождения',
  personalMessage: 'Алексей, пусть этот особенный день принесет тебе море радости и пусть каждый день будет наполнен музыкой и смехом! 🎈✨',
  songUrl: DEFAULT_SONG_URL,
  found: false
};

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

// Функция загрузки данных подарка
async function loadGiftData() {
  const urlParams = new URLSearchParams(window.location.search);
  const giftCode = urlParams.get('code');
  
  if (!giftCode) {
    console.log('No gift code found, using default data');
    updateUIWithGiftData();
    return;
  }

  try {
    console.log('Loading gift data for code:', giftCode);
    
    // Показываем индикатор загрузки
    showLoadingState();
    
    const response = await fetch(`${BACKEND_URL}?action=getGift&code=${giftCode}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (data.found) {
      giftData = {
        ...data,
        found: true
      };
      
      // Увеличиваем счетчик просмотров
      incrementViewCount(giftCode);
      
      console.log('Gift data loaded successfully:', giftData);
    } else {
      console.log('Gift not found, using default data');
      showGiftNotFoundError();
    }
    
  } catch (error) {
    console.error('Error loading gift data:', error);
    showErrorState(error.message);
  } finally {
    updateUIWithGiftData();
    hideLoadingState();
  }
}

// Увеличение счетчика просмотров
async function incrementViewCount(giftCode) {
  try {
    await fetch(`${BACKEND_URL}?action=incrementViews&code=${giftCode}`);
  } catch (error) {
    console.error('Error incrementing view count:', error);
  }
}

// Обновление UI с данными подарка
function updateUIWithGiftData() {
  // Обновляем заголовок
  const titleElement = document.querySelector('#song-card h2');
  if (titleElement && giftData.recipientName) {
    const occasionEmoji = getOccasionEmoji(giftData.occasion);
    titleElement.textContent = `${occasionEmoji} ${getOccasionTitle(giftData.occasion)}, ${giftData.recipientName}!`;
  }
  
  // Обновляем описание
  const descriptionElement = document.querySelector('#song-card p');
  if (descriptionElement) {
    descriptionElement.textContent = getOccasionDescription(giftData.occasion);
  }
  
  // Обновляем персональное сообщение
  const messageElement = document.querySelector('.greeting-text');
  if (messageElement && giftData.personalMessage) {
    messageElement.textContent = giftData.personalMessage;
  }
  
  // Обновляем аудио источник
  const audioElement = document.getElementById('audio');
  const downloadLink = document.getElementById('download-link');
  
  if (audioElement && giftData.songUrl && giftData.songUrl !== DEFAULT_SONG_URL) {
    audioElement.src = giftData.songUrl;
    
    if (downloadLink) {
      downloadLink.href = giftData.songUrl;
      downloadLink.download = `${giftData.recipientName || 'персональная'}_песня.mp3`;
    }
  }
}

// Получение эмодзи для повода (включая кастомные)
function getOccasionEmoji(occasion) {
  const emojis = {
    'День рождения': '🎉',
    'Новый год': '🎄',
    'Годовщина': '💝',
    '8 марта': '🌹',
    'День Святого Валентина': '💕',
    'Просто так': '✨',
    'Свадьба': '💒',
    'Выпускной': '🎓'
  };
  // Для неизвестных поводов используем универсальный эмодзи
  return emojis[occasion] || '🎊';
}

// Получение заголовка для повода (включая кастомные)
function getOccasionTitle(occasion) {
  const titles = {
    'День рождения': 'С Днём Рождения',
    'Новый год': 'С Новым Годом',
    'Годовщина': 'С Годовщиной',
    '8 марта': 'С 8 Марта',
    'День Святого Валентина': 'С Днём Святого Валентина',
    'Просто так': 'Специально для тебя',
    'Свадьба': 'С Днём Свадьбы',
    'Выпускной': 'С Выпускным'
  };
  // Для кастомных поводов создаем заголовок динамически
  return titles[occasion] || `Поздравляю с ${occasion}`;
}

// Получение описания для повода (включая кастомные)
function getOccasionDescription(occasion) {
  const descriptions = {
    'День рождения': 'Эта песня создана специально для твоего дня рождения! Насладись уникальной композицией 🎶',
    'Новый год': 'Встречай Новый год с персональной песней! Пусть она принесёт удачу 🎶',
    'Годовщина': 'В честь вашего особенного дня создана эта уникальная композиция 🎶',
    '8 марта': 'Поздравление в формате персональной песни специально для тебя 🎶',
    'День Святого Валентина': 'Музыкальное признание в любви создано специально для тебя 🎶',
    'Просто так': 'Эта песня создана специально для тебя просто так, чтобы подарить улыбку 🎶',
    'Свадьба': 'Музыкальное поздравление с самым важным днём в жизни 🎶',
    'Выпускной': 'Персональная песня в честь твоего выпускного! 🎶'
  };
  // Для кастомных поводов используем универсальное описание
  return descriptions[occasion] || `Эта песня создана специально для тебя! Насладись уникальной композицией 🎶`;
}

// Состояния загрузки и ошибок
function showLoadingState() {
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-state';
    loadingDiv.innerHTML = `
      <div style="text-align: center; padding: 10px;">
        <div style="font-size: 48px; margin-bottom: 10px;">🎵</div>
        <h3 style="color: var(--text-color); margin-bottom: 7px;">Загружаем твой подарок...</h3>
        <p style="color: var(--text-secondary-color);">Подождите немного</p>
      </div>
    `;
    mainContent.appendChild(loadingDiv);
  }
}

function hideLoadingState() {
  const loadingState = document.getElementById('loading-state');
  if (loadingState) {
    loadingState.remove();
  }
}

function showErrorState(errorMessage) {
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-state';
    errorDiv.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-color);">
        <div style="font-size: 48px; margin-bottom: 20px;">😔</div>
        <h3 style="margin-bottom: 10px;">Не удалось загрузить подарок</h3>
        <p style="color: var(--text-secondary-color); margin-bottom: 20px;">${errorMessage}</p>
        <button onclick="location.reload()" style="background: var(--btn-gradient); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer;">
          Попробовать снова
        </button>
      </div>
    `;
    mainContent.appendChild(errorDiv);
  }
}

function showGiftNotFoundError() {
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-state';
    errorDiv.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-color);">
        <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
        <h3 style="margin-bottom: 10px;">Подарок не найден</h3>
        <p style="color: var(--text-secondary-color); margin-bottom: 20px;">
          Возможно, ссылка устарела или содержит ошибку
        </p>
        <button onclick="showDefaultGift()" style="background: var(--btn-gradient); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer;">
          Посмотреть демо
        </button>
      </div>
    `;
    mainContent.appendChild(errorDiv);
  }
}

function showDefaultGift() {
  const errorState = document.getElementById('error-state');
  if (errorState) {
    errorState.remove();
  }
}

// Window load effect
window.addEventListener('load', () => {
  document.getElementById('envelope').style.transform = 'scale(0.95)';
  setTimeout(() => {
    document.getElementById('envelope').style.transform = 'scale(1)';
  }, 400);
  
  // Загружаем данные подарка
  loadGiftData();
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
  const duration = 1800;
  const animationEnd = Date.now() + duration;
  const colors = window.confettiColors || ['#fdd39e', '#fbb47a', '#f46b8a', '#e64d6e', '#ffffff'];
  
  const defaults = { 
    startVelocity: 45,
    spread: 360, 
    ticks: 100,
    zIndex: 999,
    colors: colors,
    gravity: 1.0,
    scalar: 1.2
  };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function initialBurst() {
    const count = 120;
    confetti(Object.assign({}, defaults, {
      particleCount: count,
      spread: 100,
      origin: { x: 0.5, y: 0.6 }
    }));
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 60 * (timeLeft / duration);

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
    
    if (timeLeft > duration * 0.5) {
      confetti(Object.assign({}, defaults, {
        particleCount: particleCount * 1.5,
        spread: 120,
        origin: { x: randomInRange(0.4, 0.6), y: randomInRange(0.4, 0.6) }
      }));
    }
  }, 300);

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
    closeSongCard();
  }
});

function showSongCard() {
  isOpen = true;
  
  celebrationEffect();
  
  setTimeout(() => {
    songCard.classList.remove('hidden');
    setTimeout(() => songCard.classList.add('show'), 50);
  }, 1500);
  
  setTimeout(() => {
    openBtn.classList.remove('loading');
    openBtn.textContent = '🔒 Закрыть подарок';
    openBtn.disabled = false;
  }, 2000);
}

function closeSongCard() {
  console.log('Closing song card...');
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
    text: `Посмотри, какой невероятный персональный подарок у меня! Это моя собственная песня! 🎵✨`,
    url: shareUrl
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      
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

// ИСПРАВЛЕННАЯ функция генерации URL для шаринга
function generateShareUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const giftCode = urlParams.get('code');
  
  // Формируем корректный URL на основе BASE_APP_URL
  let shareUrl;
  
  if (giftCode) {
    // Если есть gift code, формируем полную ссылку с параметрами
    shareUrl = `${BASE_APP_URL}?code=${giftCode}&theme=${currentTheme}&locked=true`;
  } else {
    // Если нет gift code, используем только тему
    shareUrl = `${BASE_APP_URL}?theme=${currentTheme}&locked=true`;
  }
  
  console.log('Generated share URL:', shareUrl);
  return shareUrl;
}

function showFallbackShareModal() {
  const shareUrl = generateShareUrl();
  const text = `Посмотри, какой невероятный персональный ${giftData.occasion.toLowerCase()} подарок я получил! Это моя собственная песня! 🎵✨`;

  const shareOptions = [
    { name: '📱 WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(text)}%20${encodeURIComponent(shareUrl)}` },
    { name: '✈️ Telegram', url: `https://telegram.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}` },
    { name: '🔵 VKontakte', url: `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(text)}` },
    { name: '📋 Скопировать ссылку', action: 'copy', url: '#' }
  ];

  // Создаем модальное окно если его нет
  if (!shareModal) {
    createShareModal();
  }

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

function createShareModal() {
  const modal = document.createElement('div');
  modal.id = 'share-modal';
  modal.className = 'share-modal hidden';
  modal.innerHTML = `
    <div class="share-modal-content">
      <h3 class="share-modal-title">Поделиться подарком</h3>
      <div id="share-options"></div>
      <button class="share-modal-close-btn" id="share-modal-close-btn">Закрыть</button>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Добавляем обработчики
  modal.querySelector('#share-modal-close-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

// Handle copy action
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.share-modal-btn');
  if (btn && btn.dataset.action === 'copy') {
    e.preventDefault();
    const shareUrl = btn.dataset.shareUrl || generateShareUrl();
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      localStorage.setItem('theme-locked', 'true');
      themeSwitcher.classList.add('hidden');
      
      const originalText = btn.innerHTML;
      btn.innerHTML = '✅ Скопировано!';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2500);
    });
  } else if (btn && btn.dataset.action === 'link') {
    localStorage.setItem('theme-locked', 'true');
    themeSwitcher.classList.add('hidden');
  }
});

if (shareModalCloseBtn) {
  shareModalCloseBtn.addEventListener('click', () => {
    shareModal.classList.add('hidden');
  });
}

// Enhanced download functionality
document.getElementById('download-link').addEventListener('click', (e) => {
  e.preventDefault();
  
  const downloadUrl = giftData.songUrl || DEFAULT_SONG_URL;
  const fileName = `${giftData.recipientName || 'персональная'}_песня_${giftData.occasion.replace(/\s+/g, '_')}.mp3`;
  
  // Если это внешняя ссылка (S3), открываем в новой вкладке
  if (downloadUrl.startsWith('http') && !downloadUrl.includes(window.location.hostname)) {
    window.open(downloadUrl, '_blank');
  } else {
    // Локальный файл - обычная загрузка
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  
  const btn = e.target.closest('.download-btn');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '✅';
  setTimeout(() => {
    btn.innerHTML = originalHTML;
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
