function login() {
    event.preventDefault();
    const data = fetchCredential();
    axios.post(`/login`, data)
        .then(() => axios.get('/session'))
        .then(() => window.location.href="/")
        .catch((err) => {
            let auth_status = document.getElementById('auth-status-message');
            auth_status.innerHTML = `
                <p>Not an authenticated user. Please register!</p>
                <button onClick="register()">register</button>
            `;
        })
}

function register() {
    event.preventDefault();
    const data = fetchCredential();
    axios.post(`/register`, data)
        .then(() => login())
        .catch((err) => {
            let auth_status = document.getElementById('auth-status-message');
            auth_status.innerHTML = `
                <p>${err} Something wrong with your registration!</p>
            `;
        })
}


function fetchCredential() {
    event.preventDefault();
    const credential = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
    };
    return credential;
}