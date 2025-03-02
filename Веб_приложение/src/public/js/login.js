document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('login-message').textContent = data.message;
            document.getElementById('login-message').style.color = 'green';
            // Перенаправление на главную страницу после успешной авторизации
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            document.getElementById('login-message').textContent = data.error;
            document.getElementById('login-message').style.color = 'red';
        }
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('login-message').textContent = 'Ошибка при авторизации.';
        document.getElementById('login-message').style.color = 'red';
    }
});
