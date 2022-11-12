 const db = require('./mysql'),
 bcrypt = require('bcrypt'),
 mail = require('../models/mail'),
 crypto = require('crypto'),
 path = require("path"),
 url = require("url"),
 fs = require('fs'),
 request = require("request"),
    //spamlist = require("./spamfilterlist.json");
 saltRounds = 10;
 

const  query = (q, data)=> {
	return new Promise((resolve, reject) => {
		db.query(q, data, (err, res) => {
			err ? reject(err) : resolve(res)
		})
	})
}

const createUser = (user, newUserDetail) => {
    return new Promise((resolve, reject) => {
        bcrypt.hash(user.pin, saltRounds, (error, hash) => {
            user.pin = hash
            db.query('INSERT INTO users SET ?', user, async (err, res) => {

                if (err) {
                    return reject(err);
                }
                newUserDetail.user_id = res.insertId;

                db.query('INSERT INTO user_details SET ?', newUserDetail, (err, res) => {
                    if (err) {
                        return reject(err);
                    } 
                    res.user_id = newUserDetail.user_id 
                    return err ? reject(err) : resolve(res)

                })
               
            })
        })
    })
}
const createUserWithoutPass = (user, newUserDetail) => {
    return new Promise((resolve, reject) => {

            db.query('INSERT INTO users SET ?', user, async (err, res) => {

                if (err) {
                    return reject(err);
                }
                newUserDetail.user_id = res.insertId;            

                db.query('INSERT INTO user_details SET ?', newUserDetail, (err, res) => {

                    if (err) {
                        return reject(err);
                    } 
                    res.user_id = newUserDetail.user_id
                    res.username = user.username 

                    return err ? reject(err) : resolve(res)

                })  
            })  
    })
}

const getPlayerStats = async (res, user) => {
    db.query(`Select ps.*,g.* from player_statistics ps inner join games g on ps.game_id=g.id where ps.user_id=${user}`, function (err, rows, fields) {
        let stats = rows
        db.query(`SELECT g.* from favorite_games fg inner join games g on g.id=fg.game_id where user_id = ${user}`, (err, rows, fields) => {
            res.render("user/gamestats", { stats: stats, fav: rows })
        })

    })
}

const updateToken = (user_id, req, res) => {
    return new Promise((resolve, reject) => {

        crypto.randomBytes(20, function (err, buf) {
            var token = buf.toString('hex');

            db.query('UPDATE user_details SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE user_id = ?', [token, Date.now(), user_id], (err, res) => {
                db.query(`Select username, email from users where id = ?`, [user_id], async (err, result) => {
                    username = result[0].username
                    if (err) { console.log(err); reject(err); }

                    let options = {
                        to: result[0].email,
                        subject: 'Password reset request',
                    }

                    let renderable = {
                        template: path.join("emails", "users", "forgotpass.html"),
                        locals: {
                            host: req.hostname+':4000',
                            username: username,
                            token: token,
                            url: url
                        }
                    }
                    let rr = await mail(options, renderable).then((rs) => {
                        console.log("Mail sent", rs);
                        return rs
                    }).catch(err => {
                        console.log(err)
                    })
                   // rr = JSON.parse(rr);
                    //console.log('rr', rr);
                    res.status = 1
                    res.data = 'data'
                    resolve(res);
                })
            })
        })
    })
}

const updatePassword = (email, pin, user_id) => {
    return new Promise((resolve, reject) => {
        bcrypt.hash(pin, saltRounds, (error, hash) => {
            pin = hash;
            db.query('UPDATE `users` SET `pin` = ?  WHERE  email=?', [pin, email], async (err, res) => {

                if (err) {
                    return reject(err);
                }
                await updateUserDetails(user_id);

                resolve(res);
            })
        })
    })
}

const updateUserDetails = (user_id) => {
    return new Promise((resolve, reject) => {
            db.query("UPDATE user_details SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE user_id = ?", ['', '', user_id], (err, res) => {
                if (err) {
                    return reject(err);
                }
                resolve(res);
            })
    })
}

const addUserAcc = (data) => {
    return new Promise((resolve, reject) => {

         db.query('INSERT INTO user_account SET ?', data, (err, res) => {

                if (err) {
                    return reject(err);
                }
                return resolve(res);
            })
        
    })
}


const comparePassword = (pin, hash) => {
    console.log('pin',pin)
    console.log('hash',hash)
    return new Promise((resolve, reject) => {
        bcrypt.compare(pin, hash, (err, res) => {
            err ? reject(err) : resolve(res)
        })
    })
}

const addActivity = (activity) => {

    return new Promise((resolve, reject) => {
        db.query('INSERT INTO last_activity SET ?', activity, (err, res) => {

            if (err) {
                return reject(err);
            }
            resolve(res);
        })
    })
}

const updateActivity = (status, id) => {
    return new Promise((resolve, reject) => {
        db.query('UPDATE users SET online=? WHERE id=?', [status, id], (err, res) => {
            if (err) {
                return reject(err);
            }
            resolve(res);
        })
    })
}

const updatePhoneVerificationStatus = (status, phone) => {
    return new Promise((resolve, reject) => {
        db.query("UPDATE users SET phone_verify=?, device_id=? WHERE phone=?", [status, null,phone], (err, res) => {
            if (err) {
                return reject(err);
            }
            resolve(res);
        })
    })
}

module.exports = {
    query,
    createUser,
    comparePassword,
    createUserWithoutPass,
    addUserAcc,
    updateToken,
    updatePassword,
    updateActivity,
    addActivity,
    updatePhoneVerificationStatus,
    updateUserDetails
}