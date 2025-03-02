const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const app = express();
const port = 3000;

// Подключение к базе данных
const db = new sqlite3.Database('./records.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключение к базе данных успешно установлено.');
        // Создание таблиц, если они не существуют
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                score INTEGER NOT NULL,
                difficulty TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
    }
});

// Middleware для обработки JSON
app.use(express.json());

// Настройка сессий
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Для HTTPS установите true
}));

// Инициализация Passport
app.use(passport.initialize());
app.use(passport.session());

// Настройка стратегии Passport
passport.use(new LocalStrategy((username, password, done) => {
    const query = `SELECT * FROM users WHERE username = ?`;
    db.get(query, [username], (err, user) => {
        if (err) return done(err);
        if (!user) return done(null, false, { message: 'Неверное имя пользователя.' });
        if (user.password !== password) return done(null, false, { message: 'Неверный пароль.' });
        return done(null, user);
    });
}));

// Сериализация и десериализация пользователя
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    const query = `SELECT * FROM users WHERE id = ?`;
    db.get(query, [id], (err, user) => {
        done(err, user);
    });
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Маршрут для главной страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/icon.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'icon.png'));
});

// Маршрут для страницы авторизации
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Маршрут для страницы регистрации
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Маршрут для обработки авторизации
app.post('/api/login', passport.authenticate('local'), (req, res) => {
    res.json({ success: true, message: 'Авторизация успешна!' });
});

// Маршрут для обработки регистрации
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Необходимо указать имя пользователя и пароль.' });
    }

    const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
    db.run(query, [username, password], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Пользователь с таким именем уже существует.' });
            }
            return res.status(500).json({ error: 'Ошибка при регистрации пользователя.' });
        }
        res.status(201).json({ success: true, message: 'Пользователь успешно зарегистрирован!' });
    });
});

app.post('/api/records', async (req, res) => {
    const { score, difficulty } = req.body;
    const userId = req.user?.id; // Получаем ID пользователя из сессии

    if (!userId) {
        return res.status(401).json({ error: 'Необходимо авторизоваться для сохранения рекорда.' });
    }

    if (!score || !difficulty) {
        return res.status(400).json({ error: 'Необходимо указать score и difficulty.' });
    }

    try {
        // Проверяем текущий лучший результат
        const bestScoreQuery = `
            SELECT MAX(score) AS bestScore
            FROM records
            WHERE user_id = ? AND difficulty = ?
        `;
        const bestScoreResult = await new Promise((resolve, reject) => {
            db.get(bestScoreQuery, [userId, difficulty], (err, row) => {
                if (err) reject(err);
                else resolve(row?.bestScore || 0);
            });
        });

        // Если новый результат лучше текущего лучшего, сохраняем его
        if (score > bestScoreResult) {
            const insertQuery = `
                INSERT INTO records (user_id, score, difficulty)
                VALUES (?, ?, ?)
            `;
            await new Promise((resolve, reject) => {
                db.run(insertQuery, [userId, score, difficulty], function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });

            return res.status(201).json({ success: true, message: 'Рекорд сохранен!' });
        } else {
            return res.status(200).json({ success: false, message: 'Новый результат не лучше текущего рекорда.' });
        }
    } catch (error) {
        console.error('Ошибка:', error);
        return res.status(500).json({ error: 'Ошибка при сохранении рекорда.' });
    }
});

app.get('/api/best-score', (req, res) => {
    const userId = req.user?.id; // Получаем ID пользователя из сессии
    const { difficulty } = req.query;

    if (!userId) {
        // Если пользователь не авторизован, возвращаем специальный флаг
        return res.json({ bestScore: null, message: "Войдите в аккаунт для отслеживания лучшего результата." });
    }

    if (!difficulty) {
        return res.status(400).json({ error: 'Необходимо указать уровень сложности.' });
    }

    const query = `
        SELECT MAX(score) AS bestScore
        FROM records
        WHERE user_id = ? AND difficulty = ?
    `;

    db.get(query, [userId, difficulty], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка при получении лучшего результата.' });
        }
        res.json({ bestScore: row?.bestScore || 0 });
    });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});