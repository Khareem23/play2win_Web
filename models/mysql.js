const
    mysql = require('mysql'),
    
    db = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    charset: "utf8mb4",
    multipleStatements: true
});

db.connect(err => {
    if(err){
        console.log(err);
    }
})

module.exports = db
