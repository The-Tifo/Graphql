document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error');

    console.log('Login attempt initiated');

    try {
        // Clear any existing token
        sessionStorage.removeItem('jwt');
        console.log('Cleared existing token');

        const credentials = btoa(`${username}:${password}`);
        console.log('Credentials encoded, making auth request');

        const response = await fetch('https://learn.reboot01.com/api/auth/signin', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });

        console.log('Auth response status:', response.status);

        if (!response.ok) {
            throw new Error(`Auth request failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('Auth response received:', data ? 'yes' : 'no');

        const token = data.token || data;
        console.log('Token extracted:', token ? 'yes' : 'no');

        if (!token) {
            throw new Error('No token received from server');
        }

        // Store token and verify storage
        sessionStorage.setItem('jwt', token);
        const storedToken = sessionStorage.getItem('jwt');
        console.log('Token stored successfully:', storedToken === token);

        if (!storedToken) {
            throw new Error('Failed to store token in session storage');
        }

        // Use replace to prevent back button from returning to login
        console.log('Redirecting to profile page');
        window.location.replace('profile.html');

    } catch (error) {
        console.error('Login error:', error);
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Invalid username or password';
    }
});
