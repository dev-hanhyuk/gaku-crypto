document.addEventListener('DOMContentLoaded', () => {
    axios.get('/api/mycoins')
        .then(res => {
            let coins = res.data.results;
            let coins_value = 0;

            let mycoinsTableDOM = document.getElementById("mycoins-container");
            for (var i=0; i<coins.length; i++) {
                

                let row = mycoinsTableDOM.insertRow(i);
                let coin_name = row.insertCell(0);
                let price = row.insertCell(1);
                let quantity = row.insertCell(2);
                let value = row.insertCell(3);
                let sell_button = row.insertCell(4);
                let coin_href = row.insertCell(5);
                let coin_uri = `/${coins[i].coin_name.toLowerCase()}.html`;

                coin_name.innerHTML = coins[i].coin_name;
                price.innerHTML = coins[i].price;
                quantity.innerHTML = `<p id="current-num-coins-${coins[i].coin_name}">${coins[i].quantity}</p>`;
                value.innerHTML = coins[i].quantity * coins[i].price;
                sell_button.innerHTML = `
                    <input id="coin-sell-${coins[i].coin_name}" type="number" />
                    <button onClick="sell_mycoins('${coins[i].coin_name}', ${coins[i].quantity})">Sell</button>`;

                coin_href.innerHTML = `<a href=${coin_uri}>link to ${coins[i].coin_name}</a>`;
                coins_value += coins[i].quantity * coins[i].price;
            }

            
            let total_budget_value = res.data.residual_budget;
            let total_coins_value = coins_value;
            let total_value = total_budget_value + total_coins_value;

            document.getElementById('total-coins-value').innerHTML = `<h2>Total value of coins: ${total_coins_value}</h2>`;
            document.getElementById('total-budget-value').innerHTML = `<h2>Total residual budget: ${total_budget_value}</h2>`;
            document.getElementById('total-value').innerHTML = `<h1>Total Value: ${total_value}</h1>`;
            return;
        })
        .catch(err => console.log(err))
});



function sell_mycoins(coin_name, current_coin_quantity) {
    const n_coins_to_sell = document.getElementById('coin-sell-'+coin_name).value;
    const selling_payload = { coin_name, current_coin_quantity, n_coins_to_sell };

    axios.post('/api/mycoins/sell', selling_payload)
        .then(() => alert('successfully sold my coin(s)!'))
        .then(() => axios.get('/session'))
        .then(() => window.location.assign('/mycoins'))
        .catch(err => console.error(err))
}