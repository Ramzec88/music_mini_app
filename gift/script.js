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

// Show theme switcher on double click (for testing)
document.addEventListener('dblclick', (e) => {
  if (e.ctrlKey || e.metaKey) {
    themeSwitcher.classList.remove('hidden');
  }
});

// Initialize theme from URL parameter or localStorage
function initializeTheme() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlTheme = urlParams.get('theme');
  const savedTheme = localStorage.getItem('gift-theme');
  
  const initialTheme = urlTheme || savedTheme || 'peach';
  applyTheme(initialTheme);
  
  setTimeout(() => {
    if (!themeSwitcher.classList.contains('hidden')) {
      themeSwitcher.style.opacity = '0.7';
    }
  }, 10000);
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
  const duration = 4000;
  const animationEnd = Date.now() + duration;
  const colors = window.confettiColors || ['#fdd39e', '#fbb47a', '#f46b8a', '#e64d6e', '#ffffff'];
  const defaults = { 
    startVelocity: 35, 
    spread: 360, 
    ticks: 80, 
    zIndex: 0,
    colors: colors
  };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 60 * (timeLeft / duration);

    confetti(Object.assign({}, defaults, {
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    }));
    confetti(Object.assign({}, defaults, {
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    }));
    
    if (timeLeft > duration * 0.8) {
      confetti(Object.assign({}, defaults, {
        particleCount: particleCount * 1.5,
        origin: { x: 0.5, y: 0.5 }
      }));
    }
  }, 250);
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
  songCard.classList.remove('hidden');
  setTimeout(() => songCard.classList.add('show'), 100);
  celebrationEffect();
  
  setTimeout(() => {
    openBtn.classList.remove('loading');
    openBtn.textContent = '🔒 Закрыть подарок';
    openBtn.disabled = false;
  }, 1500);
}

// Close song card with cleanup
closeBtn.addEventListener('click', closeSongCard);

function closeSongCard() {
  songCard.classList.remove('show');
  setTimeout(() => {
    songCard.classList.add('hidden');
    isOpen = false;
    openBtn.textContent = '🎵 Открыть подарок';
    
    if (envelope && envelope.totalFrames) {
      envelope.goToAndStop(0, true);
    } else {
      document.getElementById('envelope').style.transform = 'rotateY(0deg) scale(1)';
    }
    
    if (isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      isPlaying = false;
      playBtn.textContent = '▶️ Слушать мою песню';
      waveAnimation.classList.remove('playing');
    }
  }, 500);
}

// Enhanced play/pause functionality
playBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play().then(() => {
      isPlaying = true;
      playBtn.textContent = '⏸️ Поставить на паузу';
      waveAnimation.classList.add('playing');
    }).catch(error => {
      console.log('Audio play failed:', error);
      playBtn.textContent = '❌ Ошибка воспроизведения';
      setTimeout(() => {
        playBtn.textContent = '▶️ Попробовать снова';
      }, 2000);
    });
  } else {
    audio.pause();
    isPlaying = false;
    playBtn.textContent = '▶️ Продолжить слушать';
    waveAnimation.classList.remove('playing');
  }
});

// Audio event handlers
audio.addEventListener('ended', () => {
  isPlaying = false;
  playBtn.textContent = '🔁 Слушать ещё раз';
  waveAnimation.classList.remove('playing');
});

// Share functionality using existing modal in HTML
const shareModal = document.getElementById('share-modal');
const shareOptionsContainer = document.getElementById('share-options');
const shareModalCloseBtn = document.getElementById('share-modal-close-btn');
const shareBtn = document.getElementById('share-btn');

shareBtn.addEventListener('click', async () => {
  const shareData = {
    title: '🎁 Персональный музыкальный подарок!',
    text: 'Посмотри, какой невероятный персональный подарок я получил! Это моя собственная песня! 🎵✨',
    url: window.location.href
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
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

function showFallbackShareModal() {
  const url = window.location.href;
  const text = 'Посмотри, какой невероятный персональный музыкальный подарок я получил! Это моя собственная песня! 🎵✨';

  const shareOptions = [
    { name: '📱 WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(text)}%20${encodeURIComponent(url)}` },
    { name: '✈️ Telegram', url: `https://telegram.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
    { name: '🔵 VKontakte', url: `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}` },
    { name: '📋 Скопировать ссылку', action: 'copy', url: '#' }
  ];

  shareOptionsContainer.innerHTML = shareOptions.map(option => `
    <a href="${option.url}" 
       class="share-modal-btn" 
       data-action="${option.action || 'link'}">
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
    navigator.clipboard.writeText(window.location.href).then(() => {
      const originalText = btn.innerHTML;
      btn.innerHTML = '✅ Скопировано!';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2500);
    });
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
