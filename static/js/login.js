// Add event listener for form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    // Prevent the default form submission behavior
    e.preventDefault();

    // Get the input values from the form
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error');

    // Create base64 encoded credentials for Basic Auth
    const credentials = btoa(`${username}:${password}`);

    try {
        // Send POST request to authentication endpoint
        const response = await fetch('https://learn.reboot01.com/api/auth/signin', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`  // Send credentials in Authorization header
            }
        });

        // Check if the response was successful
        if (!response.ok) {
            throw new Error('Invalid credentials');
        }

        // Parse the JSON response
        const data = await response.json();

        // Store the JWT token in sessionStorage for better security (cleared when tab closes)
        sessionStorage.setItem('jwt', data.token || data);

        // Get base URL for GitHub Pages or local development
        const baseUrl = window.location.pathname.includes('/Graphql') 
            ? '/Graphql'  // GitHub Pages repository name
            : '';

        // Redirect user to profile page after successful login
        window.location.href = `${baseUrl}/profile.html`;

    } catch (error) {
        // Display error message if login fails
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Invalid username or password';
    }
});
