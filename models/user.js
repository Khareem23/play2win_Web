const db = require("../models/db"),
  P = require("bluebird"),
  fs = require("fs"),
  path = require("path"),
  crypto = require("crypto"),
  mail = require("../models/mail"),
  bcrypt = require("bcrypt"),
  saltRounds = 10;
jwt = require("jsonwebtoken");
const shortid = require("shortid");
const { map } = require("p-iteration");
var status = require("http-status-codes");
var request = require("request");

/*pushwoosh*/
//var Pushwoosh = require('pushwoosh-client');
var Pushwoosh = require("pushwoosh");
var Pushclient = new Pushwoosh(process.env.PUSH_CODE, process.env.PUSH_TOKEN);
/*pushwoosh*/

/*twilio config start*/
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const sv = process.env.SERVICE_ID;
/*twilio config end*/

const default_coins = 20000;

var myArray = [
  "Kuku",
  "Mogambo",
  "Shakaal",
  "Kilvish",
  "Shaktimaan",
  "Crime Master Gogo",
  "Keju",
  "Saabu",
  "Bunty",
  "Gaitonde",
  "Gabbar",
  "Thakur",
  "Mr. India",
  "K..K..Kiran",
  "Naagraj",
  "Raja Babu",
  "Babita ji",
  "Bhabhi ji",
  "Daya Bhen",
  "Jethalal",
  "Gully Boy",
  "Baba Ji",
  "Bhaiya",
  "Chulbul Pandey",
  "Foofaaji",
  "Didi",
  "Pappu",
  "Dream Girl",
  "Papa Ki Pari",
  "Hansa",
  "Praful",
  "Manjulika",
  "Baa",
  "Bantai",
  "Jerry",
  "Chhote",
  "Pandit Ji",
  "Bholi Punjaban",
  "Jattani",
  "Choochaa",
  "Thakuraain",
  "Khamakha",
  "Yo Yo Singh",
  "Nandu Sabka Bandhu",
  "Anarkali",
  "Bubbly",
  "Soorma Bhopali",
  "Pushpa",
  "Chutki",
  "Maaya Sarabhai",
  "Chandramukhi",
  "Inspector Choutala",
  "Raani ",
  "Bitti",
  "Paaro",
  "Kalank",
  "Devdas",
  "Jeetu",
  "Sharma Ji Ka Ladka",
  "Deewani",
  "Gutthi",
  "Selfie Queen",
  "Leela",
  "Mastaani",
  "Parjaai Ji",
  "Devsena",
  "Kattappa",
  "Baahubali",
  "Chitti",
  "Anna",
  "Hindustani Bhaau",
  "Raajmata",
  "Shivagaamini",
  "Kabir Singh",
  "Pinky",
  "Chandika",
  "Chhota Bheem",
  "Naina",
  "Ae Shivaani",
  "Daaku Daddy",
  "Pammy Aunty",
  "Sakht Launda",
  "Mausi",
  "Basanti",
  "Shivaaji The Boss",
  "Angoori",
  "Komolikaa",
  "Amma Ji",
  "ACP Pradyuman",
  "Circuit",
  "Pappa Ji",
  "Jassi",
  "Madhubaala",
  "Shehenshah",
  "Heera Lal",
  "Kachra Seth",
  "Hasina",
  "Preeto",
  "Billo Raani",
  "Madam Ji",
  "Majnu Bhai",
  "Maaas",
  "Shetty Bhai",
  "Jagat Janani",
  "Viru",
  "Vasooli bhai",
  "Chhota Chhatri",
  "Dr.Ghungroo",
  "Rancho",
  "Mussadi Lal",
]; // Update Redeem Request
var actors = myArray.map((a) => JSON.stringify(a)).join();

const RedeemStatus = (req, res) => {
  let {
    body: { orderId },
  } = req;

  disburst(orderId).then((result) => {
    res.end(
      JSON.stringify({
        result: { mssg: "Redeem Request successfully", success: true, result },
      })
    );
  });
};
const updateRedeemStatus = (req, res) => {
  let {
    body: { id: id, status: status, amount, uid },
    session,
  } = req;
  var rs1;
  status = status == 1 ? 0 : 1;

  var query0 = 'SELECT status from redeem_history where id = "' + id + '"';

  db.query(query0, function (err0, result0) {
    if (err0) {
      generateError(res, "Error retrieving user data");
    } else {
      var _result0 = JSON.parse(JSON.stringify(result0));
      if (_result0.length > 0) {
        var query1 =
          'UPDATE redeem_history SET status= "' +
          status +
          '" WHERE id = "' +
          id +
          '"';
        db.query(query1, async function (err1, result1) {
          if (err1) {
            generateError(res, "Error updating profile!");
          } else {
            var [{ phone }] = await getUserPhone(uid);
            var [{ email }] = await getUserEmail(uid);
            console.log("email", email);
            console.log("phone1", phone);
            console.log("amount", amount);
            gratification(phone, amount).then(
              async (result) => {
                console.log("result123", result);

                if (status == 1) {
                  let options = {
                    to: email,
                    subject: "withdrawal processed",
                  };

                  let renderable = {
                    template: path.join(
                      "emails",
                      "users",
                      "withdrawal_success.html"
                    ),
                    locals: { host: req.hostname },
                  };

                  let rr1 = await mail(options, renderable);

                  let data01 = {
                    mobile: phone,
                    message:
                      "The withdrawal has been processed. Expect payment within 3-5 business days.",
                  };
                  let rr01 = await sms(data01);
                }
              },
              (err) => {
                console.log("err123", err);
                res.end(
                  JSON.stringify({
                    result: {
                      mssg: "Redeem Request not successfully",
                      success: false,
                      error: err,
                    },
                  })
                );
              }
            );
            setTimeout(() => {
              res.end(
                JSON.stringify({
                  result: {
                    mssg: "Redeem Request successfully",
                    success: true,
                  },
                })
              );
            }, 3000);
          }
        });
      } else {
        generateError(res, "Record not found!");
      }
    }
  });
};

const generateError = function (res, text) {
  return res.end(
    JSON.stringify({
      result: {
        error: text,
        success: false,
        mssg: "Operation Not accomplished",
      },
    })
  );
};
const isUserExists = (id) => {
  return db.query(
    'SELECT Count(*) as usercount from users where id = "' + id + '"'
  );
};
const getPushId = (user_id) => {
  let sql = "select push_id from user_details WHERE user_id = ? ";
  return db.query(sql, [user_id]);
};

const getCountryList = () => {
  let sql = "select name, phonecode from country";
  return db.query(sql);
};

const updateDeviceId = (deviceid, user_id) => {
  if (deviceid == "") {
    deviceid = null;
  } else {
    deviceid = '"' + deviceid + '"';
  }
  let sql =
    "UPDATE users SET device_id = " + deviceid + "  WHERE id =" + user_id;
  return db.query(sql);
};

const updateLastLogin = (user_id) => {
  let sql = "UPDATE users SET last_login = now() WHERE id =" + user_id;
  return db.query(sql);
};

const updateWin = (user_id, poolid, win) => {
  let sql =
    "UPDATE bet_history SET win = " +
    win +
    "  WHERE poolid=" +
    poolid +
    " and user_id =" +
    user_id;
  return db.query(sql);
};

const updatePushId = (push_id, user_id) => {
  let sql =
    "UPDATE user_details SET push_id = '" +
    push_id +
    "' WHERE user_id='" +
    user_id +
    "'";
  return db.query(sql, [user_id]);
};
const addNotification = (data) => {
  return db.query("INSERT INTO notifications SET ?", Object.assign({}, data));
};

// const registerChallenge = (data) => {
//      return db.query(`INSERT INTO challenges SET ?`, [data])
// }

const registerChallenge = async (data) => {
  console.log("datadatadata", data);

  if (data.message && data.push_id) {
    var config = {
      send_date: "now",
      ignore_user_timezone: true,
      content: data.message,
      devices: [data.push_id],
    };
  }

  if (data.action == "register") {
    let userdata = {
      bet: data.bet_amount,
      user_id: data.user_id,
      username: data.username,
      challenge: 1,
      desc: null,
    };
    let creaPool = await createPool(userdata);

    delete data.action;

    if (creaPool.insertId) {
      delete data.user_id;
      delete data.username;

      data.poolid = creaPool.insertId;
      console.log("config", config);
      await Pushclient.sendMessage(config);
      delete data.message;
      delete data.push_id;
      return db.query(`INSERT INTO challenges SET ?`, Object.assign({}, data));
    } else {
      return new Promise(function (resolve, reject) {
        reject({ error: "Pool Not created" });
      });
    }
  }

  if (data.action == "rejected") {
    console.log("config rejected", config);
    await Pushclient.sendMessage(config);
    db.query(`DELETE FROM  pool where id = ?`, [data.poolid]);
    return db.query(`DELETE FROM  challenges where id = ?`, [data.id]);
    //  / return db.query(`UPDATE challenges SET status = ? WHERE id = ?`, ['rejected', data.id])
  }

  if (data.action == "approved") {
    console.log("config approved", config);
    await Pushclient.sendMessage(config);
    return db.query(`UPDATE challenges SET status = ? WHERE id = ?`, [
      "approved",
      data.id,
    ]);
  }
};

const deleteNotification = (id) => {
  return db.query(`DELETE FROM  notifications where id = ?`, [id]);
};

const getNotifications = (fbid) => {
  let sql =
    "SELECT (SELECT username from users where fb_id = n.sender_id) as senderName, n.* FROM `notifications` n left JOIN users ur on ur.fb_id = n.receiver_id WHERE n.receiver_id = '" +
    fbid +
    "'";
  return db.query(sql);
};

const friendRequests = (id) => {
  return db.query(
    "SELECT a.* FROM `relationship` as a where a.user_two_id=" +
      id +
      " and a.status=0"
  );
};

const friends = (id) => {
  let sql =
    "SELECT b.id,b.username, a.status FROM `relationship` as a JOIN users as b on (a.user_one_id=b.id and a.user_one_id!=" +
    id +
    ") or (a.user_two_id=b.id and a.user_two_id!=" +
    id +
    ")  WHERE (a.`user_one_id` = " +
    id +
    " OR a.`user_two_id` = " +
    id +
    ") AND a.`status` = 1";
  return db.query(sql);
};
const getTotalSpent = (id) => {
  let sql =
    'SELECT SUM(amount) as totalspent from spent_log where user_id = "' +
    id +
    '" group by user_id ';
  //console.log(sql)
  return db.query(sql);
};

const userTransactions = (id) => {
  let sql = `select ut.*, u.username from user_transactions ut left join users u on ut.user_id=u.id where ut.user_id= ${id}`;
  //console.log(sql)
  return db.query(sql);
};
const matchRequests = (user) => {
  let sql = `select mr.*, g.game_name from match_requests mr left join games g on g.id = mr.gameId where (mr.toUser= '${user}'  or  mr.fromUser= '${user}') and status = 1`;
  //console.log(sql)
  return db.query(sql);
};
const getWithdrawals = () => {
  let sql = `select ut.*, u.username, u.email from user_transactions ut left join users u on ut.user_id=u.id`;
  //console.log(sql)
  return db.query(sql);
};
const getAdminTransactions = () => {
  let sql = `select * from admin_transactions`;
  //console.log(sql)
  return db.query(sql);
};
const matchMakingData = () => {
  let sql = `select mm.*, u.email as winnerEmail, p.charge_percentage from match_making mm
  left join users u on u.id = mm.winner left join pool p on mm.pool_id = p.id`;
  //console.log(sql)
  return db.query(sql);
};

const spentLogByuser = (id) => {
  let sql =
    'SELECT sp.*, us.username from spent_log sp left join users us on sp.user_id=us.id where sp.user_id = "' +
    id +
    '" ';
  //console.log(sql)
  return db.query(sql);
};
const isPoolExists = (creator_id, poolid = null) => {
  let myvar;
  if (poolid) {
    myvar = " and id=" + poolid;
  } else {
    myvar = "";
  }
  return db.query(
    "SELECT Count(*) as poolcount from pool where creator_id = " +
      creator_id +
      " and status = 1" +
      myvar
  );
};

const getUserCoins = (user_id) => {
  let sql = "SELECT coins from user_details where user_id =? ";
  return db.query(sql, [user_id]);
};

const getBetHistory = (game_id = null, user_id) => {
  let my;
  if (game_id) {
    my = " and bh.game_id=" + game_id + " ORDER BY bh.created_at DESC";
  } else {
    my = " ORDER BY bh.created_at DESC";
  }
  let sql =
    "SELECT bh.bet_amount, p.started, bh.win , DATE_FORMAT(bh.created_at, '%d  %b, %Y %H:%i') AS created from bet_history bh left join pool p on p.id = bh.poolid where p.started = 1 and bh.user_id = ? " +
    my;
  //console.log('sql111',sql);
  return db.query(sql, [user_id]);
};

const getBetHistoryMain = (user_id) => {
  console.log(user_id);
  let sql = `SELECT bh.*, g.game_name from bet_history bh 
    left JOIN games g on g.id = bh.game_id `;
  return db.query(sql);
};

const getBets = () => {
  let sql = `SELECT bh.id, bh.poolid,bh.game_id, bh.bet_amount,bh.created_at,bh.updated_at, g.game_name from bet_history bh 
    left JOIN games g on g.id = bh.game_id
    where  bh.user_id = 30 `;
  return db.query(sql);
};
const getBetsByGame = (id) => {
  let sql = `SELECT bh.id, bh.poolid,bh.game_id, bh.bet_amount,bh.created_at,bh.updated_at, g.game_name from bet_history bh 
    left JOIN games g on g.id = bh.game_id
    where g.id = '${id}' `;
  return db.query(sql);
};

const getChallenge = (game_id = null, sender) => {
  let my;
  if (game_id) {
    my = " and game_id=" + game_id;
  } else {
    my = "";
  }
  let sql =
    "SELECT id, status, poolid, sender, receiver, win_amount, bet_amount, end, DATE_FORMAT(created_time, '%d  %b, %Y %H:%i') AS created from challenges where  end = 0 and sender = ? " +
    my;
  return db.query(sql, [sender]);
};

const getChallenge01 = (cid) => {
  let sql = "SELECT * from challenges where  id = ? ";
  return db.query(sql, [cid]);
};

const receivedChallenge = (game_id = null, receiver) => {
  let my;
  if (game_id) {
    my = " and game_id=" + game_id;
  } else {
    my = "";
  }
  let sql =
    "SELECT id, status, poolid, sender, receiver, win_amount, bet_amount, end, DATE_FORMAT(created_time, '%d  %b, %Y %H:%i') AS created from challenges where end = 0 and receiver = ? " +
    my;
  return db.query(sql, [receiver]);
};

const getUserStats = (user_id) => {
  return db.query(
    "Select SUM(ps.battles_won) as battles_won, SUM(ps.battles_lost) as battles_lost, SUM(ps.coins_won) as coins_won, SUM(ps.coins_lost) as coins_lost, SUM(ps.battles_played) as battles_played from player_statistics ps where ps.user_id = ? group by ps.user_id ",
    [user_id]
  );
};

const createRecord = (id) => {
  let sql = "INSERT INTO `player_statistics` (user_id) values(" + id + ")";
  return db.query(sql);
};

const getCommission = () => {
  return db.query("SELECT profit_percent from users where id = '1' ");
};

const setCommission = (profit_percent) => {
  return db.query("UPDATE users SET profit_percent = ? WHERE id = ?", [
    profit_percent,
    1,
  ]);
};

const checkpool = (poolid) => {
  return db
    .query(
      "SELECT COUNT(*) as poolCount, started, participants, bet_amount from pool WHERE id = ? and status = 1 GROUP BY id",
      [poolid]
    )
    .then(async (result01) => {
      //console.log('result01',result01);
      if (result01.length > 0) {
        return result01;
      } else {
        return 0;
      }
    });
};

const userlist1 = (req, res) => {
  //return db.query("Select COALESCE((select SUM(amount) from spent_log WHERE user_id=us.id GROUP BY user_id),0) as total_spent, ps.coins_won, us.*,DATE_FORMAT(us.created_at, '%d  %b, %Y %H:%i') AS created, ud.phone, ud.coins, ud.location from users us LEFT JOIN user_details"+vl+" ud on us.id = ud.user_id left join player_statistics"+vl+" ps  on us.id = ps.user_id left join spent_log sl on us.id = sl.user_id WHERE us.isadmin != '1' order by us.created_at desc");
  return db.query(
    "Select COALESCE((select SUM(amount) from spent_log WHERE user_id=us.id GROUP BY user_id),0) as total_spent, ps.coins_won, us.*,DATE_FORMAT(us.created_at, '%d  %b, %Y %H:%i') AS created, ud.phone, ud.coins, ud.location from users us LEFT JOIN user_details ud on us.id = ud.user_id left join player_statistics ps  on us.id = ps.user_id  WHERE us.isadmin != '1' and username NOT IN (" +
      actors.toString() +
      ") order by us.created_at desc"
  );
};

const userlist = (req, res) => {
  //return db.query("Select COALESCE((select SUM(amount) from spent_log WHERE user_id=us.id GROUP BY user_id),0) as total_spent, ps.coins_won, us.*,DATE_FORMAT(us.created_at, '%d  %b, %Y %H:%i') AS created, ud.phone, ud.coins, ud.location from users us LEFT JOIN user_details"+vl+" ud on us.id = ud.user_id left join player_statistics"+vl+" ps  on us.id = ps.user_id left join spent_log sl on us.id = sl.user_id WHERE us.isadmin != '1' order by us.created_at desc");
  return db.query(
    "Select COALESCE((select SUM(amount) from spent_log WHERE user_id=us.id GROUP BY user_id),0) as total_spent, COALESCE((select SUM(coins_won) from player_statistics WHERE user_id=us.id GROUP BY user_id),0) as coins_won, us.*,  DATE_FORMAT(us.created_at, '%d  %b, %Y %H:%i') AS created, us.phone, ud.coins from users us LEFT JOIN user_details ud on us.id = ud.user_id  WHERE us.isadmin != '1' and username NOT IN (" +
      actors.toString() +
      ") order by us.created_at desc "
  );
};

const tableList = () => {
  let sql = "Select * from pooltables order by bet asc";
  return db.query(sql);
};

const gamesList = () => {
  let sql = "Select * from games order by game_name asc ";
  return db.query(sql);
};
const getBetDetail = (id) => {
  let sql = "Select * from bet_history where id = ?";
  return db.query(sql, [id]);
};
const getTableById = (id) => {
  return db.query("Select * from pooltables where id=?", [id]);
};

const createTable = (data) => {
  return db.query("INSERT INTO pooltables SET ?", Object.assign({}, data));
};

const addBetHistory = (data) => {
  return db.query("INSERT INTO bet_history SET ?", Object.assign({}, data));
};

const updateTable = (data) => {
  let sql =
    "UPDATE pooltables SET name = ?, bet = ?, percentage = ?, tabletype = ?, targetlines = ? where id=?";
  return db.query(sql, [
    data.name,
    data.bet,
    data.percentage,
    data.tabletype,
    data.targetlines,
    data.id,
  ]);
};

const kycRequest = (req, res) => {
  return db.query(
    "Select ua.*, us.username, DATE_FORMAT(ua.created_at, '%d  %b, %Y %H:%i') AS created from user_account ua LEFT JOIN users us on us.id = ua.user_id WHERE us.isadmin != '1' and username NOT IN (" +
      actors.toString() +
      ")"
  );
};

const redeemRequest = (req, res) => {
  return db.query(
    "Select ua.*, us.username, us.id as uid, DATE_FORMAT(ua.activity_date, '%d  %b, %Y %H:%i') AS created from redeem_history ua LEFT JOIN users us on us.id = ua.user_id WHERE us.isadmin != '1' and username NOT IN (" +
      actors.toString() +
      ")"
  );
};

const getUserCredit = (user_id) => {
  sql = "SELECT coins from user_details where user_id =? ";
  return db.query(sql, [user_id]);
};

const getVersion = () => {
  sql = "SELECT * from version";
  return db.query(sql);
};

const getLevel = () => {
  return db.query("SELECT * from ai_levels");
};

const updateVersion = (ver) => {
  let sql = "UPDATE version SET version = ?";
  return db.query(sql, [ver]);
};

const getBetAmount = (poolid, creator_id) => {
  sql =
    'SELECT `participants`->"$.player_' +
    creator_id +
    '.bet" as bet FROM pool WHERE id = "' +
    poolid +
    '"';
  console.log("getBetAmount:", sql);
  return db.query(sql);
};

const getBetAmount01 = (poolid, creator_id) => {
  sql = 'SELECT bet_amount FROM pool WHERE id = "' + poolid + '"';

  return db.query(sql);
};

const getUsersPerPool = (bet, status) => {
  var WHERE = "";
  if (bet) {
    WHERE = "where p.status = " + status + " and p.bet_amount =" + bet;
  } else {
    WHERE = "where p.status = " + status;
  }

  //sql = 'SELECT COUNT(*) as cnt, p.bet_amount, pt.name FROM pool p left JOIN pooltables pt on p.bet_amount = pt.bet '+WHERE+' GROUP BY p.bet_amount,pt.name';
  sql =
    "SELECT COUNT(*) as cnt, p.bet_amount, pt.name, pt.percentage, (2*COUNT(*)*p.bet_amount * (pt.percentage)/100 ) as profit FROM pool p left JOIN pooltables pt on p.bet_amount = pt.bet " +
    WHERE +
    " GROUP BY p.bet_amount,pt.name";
  //console.log('getUsersPerPool:',sql);
  return db.query(sql);
};

const getProfitPercent = (poolid) => {
  sql =
    "SELECT p.bet_amount as bet, pt.percentage from pool p left join pooltables pt on p.bet_amount = pt.bet where p.id =" +
    poolid;
  //console.log(sql);
  return db.query(sql);
};

const getProfitPercent01 = (bet) => {
  sql = "SELECT percentage from pooltables where bet =" + bet;
  //console.log(sql);
  return db.query(sql);
};
const getProfitPercent02 = (id) => {
  sql = "SELECT charge_percentage as percentage from pool where id =" + id;
  //console.log(sql);
  return db.query(sql);
};

// const getProfitPercent = (poolid) => {

//   sql = "SELECT p.bet_amount as bet from pool p where p.status = 1 and p.id ="+poolid;
//   //console.log('sql:',sql)
//   return db.query(sql);

// }

const getPaymentRec = (id) => {
  sql = 'SELECT user_id from payment_history where order_id ="' + id + '"';
  //console.log(sql);
  return db.query(sql);
};

const getUserEmail = (id) => {
  sql = 'SELECT email from users where id ="' + id + '"';
  return db.query(sql);
};
/* const recordTrans = (data, userid) => {
  sql = `insert into  user_transactions(user_id, amount, trans_id, trans_status,resp_code, resp_msg, details, type, withdraw) VALUES ('${userid}', '${data.amount}', '${data.trans_id}','${data.status}','${data.code}','${data.msg}','${data.details}','${data.type}', '${data.withdraw}')`;
  console.log(sql)
  return db.query(sql); 
} */

const recordTrans = (data, userid) => {
  sql = `select 1 from user_transactions where user_id = '${userid}'`;
  db.query(sql).then((data1) => {
    if (data1.length) {
      sql = `update  user_transactions set transactions = '${JSON.stringify(
        data
      )}' where user_id = '${userid}'`;
      return db.query(sql);
    } else {
      sql = `insert into  user_transactions(user_id, transactions) VALUES ('${userid}', '${JSON.stringify(
        data
      )}')`;
      return db.query(sql);
    }
  });
};
const recordAdminTrans = (data) => {
  sql = `insert into  admin_transactions(amount, type, details) VALUES ('${data.amount}', '${data.type}','${data.details}')`;
  return db.query(sql);
};
const recordRequest = (data) => {
  sql = `insert into  match_requests(gameId, fromUser, toUser, betAmount) VALUES ('${data.gameId}', '${data.fromUser}','${data.toUser}','${data.betAmount}')`;
  return db.query(sql);
};
const deleteRequest = (id) => {
  sql = `delete from  match_requests where id = '${id}'`;
  return db.query(sql);
};
const updateRequest = (id) => {
  sql = `update match_requests set approved = 1 where id = '${id}'`;
  return db.query(sql);
};
const updateMatchRequest = (id) => {
  sql = `update match_requests set status = 1 where id = '${id}'`;
  return db.query(sql);
};

const getUserAcc = (id) => {
  sql = `SELECT ud.coins, uac.* from user_account uac 
  left join user_details ud on uac.user_id = ud.user_id
  where ud.user_id  ='${id}'`;
  return db.query(sql);
};

const getUserUsername = (id) => {
  sql = 'SELECT username from users where id ="' + id + '"';
  return db.query(sql);
};
const checkuser = (username) => {
  sql = 'SELECT * from users where username ="' + username + '"';
  return db.query(sql);
};

const usernameConfirmation = (username) => {
  sql =
    'SELECT id from users where username = LOWER("' +
    username +
    '") order by username';
  console.log("username", sql);
  return db.query(sql);
};

const getUserId = (username) => {
  sql = 'SELECT id from users where username ="' + username + '"';
  return db.query(sql);
};
const getKycStatus = (id) => {
  sql = 'SELECT status from user_account where user_id ="' + id + '"';
  return db.query(sql);
};

const getIdByUsername = (username) => {
  sql = 'SELECT id from users where username ="' + username + '"';
  return db.query(sql);
};

const getRecords = () => {
  sql = "SELECT id from users";

  return db.query(sql);
};

const addPaymentHistory = (data) => {
  return db.query("INSERT INTO payment_history SET ?", Object.assign({}, data));
};
const getPaymentHistory = () => {
  return db.query(
    "Select us.id, us.username, ph.* from payment_history ph left join users us  on us.id = ph.user_id  WHERE us.isadmin != '1' and username NOT IN (" +
      actors.toString() +
      ")"
  );
};

const addRedeemHistory = (data) => {
  return getUserCoins(data.user_id).then(async (result) => {
    if (result[0].win_amount >= data.redeem_amount) {
      let rs1 = await updateUserBalance(data.user_id, data.redeem_amount, "-");
      await updateUserWinBalance(data.user_id, data.redeem_amount, "-");
      let spent = {
        user_id: data.user_id,
        amount: data.redeem_amount,
        spent_for: "Withdraw",
      };

      let rs9 = await addSpentLog(spent);
      return db.query(
        "INSERT INTO redeem_history SET ?",
        Object.assign({}, data)
      );
    } else {
      return { error: "You do not have sufficient balance.", success: false };
    }
  });
};

const updatePaymentHistory = (
  amount,
  trans_id,
  payment_status,
  respcode,
  respmsg,
  order_id
) => {
  let sql =
    "UPDATE payment_history SET amount = ?, trans_id = ?, payment_status = ?, respcode = ?, respmsg = ? WHERE order_id = ?";
  //console.log(sql);
  return db.query(sql, [
    amount,
    trans_id,
    payment_status,
    respcode,
    respmsg,
    order_id,
  ]);
};

const updateUserBalance = (user_id, amount, oper) => {
  let sql =
    "UPDATE user_details SET coins = IF(coins >= 0, coins " +
    oper +
    " " +
    amount +
    ", 0) WHERE user_id = ?";
  //console.log(sql);
  return db.query(sql, [user_id]);
};
const updateMatchMaking = (winnerId, poolId) => {
  let sql = "UPDATE match_making SET winner = ? WHERE pool_id = ?";
  //console.log(sql);
  return db.query(sql, [winnerId, poolId]);
};
const getUserMails2 = (id1, id2) => {
  let sql =
    "select (select email from users where id = ?) as player1Email, (select transactions from user_transactions where user_id = ?) as player1Trans, (select email from users where id = ?) as player2Email, (select transactions from user_transactions where user_id = ?) as player2Trans";
  console.log(sql);
  return db.query(sql, [id1, id1, id2, id2]);
};
const getUserMails3 = (id1, id2, id3) => {
  let sql =
    "select (select email from users where id = ?) as player1Email, (select transactions from user_transactions where user_id = ?) as player1Trans, (select email from users where id = ?) as player2Email, (select transactions from user_transactions where user_id = ?) as player2Trans, (select email from users where id = ?) as player3Email, (select transactions from user_transactions where user_id = ?) as player3Trans";
  //console.log(sql);
  return db.query(sql, [id1, id1, id2, id2, id3, id3]);
};
const getUserMails4 = (id1, id2, id3, id4) => {
  let sql =
    "select (select email from users where id = ?) as player1Email, (select transactions from user_transactions where user_id = ?) as player1Trans, (select email from users where id = ?) as player2Email, (select transactions from user_transactions where user_id = ?) as player2Trans, (select email from users where id = ?) as player3Email, (select transactions from user_transactions where user_id = ?) as player3Trans, (select email from users where id = ?) as player4Email, (select transactions from user_transactions where user_id = ?) as player4Trans";
  //console.log(sql);
  return db.query(sql, [id1, id1, id2, id2, id3, id3, id4, id4]);
};
const setMatchMaking = (players, bet_amount, pool_id) => {
  let sql = `insert into match_making(players, bet_amount, pool_id) values('${JSON.stringify(
    players
  )}','${bet_amount}','${pool_id}')`;
  //console.log(sql);
  return db.query(sql);
};
const getChargePercentage = () => {
  let sql = `select percentage from charge_percentage where id = 1`;
  return db.query(sql);
};
const updateUserWinBalance = (user_id, amount, oper) => {
  let sql =
    "UPDATE user_details SET win_amount = IF(win_amount >= 0, win_amount " +
    oper +
    " " +
    amount +
    ", 0) WHERE user_id = ?";
  return db.query(sql, [user_id]);
};

const updateUserStat = (user_id, game_id, field, amount, oper) => {
  return db
    .query("select id from player_statistics where user_id =? and game_id=? ", [
      user_id,
      game_id,
    ])
    .then((result) => {
      if (result.length > 0) {
        return db.query(
          "UPDATE player_statistics SET " +
            field +
            " = IF(" +
            field +
            " >= 0, " +
            field +
            " " +
            oper +
            " " +
            amount +
            ", 0) WHERE user_id =? and game_id=? ",
          [user_id, game_id]
        );
      } else {
        sql =
          "INSERT INTO player_statistics (user_id,game_id, " +
          field +
          ") values(" +
          user_id +
          "," +
          game_id +
          ", " +
          amount +
          ")";
        console.log(sql);
        return db.query(sql);
      }
    });
};

const updateUserStatTogether = (user_id, data) => {
  return db
    .query("select id from player_statistics where user_id =? ", [user_id])
    .then((result) => {
      if (result.length > 0) {
        console.log("data.length:", Object.keys(data).length);
        if (Object.keys(data).length == 4) {
          let sql =
            "UPDATE player_statistics SET battles_won = battles_won + " +
            data.battles_won +
            ", coins_won = coins_won + " +
            data.coins_won +
            ", coins_lost = coins_lost +" +
            data.coins_lost +
            ", battles_played = battles_played + " +
            data.battles_played +
            "  WHERE user_id = " +
            user_id;
          console.log(sql);
          return db.query(sql);
        } else {
          let sql =
            "UPDATE player_statistics SET battles_lost = battles_lost + " +
            data.battles_lost +
            ", coins_lost= coins_lost +" +
            data.coins_lost +
            ", battles_played = battles_played + " +
            data.battles_played +
            "  WHERE user_id = " +
            user_id;
          console.log(sql);
          return db.query(sql);
        }
      } else {
        return db.query(
          "INSERT INTO player_statistics SET ?",
          Object.assign({}, data)
        );
      }
    });
};

const updateUsername = (username, avatar, user_id) => {
  if (avatar) {
    avatar = ", avatar='" + avatar + "' ";
  } else {
    avatar = "";
  }
  return db.query(
    "UPDATE users SET username = ?  " + avatar + "  WHERE id = ?",
    [username, user_id]
  );
};

const updateUserAvatar = (user_id, base64_str) => {
  return db.query("UPDATE users SET avatar = ?  WHERE id = ?", [
    base64_str,
    user_id,
  ]);
};

const updateOffer = (name, base64_str, offer_percentage) => {
  return db.query(
    "UPDATE offers SET name = ?, image = ?, offer_percentage = ? WHERE id = ?",
    [name, base64_str, offer_percentage, 1]
  );
};

const updateLevel = (level) => {
  return db.query("UPDATE ai_levels SET difficulty_level = ?  WHERE id = ?", [
    level,
    1,
  ]);
};

const getUserDetail = (field, user_id) => {
  let sql = "select " + field + " from user_details WHERE user_id = ? ";
  return db.query(sql, [user_id]);
};

const getUserPhone = (user_id) => {
  let sql = "select phone from users WHERE id = ? ";
  return db.query(sql, [user_id]);
};

const getOffer = () => {
  let sql = "select name, image, offer_percentage from offers";
  //console.log('sql',sql);
  return db.query(sql);
};

const getUserDetails = (id) => {
  //return isUserExists(id).then((rslt) => {
  //   if(rslt[0].userCount > 0){
  let sql =
    "select us.id, us.username, us.unqid, us.email, us.avatar, ud.coins, ud.user_dp, ud.gender, ud.current_cue, ud.current_chat, ud.chat, ud.cue,  ps.battles_won, ps.battles_lost,ps.coins_won, ps.coins_lost, ps.battles_played from users us left join user_details ud on us.id = ud.user_id left join player_statistics ps on ps.user_id = us.id WHERE us.id = ? ";
  return db.query(sql, [id]);
  // }else{
  //   return {msg:'No User Found'}
  // }
  // });
};

const setLogedinUser = (session, user) => {
  session.id = user.id;
  session.usertype = user.isadmin;
  session.email = user.email;
  session.username = user.username;
  session.coins = user.coins;
  return session;
};

const getCuePrice = (id) => {
  let sql = "select price from cue WHERE id= ? ";
  //console.log('sql',sql);
  return db.query(sql, [id]);
};

const getChatPrice = (id) => {
  let sql = "select price from chat WHERE id= ? ";
  //console.log('sql',sql);
  return db.query(sql, [id]);
};

const updateCue = (user_id, cue_id) => {
  var cue, data;
  return db
    .query("SELECT cue from user_details WHERE user_id = ?", [user_id])
    .then((result) => {
      cue = result[0].cue;
      if (cue == null) {
        data = cue_id;
      } else {
        data = cue + "," + cue_id;
      }
      let sql = "UPDATE user_details SET cue = ? WHERE user_id = ?";

      return db.query(sql, [data, user_id]);
    });
};

const updateChat = (user_id, chat_id) => {
  var cue, data;
  return db
    .query("SELECT chat from user_details WHERE user_id = ?", [user_id])
    .then((result) => {
      chat = result[0].chat;
      if (chat == null) {
        data = chat_id;
      } else {
        data = chat + "," + chat_id;
      }

      let sql = "UPDATE user_details SET chat = ? WHERE user_id = ?";
      return db.query(sql, [data, user_id]);
    });
};

const setCurrentChat = (user_id, chat_id) => {
  var cue, data;
  return db
    .query("SELECT chat from user_details WHERE user_id = ?", [user_id])
    .then((result) => {
      chat = result[0].chat;

      if (chat == null) {
        return false;
      } else {
        var chatArr = chat.split(",");
        if (chatArr.indexOf(chat_id) != -1) {
          return db.query(
            "UPDATE user_details SET current_chat = ? WHERE user_id = ?",
            [chat_id, user_id]
          );
        } else {
          return { msg: "Please purchase this item first." };
        }
      }
    });
};

const setCurrentCue = (user_id, cue_id) => {
  return db
    .query("SELECT cue from user_details WHERE user_id = ?", [user_id])
    .then((result) => {
      cue = result[0].cue;
      if (cue == null) {
        return false;
      } else {
        var cueArr = cue.split(",");
        if (cueArr.indexOf(cue_id) != -1) {
          return db.query(
            "UPDATE user_details SET current_cue = ? WHERE user_id = ?",
            [cue_id, user_id]
          );
        } else {
          return { msg: "Please purchase this item first." };
        }
      }
    });
};

const buyCue = (req, res, userdata) => {
  let {
    body: { cue_id },
  } = req;

  var totalCoins,
    rs1,
    rs2,
    rs3,
    finalresult = {};

  db.query("SELECT coins from user_details WHERE user_id = ?", [
    userdata.user_id,
  ])
    .then(async (result) => {
      let totalCoins = result[0].coins;
      let rs = await getCuePrice(cue_id);
      let coins_left = totalCoins - rs[0].price;

      if (rs[0].price > totalCoins) {
        res.json({
          result: {
            success: false,
            error: "You do not have sufficient balance",
          },
        });

        return false;
      } else {
        rs1 = await updateUserBalance(userdata.user_id, rs[0].price, "-");
        rs2 = await updateUserBalance(1, rs[0].price, "+");
        rs3 = await updateCue(userdata.user_id, cue_id);
        let spent = {
          user_id: userdata.user_id,
          amount: rs[0].price,
          spent_for: "Cue purchase",
        };
        let rs4 = await addSpentLog(spent);
        rs3.coins_left = coins_left;
        return rs3;
      }
    })
    .then((newuser01) => {
      if (newuser01 == false) {
        return false;
      }

      if (newuser01.affectedRows) {
        finalresult.success = true;
        finalresult.msg = "Item purchased successfully.";
        finalresult.coins_left = newuser01.coins_left;

        return res.json({ result: finalresult });
      } else {
        return res.json({ result: { success: false } });
      }
    });
};

const buyChat = (req, res, userdata) => {
  let {
    body: { chat_id },
  } = req;

  var totalCoins,
    rs1,
    rs2,
    rs3,
    finalresult = {};

  db.query("SELECT coins from user_details WHERE user_id = ?", [
    userdata.user_id,
  ])
    .then(async (result) => {
      let totalCoins = result[0].coins;

      let rs = await getChatPrice(chat_id);

      let coins_left = totalCoins - rs[0].price;

      if (rs[0].price > totalCoins) {
        res.json({
          result: {
            success: false,
            error: "You do not have sufficient balance",
          },
        });

        return false;
      } else {
        //console.log('price:', rs[0].price);
        rs1 = await updateUserBalance(userdata.user_id, rs[0].price, "-");
        rs2 = await updateUserBalance(1, rs[0].price, "+");
        rs3 = await updateChat(userdata.user_id, chat_id);
        //console.log('rs3:',rs3);

        let spent = {
          user_id: userdata.user_id,
          amount: rs[0].price,
          spent_for: "Chat purchase",
        };
        let rs4 = await addSpentLog(spent);
        rs3.coins_left = coins_left;
        return rs3;
      }
    })
    .then((newuser01) => {
      if (newuser01 == false) {
        return false;
      }

      if (newuser01.affectedRows) {
        finalresult.success = true;
        finalresult.msg = "Item purchased successfully.";
        finalresult.coins_left = newuser01.coins_left;

        return res.json({ result: finalresult });
      } else {
        return res.json({ result: { success: false } });
      }
    });
};

const signup = (req, res) => {
  let {
    body: {
      device_id,
      pin,
      gender,
      username,
      dob,
      email,
      password,
      phone,
      avatar,
      push_id,
    },
  } = req;
  var user,
    newUser,
    newUserDetail,
    user_id = "",
    player_stat;

  if (!username) {
    var sp = email.split("@");
    username = sp[0];
  }
  if (!avatar) {
    avatar = 0;
  }

  db.query(
    "SELECT COUNT(*) as userCount, email, phone, username from users WHERE email = ? or username = ? or phone = ? GROUP BY email, username, phone",
    [email, username, phone]
  )
    .then((result) => {
      //console.log('signup result',result);
      user = result[0];

      if (result.length > 0) {
        if (user.email == email)
          return res.json({
            result: { success: false, error: "Email already exists!" },
          });
        if (user.username == username)
          return res.json({
            result: { success: false, error: "Username already exists!" },
          });
        if (user.phone == phone)
          return res.json({
            result: { success: false, error: "Phone Number already exists!" },
          });
        return false;
      } else {
        let unqid = shortid.generate(); //crypto.randomBytes(4).toString('hex');

        newUser = {
          unqid,
          username,
          phone,
          email,
          pin,
          password,
          avatar,
          device_id,
        };

        newUserDetail = {
          user_id,
          dob,
          coins: default_coins,
          gender,
        };

        if (push_id) {
          newUserDetail.push_id = push_id;
        }

        return db.createUser(newUser, newUserDetail);
      }
    })
    .then(async (newuser01) => {
      if (newuser01 == false) {
        return false;
      }

      if (newuser01.affectedRows) {
        newUser.id = newuser01.user_id;
        newUser.success = true;
        newUser.coins = 20;
        delete newUser.password;
        delete newUser.pin;
        if (req.originalUrl.indexOf("api") != -1) {
          var token = jwt.sign(
            { user_id: newuser01.user_id, username: username },
            process.env.SECRET_KEY
          );
          newUser.token = token;
        }
        newUser.avatar = avatar;
        return res.json({ result: newUser });
      /*   client.verify
          .services(sv)
          .verifications.create({ to: phone, channel: "sms" })
          .then(
            (verification) => {
              console.log("verification", verification);
              if (verification.status == "pending") {
                newUser.sms = "sent";
                return res.json({ result: newUser });
              } else {
                newUser.sms = "not sent";
                return res.json({ result: newUser });
              }
            },
            (err) => {
              console.log("err", err);
              if (err.code == 60200) {
                newUser.sms = "not sent";
                return res.json({ result: newUser });
              }
            }
          ); */
      } else {
        return res.json({
          result: { msg: "Couldn't save new user", success: false },
        });
      }
    });
};
const checkUserName = (req, res) => {
  let {
    body: { username },
  } = req;

  db.query("SELECT * from users WHERE username = ?", [username]).then(
    (result) => {
      //console.log('signup result',result);
      user = result[0];

      if (result.length > 0) {
        return res.json({
          result: { success: false, error: "Username already exists!" },
        });
        return false;
      } else {
        return res.json({
          result: { success: true, message: "Username available." },
        });
      }
    }
  );
};

/**
 *For login with facebook
 */
const facebookSignup = (req, res) => {
  let {
    session,
    body: { fb_id, location, username, email, device_id, game_id, push_id },
  } = req;
  var result = {},
    player_stat,
    user_id,
    rslt = {};

  db.query(
    "SELECT id, email, avatar, device_id, username from users WHERE fb_id = '" +
      fb_id +
      "' "
  )
    .then((rows) => {
      if (rows.length > 0) {
        user = rows[0];
        if (user.device_id != null && user.device_id != device_id) {
          res.json({
            result: {
              error: "Login failed\n You are logged in somewhere else. ",
              mssg: "Login failed\n You are logged in somewhere else.",
            },
          });
          return false;
        }
        setLogedinUser(session, user);
        result.success = true;
        result.avatar = user.avatar;
        rslt.user_id = user.id;
        return rslt;
      } else {
        let avatar = 0;
        let unqid = shortid.generate();

        let newUser = {
          unqid,
          fb_id,
          email,
          username,
          avatar,
          device_id,
        };

        let newUserDetail = {
          coins: default_coins,
        };

        if (push_id) {
          newUserDetail.push_id = push_id;
        }

        return db.createUserWithoutPass(newUser, newUserDetail);
      }
    })
    .then(async (rslt) => {
      console.log("rslt:", rslt);
      if (rslt == false) {
        return;
      }
      if (rslt.affectedRows == 1) {
        rslt.isadmin = 0;

        var setedUser = setLogedinUser(session, rslt);
        result.id = rslt.user_id;
        result.avatar = 0;
      } else {
        result.id = rslt.user_id;
      }
      console.log("result.id:", result.id);

      var ip =
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

      if (ip.substr(0, 7) == "::ffff:") {
        ip = ip.substr(7);
      }

      let last_activity = {
        user_id: result.id,
        ip: ip,
        status: "1",
      };

      //db.updateActivity('y', result.id);
      // db.addActivity(last_activity)

      let rs = await getUserDetails(result.id);

      let chat = rs[0].chat;
      let cue = rs[0].cue;
      let avatar = rs[0].avatar;

      if (chat != null) {
        chat = chat.split(",");
      } else {
        chat = 0;
      }

      if (cue != null) {
        cue = cue.split(",");
      } else {
        cue = 0;
      }
      await updateDeviceId(device_id, result.id);
      if (push_id) {
        await updatePush(push_id, result.id);
      }
      let rows = await friends(result.id);

      let friendlist = rows.map(function (row) {
        return row.id;
      });

      var token = jwt.sign(
        { user_id: result.id, username: session.username, coins: rs[0].coins },
        process.env.SECRET_KEY
      );

      let ckUser = await checkUserInPool(result.id);

      // if(ckUser.length >0){
      //   let poolid = ckUser[0].poolid
      //   let arr = JSON.parse(ckUser[0].kys);
      //   arr = arr.filter(item => item !== 'player_'+result.id)

      //   let winner_id = arr[0].split('_')[1];

      //   commitInner(winner_id, result.id , poolid, game_id, req);
      // }

      return res.json({
        result: {
          friends: friendlist,
          coins: rs[0].coins,
          avatar: result.avatar,
          isadmin: session.usertype,
          success: true,
          username: session.username,
          token: token,
          user_id: result.id,
          setCue: rs[0].current_cue,
          setChat: rs[0].current_chat,
          chat,
          cue,
          user_dp: rs[0].user_dp,
        },
      });
    })
    .catch((err) => console.log(err));
};

/**
 *For guest login
 */
const guestLogin = (req, res) => {
  let {
    session,
    body: { device_id, location, push_id },
  } = req;
  var result = {},
    player_stat,
    user_id;

  db.query("SELECT id, username, avatar from users WHERE device_id = ?", [
    device_id,
  ])
    .then((rows) => {
      if (rows.length > 0) {
        user = rows[0];
        setLogedinUser(session, user);
        result.success = true;
        result.avatar = user.avatar;
        let user_id = user.id;
        return user_id;
      } else {
        let username = "Guest" + crypto.randomBytes(2).toString("hex");
        let avatar = 0;
        let unqid = shortid.generate();
        let newUser = {
          unqid,
          username,
          avatar,
          device_id,
        };
        let newUserDetail = {
          coins: default_coins,
          location,
        };
        player_stat = {
          user_id,
        };

        if (push_id) {
          newUserDetail.push_id = push_id;
        }

        return db.createUserWithoutPass(newUser, newUserDetail, player_stat);
      }
    })
    .then(async (rslt) => {
      //console.log('rslt',rslt);
      if (rslt.affectedRows == 1) {
        rslt.isadmin = 0;
        rslt.email = null;

        var setedUser = setLogedinUser(session, rslt);
        result.id = rslt.user_id;
        result.avatar = 0;
      } else {
        result.id = rslt;
      }

      //console.log('result.id:',result.id)

      var ip =
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

      if (ip.substr(0, 7) == "::ffff:") {
        ip = ip.substr(7);
      }

      let last_activity = {
        user_id: result.id,
        ip: ip,
        status: "1",
      };

      //db.updateActivity('y', result.id);
      //db.addActivity(last_activity)
      if (push_id) {
        await updatePush(push_id, result.id);
      }
      let rs = await getUserDetails(result.id);
      if (rs) {
        let chat = rs[0].chat;
        let cue = rs[0].cue;
        let avatar = rs[0].avatar;
        if (chat != null) {
          chat = chat.split(",");
        } else {
          chat = 0;
        }

        if (cue != null) {
          cue = cue.split(",");
        } else {
          cue = 0;
        }

        let rows = await friends(result.id);

        let friendlist = rows.map(function (row) {
          return row.id;
        });

        var token = jwt.sign(
          {
            user_id: result.id,
            username: session.username,
            coins: rs[0].coins,
            user_dp: rs[0].user_dp,
          },
          process.env.SECRET_KEY
        );

        let ckUser = await checkUserInPool(result.id);

        if (ckUser.length > 0) {
          let poolid = ckUser[0].poolid;
          let arr = JSON.parse(ckUser[0].kys);
          arr = arr.filter((item) => item !== "player_" + result.id);

          let winner_id = arr[0].split("_")[1];

          commitInner(winner_id, result.id, poolid, game_id, req);
        }

        return res.json({
          result: {
            friends: friendlist,
            coins: rs[0].coins,
            avatar: result.avatar,
            isadmin: session.usertype,
            success: true,
            username: session.username,
            token: token,
            user_id: result.id,
            setCue: rs[0].current_cue,
            setChat: rs[0].current_chat,
            chat,
            cue,
          },
        });
      } else {
        return res.json({ result: { success: false } });
      }
    });
};
function getUsers02(userIds) {
  return map(userIds, async (userId) => {
    response = await checkUserInPool(userId.id);
    //console.log('respid',response);

    if (response.length > 0) {
      return response[0].userid;
    } else {
      return null;
    }
  });
}

const checkUserInPool = (
  user_id,
  started = null,
  logincheck = null,
  poolid = null
) => {
  let mywhere;
  if (started == null && logincheck == null) {
    mywhere = "";
  } else {
    mywhere = " and started = 0 and creator_id !=" + user_id;
  }

  if (poolid) {
    mywhere = " and id=" + poolid;
  }

  sql =
    'SELECT id as poolid, JSON_KEYS(participants) as kys, JSON_UNQUOTE(JSON_EXTRACT(participants, "$.player_' +
    user_id +
    '.user_id")) AS userid FROM pool WHERE JSON_EXTRACT(participants, "$.player_' +
    user_id +
    '.user_id") = ' +
    user_id +
    " and status=1" +
    mywhere;
  //console.log(sql);
  return db.query(sql);
};

const checkPoolFor = (user_id) => {
  sql =
    'SELECT id as poolid,game_id, JSON_KEYS(participants) as kys, JSON_UNQUOTE(JSON_EXTRACT(participants, "$.player_' +
    user_id +
    '.user_id")) AS userid FROM pool WHERE JSON_EXTRACT(participants, "$.player_' +
    user_id +
    '.user_id") = ' +
    user_id +
    " and status = 1 and started=1";
  // console.log(sql);
  return db.query(sql);
};

const getWinnerLooser = (poolid) => {
  sql = "SELECT * FROM wins WHERE poolid = ?";
  return db.query(sql, [poolid]);
};

/**
 *For bot login
 */
const botLogin = (req, res) => {
  var result = {},
    player_stat,
    user_id,
    pc,
    difference;
  let sql =
    "SELECT id FROM `users` WHERE username IN (" + actors.toString() + ")";
  return db
    .query(sql)
    .then(async (result) => {
      if (result.length > 0) {
        pc = await getUsers02(result);
        pc = pc.filter(Boolean).map(Number);
        result01 = result.map((a) => a.id);
        difference = result01
          .filter((x) => !pc.includes(x))
          .concat(pc.filter((x) => !result01.includes(x)));
      }

      // console.log('difference',difference);

      if (difference != undefined && difference.length > 0) {
        return difference[0];
      } else {
        let username = myArray[(Math.random() * myArray.length) | 0]; //'Guest'+crypto.randomBytes(2).toString('hex')+'-bt';
        let avatar = 0;
        let unqid = shortid.generate();
        let newUser = {
          unqid,
          username,
          avatar,
        };
        let newUserDetail = {
          coins: default_coins,
        };
        player_stat = {
          user_id,
        };
        return db.createUserWithoutPass(newUser, newUserDetail, player_stat);
      }
    })
    .then(async (rslt) => {
      //console.log('rslt',rslt);
      if (rslt.affectedRows == 1) {
        rslt.isadmin = 0;
        rslt.email = null;

        result.id = rslt.user_id;
        result.avatar = 0;
      } else {
        result.id = rslt;
      }

      let rs = await getUserDetails(result.id);

      if (rs.length > 0) {
        let chat = rs[0].chat;
        let cue = rs[0].cue;
        let avatar = Math.floor(Math.random() * 10); //rs[0].avatar;
        if (chat != null) {
          chat = chat.split(",");
        } else {
          chat = 0;
        }

        if (cue != null) {
          cue = cue.split(",");
        } else {
          cue = 0;
        }

        let rows = await friends(result.id);
        let [{ difficulty_level }] = await getLevel();
        let friendlist = rows.map(function (row) {
          return row.id;
        });
        let [{ username }] = await getUserUsername(result.id);

        return res.json({
          result: {
            difficulty_level,
            username,
            user_id: result.id,
            avatar: avatar,
            success: true,
            setCue: rs[0].current_cue,
            setChat: rs[0].current_chat,
            chat,
            cue,
            user_dp: rs[0].user_dp,
          },
        });
      } else {
        return res.json({ result: { success: false } });
      }
    });
};

const login = (req, res) => {
  P.coroutine(function* () {
    let {
      body: {
        email: email,
        password: rpassword,
        pin: rpin,
        push_id,
        device_id,
      },
      session,
    } = req;
    email = email.toLowerCase()
    let sql =
      'SELECT COUNT(id) as userCount, username, device_id, email, phone, id, pin, password, status, isadmin, phone_verify from users WHERE LOWER(email) = "' +
      email +
      '" or LOWER(username) = "' +
      email +
      '" or phone = "' +
      email +
      '" and pin IS NOT NULL GROUP BY id LIMIT 1';
    //console.log(sql)
    let user = yield db.query(sql);

    //console.log('Pool:',Pool);
    if (user.length) {
      let Pool = yield checkUserInPool(user[0].id);

      if (user[0].status == 0) {
        res.json({
          result: {
            error: "User inactive. Please contact administrator!",
            mssg: "User inactive. Please contact administrator!",
          },
        });
        return;
      }

      if (user[0].phone_verify == 0) {
        //let nv = {};
        let veri = yield client.verify
          .services(sv)
          .verifications.create({ to: user[0].phone, channel: "sms" });

        // if(veri.status == 'pending'){
        //   nv.sms = "sent"
        //   nv.message = "You need to verify your number."
        // }else{
        //  nv.sms = "not sent"
        //  nv.message = "You need to verify your number."
        // }

        res.json({
          result: {
            error: "You need to verify your number.",
            mssg: "You need to verify your number.",
          },
        });
        return;
      }

      let [{ userCount, id, password, username, email, isadmin, gender, pin }] =
        user;
      var same;
      if (!req.body.exist) {
        same = yield db.comparePassword(rpin, pin);
      } else {
        same = 1;
      }

      if (user[0].device_id != null && user[0].device_id != device_id) {
        yield client.verify
          .services(sv)
          .verifications.create({ to: user[0].phone, channel: "sms" });

        res.json({
          result: {
            error: "Login failed\n You are logged in somewhere else. ",
            mssg: "Login failed\n You are logged in somewhere else.",
          },
        });
        return;
      }
      console.log("user[0].phone_verify", user[0].phone_verify);

      if (!same) {
        return res.json({
          result: { error: "Wrong Pin!", mssg: "Wrong Pin!" },
        });
      } else {
        let m = yield updateDeviceId(device_id, user[0].id);
        if (push_id) {
          yield updatePush(push_id, user[0].id);
        }

        var setedUser = setLogedinUser(session, user[0]);

        let push_user_id;
        if (req.session.id) {
          push_user_id = req.session.id;
        } else {
          push_user_id = user[0].id;
        }

        var ip =
          req.headers["x-forwarded-for"] ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          req.connection.socket.remoteAddress;

        if (ip.substr(0, 7) == "::ffff:") {
          ip = ip.substr(7);
        }

        let last_activity = {
          user_id: user[0].id,
          ip: ip,
          status: "1",
        };

        //db.updateActivity('y', req.session.id);
        //db.addActivity(last_activity)

        if (setedUser.id) {
          yield updateLastLogin(user[0].id);
          if (req.originalUrl.indexOf("api") != -1) {
            let rs = yield getUserDetails(user[0].id);

            let chat = rs[0].chat;
            let cue = rs[0].cue;
            let avatar = rs[0].avatar;
            let gender = rs[0].gender;

            if (chat != null) {
              chat = chat.split(",");
            } else {
              chat = 0;
            }

            if (cue != null) {
              cue = cue.split(",");
            } else {
              cue = 0;
            }
            let rows = yield friends(id);

            let friendlist = rows.map(function (row) {
              return row.id;
            });

            var token = jwt.sign(
              { user_id: id, username: setedUser.username, coins: rs[0].coins },
              process.env.SECRET_KEY
            );

            let ckUser = yield checkUserInPool(id, 0, (logincheck = 1));
            if (ckUser.length > 0) {
              let poolid = ckUser[0].poolid;
              yield leavePool(id, poolid);
            }
            let winner_id, game_id;
            let ckUser001 = yield checkPoolFor(id);
            //console.log('ckUser001',ckUser001);

            if (ckUser001.length > 0) {
              let kys = JSON.parse(ckUser001[0].kys);
              if (kys.length > 0) {
                let kys0 = kys[0].split("_")[1];
                let kys1 = kys[1].split("_")[1];

                if (kys0 != id) {
                  winner_id = kys0;
                } else {
                  winner_id = kys1;
                }
              }
              looser_id = id;
              poolid = ckUser001[0].poolid;
              game_id = ckUser001[0].game_id;
              // console.log('winner_id',winner_id);
              // console.log('looser_id',looser_id);
              // console.log('poolid',poolid);

              yield commitInner(winner_id, looser_id, poolid, game_id, req);
            }

            return res.json({
              result: {
                friends: friendlist,
                isadmin: setedUser.usertype,
                success: true,
                username: setedUser.username,
                coins: rs[0].coins,
                token: token,
                user_id: setedUser.id,
                setCue: rs[0].current_cue,
                setChat: rs[0].current_chat,
                chat,
                cue,
                avatar,
                user_dp: rs[0].user_dp,
              },
            });
          } else {
            return res.json({
              result: {
                isadmin: setedUser.usertype,
                success: true,
                usertype: setedUser.usertype,
                user_id: setedUser.id,
              },
            });
          }
        } else {
          return res.json({
            result: { error: "something wrong", mssg: "something wrong" },
          });
        }
      }
    } else {
      return res.json({
        result: {
          error: "Phone number is incorrect",
          mssg: "Wrong Email/Phone/Username",
        },
      });
    }
  })();
};

const loginWeb = async (req, res) => {
 
  P.coroutine( function* () {
    let {
      body: { email: email, password: psw },
      session,
    } = req;
    
    let sql = `SELECT u.username, u.email, u.phone, u.pin, u.password, u.id, u.status, u.isadmin, u.phone_verify, ud.coins from users u
        join user_details ud on u.id = ud.user_id
        WHERE (email = '${email}' or username ='${email}' or phone ='${email}') `;
   
    let user = yield db.query(sql);
console.log(user)
    if (user.length) {
      
      let [{ userCount, id, password, username, email, isadmin, gender, pin }] =
        user;
      var same = yield  db.comparePassword(psw, pin);
      var equal = password==psw
      if(same||equal){
        let Pool = yield checkUserInPool(user[0].id);

        if (user[0].status == 0) {
          res.json({
            result: {
              error: "User inactive. Please contact administrator!",
              mssg: "User inactive. Please contact administrator!",
            },
          });
          return;
        }
  
        if (user[0].phone_verify == 0) {
          //let nv = {};
          let veri = yield client.verify
            .services(sv)
            .verifications.create({ to: user[0].phone, channel: "sms" });
  
          // if(veri.status == 'pending'){
          //   nv.sms = "sent"
          //   nv.message = "You need to verify your number."
          // }else{
          //  nv.sms = "not sent"
          //  nv.message = "You need to verify your number."
          // }
  
          res.json({
            result: {
              error: "You need to verify your number.",
              mssg: "You need to verify your number.",
            },
          });
          return;
        }
  
        var setedUser = setLogedinUser(session, user[0]);
        if (setedUser.id) {
          yield updateLastLogin(user[0].id);
          if (req.originalUrl.indexOf("api") != -1) {
            let rs = yield getUserDetails(user[0].id);
            console.log(rs);
          }
        }
        var token = jwt.sign(
          { user_id: setedUser.id, username: setedUser.username },
          process.env.SECRET_KEY
        );
        console.log("token is ", token);
        return res.json({
          result: {
            isadmin: setedUser.usertype,
            success: true,
            usertype: setedUser.usertype,
            user_id: setedUser.id,
            username: setedUser.username,
            coins: setedUser.coins,
            token: token,
            email: user[0].email,
            phone: user[0].phone,
          },
        });
      }
      else{
        return res.json({
          result: {
            error: "Wrong pin/password",
            mssg: "Wrong pin or password",
          },
        });
      }
    
     
    } else {
      return res.json({
        result: {
          error: "Phone number is incorrect",
          mssg: "Wrong Email/Phone/Username",
        },
      });
    }
      
   
  })();
};
/**
 *For checkInstall
 */
const checkInstall = (req, res) => {
  let {
    body: { device_id },
  } = req;

  db.query("SELECT COUNT(id) as userCount from installs WHERE device_id = ?", [
    device_id,
  ]).then(async (rows) => {
    if (rows[0].userCount > 0) {
      return res.json({ result: { success: false } });
    } else {
      let data = {
        device_id,
      };
      await db.query("INSERT INTO installs SET ?", Object.assign({}, data));
      return res.json({ result: { success: true } });
    }
  });
};

const checkField = (fields, tbl, where) => {
  let {
    body: { field },
  } = req;

  db.query("SELECT " + fields + " from " + tbl + "+ where +", [device_id]).then(
    async (rows) => {
      if (rows[0].userCount > 0) {
        return res.json({ result: { success: false } });
      } else {
        let data = {
          device_id,
        };
        await db.query("INSERT INTO installs SET ?", Object.assign({}, data));
        return res.json({ result: { success: true } });
      }
    }
  );
};

const wins = (data) => {
  return db.query("INSERT INTO wins SET ?", Object.assign({}, data));
};

const addSpentLog = (data) => {
  return db.query("INSERT INTO spent_log SET ?", Object.assign({}, data));
};

const addKyc = (data) => {
  //console.log('data',data);
  var pd, bd;
  return db
    .query("SELECT id, pan_doc, bank_doc from user_account WHERE user_id = ?", [
      data.user_id,
    ])
    .then((result) => {
      if (result.length > 0) {
        if (data.pan_doc) {
          pd = data.pan_doc;
        } else {
          pd = result[0].pan_doc;
        }

        if (data.bank_doc) {
          bd = data.bank_doc;
        } else {
          bd = result[0].bank_doc;
        }

        return db.query(
          "UPDATE `user_account` SET `full_name` = ?, bank_name = ? , acc_num = ?, ifsc_code=?, pan_num=?, pan_doc=?, bank_doc=?  WHERE  user_id=?",
          [
            data.full_name,
            data.bank_name,
            data.acc_num,
            data.ifsc_code,
            data.pan_num,
            pd,
            bd,
            data.user_id,
          ]
        );
      } else {
        return db.query(
          "INSERT INTO user_account SET ?",
          Object.assign({}, data)
        );
      }
    });
};

const roomList = (data) => {
  return db.query(
    "SELECT * from pool WHERE status = 1 and challenge = 0 and started = 0 and created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)"
  );
};

const roomList01 = (data) => {
  let sql =
    "SELECT p.* from pool p left join challenges c on c.poolid = p.id WHERE (c.sender ='" +
    data.username +
    "' or c.receiver='" +
    data.username +
    "') and p.status = 1 and p.challenge = 1 and p.started = 0 and p.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)";
  //console.log('sql112233:',sql);
  return db.query(sql);
};

const getStarted = (poolid) => {
  return db.query(
    "SELECT started from pool WHERE id=" + poolid + " and started = 0 "
  );
};

const uploadDoc = (path, field) => {
  return field.mv(path, function (err) {
    if (err) {
      return { success: false, err };
    } else {
      return { success: true };
    }
  });
};

const joinPool = (data) => {
  let creator_id;
  return db
    .query(
      "SELECT COUNT(*) as poolCount, bet_amount, participants from pool WHERE id = ? GROUP BY id",
      [data.poolid]
    )
    .then(async (result01) => {
      //console.log('result01',result01);
      if (result01.length <= 0) {
        return { error: "Room does not exists.", success: false };
      }
      let particep = result01[0].participants;

      if (particep) {
        let numOfPart = Object.keys(JSON.parse(particep));
        creator_id = numOfPart[0].split("_")[1];
        //console.log('creator_id',creator_id);
        if (numOfPart.length > 4) {
          return { error: "Room is full.You can not join", success: false };
        }
      }

      let rs = await getUserCredit(data.user_id);

      let credits = rs[0].coins;

      if (credits >= result01[0].bet_amount) {
        if (result01[0].poolCount > 0) {
          let sql =
            "UPDATE pool SET `participants` = JSON_SET(`participants` ,'$.player" +
            "_" +
            data.user_id +
            "' , JSON_OBJECT('bet'," +
            result01[0].bet_amount +
            " , 'user_id', " +
            data.user_id +
            ")) WHERE `id` = '" +
            data.poolid +
            "'";
          let result = await db.query(sql);
          result.creator_id = creator_id;
          result.bet = result01[0].bet_amount;
          //await updateUserBalance(data.user_id, result01[0].bet_amount ,'-');
          await deleteOldPool(creator_id, data.poolid);
          return result;
        } else {
          return { error: "No Room exists", success: false };
        }
      } else {
        return { error: "You don't have enough credits.", success: false };
      }
    });
};

const leavePool = (userId, poolId) => {
  return db.query(
    "UPDATE pool SET participants = JSON_REMOVE(`participants`, '$.player" +
      "_" +
      userId +
      "') WHERE id=?",
    [poolId]
  );
};

const deletePool = (creator_id, poolid = null) => {
  let myvar;
  if (poolid) {
    myvar = " and id=" + poolid;
  } else {
    myvar = "";
  }
  return db.query("DELETE FROM  pool where creator_id = ?" + myvar, [
    creator_id,
  ]);
};

const deleteOldPool = (creator_id, poolid) => {
  return db.query(`DELETE FROM  pool where creator_id = ? and id != ?`, [
    creator_id,
    poolid,
  ]);
};

// const deleteOldPool = (creator_id, poolid) => {

//   return db.query(`DELETE FROM  pool where creator_id = ? and id != ?`, [creator_id, poolid]);
// }

// const setDflagForPool = (poolid) => {

//   return db.query(`UPDATE pool set dflag = 1 where creator_id = ? and poolid != ?`, [creator_id, poolid]);
// }

const updatePool = (poolid) => {
  return db.query(`UPDATE pool set status = 0 where id = ?`, [poolid]);
};

const startGame = (poolid) => {
  return db.query(`UPDATE pool set started = 1 where id = ?`, [poolid]);
};

const updatePush = (push_id, user_id) => {
  return db.query(`UPDATE user_details set push_id = ? where user_id = ?`, [
    push_id,
    user_id,
  ]);
};

const doTransaction = (userid) => {
  return checkUserInPool(userid);
  //   md.doTransaction(userid)
  //   .then((result ) => {
  //  //res.status(200).json({result});
  //       Commit()
  //   })
};

const createPool = (userdata) => {
  //console.log(userdata);
  var credits;
  //let data = userdata;
  return getUserCredit(userdata.user_id).then(async (rs) => {
    let str = userdata.username;
    let username = str.substr(0, 5);
    if (username == "Guest") {
      credits = userdata.bet;
    } else {
      credits = rs[0].coins;
    }
    //console.log('credits',credits);
    //console.log('bet',userdata.bet);
    let data = {
      challenge: userdata.challenge,
      creator_id: userdata.user_id,
      description: userdata.desc,
      charge_percentage: userdata.chargePercentage,
      participants:
        '{"player_' +
        userdata.user_id +
        '":{"user_id":"' +
        userdata.user_id +
        '","bet":' +
        userdata.bet +
        "}}",
    };

    if (credits >= userdata.bet) {
      data.bet_amount = userdata.bet;
      //sawait updateUserBalance(userdata.user_id, userdata.bet ,'-');
      return db.query("INSERT INTO pool SET ?", Object.assign({}, data));
    } else {
      return { error: "User do not have enough credits." };
    }
  });
};
const createPoolWeb = (data) => {
  return db.query("INSERT INTO pool SET ?", Object.assign({}, data));
};

const editPoolWeb = (data) => {
  return db.query("update pool set game_id = ?, bet_amount = ? where id = ?", [
    data.game,
    data.bet,
    data.poolid,
  ]);
};
const updatePercentage = (percentage) => {
  return db.query("update charge_percentage set percentage = ? where id = 1", [
    percentage
  ]);
};
const editBetHistory = (data) => {
  return db.query(
    "update bet_history set game_id = ?, bet_amount = ? where id = ?",
    [data.game, data.bet, data.id]
  );
};

// const createPool = (data, bet, otheruser) => {
//   var credits, credits_vl;
//   return getUserCredit(data.creator_id).then( async (rs)=> {

//     let [username01] = await getUserUsername(data.creator_id);
//     let [username02] = await getUserUsername(otheruser);
//     //console.log('nmn',myArray.indexOf(username01.username))
//     if(myArray.indexOf(username01.username) == -1){
//        credits = bet;
//     }else{
//        credits = rs[0].coins;
//     }
//       let rs_vl = await getUserCredit(otheruser);
//       //console.log('nmn11',myArray.indexOf(username02.username))
//       if(myArray.indexOf(username02.username) == -1){
//          credits_vl = bet;
//       }else{
//          credits_vl = rs_vl[0].coins;
//       }
// //console.log('credits',credits)
// //console.log('credits_vl',credits_vl)
//   if(credits >= bet && credits_vl >= bet){
//           data.bet_amount = bet;
//           return  db.query('INSERT INTO pool SET ?', Object.assign({}, data));
//   }else{
//       return {"error":"One of user do not have enough credits."}
//   }

//   })
// }

const commitInner = async (winner_id, looser_id, poolid, game_id, req) => {
  let rs = await getProfitPercent(poolid);
  let [{ percentage }] = await getProfitPercent02(poolid);
  let percent = percentage;
  console.log("percentage from db", percent);

  var bet = rs[0].bet;
  let winner_amount = Math.round((bet * 2 * (100 - percent)) / 100);
  let admin_amount = Math.round((bet * 2 * percent) / 100);
  let dp = await updatePool(poolid);

  let spent_l = {
    user_id: looser_id,
    amount: bet,
    spent_for: "lost in pool game",
  };

  let spent_w = {
    user_id: winner_id,
    amount: winner_amount,
    spent_for: "Won in pool game",
  };

  let win = {
    poolid: poolid,
    winner: winner_id,
    looser: looser_id,
  };

  let wi = await wins(win);
  await updateWin(winner_id, poolid, 1);

  let rs2 = await updateUserBalance(winner_id, winner_amount, "+");
  //await updateUserWinBalance(winner_id, (winner_amount - bet) ,'+')

  let rs3 = await updateUserBalance(1, admin_amount, "+");
  let rs4 = await updateUserStat(winner_id, game_id, "battles_won", 1, "+");
  let rs5 = await updateUserStat(looser_id, game_id, "battles_lost", 1, "+");
  let rs6 = await updateUserStat(winner_id, game_id, "coins_lost", bet, "+");
  let coins_won = parseInt(winner_amount);

  let rs12 = await updateUserStat(
    winner_id,
    game_id,
    "coins_won",
    coins_won,
    "+"
  );
  let rs7 = await updateUserStat(looser_id, game_id, "coins_lost", bet, "+");
  let rs8 = await updateUserStat(looser_id, game_id, "battles_played", 1, "+");
  let rs11 = await updateUserStat(winner_id, game_id, "battles_played", 1, "+");
  let rs9 = await addSpentLog(spent_l);
  let rs10 = await addSpentLog(spent_w);

  if (rs2 && rs4) {
    return rs4;
  }
  return false;
};

const Commit = (req, res, userdata) => {
  let {
    body: { winner_id, looser_id, poolid, game_id },
  } = req;
  var rs1 = "";

  return db
    .query(
      'SELECT Count(*) as usercount from users where id = "' + looser_id + '"'
    )
    .then(async (result01) => {
      //console.log('result012345',result01);
      if (result01[0].usercount > 0) {
        let nfp = await checkpool(poolid);
        if (nfp.length > 0) {
          let no_of_particp = Object.keys(JSON.parse(nfp[0].participants));
          if (no_of_particp.length <= 1) {
            return { error: "Less number of participants" };
          }
          if (nfp[0].started != 1) {
            return { error: "Game not started yet" };
          }
        } else {
          return { error: "No Pool Found" };
        }
        return commitInner(winner_id, looser_id, poolid, game_id, req);
      } else {
        return { error: "user does not exist" };
      }
    });
};

const newcommitInner = async (winner_id, looser, poolid, game_id, req) => {
  let rs = await getProfitPercent(poolid);
  let [{percentage}] =  await getProfitPercent02(poolid);
  let percent = percentage
  console.log("percentage from db", percent);
  let count = Object.keys(looser).length + 1;
  var bet = rs[0].bet;
  let winner_amount = Math.round((bet * count * (100 - percent)) / 100);
  let admin_amount = Math.round((bet * count * percent) / 100);
  let dp = await updatePool(poolid);

  let spent_l = {
    user_id: looser.looser01,
    amount: bet,
    spent_for: "lost in pool game",
  };

  let spent_w = {
    user_id: winner_id,
    amount: winner_amount,
    spent_for: "Won in pool game",
  };

  let win = {
    poolid: poolid,
    winner: winner_id,
    looser: looser.looser01,
  };
  var data = {
    amount: bet * count,
    type: "Debit",
    details: "Winner amount debited",
  };
  var data1 = {
    amount: admin_amount,
    type: "Credit",
    details: "Game charges credited",
  };
  var emails = await getUserMails2(winner_id, winner_id);
  var userData1 = JSON.parse(emails[0].player1Trans);
  var userTransData = {
    amount: bet * count,
    trans_id: Date.now(),
    status: "success",
    type: "Credit",
    details: "Winner amount credited",
    withdraw: 0,
    poolId: poolid,
  };

  if (userData1) {
    userData1.push(userTransData);
  } else {
    userData1 = [];
    userData1.push(userTransData);
  }
  var userTransData1 = {
    amount: admin_amount,
    trans_id: Date.now(),
    status: "success",
    type: "Debit",
    details: "Game charges debited",
    withdraw: 0,
    poolId: poolid,
  };
  var userData2 = userData1;
  userData2.push(userTransData1);
  await updateWin(winner_id, poolid, 1);

  let t1 = await recordAdminTrans(data);
  let t4 = await recordAdminTrans(data1);
  let t2 = await recordTrans(userData1, winner_id);
  let t3 = await recordTrans(userData2, winner_id);
  let rs25 = await updateMatchMaking(winner_id, poolid);

  let coins_won = parseInt(winner_amount);
  let rs3 = await updateUserBalance(1, admin_amount, "+");
  let rs2 = await updateUserBalance(winner_id, winner_amount, "+");
  let rs4 = await updateUserStat(winner_id, game_id, "battles_won", 1, "+");
  let rs6 = await updateUserStat(winner_id, game_id, "coins_lost", bet, "+");
  let rs12 = await updateUserStat(
    winner_id,
    game_id,
    "coins_won",
    coins_won,
    "+"
  );
  let rs11 = await updateUserStat(winner_id, game_id, "battles_played", 1, "+");
  let rs10 = await addSpentLog(spent_w);

  switch (Object.keys(looser).length) {
    case 1:
      await updateUserStat(looser.looser01, game_id, "coins_lost", bet, "+");
      await updateUserStat(looser.looser01, game_id, "battles_lost", 1, "+");
      await updateUserStat(looser.looser01, game_id, "battles_played", 1, "+");
      await addSpentLog(spent_l);
      await wins(win);
      break;
    case 2:
      await updateUserStat(looser.looser01, game_id, "coins_lost", bet, "+");
      await updateUserStat(looser.looser01, game_id, "battles_lost", 1, "+");
      await updateUserStat(looser.looser01, game_id, "battles_played", 1, "+");
      await addSpentLog(spent_l);

      await updateUserStat(looser.looser02, game_id, "coins_lost", bet, "+");
      await updateUserStat(looser.looser02, game_id, "battles_lost", 1, "+");
      await updateUserStat(looser.looser02, game_id, "battles_played", 1, "+");
      spent_l.user_id = looser.looser02;
      await addSpentLog(spent_l);
      win.looser02 = looser.looser02;
      await wins(win);
      break;
    case 3:
      await updateUserStat(looser.looser01, game_id, "coins_lost", bet, "+");
      await updateUserStat(looser.looser01, game_id, "battles_lost", 1, "+");
      await updateUserStat(looser.looser01, game_id, "battles_played", 1, "+");

      await updateUserStat(looser.looser02, game_id, "coins_lost", bet, "+");
      await updateUserStat(looser.looser02, game_id, "battles_lost", 1, "+");
      await updateUserStat(looser.looser02, game_id, "battles_played", 1, "+");
      spent_l.user_id = looser.looser02;
      await addSpentLog(spent_l);

      await updateUserStat(looser.looser03, game_id, "coins_lost", bet, "+");
      await updateUserStat(looser.looser03, game_id, "battles_lost", 1, "+");
      await updateUserStat(looser.looser03, game_id, "battles_played", 1, "+");
      spent_l.user_id = looser.looser03;
      await addSpentLog(spent_l);
      win.looser02 = looser.looser02;
      win.looser03 = looser.looser03;
      await wins(win);
      break;

    default:
      console.log("looser.length", Object.keys(looser).length);
  }

  if (rs2 && rs4) {
    return rs4;
  }
  return false;
};

const newCommit = (req, res, userdata) => {
  let {
    body: { winner_id, poolid, game_id },
  } = req;

  //looser = JSON.parse(looser);
  var rs1 = "";
  let looser;

  return db
    .query(
      'SELECT Count(*) as usercount from users where id = "' + winner_id + '"'
    )
    .then(async (result01) => {
      //console.log('result012345',result01);
      if (result01[0].usercount > 0) {
        let nfp = await checkpool(poolid);
        if (nfp.length > 0) {
          let new_no_of_particp = Object.keys(JSON.parse(nfp[0].participants));
          let no_of_particp = new_no_of_particp.filter(function (item) {
            return item != "player_" + winner_id;
          });
          console.log("no_of_particp", no_of_particp);

          if (new_no_of_particp.length <= 1) {
            return { error: "Less number of participants" };
          }
          if (nfp[0].started != 1) {
            return { error: "Game not started yet" };
          }
          if (no_of_particp.length == 1) {
            looser = { looser01: no_of_particp[0].split("_")[1] };
          } else if (no_of_particp.length == 2) {
            looser = {
              looser01: no_of_particp[0].split("_")[1],
              looser02: no_of_particp[1].split("_")[1],
            };
          } else if (no_of_particp.length == 3) {
            looser = {
              looser01: no_of_particp[0].split("_")[1],
              looser02: no_of_particp[1].split("_")[1],
              looser03: no_of_particp[2].split("_")[1],
            };
          }
        } else {
          return { error: "No Pool Found" };
        }
        console.log("looser", looser);
        return newcommitInner(winner_id, looser, poolid, game_id, req);
      } else {
        return { error: "user does not exist" };
      }
    });
};

const newDraw = (req, res) => {
  let {
    body: { poolid },
  } = req;

  return checkpool(poolid).then(async (nfp) => {
    if (nfp.length > 0) {
      let no_of_particp = Object.keys(JSON.parse(nfp[0].participants));
      let rs = await getProfitPercent(poolid);
      let [{ percentage }] = await getProfitPercent02(poolid);
      let percent = percentage;
      console.log("percentage from db", percent);
      let count = no_of_particp.length;
      var bet = rs[0].bet;
      let totalBet = bet * count;
      let admin_amount = Math.round((totalBet * percent) / 100);
      let amount_each = (totalBet - admin_amount) / count;

      if (no_of_particp.length <= 1) {
        return { error: "Less number of participants" };
      }
      if (nfp[0].started != 1) {
        return { error: "Game not started yet" };
      }
      if (no_of_particp.length == 2) {
        await updateUserBalance(
          no_of_particp[0].split("_")[1],
          amount_each,
          "+"
        );
        await updatePool(poolid);
        return await updateUserBalance(
          no_of_particp[1].split("_")[1],
          amount_each,
          "+"
        );
      } else if (no_of_particp.length == 3) {
        await updateUserBalance(
          no_of_particp[0].split("_")[1],
          amount_each,
          "+"
        );
        await updateUserBalance(
          no_of_particp[1].split("_")[1],
          amount_each,
          "+"
        );
        await updatePool(poolid);
        return await updateUserBalance(
          no_of_particp[2].split("_")[1],
          amount_each,
          "+"
        );
      } else if (no_of_particp.length == 4) {
        await updateUserBalance(
          no_of_particp[0].split("_")[1],
          amount_each,
          "+"
        );
        await updateUserBalance(
          no_of_particp[1].split("_")[1],
          amount_each,
          "+"
        );
        await updateUserBalance(
          no_of_particp[2].split("_")[1],
          amount_each,
          "+"
        );
        await updatePool(poolid);
        return await updateUserBalance(
          no_of_particp[3].split("_")[1],
          amount_each,
          "+"
        );
      }
    } else {
      return { error: "No Pool Found" };
    }
  });
};

// FOR DETAILS OF GIVEN USER
const updateUser = (req, res, data) => {
  //console.log('data',data);
  let {
    body: {
      userid,
      username,
      user_dp,
      coins,
      power_ups,
      no_of_levels,
      no_of_aircrafts,
      push_id,
    },
  } = req;
  console.log("body:", req.body);

  userid = data.user_id;
  var query0 = "UPDATE users SET ";
  var query1 = "UPDATE user_details SET ";
  var where0 = " WHERE id = " + userid;
  var where1 = " WHERE user_id = " + userid;
  var noerror0 = 0;
  var noerror1 = 0;

  var re0 = {};
  re1 = {};

  if (username) {
    if (noerror0 == 1) {
      query0 += ', username = "' + username + '"';
    } else {
      query0 += 'username = "' + username + '"';
    }

    noerror0 = 1;
  }

  if (power_ups) {
    if (noerror1 == 1) {
      query1 += ', power_ups = "' + power_ups + '"';
    } else {
      query1 += 'power_ups = "' + power_ups + '"';
    }
    noerror1 = 1;
  }

  if (user_dp) {
    console.log("user_dp111", user_dp);
    if (noerror1 == 1) {
      query1 += ', user_dp = "' + user_dp + '"';
    } else {
      query1 += 'user_dp = "' + user_dp + '"';
    }
    noerror1 = 1;
  }

  if (coins) {
    if (noerror1 == 1) {
      query1 += ', coins = "' + coins + '"';
    } else {
      query1 += 'coins = "' + coins + '"';
    }
    noerror1 = 1;
  }

  if (no_of_levels) {
    if (noerror1 == 1) {
      query1 += ', no_of_levels = "' + no_of_levels + '"';
    } else {
      query1 += 'no_of_levels = "' + no_of_levels + '"';
    }
    noerror1 = 1;
  }

  if (no_of_aircrafts) {
    if (noerror1 == 1) {
      query1 += ', no_of_aircrafts = "' + no_of_aircrafts + '"';
    } else {
      query1 += 'no_of_aircrafts = "' + no_of_aircrafts + '"';
    }
    noerror1 = 1;
  }

  if (push_id) {
    if (noerror1 == 1) {
      query1 += ', push_id = "' + push_id + '"';
    } else {
      query1 += 'push_id = "' + push_id + '"';
    }
    noerror1 = 1;
  }

  return isUserExists(userid)
    .then(async (result) => {
      console.log("result", result);
      console.log("userid", userid);

      if (result[0].usercount >= 1) {
        if (noerror0 == 1) {
          re0 = await db.query(query0 + where0);
        }
        console.log("user_dp222", query0 + where0);
        if (noerror1 == 1) {
          re1 = await db.query(query1 + where1);
        }
        console.log("user_dp222", query1 + where1);
        return { ...re0, ...re1 };
      }
    })
    .catch(function (err) {
      if (err.code == "ER_EMPTY_QUERY") {
        res.end(
          JSON.stringify({
            result: {
              mssg: "There is no changes in the update",
              success: true,
            },
          })
        );
      }
    });
};
// FOR DETAILS OF GIVEN USER
const deleteRecord = (id, tbl) => {
  var query0 = "SELECT Count(*) from " + tbl + ' where id = "' + id + '"';

  return db.query(query0).then((row) => {
    user = row;
    if (user.length > 0) {
      return db.query("DELETE FROM  " + tbl + " where id=?", [id]);
    }
  });
};
const deletePoolWeb = (id) => {
  return db.query("DELETE FROM  pool where id=?", [id]);
};
const deleteBet = (id) => {
  return db.query("DELETE FROM  bet_history where id=?", [id]);
};
// FOR DETAILS OF GIVEN USER
const updateUserStatus = (req, res) => {
  let {
    body: { id: id, status: status },
    session,
  } = req;

  status = status == 0 ? 1 : 0;

  //console.log('status:', status);
  var query0 = 'SELECT username, email from users where id = "' + id + '"';

  db.query(query0, function (err0, result0) {
    if (err0) {
      generateError(res, "Error retrieving user data");
    } else {
      var _result0 = JSON.parse(JSON.stringify(result0));
      if (_result0.length > 0) {
        var query1 =
          'UPDATE users SET status= "' + status + '" WHERE id = "' + id + '"';
        db.query(query1, function (err1, result1) {
          if (err1) {
            generateError(res, "Error updating profile!");
          } else {
            res.end(
              JSON.stringify({
                result: { mssg: "Profile updated successfully", success: true },
              })
            );
          }
        });
      } else {
        generateError(res, "User not found!");
      }
    }
  });
};

// FOR DETAILS OF GIVEN USER
const updateAccountStatus = (req, res) => {
  let {
    body: { id: id, status: status },
    session,
  } = req;
  var username, email, user_id;
  status = status == "approved" ? "disapproved" : "approved";

  //console.log('status:', status);
  var query0 =
    'SELECT status, user_id from user_account where id = "' + id + '"';

  db.query(query0, function (err0, result0) {
    if (err0) {
      generateError(res, "Error retrieving user data");
    } else {
      var _result0 = JSON.parse(JSON.stringify(result0));
      if (_result0.length > 0) {
        user_id = _result0.user_id;
        var query1 =
          'UPDATE user_account SET status= "' +
          status +
          '" WHERE id = "' +
          id +
          '"';
        //console.log(query1)
        db.query(query1, async function (err1, result1) {
          if (err1) {
            generateError(res, "Error updating profile!");
          } else {
            var rs = await getUserEmail(_result0[0].user_id);

            if (rs.length > 0) {
              email = rs[0].email;
              username = rs[0].email.split("@")[0];
              let options = {
                to: rs[0].email,
                subject: "KYC Request Approved",
              };

              let renderable = {
                template: path.join("emails", "users", "kyc_approved.html"),
                locals: {
                  host: req.hostname,
                  username: username,
                },
              };

              let rr1 = await mail(options, renderable);
              console.log("rr1", rr1);
            }
            res.end(
              JSON.stringify({
                result: { mssg: "Status updated successfully", success: true },
              })
            );
          }
        });
      } else {
        generateError(res, "Record not found!");
      }
    }
  });
};

//Forgot Password
const forgot = (req, res) => {
  P.coroutine(function* () {
    let {
      body: { email: email },
      session,
    } = req;

    return db
      .query(
        "SELECT COUNT(*) as userCount, id from users WHERE email = ? and isadmin !='1' group by id",
        [email]
      )
      .then((row) => {
        console.log("query executed", row);
        if (row.length > 0) {
          if (row[0].userCount == 1) {
            db.updateToken(row[0].id, req, res)
              .then(function (result) {
                if (result.status == 1 && result.data != null) {
                  res.json({
                    result: {
                      mssg: "Email! sent successfully!!",
                      success: true,
                    },
                  });
                } else {
                  res.json({
                    result: {
                      mssg: "Email! could not be sent",
                      success: false,
                    },
                  });
                }
              })
              .catch((err) => console.log(err));
          } else {
            res.status(400).json({
              mssg: "No account with that email address exists.",
              success: false,
            });
          }
        } else {
          res.status(400).json({ mssg: "No record exists.", success: false });
        }
      });
  })();
};

//Reset Password
const reset = (req, res) => {
  P.coroutine(function* () {
    let token = req.params.token;
    //console.log('token:',token);
    db.query(
      'SELECT user_id, resetPasswordExpires From user_details WHERE resetPasswordToken = "' +
        token +
        '"'
    ).then(async (result) => {
      //console.log('result',result);
      if (result.length > 0) {
        row = JSON.parse(JSON.stringify(result));
        var userid = row[0].user_id;
        var [{ email }] = await getUserEmail(userid);
        var resetPasswordExpires = row[0].resetPasswordExpires;

        if (row.length == 1) {
          let twoHoursBefore = resetPasswordExpires + 2 * 60 * 60 * 1000;

          if (twoHoursBefore > Date.now()) {
            res.render("front/updatepassword", { email, userid });
          } else {
            res.redirect("/error");
          }
        } else {
          console.log("token not exists");
        }
      } else {
        console.log("result else");
        res.redirect("/error");
      }
    });
  })();
};
const onlineUsers = () => {
  return db.query(
    'Select username from users where online="y" and username NOT IN (' +
      actors.toString() +
      ")"
  );
};
const totalUsers1 = () => {
  return db.query(
    'SELECT COUNT(*) userCount,(select COUNT(*) from users where online="y" and username NOT IN (' +
      actors.toString() +
      ")) as online_users FROM users WHERE username NOT IN (" +
      actors.toString() +
      ")"
  );
};
const totalUsers = () => {
  return db.query(
    "SELECT COUNT(*) userCount FROM users WHERE username NOT IN (" +
      actors.toString() +
      ")"
  );
};
const currentMonthUsers = () => {
  return db.query(
    "SELECT COUNT(*) newUsers FROM users WHERE  username NOT IN (" +
      actors.toString() +
      ") and MONTH(created_at)=MONTH(CURRENT_DATE()) AND YEAR(created_at)=YEAR(CURRENT_DATE())"
  );
};

const todaysUsers = () => {
  return db.query(
    "SELECT COUNT(*) todaysUsers FROM users WHERE  username NOT IN (" +
      actors.toString() +
      ") and DAY(created_at)=DAY(CURRENT_DATE()) AND MONTH(created_at)=MONTH(CURRENT_DATE()) AND YEAR(created_at)=YEAR(CURRENT_DATE())"
  );
};
const totalAmount = () => {
  return db.query(
    "select COALESCE((select SUM(coins) from user_details),0) as totalAmount, COALESCE((select SUM(amount) from admin_transactions where type = 'Credit'),0) as totalCreadit, COALESCE((select SUM(amount) from admin_transactions where type = 'Debit'),0) as totalDebit"
  );
};

const last24login = () => {
  return db.query(
    "SELECT COUNT(*) as last24login from last_activity WHERE status = '1' AND online_date > (NOW() - INTERVAL 24 HOUR)"
  );
};
const gamePerday = () => {
  return db.query(
    'SELECT COUNT(*) as gamesplayed, sum(p.bet_amount) as total_bet, GROUP_CONCAT(us.username) winners, (2*sum(p.bet_amount)*(pt.percentage/100)) as profit, p.created_at from pool p left JOIN pooltables pt ON p.bet_amount = pt.bet left join wins w on w.poolid = p.id left join users us on us.id = w.winner  WHERE p.status = 0 group by DATE_FORMAT(p.created_at,"%y-%m-%d") and username NOT IN (' +
      actors.toString() +
      ")"
  );
};

module.exports = {
  roomList,
  newDraw,
  newDraw,
  getPaymentHistory,
  wins,
  gamePerday,
  onlineUsers,
  totalUsers,
  currentMonthUsers,
  last24login,
  todaysUsers,
  signup,
  friendRequests,
  friends,
  facebookSignup,
  createPool,
  joinPool,
  deletePool,
  updatePool,
  updateUser,
  Commit,
  newCommit,
  login,
  forgot,
  reset,
  getUserCredit,
  checkpool,
  getUserCoins,
  getUserDetails,
  getUserDetail,
  buyCue,
  buyChat,
  setCurrentCue,
  setCurrentChat,
  setCurrentCue,
  setCurrentChat,
  userlist,
  getCommission,
  setCommission,
  updateUserStatus,
  deleteRecord,
  updateUsername,
  guestLogin,
  updateUserStat,
  getRecords,
  createRecord,
  updateUserAvatar,
  addSpentLog,
  getTotalSpent,
  addPaymentHistory,
  updatePaymentHistory,
  getPaymentRec,
  updateUserBalance,
  addKyc,
  uploadDoc,
  redeemRequest,
  kycRequest,
  updateAccountStatus,
  updateVersion,
  getVersion,
  addRedeemHistory,
  updateRedeemStatus,
  getUserEmail,
  checkInstall,
  getKycStatus,
  getUserUsername,
  getIdByUsername,
  updateDeviceId,
  updateUserStatTogether,
  getUsersPerPool,
  getProfitPercent,
  tableList,
  getTableById,
  createTable,
  updateTable,
  botLogin,
  checkUserInPool,
  doTransaction,
  getOffer,
  getLevel,
  updateLevel,
  updateUserWinBalance,
  updateOffer,
  spentLogByuser,
  RedeemStatus,
  getUserPhone,
  getNotifications,
  addNotification,
  deleteNotification,
  getPushId,
  updatePushId,
  getUserStats,
  getCountryList,
  addBetHistory,
  getBetHistory,
  updatePush,
  startGame,
  updateWin,
  registerChallenge,
  getChallenge,
  receivedChallenge,
  getUserId,
  getProfitPercent01,
  getStarted,
  getBetAmount01,
  getChallenge01,
  getWinnerLooser,
  deleteOldPool,
  roomList01,
  leavePool,
  checkPoolFor,
  isPoolExists,
  usernameConfirmation,
  updateLastLogin,
  loginWeb,
  userTransactions,
  setMatchMaking,
  matchMakingData,
  getUserMails2,
  getUserMails3,
  getUserMails4,
  recordTrans,
  getUserAcc,
  getWithdrawals,
  totalAmount,
  recordAdminTrans,
  getAdminTransactions,
  createPoolWeb,
  gamesList,
  getBetHistoryMain,
  getBetDetail,
  editPoolWeb,
  editBetHistory,
  deletePoolWeb,
  deleteBet,
  getBets,
  getBetsByGame,
  checkUserName,
  recordRequest,
  matchRequests,
  deleteRequest,
  updateRequest,
  checkuser,
  updateMatchRequest,
  getChargePercentage,
  getProfitPercent02,
  updatePercentage
};
