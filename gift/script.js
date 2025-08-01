const tg = window.Telegram.WebApp;
tg.expand();

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('id');

// Загружаем данные подарка
fetch(`https://yourapi.com/song?id=${userId}`)
  .then(res => res.json())
  .then(data => {
    document.getElementById('username').textContent = data.username;
    document.getElementById('message').textContent = data.message;
    document.getElementById('audio').src = data.songUrl;
    document.getElementById('download-btn').onclick = () => window.open(data.songUrl);
  });

// Загружаем конверт (idle)

let envelope = lottie.loadAnimation({
  container: document.getElementById('envelope'),
  renderer: 'svg',
  loop: false,
  autoplay: false,
  path: 'assets/envelope_open.json'
});

// При клике проигрываем анимацию открытия
document.getElementById('open-btn').addEventListener('click', () => {
  envelope.goToAndPlay(0);
});

// Кнопка открытия
document.getElementById('open-btn').addEventListener('click', () => {
  const glow = document.getElementById('glow');

  // Усиливаем сияние
  glow.classList.add('active');

  // Задержка перед открытием
  setTimeout(() => {
    envelope.destroy();
    envelope = lottie.loadAnimation({
      container: document.getElementById('envelope'),
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: 'assets/envelope_open.json'
    });

    envelope.addEventListener('complete', () => {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });

      const player = document.getElementById('player');
      player.classList.remove('hidden');
      setTimeout(() => player.classList.add('show'), 50);

      document.getElementById('open-btn').style.display = 'none';
    });
  }, 500);
});
