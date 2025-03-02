document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('register-message').textContent = data.message;
            document.getElementById('register-message').style.color = 'green';
            // Перенаправление на страницу авторизации после успешной регистрации
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else {
            document.getElementById('register-message').textContent = data.error;
            document.getElementById('register-message').style.color = 'red';
        }
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('register-message').textContent = 'Ошибка при регистрации.';
        document.getElementById('register-message').style.color = 'red';
    }
});
