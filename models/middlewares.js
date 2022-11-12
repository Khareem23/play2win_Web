const 
    db = require('./db'),
    P = require('bluebird');
var jwt = require('jsonwebtoken');


const LoggedIn = (req, res, next) => {
    req.session.id ? next() : res.redirect('/login')
}

function ensureToken(req, res, next) {
  const bearerHeader = req.headers["authorization"];
  //var jwtVerifyAsync = P.promisify(jwt.verify, {context: jwt})
  //console.log('jwtVerifyAsync',jwtVerifyAsync);

  if (typeof bearerHeader !== 'undefined') {
    const bearer = bearerHeader.split(" ");
    const bearerToken = bearer[1];
    req.token = bearerToken;

    jwt.verify(bearerToken, process.env.SECRET_KEY, function(err, decoded) {
        //console.log('err my',err.name);
       // console.log('err my',err.message);
        if (err && err.name == 'TokenExpiredError') {
       return res.status(401).json({message:err.message});
        }
      });


    next();
  } else {
      console.log('token error aa gaya');
    res.sendStatus(403);
  }
}

const IsAdmin = (req, res, next) => {
    //console.log('usertype:'+req.session.usertype);
    req.session.usertype == 1 ? next() : res.redirect('/login')
}


const NotLoggedIn = (req, res, next) => {
    // console.log(req.session);
    !req.session.id ? next() : res.redirect('/')
}

const MainRedirect = (req, res, next) => {
    req.session.id ? next() : res.redirect('/login')
}

const variables = (req, res, next) => {
    let loggedIn = (req.session.id) ? true : false
    res.locals.loggedIn = loggedIn
    res.locals.session = req.session
    next()
}

const not_found = (req, res, next) => {
    let options = {  title: "Oops!" }
    res.status(404).render('user/error', {options})
}

const MeOrNot = (req, res, next) => {
    db.query('SELECT COUNT(id) as e FROM users WHERE id=?', [req.params.id])
        .then(is => {
			is[0].e == 0 ? res.redirect('/user/error') : next()
        })
        .catch(err => console.log(err) )
}

const delete_temp_images = (req, res, next) => {
    pi.DeleteAllOfFolder(process.cwd()+'/public/temp/')
    next()
}

const view_profile = (req, res, next) => {
    let { params: { id: get }, session: { id: session, firstname } } = req
    if(get != session){
        let insert = {
            view_by: session, 
            view_by_username: firstname,
            view_to: get,
            view_time: new Date().getTime()
        }
        db.query('INSERT INTO profile_views SET ?', insert)
    }
    next()
}



module.exports = {
    LoggedIn,
    IsAdmin,
    NotLoggedIn,
    MainRedirect,
    variables,
    not_found,
    MeOrNot,
    delete_temp_images,
    view_profile,
    ensureToken
}