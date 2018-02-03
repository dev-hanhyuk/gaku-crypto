document.addEventListener('DOMContentLoaded', () => {
    axios.get('/session')
        .then(res => res.data.user)
        .then(auth_status => {
            if (!auth_status) {
                console.log('user_session not found');
                document.getElementById("auth-status").innerHTML = `
                <h3>Welcome, stranger!</h3>
                <button onClick="signin()">Sign In</button>
                <button onClick="ranking()">Ranking</button>
                `;
            } else {
                console.log('user_session: ', auth_status);
                document.getElementById("auth-status").innerHTML = `
                <h3>Welcome, ${auth_status.email}!!</h3>
                <button onClick="logout()">Logout</button>
                <button onClick="mycoins()">My Coins</button>
                <button onClick="mycart()">My Cart</button>
                <button onClick="ranking()">Ranking</button>
                `;
            }
            return;
        })
        .then(() => axios.get(`/api/coins`))
        .then((res) => {
            const coins = res.data;
            //array iterate
            let coinsTableDOM = document.getElementById("coins-table-body");
            coinsTableDOM.innerHTML = `<tr><td>logo</td><td>name</td><td>price</td></tr>`
            for (var i=0; i<coins.length; i++) {
                let row = coinsTableDOM.insertRow(i+1);
                let coin_img = row.insertCell(0);
                let coin_name = row.insertCell(1);
                let price = row.insertCell(2);
                let href= `/${coins[i].name.toLowerCase()}.html`;

                coin_img.innerHTML = `<img src="${coins[i].coin_img}" class="coin-image"/>`
                coin_name.innerHTML = `<a href=${href} class="anchor-style">${coins[i].name}</a>`;
                price.innerHTML = coins[i].price;

            };

            return;
        })
        .catch(err => console.error(err))
});


function logout() { 
    axios.get('/logout')
        .then(() => window.location.assign('/'))
        .catch(err => console.error(err));
};

function signin() { window.location.assign('/auth'); }
function mycoins() { 
    axios.get('/session')
        .then(() => window.location.assign('/mycoins'))
        .catch(err => console.error(err))
};

function mycart() { 
    axios.get('/session')
        .then(() => window.location.assign('/mycart'))
        .catch(err => console.error(err))
};

function ranking() {  
    axios.get('/session')
        .then(() => window.location.assign('/ranking'))
        .catch(err => console.error(err))
};