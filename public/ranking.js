document.addEventListener('DOMContentLoaded', () => {
    axios.get(`/api/rank`)
        .then(res => {
            const rank = res.data;
            const rankingTableDOM = document.getElementById('ranking-table');
            for (var i=0; i < rank.length; i++) {
                let row = rankingTableDOM.insertRow(i);
                let ranking = row.insertCell(0);
                let email_cell = row.insertCell(1);
                let val_cell = row.insertCell(2);

                ranking.innerHTML = `${i+1}`;
                email_cell.innerHTML = rank[i].email;
                val_cell.innerHTML = rank[i].total_value;
            }
            return;
        })
        .catch(err => console.error(err))
})