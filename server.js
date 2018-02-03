'use strict';

const process = require('process');
const { resolve } = require('path');
const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MemcachedStore = require('connect-memjs')(session);
const app = express();
const bodyParser = require('body-parser');

// Environment variables are defined in app.yaml.
let MEMCACHE_URL = process.env.MEMCACHE_URL || '127.0.0.1:11211';

const options = require('./config').options;

// database access information for interal testing environment
// const options = {
//     host: 'localhost',
//     user: 'root',
//     password: '1234',
//     database: 'crypto'
// };

const c = mysql.createPool(options);


app.enable('trust proxy');
app.use(cookieParser());
app.use(session({
    secret: 'random secret for crypto project',
    saveUninitialized: false, resave: false,
    store: new MemcachedStore({
        servers: [MEMCACHE_URL]
      })
}));


app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.static('public'));


app.get('/session', (req, res, next) => {
    if (req.session.user) {
        res.send({ user: req.session.user });
    } else {
        res.send({ user: null });
    }
});


app.post('/login', (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    let qStr = `SELECT * FROM users WHERE email='${email}';`;
    c.query(qStr, (err, results)=> {
        if (results[0] && (results[0].password == password)) {
            req.session.user = results[0];
            console.log('session user logged in cookie: ', req.session);
            res.sendStatus(200);
        } else {
            res.sendStatus(401);
        }
        
    });
});


app.post('/register', (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    
    let qStr = `INSERT INTO users (email, password, budget) VALUES ('${email}', '${password}', 100000);`;
    c.query(qStr, (err, results) => {
        if (err) res.send({ error_message: err });
        res.sendStatus(200);
        
    })

})


app.get('/logout', (req, res, next) => {
    req.session.user = null;
    res.status(200).end();
});



app.get('/api/coins', (req, res, next) => {
    const qStr = 'SELECT * FROM coins;';
    c.query(qStr, (err, results) => {
        if (err) res.send(err);
        res.send(results);
        
    })
});




app.get('/api/mycoins', (req, res, next) => {
    if (!req.session.user) res.redirect('/auth');
    else {
        const email = req.session.user.email;
        const qStr = `SELECT c.name as coin_name, p.quantity as quantity, c.price as price FROM purchase p INNER JOIN coins c ON p.coin_name= c.name WHERE p.user_email='${email}';`;
        fetchUserResidualBudget(email)
            .then(residual_budget => {
                c.query(qStr, (err, results) => {
                    if (err) res.send(err);
                    if (results) res.send({results, residual_budget});
                    
                })        
            })
    } 
})



app.post('/api/mycoins/sell', (req, res, next) => {
    const { coin_name, current_coin_quantity, n_coins_to_sell } = req.body;
    const user_email = req.session.user.email;
    const updated_quantity = current_coin_quantity - n_coins_to_sell;

    let current_residual_budget;
    let current_coin_price;
    //purchase table 조정 => reduce the number of coins
    updateIndividualCoinPurchaseQuantity(updated_quantity, user_email, coin_name)
        .then(() => fetchUserResidualBudget(user_email))
        .then((residual_budget) => current_residual_budget = residual_budget)
        .then(() => fetchCoinPrice(coin_name))
        .then((cp) => {
            current_coin_price = cp;
            // user budget update with current price * n_coins_to_sell
            const updated_budget = current_residual_budget + (current_coin_price * n_coins_to_sell);
            return userBudgetUpdate(user_email, updated_budget)
        })
        .then(() => res.sendStatus(200))
        .catch((err) => console.error(err))

});




app.get('/api/mycart', (req, res, next) => {
    if (!req.session.user) res.redirect('/auth');
    else {
        const email = req.session.user.email;
        const qStr = `
        SELECT mc.id, c.name as coin_name, mc.quantity as quantity, c.price as price 
        FROM mycart mc 
        JOIN coins c ON c.name=mc.coin_name 
        WHERE mc.user_email='${email}';`;

        fetchUserResidualBudget(email)
            .then(residual_budget => {
                c.query(qStr, (err, results) => {
                    if (err) res.send(err);
                    if (results) res.send({results, residual_budget});
                    
                })        
            })    
    }
});


app.post('/api/mycart', (req, res, next) => {
    if (!req.session.user) res.redirect('/auth');
    else {
        const email = req.session.user.email;
        const { coin_name, quantity } = req.body;
        const qStr = `INSERT INTO mycart (user_email, coin_name, quantity) VALUES ("${email}", "${coin_name}", ${quantity} );`;
        c.query(qStr, (err, results) => {
            if(err) res.send(err);
            if (results) res.send({ results });
            
        })
    }
})


app.get('/api/mycart/remove/:id', (req, res, next) => {
    if (!req.session.user) res.redirect('/auth');
    else {
        const qStr = `DELETE FROM mycart WHERE id=${req.params.id}`
        c.query(qStr, (err, results) => {
            if (err) res.send(err);
            if (results) res.send({results});
            
        })
    }
})


app.post('/api/purchase', (req, res, next) => {
    if (!req.session.user) res.redirect('/auth');
    else {
        const user_email = req.session.user.email;
        const quantity = +req.body.quantity;
        const coin_name = req.body.coin_name;
        return purchase(user_email, coin_name, quantity)
            .then(() => res.send({purchase_success: true}))
            .catch(err => res.send({purchase_success: false}));

    }    
})


app.get('/api/coins/:coinName', (req, res, next) => {
    //query a specific coin information based on its name
    const qStr = `SELECT * FROM coins WHERE name='${req.params.coinName}';`;
    c.query(qStr, (err, results) => {
        if (err) res.send(err);
        res.send(results[0]); //returns only the first query result
        
    })
});


app.put('/api/coins/:coinName', (req, res, next) => {
    const updated_price = req.body.price;
    const qStr = `UPDATE coins SET price=${updated_price} WHERE name='${req.params.coinName}';`;
    c.query(qStr, (err, results) => {
        if (err) res.send(err);
        res.send(results[0]); //returns only the first query result
        
    })
});


app.get('/api/rank', (req, res, next) => {
    const qStr = 
    ` 
    SELECT u.email, IFNULL(SUM(p.quantity * c.price), 0) + u.budget as total_value
    FROM users u
    LEFT JOIN purchase p ON p.user_email = u.email
    LEFT JOIN coins c ON p.coin_name = c.name
    GROUP BY u.email
    ORDER BY total_value DESC
    ;`;
    c.query(qStr, (err, results) => {
        if (err) res.send(err);
        if (results) {
            if (results) {
                res.send(results);
            }
        }
        
    })
})


app.get('/auth', (req, res, next) => {
    res.sendFile(resolve(__dirname, 'public', 'auth.html'));
});


app.get('/', (req, res, next) => {
    res.sendFile(resolve(__dirname, 'public', 'index.html'));
});


app.get('/mycoins', (req, res, next) => {
    console.log(req.session);
    if (!req.session.user) res.redirect('/auth');
    else {res.sendFile(resolve(__dirname, 'public', 'mycoins.html'));}
});


app.get('/mycart', (req, res, next) => {
    console.log(req.session);
    if (!req.session.user) res.redirect('/auth');
    else {res.sendFile(resolve(__dirname, 'public', 'mycart.html'));}
});

app.get('/thankyou', (req, res, next) => {
    if (!req.session.user) res.redirect('/auth');
    else {res.sendFile(resolve(__dirname, 'public', 'thankyou.html'));}
});

app.get('/ranking', (req, res, next) => {
    res.sendFile(resolve(__dirname, 'public', 'ranking.html'));
})


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});


module.exports = app;




function purchase(user_email, coin_name, quantity) {
    let coin_price;
    let residual_budget;
    let pre_purchased_coin;
    return fetchCoinPrice(coin_name)
        .then(cp => coin_price = cp)
        .then(() => fetchUserResidualBudget(user_email))
        .then(budget => residual_budget = budget)
        .then(() => {
            let updated_residual_budget = residual_budget - (coin_price * quantity);
            return userBudgetUpdate(user_email, updated_residual_budget)
        })
        .then(() => fetchPrePurchasedCoin(coin_name, user_email))
        .then((results) => {
            if (results.length == 0) return pre_purchased_coin = null;
            else {
                return pre_purchased_coin = results[0].quantity;
            }
        })
        .then(() => purchaseCoin(user_email, coin_name, pre_purchased_coin, quantity))
        .catch(err => console.log(err));
}



function fetchPrePurchasedCoin(coin_name, user_email) {
    const qStr = `SELECT * FROM purchase WHERE user_email='${user_email}' AND coin_name='${coin_name}';`;
    return new Promise((resolve, reject) => {
        c.query(qStr, (err, results) => {
            if(err) reject(err);
            resolve(results);
            
        })
    })
    
}


function purchaseCoin(user_email, coin_name, pre_purchased_coin, quantity) {
    return new Promise((resolve, reject) => {
        let qStr;

        if (pre_purchased_coin !== null) {
            qStr = `UPDATE purchase SET quantity=${pre_purchased_coin + quantity} WHERE user_email='${user_email}' AND coin_name='${coin_name}';`;//user_coin db update
            c.query(qStr, (err, results) => {
                if (err) reject(err);
                resolve(results);
                
            })
        } else {
            qStr = `INSERT INTO purchase (user_email, coin_name, quantity) VALUES ('${user_email}', '${coin_name}', ${quantity});`
            c.query(qStr, (err, results) => {
                if (err) reject(err);
                resolve(results);
                
            })
        }
    })
}




function fetchUserResidualBudget(user_email) {
    const qStr = `SELECT * FROM users WHERE email='${user_email}';`;
    return new Promise((resolve, reject) => {
        c.query(qStr, (err, results) => {
            if (err) reject(err);
            resolve(results[0].budget); //returns only the first query result
            
        })
    })    
}


function updateIndividualCoinPurchaseQuantity(updated_quantity, user_email, coin_name) {
    let qStr;
    if (updated_quantity == 0) {
        qStr = `
        DELETE FROM purchase 
        WHERE user_email='${user_email}'
        AND coin_name='${coin_name}';
        `
    } else {
        qStr = `
        UPDATE purchase SET quantity=${updated_quantity} 
        WHERE user_email='${user_email}' 
        AND coin_name='${coin_name}';`;
    };

    return new Promise((resolve, reject) => {        
        c.query(qStr, (err, results) => {
            if (err) reject(err);
            resolve(results);
            
        })
    })
}

function fetchCoinPrice(coin_name) {
    const qStr = `SELECT * FROM coins WHERE name="${coin_name}";`;
    return new Promise((resolve, reject) => {
        c.query(qStr, (err, results) => {
            if (err) reject(err);
            resolve(results[0].price);
            
        })
    })
}

function userBudgetUpdate(user_email, updated_residual_budget) {
    return new Promise((resolve, reject) => {
        const qStr = `UPDATE users SET budget=${updated_residual_budget} WHERE email='${user_email}';`;//user update
        c.query(qStr, (err, results) => {
            if (err) reject(err);
            resolve(results);
            
        })
    })
}
