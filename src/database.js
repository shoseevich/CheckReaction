const sqlite3 = require('sqlite3').verbose();

// Подключение к базе данных (файл records.db будет создан автоматически)
const db = new sqlite3.Database('./records.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключение к базе данных успешно установлено.');
        // Создание таблицы для рекордов, если она не существует
        db.run(`
            CREATE TABLE IF NOT EXISTS records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                score INTEGER NOT NULL,
                level INTEGER NOT NULL,
                difficulty TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
});

module.exports = db;