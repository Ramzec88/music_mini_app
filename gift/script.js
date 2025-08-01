let envelope = lottie.loadAnimation({
  container: document.getElementById('envelope'),
  renderer: 'svg',
  loop: false,
  autoplay: false,
  path: 'assets/envelope_open.json'
});

let isOpen = false;
const songCard = document.getElementById('song-card');
const audio = document.getElementById('audio');
const playBtn = document.getElementById('play-btn');

document.getElementById('open-btn').addEventListener('click', () => {
  const totalFrames = envelope.totalFrames;

  if (!isOpen) {
    // Открытие
    envelope.playSegments([0, totalFrames], true);
    envelope.addEventListener('complete', () => {
      isOpen = true;
      songCard.classList.remove('hidden');
      setTimeout(() => songCard.classList.add('show'), 50);

      // Конфетти
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }, { once: true });

  } else {
    // Закрытие до кадра 177
    envelope.playSegments([totalFrames, 177], true);

    const stopOn177 = () => {
      if (envelope.currentFrame <= 177) {
        envelope.goToAndStop(177, true);
        isOpen = false;
        songCard.classList.remove('show');
        setTimeout(() => songCard.classList.add('hidden'), 400);
        envelope.removeEventListener('enterFrame', stopOn177);
      }
    };
    envelope.addEventListener('enterFrame', stopOn177);
  }
});

// Кнопка Play
playBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = '⏸ Пауза';
  } else {
    audio.pause();
    playBtn.textContent = '▶️ Слушать песню';
  }
});
