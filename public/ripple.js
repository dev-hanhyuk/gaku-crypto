const COIN_NAME = "ripple"

document.addEventListener('DOMContentLoaded', () => {
    axios.get(`/api/coins/${COIN_NAME}`)
        .then(res => {
            const descriptionDOM = document.getElementById("description-container");
            descriptionDOM.innerHTML = `<p>${res.data.description}</p>`;
            return;

        })
        .catch(err => console.log(err))

});


function purchase() {
    event.preventDefault();
    console.log(`purchasing ${COIN_NAME}`);

    let data = {
        quantity: document.getElementById('quantity').value,
        coin_name: COIN_NAME
    }
    const url = "/api/purchase";

    axios.post(url, data)
        .then((res) => {
            if (res.data.purchase_success == true) {
                alert("successfully purchased!");
                return axios.get('/session')
                    .then(() => window.location.assign('/thankyou'))
            } else if (res.data.purchase_success == false) {
                alert("Something went wrong! Please try it again!");
            }
        })
        .catch(err => console.log(err))
}



function toMycart() {
    event.preventDefault();
    let data = {
        quantity: document.getElementById('quantity').value,
        coin_name: COIN_NAME
    }
    const url = "/api/mycart";

    axios.post(url, data)
        .then(() => axios.get('/session'))
        .then(() => {
            alert("successfully saved in my cart!");
            window.location.assign("/mycart");
        })
        .catch(err => console.log(err))
}