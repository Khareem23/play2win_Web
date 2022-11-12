require('dotenv').config()
var cors = require('cors')
const express = require('express'),
app = express(),
path = require('path'),
engine = require('ejs-mate'),
session = require('client-sessions'),
cookieParser = require('cookie-parser'),
port = process.env.PORT,
bodyParser = require('body-parser'),
passport = require('passport');
app.use(cors())
 app.engine('ejs', engine);
 app.set('views',__dirname + '/views');
 app.use(passport.initialize());
 app.set('view engine','ejs');

app.use(express.static(path.join(__dirname, "/public")))

app.use(bodyParser.json({ limit: '50mb', extended: true }))
    .use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

app.use(cookieParser());
//Session
app.use(session({
    cookieName: "session",
    secret: process.env.SESSION_SECRET_LETTER,
    duration: 30 * 60 * 1000,
    activeDuration: 10 * 60 * 1000
}))

/*routes*/
const  apiS = require('./routes/apis'),
		mainR = require('./routes/main_routes'),
		userR = require('./routes/user_routes'),
		backRoutes = require('./routes/backRoutes'),
    	mw = require('./models/middlewares');

app.use('/', mainR);
app.use('/admin', backRoutes);
app.use('/user', userR);
app.use('/apis', apiS);

// Middleware for 404 page
app.use(mw.not_found);

const server = app.listen(port,()=> {
	console.log('App is running on port:'+ port);
});

require("./models/socket")(server);