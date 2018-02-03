document.addEventListener('DOMContentLoaded', () => {
    axios.get(`/api/mycart`)
        .then(res => {
            const cart = res.data.results;
            
            const mycartTableDOM = document.getElementById('mycart-table');
            for (var i=0; i < cart.length; i++) {
                let row = mycartTableDOM.insertRow(i);
                let coin_name = row.insertCell(0);
                let price = row.insertCell(1);
                let quantity = row.insertCell(2);
                let value = row.insertCell(3);
                let purchase_button = row.insertCell(4);

                coin_name.innerHTML = cart[i].coin_name;
                price.innerHTML = cart[i].price;
                quantity.innerHTML = cart[i].quantity;
                value.innerHTML = cart[i].price * cart[i].quantity;
                purchase_button.innerHTML = `<button onClick="purchase('${cart[i].coin_name}', ${cart[i].quantity}, ${cart[i].id})">Purchase</button>`
            }

            
            const residualBudgetDOM = document.getElementById("residual-budget");
            residualBudgetDOM.innerHTML = `<h1>Your residual budget is ${res.data.residual_budget}</h1>`

        })
        .catch(err => console.error(err))
})



function purchase(coin_name, quantity, id) {
    const data = { coin_name, quantity };
    const url = "/api/purchase";
    const remove_item_from_mycart_url = "/api/mycart/remove";

    axios.post(url, data)
        .then(res => alert('successfully purchased!'))
        .then(() => axios.get(remove_item_from_mycart_url + '/' + id))
        .then(() => axios.get('/session'))
        .then(res => window.location.assign("/thankyou"))
        .catch(err => console.log(err))
}