const gameArea = document.getElementById('game-area');
const startButton = document.getElementById('start-button');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const messageDisplay = document.getElementById('message');
const difficultySelector = document.getElementById('difficulty');
const bestScoreDisplay = document.getElementById('best-score');

let score = 0;
let timeLeft = 10;
let timer;
let gameActive = false;

// Параметры сложности
const difficultySettings = {
    easy: {
        time: 15,
        minCircles: 5,
        maxCircles: 7,
        colors: ['red', 'blue', 'green'],
        fieldWidth: '60%',
        maxGreenCircles: 3
    },
    medium: {
        time: 10,
        minCircles: 7,
        maxCircles: 10,
        colors: ['red', 'blue', 'green', 'yellow', 'purple'],
        fieldWidth: '80%',
        maxGreenCircles: 2
    },
    hard: {
        time: 5,
        minCircles: 10,
        maxCircles: 15,
        colors: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink'],
        fieldWidth: '100%',
        maxGreenCircles: 1
    }
};

// Функция для создания кругов
function createCircles() {
    const difficulty = difficultySelector.value;
    const settings = difficultySettings[difficulty];
    const numberOfCircles = Math.floor(Math.random() * (settings.maxCircles - settings.minCircles + 1)) + settings.minCircles;
    const maxGreenCircles = Math.min(settings.maxGreenCircles, numberOfCircles);
    let greenCirclesCreated = 0;
    const circles = [];

    for (let i = 0; i < numberOfCircles; i++) {
        const circle = document.createElement('div');
        circle.classList.add('circle');

        let color;
        if (greenCirclesCreated < maxGreenCircles) {
            color = 'green';
            greenCirclesCreated++;
        } else {
            const availableColors = settings.colors.filter(c => c !== 'green');
            color = availableColors[Math.floor(Math.random() * availableColors.length)];
        }

        circle.style.backgroundColor = color;

        let top, left;
        let isOverlapping;
        do {
            isOverlapping = false;
            top = Math.random() * 90;
            left = Math.random() * 90;

            for (const existingCircle of circles) {
                const existingTop = parseFloat(existingCircle.style.top);
                const existingLeft = parseFloat(existingCircle.style.left);
                const distance = Math.sqrt(Math.pow(top - existingTop, 2) + Math.pow(left - existingLeft, 2));

                if (distance < 20) {
                    isOverlapping = true;
                    break;
                }
            }
        } while (isOverlapping);

        circle.style.top = `${top}%`;
        circle.style.left = `${left}%`;
        circle.addEventListener('click', () => handleCircleClick(circle, color));
        gameArea.appendChild(circle);
        circles.push(circle);
    }
}

// Обработка клика по кругу
function handleCircleClick(circle, color) {
    if (!gameActive) return;

    if (color === 'green') {
        score += 10;
        messageDisplay.textContent = "Правильно! +10 очков";
        messageDisplay.style.color = "green";
    } else {
        score -= 5;
        messageDisplay.textContent = "Неправильно! -5 очков";
        messageDisplay.style.color = "red";
    }

    scoreDisplay.textContent = score;
    gameArea.innerHTML = '';
    createCircles();
}

// Обновление таймера
function updateTimer() {
    timeLeft--;
    timerDisplay.textContent = timeLeft;

    if (timeLeft <= 0) {
        endGame();
    }
}

// Начало игры
function startGame() {
    const difficulty = difficultySelector.value;
    const settings = difficultySettings[difficulty];

    gameActive = true;
    score = 0;
    timeLeft = settings.time;
    scoreDisplay.textContent = score;
    timerDisplay.textContent = timeLeft;
    messageDisplay.textContent = "";
    startButton.disabled = true;

    // Отключаем выбор сложности
    difficultySelector.disabled = true;

    gameArea.style.width = settings.fieldWidth;
    gameArea.innerHTML = '';
    createCircles();

    // Получаем лучший результат для выбранного уровня сложности
    updateBestScore(difficulty);

    timer = setInterval(updateTimer, 1000);
}

// Завершение игры
async function endGame() {
    gameActive = false;
    clearInterval(timer);
    messageDisplay.textContent = `Игра окончена! Ваш счет: ${score}`;
    startButton.disabled = false;
    gameArea.innerHTML = '';

    // Включаем выбор сложности
    difficultySelector.disabled = false;

    const difficulty = difficultySelector.value;

    // Сохраняем рекорд
    await saveRecord(score, difficulty);

    // Обновляем лучший результат для текущего уровня сложности
    updateBestScore(difficulty);
}

// Функция для сохранения рекорда
async function saveRecord(score, difficulty) {
    try {
        const response = await fetch('/api/records', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ score, difficulty }),
        });

        if (!response.ok) {
            throw new Error('Ошибка при сохранении рекорда.');
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// Функция для получения лучшего результата
async function getBestScore(difficulty) {
    try {
        const response = await fetch(`/api/best-score?difficulty=${difficulty}`);
        const data = await response.json();

        if (response.ok) {
            return data.bestScore;
        } else {
            throw new Error(data.error || 'Ошибка при получении лучшего результата.');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        return 0;
    }
}

// Обновление лучшего результата на экране
async function updateBestScore(difficulty) {
    try {
        const response = await fetch(`/api/best-score?difficulty=${difficulty}`);
        const data = await response.json();

        if (data.bestScore === null) {
            // Если пользователь не авторизован, показываем сообщение
            bestScoreDisplay.textContent = "Войдите в аккаунт для отслеживания лучшего результата.";
        } else {
            // Иначе показываем лучший результат
            bestScoreDisplay.textContent = data.bestScore;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        bestScoreDisplay.textContent = "Ошибка при загрузке данных.";
    }
}

// При загрузке страницы получаем лучший результат для текущего уровня сложности
window.addEventListener('load', async () => {
    const difficulty = difficultySelector.value;
    updateBestScore(difficulty);
});

// Обработчик кнопки "Начать игру"
startButton.addEventListener('click', startGame);

// Изменение ширины поля при выборе сложности
difficultySelector.addEventListener('change', () => {
    const difficulty = difficultySelector.value;
    const settings = difficultySettings[difficulty];
    gameArea.style.width = settings.fieldWidth;

    // Обновляем лучший результат при изменении уровня сложности
    updateBestScore(difficulty);
});

// Обработчик изменения сложности
difficultySelector.addEventListener('change', () => {
    const difficulty = difficultySelector.value;
    const settings = difficultySettings[difficulty];

    // Обновляем значение таймера
    timerDisplay.textContent = settings.time;

    // Обновляем текст текущей сложности
    const difficultyTextMap = {
        easy: "легкий",
        medium: "средний",
        hard: "сложный"
    };
    document.getElementById('current-difficulty').textContent = difficultyTextMap[difficulty];

    // Обновляем лучший результат для выбранного уровня сложности
    updateBestScore(difficulty);
});

// При загрузке страницы получаем лучший результат для текущего уровня сложности
window.addEventListener('load', async () => {
    const difficulty = difficultySelector.value;
    updateBestScore(difficulty);
});

// Изменение ширины поля при выборе сложности
difficultySelector.addEventListener('change', () => {
    const difficulty = difficultySelector.value;
    const settings = difficultySettings[difficulty];
    gameArea.style.width = settings.fieldWidth;

    // Обновляем лучший результат при изменении уровня сложности
    updateBestScore(difficulty);
});

// Обработчик кнопки "Как играть?"
document.getElementById('how-to-play-button').addEventListener('click', () => {
    const modal = document.getElementById('how-to-play-modal');
    modal.style.display = 'flex'; // Показываем модальное окно
});

// Закрытие модального окна при клике на крестик
document.querySelector('.close-button').addEventListener('click', () => {
    const modal = document.getElementById('how-to-play-modal');
    modal.style.display = 'none'; // Скрываем модальное окно
});

// Закрытие модального окна при клике вне его области
window.addEventListener('click', (event) => {
    const modal = document.getElementById('how-to-play-modal');
    if (event.target === modal) {
        modal.style.display = 'none'; // Скрываем модальное окно
    }
});