const app = require("express").Router(),
  md = require("../models/user"),
  db = require("../models/db"),
  P = require("bluebird"),
  mw = require("../models/middlewares"),
  jwt = require("jsonwebtoken"),
  mail = require("../models/mail"),
  path = require("path");
const shortid = require("shortid");

// new packages
var axios = require("axios");
var uuid = require("uuid");

// var Pushwoosh = require('pushwoosh-client');
// var Pushclient= new Pushwoosh("251F4-40963", "3nw9TqVp8jhT9rD3anfQztG2O5ok93w5alsxCk5yJNWivNmQsCeQWl6HOjk0bB3oDXwheGND7Yn3iwjcPArS");
/*pushwoosh*/
var Pushwoosh01 = require("pushwoosh-client");
var Pushclient01 = new Pushwoosh01(
  process.env.PUSH_CODE,
  process.env.PUSH_TOKEN
);
var Pushwoosh = require("pushwoosh");
var Pushclient = new Pushwoosh(process.env.PUSH_CODE, process.env.PUSH_TOKEN);
/*pushwoosh*/
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const sv = process.env.SERVICE_ID;

const { check, validationResult, body } = require("express-validator");

generateError = function (res, text) {
  res.end(JSON.stringify({ result: { error: text, success: false } }));
};

fieldCheck = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    let array = [];
    errs = errors.array();
    for (let item of errs) {
      array.push(item.msg);
    }

    return res.status(422).json({ errors: array });
  }
};

app.post(
  "/signup",
  [
    check("email").isEmail().withMessage("Provide valid email"),
    //check('password').not().isEmpty().withMessage('Password is Required'),
    //check('phone').not().isEmpty().withMessage('Phone Number Is Required'),
    check("phone")
      .isLength({ min: 10 })
      .withMessage("Enter Valid Phone Number"),
    check("pin")
      .isLength({ min: 4, max: 4 })
      .withMessage("Pin should be of 4 digits"),
    check("gender").not().isEmpty().withMessage("Gender Is Required"),
  ],
  (req, res) => {
    // check for required field
    let my = fieldCheck(req, res);
    //console.log('my',my);
    if (my && my.statusCode == 422) return;

    client.lookups
      .phoneNumbers(req.body.phone)
      .fetch()
      .then(
        (phone_number) => {
          console.log("phone_number", phone_number);
          return md.signup(req, res);
        },
        (err) => {
          return res.status(400).json({
            result: { success: false, message: "Phone is not correct!" },
          });
        }
      );
  }
);

app.post("/phoneverifyReq", (req, res) => {
  client.verify
    .services(sv)
    .verifications.create({ to: req.body.phone, channel: "sms" })
    .then(
      (verification) => {
        if (verification.status == "pending") {
          res.status(200).json({ result: { success: true } });
        } else {
          res.status(401).json({ result: { success: false } });
        }
      },
      (error) => {
        res.status(401).json({ result: { error, success: false } });
      }
    );
});

app.post(
  "/phoneverifyCheck",
  [
    check("phone")
      .isLength({ min: 10 })
      .withMessage("Enter Valid Phone Number"),
    check("code").not().isEmpty().withMessage("Phone Number Is Required"),
  ],
  (req, res) => {
    // check for required field
    let my = fieldCheck(req, res);
    if (my && my.statusCode == 422) return;

    client.verify
      .services(sv)
      .verificationChecks.create({ to: req.body.phone, code: req.body.code })
      .then(
        async (verification) => {
          console.log("verification", verification);
          if (verification.status == "approved") {
            await db.updatePhoneVerificationStatus("1", req.body.phone);
            res
              .status(200)
              .json({ result: { success: true, status: verification.status } });
          } else {
            res.status(401).json({
              result: { success: false, status: verification.status },
            });
          }
        },
        (err) => {
          console.log("err", err);
          res
            .status(401)
            .json({ result: { success: false, status: err.status } });
        }
      );
  }
);

app.post("/dotransaction", (req, res) => {
  md.doTransaction(req.body.user_id).then(
    (result) => {
      [{ id, kys, userid }] = result;
      console.log("llll:", Array.isArray(JSON.parse(kys)));
      console.log("rest:", JSON.parse(kys).pop("user_6").split("_")[1]);
      res.status(200).json({ result });
    },
    (err) => {
      res.status(401).json({ result: { success: false, error: err } });
    }
  );
});

app.post(
  "/checkusername",
  [
    check("username").not().isEmpty().withMessage("Username Is Required"),
    check("message").not().isEmpty().withMessage("Message Is Required"),
  ],
  (req, res) => {
    let {
      body: { username, message },
    } = req;
    let ms;

    md.usernameConfirmation(username).then(
      async (result) => {
        if (result.length > 0) {
          ms = "Username already exists";
          [{ push_id }] = await md.getPushId(result[0].id);
          console.log("push_id", push_id);
          console.log("message", message);
          Pushclient01.sendMessage(
            message,
            push_id,
            function (error, response) {
              console.log("response", response);
              if (error) {
                res.status(200).json({ error });
              }
              return res.status(200).json({ result: { message: ms } });
            }
          );
        } else {
          ms = "Username not exists";
          res.status(200).json({ result: { message: ms } });
        }
      },
      (err) => {
        res.status(401).json({ result: { success: false, error: err } });
      }
    );
  }
);

app.post(
  "/fblogin",
  [
    check("username").not().isEmpty().withMessage("Username is Required"),
    check("fb_id").not().isEmpty().withMessage("Facebook Id is Required"),
  ],
  (req, res) => {
    // check for required field
    let my = fieldCheck(req, res);
    if (my && my.statusCode == 422) return;

    md.facebookSignup(req, res);
  }
);

app.post(
  "/guestlogin",
  [check("device_id").not().isEmpty().withMessage("Device Id is Required")],
  (req, res) => {
    // check for required field
    let my = fieldCheck(req, res);
    if (my && my.statusCode == 422) return;

    md.guestLogin(req, res);
  }
);

app.get("/userbot", (req, res) => {
  md.botLogin(req, res);
});

function toArray(_Object) {
  var _Array = new Array();
  for (var name in _Object) {
    _Array[name] = _Object[name];
  }
  return _Array;
}
app.get("/countrylist", (req, res) => {
  md.getCountryList().then((result) => {
    let mmy = JSON.parse(JSON.stringify(result));
    let new_data = {};
    mmy.map((obj) => {
      new_data[obj.name] = obj.phonecode;
    });
    res.status(200).json({ result: new_data });
  });
});

const waitFor = (ms) => new Promise((r) => setTimeout(r, ms));

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
app.get("/roomlist", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    md.roomList(data).then(async (result) => {
      let mmy = JSON.parse(JSON.stringify(result));
      // let rslt = await md.roomList01(data);
      // if(rslt.length >0){
      // 	mmy = mmy.concat(JSON.parse(JSON.stringify(rslt)))
      // }
      //console.log('mmy',mmy);
      let new_data = [],
        user1 = "none",
        user2 = "none",
        userid1 = 0,
        userid2 = 0;
      if (result.length > 0) {
        await asyncForEach(mmy, async (user) => {
          //console.log('user',user);
          //[{percentage}] = await md.getProfitPercent(user.id)
          let percentage = 10;
          rr = Object.keys(JSON.parse(user.participants));
          winning_amount = Math.round(
            user.bet_amount * 2 - user.bet_amount * 2 * (percentage / 100)
          );

          await waitFor(20);
          rr = Object.keys(JSON.parse(user.participants));

          if (rr.length == 1) {
            if (rr[0]) {
              userid1 = rr[0].split("_")[1];
              let [username01] = await md.getUserUsername(rr[0].split("_")[1]);
              user1 = username01.username;
            }
          } else {
            if (rr[0]) {
              userid2 = rr[1].split("_")[1];
              let [username01] = await md.getUserUsername(rr[1].split("_")[1]);
              user2 = username01.username;
            }
            if (rr[1]) {
              userid1 = rr[0].split("_")[1];
              let [username02] = await md.getUserUsername(rr[0].split("_")[1]);
              user1 = username02.username;
            }
          }
          new_data.push({
            poolid: user.id,
            winning_amount,
            bet_amount: user.bet_amount,
            userCount: rr.length,
            user1,
            user2,
            userid1,
            userid2,
          });
          (user1 = "none"), (user2 = "none"), (userid1 = 0), (userid2 = 0);
        });

        res.status(200).json({ result: new_data });
      } else {
        res.status(200).json({ result: { error: "No room found" } });
      }
    });
  });
});

app.post(
  "/checkinstall",
  [check("device_id").not().isEmpty().withMessage("Device Id is Required")],
  (req, res) => {
    // check for required field
    let my = fieldCheck(req, res);
    if (my && my.statusCode == 422) return;

    md.checkInstall(req, res);
  }
);

app.post(
  "/startgame",
  [check("poolid").not().isEmpty().withMessage("Pool Id is Required")],
  mw.ensureToken,
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
      let {
        body: { poolid },
      } = req;
      // check for required field
      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;

      md.checkpool(poolid).then(async (result) => {
        //console.log(result.length)
        if (result.length > 0) {
          let rr = Object.keys(JSON.parse(result[0].participants));
          console.log("rr", rr.length);
          if (rr.length < 2) {
            return res.status(200).json({
              result: {
                error: "Less number of participants",
                success: false,
              },
            });
          }
          let r0 = await md.getStarted(poolid);
          if (r0.length > 0) {
            let r1 = await md.startGame(poolid);

            switch (rr.length) {
              case 2:
                await md.updateUserBalance(
                  rr[0].split("_")[1],
                  result[0].bet_amount,
                  "-"
                );
                await md.updateUserBalance(
                  rr[1].split("_")[1],
                  result[0].bet_amount,
                  "-"
                );
                var emails = await md.getUserMails2(
                  rr[0].split("_")[1],
                  rr[1].split("_")[1]
                );
                console.log(emails);

                await md.setMatchMaking(
                  [
                    { id: rr[0].split("_")[1], email: emails[0].player1Email },
                    { id: rr[1].split("_")[1], email: emails[0].player2Email },
                  ],
                  result[0].bet_amount,
                  poolid
                );
                var data = {
                  amount: result[0].bet_amount,
                  trans_id: Date.now(),
                  status: "success",
                  type: "Debit",
                  details: "Match Fee Debit",
                  withdraw: 0,
                  poolId: poolid,
                };
                var userData1 = JSON.parse(emails[0].player1Trans);
                var userData2 = JSON.parse(emails[0].player2Trans);
                console.log(userData1);
                if (userData1) {
                  console.log(userData1);
                  userData1.push(data);
                  console.log(userData1);
                } else {
                  userData1 = [];
                  userData1.push(data);
                }
                if (userData2) {
                  userData2.push(data);
                } else {
                  userData2 = [];
                  userData2.push(data);
                }
                await md.recordTrans(userData1, rr[0].split("_")[1]);
                await md.recordTrans(userData2, rr[1].split("_")[1]);
                var data = {
                  amount: result[0].bet_amount * 2,
                  status: "success",
                  type: "Credit",
                  details: "Match Fee Credit",
                };
                await md.recordAdminTrans(data);
                break;
              case 3:
                await md.updateUserBalance(
                  rr[0].split("_")[1],
                  result[0].bet_amount,
                  "-"
                );
                await md.updateUserBalance(
                  rr[1].split("_")[1],
                  result[0].bet_amount,
                  "-"
                );
                await md.updateUserBalance(
                  rr[2].split("_")[1],
                  result[0].bet_amount,
                  "-"
                );
                var emails = await md.getUserMails3(
                  rr[0].split("_")[1],
                  rr[1].split("_")[1],
                  rr[2].split("_")[1]
                );
                console.log(emails);

                await md.setMatchMaking(
                  [
                    { id: rr[0].split("_")[1], email: emails[0].player1Email },
                    { id: rr[1].split("_")[1], email: emails[0].player2Email },
                    { id: rr[2].split("_")[1], email: emails[0].player3Email },
                  ],
                  result[0].bet_amount,
                  poolid
                );
                var data = {
                  amount: result[0].bet_amount,
                  trans_id: Date.now(),
                  status: "success",
                  type: "Debit",
                  details: "Match Fee Debit",
                  withdraw: 0,
                };
                var userData1 = JSON.parse(emails[0].player1Trans);
                var userData2 = JSON.parse(emails[0].player2Trans);
                var userData3 = JSON.parse(emails[0].player3Trans);
                if (userData1) {
                  userData1.push(data);
                  console.log(userData1);
                } else {
                  userData1 = [];
                  userData1.push(data);
                }
                if (userData2) {
                  userData2.push(data);
                } else {
                  userData2 = [];
                  userData2.push(data);
                }
                if (userData3) {
                  userData3.push(data);
                } else {
                  userData3 = [];
                  userData3.push(data);
                }
                await md.recordTrans(userData1, rr[0].split("_")[1]);
                await md.recordTrans(userData2, rr[1].split("_")[1]);
                await md.recordTrans(userData3, rr[2].split("_")[1]);
                var data = {
                  amount: result[0].bet_amount * 3,
                  status: "success",
                  type: "Credit",
                  details: "Match Fee Credit",
                };
                await md.recordAdminTrans(data);
                break;
              case 4:
                await md.updateUserBalance(
                  rr[0].split("_")[1],
                  result[0].bet_amount,
                  "-"
                );
                await md.updateUserBalance(
                  rr[1].split("_")[1],
                  result[0].bet_amount,
                  "-"
                );
                await md.updateUserBalance(
                  rr[2].split("_")[1],
                  result[0].bet_amount,
                  "-"
                );
                await md.updateUserBalance(
                  rr[3].split("_")[1],
                  result[0].bet_amount,
                  "-"
                );
                var emails = await md.getUserMails3(
                  rr[0].split("_")[1],
                  rr[1].split("_")[1],
                  rr[2].split("_")[1],
                  rr[4].split("_")[1]
                );
                console.log(emails);

                await md.setMatchMaking(
                  [
                    { id: rr[0].split("_")[1], email: emails[0].player1Email },
                    { id: rr[1].split("_")[1], email: emails[0].player2Email },
                    { id: rr[2].split("_")[1], email: emails[0].player3Email },
                    { id: rr[3].split("_")[1], email: emails[0].player4Email },
                  ],
                  result[0].bet_amount,
                  poolid
                );
                var data = {
                  amount: result[0].bet_amount,
                  trans_id: Date.now(),
                  status: "success",
                  type: "Debit",
                  details: "Match Fee Debit",
                  withdraw: 0,
                };
                var userData1 = JSON.parse(emails[0].player1Trans);
                var userData2 = JSON.parse(emails[0].player2Trans);
                var userData3 = JSON.parse(emails[0].player3Trans);
                var userData4 = JSON.parse(emails[0].player4Trans);
                if (userData1) {
                  userData1.push(data);
                  console.log(userData1);
                } else {
                  userData1 = [];
                  userData1.push(data);
                }
                if (userData2) {
                  userData2.push(data);
                } else {
                  userData2 = [];
                  userData2.push(data);
                }
                if (userData3) {
                  userData3.push(data);
                } else {
                  userData3 = [];
                  userData3.push(data);
                }
                if (userData4) {
                  userData4.push(data);
                } else {
                  userData4 = [];
                  userData4.push(data);
                }
                await md.recordTrans(userData1, rr[0].split("_")[1]);
                await md.recordTrans(userData2, rr[1].split("_")[1]);
                await md.recordTrans(userData3, rr[2].split("_")[1]);
                await md.recordTrans(userData4, rr[3].split("_")[1]);
                var data = {
                  amount: result[0].bet_amount * 4,
                  status: "success",
                  type: "Credit",
                  details: "Match Fee Credit",
                };
                await md.recordAdminTrans(data);
                break;
            }

            return res.status(200).json({ result: { success: true } });
          } else {
            return res.status(200).json({
              result: { message: "Game already started.", success: false },
            });
          }
        } else {
          return res.status(401).json({ result: { success: false } });
        }
      });
    });
  }
);

app.post(
  "/login",
  [
    check("email").not().isEmpty().withMessage("Enter email or pin"),
    check("pin").not().isEmpty().withMessage("Pin is Required"),
  ],
  (req, res) => {
    // check for required field
    let my = fieldCheck(req, res);

    if (my && my.statusCode == 422) return;

    md.login(req, res);
  }
);
app.post(
  "/login-web",
  [
    check("email").not().isEmpty().withMessage("Enter email or pin"),
    check("password").not().isEmpty().withMessage("Password is Required"),
  ],
  (req, res) => {
    // check for required field
    let my = fieldCheck(req, res);

    if (my && my.statusCode == 422) return;

    md.loginWeb(req, res);
  }
);

app.post(
  "/getid",
  mw.ensureToken,
  [check("username").not().isEmpty().withMessage("Username is Required")],
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
      let {
        body: { username },
      } = req;
      // check for required field
      let my = fieldCheck(req, res);

      if (my && my.statusCode == 422) return;

      md.getIdByUsername(username).then((result) => {
        //console.log('result567:',result)
        res
          .status(200)
          .json({ result: { success: true, userid: result[0].id } });
      });
    });
  }
);

app.post(
  "/getpoolresult",
  mw.ensureToken,
  [check("poolid").not().isEmpty().withMessage("Room Id is Required")],
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
      let {
        body: { poolid },
      } = req;
      // check for required field
      let my = fieldCheck(req, res);

      if (my && my.statusCode == 422) return;

      md.getWinnerLooser(poolid).then((result) => {
        console.log("result", result);
        let userStatus;
        if (result.length > 0) {
          if (data.user_id == result[0].winner) {
            userStatus = "Winner";
          } else if (data.user_id == result[0].looser) {
            userStatus = "Looser";
          } else {
            userStatus = "User does not belong to this pool";
          }
          res.status(200).json({ result: { success: true, userStatus } });
        } else {
          res
            .status(200)
            .json({ result: { message: "Room does not exists!" } });
        }
      });
    });
  }
);

app.get("/logout", mw.ensureToken, async (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, async function (err, data) {
    if (err) {
      res.sendStatus(403);
    } else {
      //console.log('data.user_id',data.user_id)
      let [{ email }] = await md.getUserEmail(data.user_id);
      let str = data.username;
      let username = str.substr(0, 5);
      if (username != "Guest") {
        await md.updateDeviceId("", data.user_id);
      }

      var ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

      if (ip.substr(0, 7) == "::ffff:") {
        ip = ip.substr(7);
      }

      let last_activity = {
        user_id: data.user_id,
        ip: ip,
        status: "0",
      };
      db.updateActivity({ online: "n", id: data.user_id });
      db.addActivity(last_activity);

      res
        .status(200)
        .json({ result: { success: true, mssg: "user logout successfully" } });
    }
  });
});

// for transaction
app.post("/record-trans", mw.ensureToken, async (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, async function (err, data) {
    if (err) {
      res.sendStatus(403);
    } else {
      //console.log('data.user_id',data.user_id)
      console.log(req.body);
      var { amount, msg, status, code, type, details, trans_id } = req.body;
      var data1 = {
        amount,
        trans_id: Date.now(),
        status,
        type,
        details,
        withdraw: 0,
      };
      var emails = await md.getUserMails2(data.user_id, data.user_id);
      var userData1 = JSON.parse(emails[0].player1Trans);
      if (userData1) {
        userData1.push(data1);
      } else {
        userData1 = [];
        userData1.push(data1);
      }
      await md.recordTrans(userData1, data.user_id);
      res
        .status(200)
        .json({ success: true, msg: "Transaction recorded successfully" });
    }
  });
});
app.post("/transfer", mw.ensureToken, async (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, async function (err, data) {
    if (err) {
      res.sendStatus(403);
    } else {
      console.log(req.body);
      var { amount } = req.body;
      console.log(amount);
      md.getUserAcc(data.user_id).then((response) => {
        var result = response[0];
        console.log(result);
        if (result.coins < amount) {
          res.status(200).json({ result: { message: "Insufficient balance" } });
        } else {
          var refNo = uuid.v1();
          var obj = {
            account_bank: result.ifsc_code,
            account_number: result.acc_num,
            amount: amount,
            narration: "5 Game Trnsfr xx007",
            currency: "NGN",
            reference: refNo,
            callback_url:
              "https://webhook.site/b3e505b0-fe02-430e-a538-22bbbce8ce0d",
            debit_currency: "NGN",
          };
          console.log(obj);

          var config = {
            method: "post",
            url: "https://api.flutterwave.com/v3/transfers",
            headers: {
              Authorization:
                "Bearer FLWSECK_TEST-ed8cfbdf154821661d40afa59747d8ca-X",
              "Content-Type": "application/json",
            },
            data: JSON.stringify(obj),
          };
          axios(config)
            .then(async function (responseMain) {
              var response = responseMain.data;
              var status = response.status;
              status == "success" ? (status = status) : (status = "fail");
              var transData = {
                amount: obj.amount,
                msg: response.message,
                trans_id: Date.now(),
                code: 200,
                status: status,
                type: "Debit",
                details: "Money Withdraw",
                withdraw: 1,
              };

              var emails = await md.getUserMails2(data.user_id, data.user_id);
              var userData1 = JSON.parse(emails[0].player1Trans);
              if (userData1) {
                userData1.push(transData);
              } else {
                userData1 = [];
                userData1.push(transData);
              }
              await md.recordTrans(userData1, data.user_id);
              md.updateUserBalance(data.user_id, amount, "-").then(
                (result3) => {
                  res
                    .status(200)
                    .json({ success: true, message: "Withdrawal Successful." });
                }
              );
            })
            .catch(function (error) {
              console.log(error);
              res.status(200).json({ message: error });
            });
        }
      });
    }
  });
});
app.get("/view-trans", mw.ensureToken, async (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, async function (err, data) {
    if (err) {
      res.sendStatus(403);
    } else {
      //console.log('data.user_id',data.user_id)
      var trans, id;
      id = data.user_id;
      md.userTransactions(id).then((rows) => {
        trans = rows[0];
        console.log(trans);
        var { transactions } = trans;
        transactions = JSON.parse(transactions);
        delete trans.transaction;
        res
          .status(200)
          .json({ success: true, data: transactions, userDetails: trans });
      });
    }
  });
});

app.post("/challenge", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, async function (err, data) {
    let rrr, ppp;
    let {
      body: { message, receiver, bet_amount, game_id, action, cid, poolid },
    } = req;
    console.log("req.body", req.body);
    let [sender] = await md.getUserUsername(data.user_id);
    let final_result = {};
    if (action == "rejected" || action == "approved") {
      [{ bet_amount }] = await md.getBetAmount01(poolid);
    }
    //let [{percentage}] = await md.getProfitPercent01(bet_amount);
    let percentage = 10;
    let win_amount = Math.round(
      bet_amount * 2 - bet_amount * 2 * (percentage / 100)
    );

    let userdata = {
      game_id,
      sender: sender.username,
      receiver,
      bet_amount,
      win_amount,
      action,
      user_id: data.user_id,
      username: data.username,
      message,
    };
    if (action == "register") {
      rrr = await md.getUserId(receiver);
      console.log("rrr", rrr);
      [{ push_id }] = await md.getPushId(rrr[0].id);
      userdata.push_id = push_id;
    }

    if (action == "rejected" || action == "approved") {
      let rslt = await md.getChallenge01(cid);
      console.log("rslt", rslt);
      rrr = await md.getUserId(rslt[0].sender);
      console.log("rrr", rrr);
      [{ push_id }] = await md.getPushId(rrr[0].id);

      (userdata.id = cid),
        (userdata.push_id = push_id),
        (userdata.poolid = poolid),
        (userdata.bet_amount = bet_amount);
    }
    md.registerChallenge(userdata).then((result) => {
      console.log("result:", result);
      if (result.affectedRows > 0) {
        final_result.success = true;
      } else {
        final_result.success = false;
      }
      final_result.success = true;
      return res.status(200).json({ result: final_result });
    });
    //  Promise.all([JSON.parse(JSON.stringify(await md.registerChallenge(userdata)))]).then(function(values) {
    // 		//console.log('values',values);
    // 		if(values[1].affectedRows > 0){
    // 			final_result.success = true
    // 		}else{
    // 			final_result.success = false
    // 		}

    // 	  });
  });
});

app.get("/getchallenge/:gameid", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    let game_id = req.params.gameid;

    if (game_id) {
      md.getChallenge(game_id, data.username).then(
        (result) => {
          //console.log('result001',result);
          if (result.length > 0) {
            result.success = true;
            return res.status(200).json({ result });
          } else {
            return res
              .status(200)
              .json({ result: { message: "No user found" } });
          }
        },
        (err) => {
          res.status(401).json({ result: { error: err, success: false } });
        }
      );
    } else {
      res
        .status(401)
        .json({ result: { error: "Game id is required", success: false } });
    }
  });
});

app.get("/receivedchallenge/:gameid", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    let game_id = req.params.gameid;
    if (game_id) {
      md.receivedChallenge(game_id, data.username).then(
        (result) => {
          console.log("result001", result);
          if (result.length > 0) {
            result.success = true;
            return res.status(200).json({ result });
          } else {
            return res
              .status(200)
              .json({ result: { message: "No user found" } });
          }
        },
        (err) => {
          res.status(401).json({ result: { error: err, success: false } });
        }
      );
    } else {
      res
        .status(401)
        .json({ result: { error: "Game id is required", success: false } });
    }
  });
});

app.post("/registerdevice", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, async function (err, data) {
    let {
      body: { device_id },
    } = req;

    let rs = await md.getPushId(data.user_id);

    if (rs.length > 0) {
      var registerDeviceOptions = {
        push_token: rs[0].push_id,
        hwid: device_id,
        device_type: 3,
      };
      //console.log('registerDeviceOptions',registerDeviceOptions);

      Pushclient01.registerDevice(
        registerDeviceOptions,
        function (error, result) {
          if (error) {
            //console.log('mytest');
            return res.status(400).json({ error });
          }
          //console.log('mytest111');
          return res.status(200).json({ response: result });
        }
      );
    } else {
      return res
        .status(400)
        .json({ result: { success: false, msg: "user not found" } });
    }
  });
});

app.post("/unregisterdevice", (req, res) => {
  let {
    body: { device_id },
  } = req;

  var registerDeviceOptions = {
    hwid: device_id,
  };

  Pushclient.unregisterDevice(
    registerDeviceOptions,
    function (error, response) {
      if (error) {
        res.status(400).json({ error });
      }
      res.status(200).json({ response });
    }
  );
});

app.post(
  "/updatepushtoken",
  [
    //check('device_id').not().isEmpty().withMessage('Device Id is Required'),
    check("push_id").not().isEmpty().withMessage("Push Id is Required"),
  ],
  mw.ensureToken,
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, async function (err, data) {
      let {
        body: { push_id },
      } = req;

      // check for required field
      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;

      md.updatePushId(push_id, data.user_id).then((result) => {
        res.status(200).json({
          result: { success: true, mssg: "Push Id updated successfully" },
        });
      });
    });
  }
);

app.post("/playerstats", mw.ensureToken, async (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, async function (err, data) {
    let user = data.user;
    db.query(
      `Select ps.*,g.* from player_statistics ps inner join games g on ps.game_id=g.id where ps.user_id=${user}`,
      function (err, rows, fields) {
        let stats = rows;
        db.query(
          `SELECT g.game_name from favorite_games fg inner join games g on g.id=fg.game_id where user_id = ${user}`,
          (err, rows, fields) => {
            res.json({
              stats: stats,
              fav:
                rows[0] && rows[0].hasOwnProperty("game_name")
                  ? rows[0].game_name
                  : "",
            });
          }
        );
      }
    );
  });
});

app.post("/updateGameStat", async (req, res) => {
  let {
    body: { user_id, game_id, outcome, coins },
  } = req;

  // console.log(req.body)
  let statExists = await db.query(
    "SELECT * FROM player_statistics where user_id= ? and game_id = ?",
    [user_id, game_id]
  );
  let prevStats = statExists[0];
  updateStats2(req);
  let action = "update";
  const construct = {};
  if (!statExists.length) {
    action = "insert";
  }
  construct.total_battles =
    action == "update" ? prevStats.total_battles + 1 : 1;
  if (outcome == "won") {
    construct.battles_won = action == "update" ? prevStats.battles_won + 1 : 1;
    construct.coins_won =
      action == "update" ? prevStats.coins_won + Number(coins) : Number(coins);
  } else if (outcome == "lost") {
    construct.battles_lost =
      action == "update" ? prevStats.battles_lost + 1 : 1;
    construct.coins_lost =
      action == "update" ? prevStats.coins_lost + Number(coins) : Number(coins);
  }
  try {
    if (action == "update") {
      db.query(
        "UPDATE player_statistics SET ? where user_id= ? and game_id = ?",
        [construct, user_id, game_id]
      );
    } else {
      construct.user_id = user_id;
      construct.game_id = game_id;
      db.query("INSERT INTO player_statistics SET ?", [construct]);
    }
    res.json(construct);
  } catch (err) {
    res.json({ error: "Error in updating statistics" });
  }
});

function updateStats2(req) {
  let {
    body: { user_id, game_id, outcome, coins },
  } = req;
  db.query(
    "SELECT id FROM tournament where CURRENT_DATE() BETWEEN start_date and end_date"
  ).then((res) => {
    if (res[0]) {
      let construct = {
        user_id: user_id,
        game_id: game_id,
        outcome: outcome,
        tournament_id: res[0].id,
      };
      outcome == "won"
        ? (construct.coins_won = coins)
        : (construct.coins_lost = coins);
      try {
        db.query("INSERT INTO player_statistics_mod SET ?", construct);
      } catch (err) {
        console.log(err);
      }
    }
  });
}

app.post(
  "/forgotpassword",
  [check("email").not().isEmpty().withMessage("Email Id is Required")],
  (req, res) => {
    // check for required field
    let my = fieldCheck(req, res);
    if (my && my.statusCode == 422) return;

    md.forgot(req, res);
  }
);

app.post("/updateuserstat", (req, res) => {
  let {
    body: { user_id, field, amount, oper },
  } = req;

  md.updateUserStat(user_id, field, amount, oper).then((result) => {
    res
      .status(200)
      .json({ result: { success: true, mssg: "Updated successfully" } });
  });
});

app.post("/updateuserbalance", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    let {
      body: { amount },
    } = req;
    if (err) {
      res.sendStatus(403);
    } else {
      md.updateUserBalance(data.user_id, amount, "+").then((result) => {
        res
          .status(200)
          .json({ result: { success: true, mssg: "Updated successfully" } });
      });
    }
  });
});

app.post("/usersbypool", (req, res) => {
  let {
    body: { bet },
  } = req;

  md.getUsersPerPool(bet).then((result) => {
    //console.log(result);
    res.status(200).json({ result: { success: true, users: result[0].users } });
  });
});

app.post("/updateversion", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    if (err) {
      res.sendStatus(403);
    } else {
      if (req.body.version) {
        md.updateVersion(req.body.version).then((result) => {
          //console.log(result);
          if (result.affectedRows > 0) {
            res.status(200).json({ result: { success: true } });
          } else {
            res.status(401).json({ result: { success: false } });
          }
        });
      } else {
        res.status(401).json({ result: { success: false, msg: "error" } });
      }
    }
  });
});

app.get("/getusercoins", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    md.getUserCoins(data.user_id).then((result) => {
      result = result[0];
      return res.status(200).json({ result });
    });
  });
});

app.get("/getuserstats", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    md.getUserStats(data.user_id).then(async (result) => {
      result = result[0];
      let [{ coins }] = await md.getUserCoins(data.user_id);
      result.coins = coins;

      return res.status(200).json({ result });
    });
  });
});

app.get("/getoffer", (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    md.getOffer().then((result) => {
      result = result[0];
      return res.status(200).json({ result });
    });
  });
});

app.get("/getuserdetails/:id", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    var id = req.params.id;
    md.getUserDetails(id).then(async (result) => {
      result = result[0];
      if (result == "undefined") {
        var result = {};
        return res.status(401).json({ success: false, msg: "No User Found" });
        return;
      }
      let rs = await md.getTotalSpent(id);
      if (rs.length > 0) {
        result.totalspent = rs[0].totalspent;
      } else {
        result.totalspent = 0;
      }

      return res.status(200).json({ result });
    });
  });
});
app.get("/userdetails", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    md.getUserDetails(data.user_id).then(async (result) => {
      result = result[0];
      if (result == "undefined") {
        var result = {};
        return res.status(401).json({ success: false, msg: "No User Found" });
        return;
      }
      let rs = await md.getTotalSpent(data.user_id);
      console.log(result);
      console.log(rs);
      if (rs.length > 0) {
        result.totalspent = rs[0].totalspent;
      } else {
        result.totalspent = 0;
      }

      return res.status(200).json({ result });
    });
  });
});

app.post("/getuserdetail", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    let {
      body: { field, userid },
    } = req;
    md.getUserDetail(field, userid).then(
      async (result) => {
        result = result[0];
        if (result == "undefined") {
          var result = {};
          return res.status(401).json({ success: false, msg: "No User Found" });
          return;
        }
        return res.status(200).json({ result });
      },
      (error) => {
        //console.log(error)
        return res
          .status(401)
          .json({ success: false, error: error.sqlMessage });
      }
    );
  });
});

app.post(
  "/leavepool",
  [check("poolid").not().isEmpty().withMessage("Pool Id is Required")],
  mw.ensureToken,
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
      let {
        body: { poolid },
      } = req;

      // check for required field
      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;

      md.checkUserInPool(data.user_id, 0, 1, poolid).then(
        async (result) => {
          console.log("result", result);
          if (result.length > 0) {
            await md.leavePool(data.user_id, poolid);
            return res.status(401).json({ success: true });
          } else {
            return res
              .status(401)
              .json({ success: false, msg: "No User Found" });
          }
        },
        (error) => {
          return res
            .status(401)
            .json({ success: false, error: error.sqlMessage });
        }
      );
    });
  }
);

app.post("/deletepool", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    let {
      body: { poolid },
    } = req;
    // check for required field
    let my = fieldCheck(req, res);
    if (my && my.statusCode == 422) return;

    md.isPoolExists(data.user_id, poolid)
      .then(async (result) => {
        if (result[0].poolcount > 0) {
          let rs = await md.deletePool(data.user_id, poolid);
          if (rs.affectedRows > 0) {
            rs.success = true;
          }
          return res.status(200).json({ result: rs });
        } else {
          return res
            .status(200)
            .json({ result: { message: "No Record Found", success: false } });
        }
      })
      .catch((err) =>
        res
          .status(401)
          .json({ result: { error: "There is some error.", success: false } })
      );
  });
});

app.get("/getpercentage", (req, res) => {
  md.getProfitPercent().then((result) => {
    let rs = result[0].profit_percent.split(",");
    res.status(200).json({ result: { success: true, percentage: rs[1] } });
  });
});

app.get("/gettablelist", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    if (err) {
      res.sendStatus(403);
    } else {
      md.tableList().then((result) => {
        //console.log('result',result);
        result.success = true;
        res.status(200).json({ result: { success: true, tableList: result } });
      });
    }
  });
});

app.get("/getversion", (req, res) => {
  md.getVersion().then((result) => {
    result[0].success = true;
    res.status(200).json({ result: result[0] });
  });
});

app.get("/games", (req, res) => {
  md.gamesList().then((result) => {
    if (result.length > 0) {
      res.status(200).json({ result: result });
    } else {
      res.status(200).json({ result: { message: "No Record found" } });
    }
  });
});

app.get("/test", (req, res) => {
  // md.getRecords()
  //   .then((result)=>{
  // 	if(result.length > 0){

  // 		result.forEach(async function(item){
  // 			let id = JSON.stringify(item.id);
  // 			await md.createRecord(id);
  // 		})
  // 		res.json({success:true});
  // 	}
  //   })

  let paymentObj = {
    ORDER_ID: shortid.generate(),
    CUST_ID: shortid.generate(),
    INDUSTRY_TYPE_ID: config.INDUSTRY_TYPE_ID,
    CHANNEL_ID: config.CHANNEL_ID,
    TXN_AMOUNT: amount.toString(),
    MID: config.MID,
    WEBSITE: config.WEBSITE,
    CALLBACK_URL: config.CALLBACK_URL,
  };

  checksum.genchecksum(paymentObj, config.PAYTM_MERCHANT_KEY, (err, result) => {
    //console.log('err',err);console.log('result:',result);
    if (err) {
      return reject("Error while generating checksum");
    } else {
      //console.log('CHECKSUMHASH',result);
      paymentObj.CHECKSUMHASH = result;
      return resolve(paymentObj);
    }
  });
});
app.post("/redeemstatus", function (req, res) {
  md.RedeemStatus(req, res);
});
//Update Password

app.post("/updatepassword", function (req, res) {
  let {
    body: {
      userid,
      email: email,
      confirmPassword: confirmPassword,
      password: password,
    },
    session,
  } = req;

  db.updatePassword(email, password, userid).then(async function (result) {
    if (result.affectedRows == 1) {
      let rr02 = await md.getUserPhone(userid);

      let data = {
        mobile: rr02[0].phone,
        message:
          "Your account password has been successfully changed. In case of any queries drop us an email at @email",
      };
      //let rr01 = await sms(data);

      let options = {
        to: email,
        subject: "Password Change",
      };
      let [{ username }] = await md.getUserUsername(userid);
      let renderable = {
        template: path.join("emails", "users", "password_update.html"),
        locals: {
          host: req.hostname,
          username: username,
        },
      };

      await mail(options, renderable);

      res.json({
        mssg: "Your password has been changed successfully",
        success: true,
      });
    } else {
      res.json({ mssg: "There is something wrong", success: false });
    }
  });
});
app.get("/test01", async (req, res) => {
  let options = {
    to: "guru@move2inbox.in",
    subject: "Test mail",
  };

  res.json({
    mssg: "Error sending email!",
    error: "Error sending email!",
    rr1,
  });
  // let data = {
  // 	user_id:req.body.uid,
  // 	order_id:req.body.ORDERID,
  // 	trans_id:req.body.TXNID,
  // 	amount:req.body.TXNAMOUNT
  // }

  // md.addPaymentHistory(data)
  //   .then((result)=>{ console.log('result',result); console.log('result.insertId',result.insertId);
  // 	if(result.insertId){
  // 		res.json({success:true});
  // 	}else{
  // 		res.json({success:false});
  // 	}
  //   },(err)=>{
  // 		res.json({success:err});
  //   })
  // let options = {
  // 	to: 'ommziteamlead08@gmail.com',
  // 	subject: "Welcome to OneUp!",
  // }
  // let renderable = {
  // 	template: path.join("emails", "users", "welcome.html"),
  // }
  // mail(options, renderable)
  // 	.then(m => {
  // 		console.log('m',m)
  // 		var currentUrl = req.originalUrl;
  // 		var admin = currentUrl.indexOf("admin");

  // 	res.json({ mssg: `Hello`})

  // 	})
  // 	.catch(me => {
  // 		console.log('me',me)
  // 		res.json({ mssg: "Error sending email!", error: "Error sending email!" })
  // 	})
});

// app.post('/createpool', mw.ensureToken ,[
//   check('bet').not().isEmpty().withMessage('Bet amount is Required'),
// ], (req, res) => {
// 	jwt.verify(req.token, process.env.SECRET_KEY, function (err, userdata) {

// 	let {body:{bet, description, vl}} = req;
// 	if(!vl){
// 		vl = ''
// 	  }
// 	  userdata.desc = description;
// 	let rslt = {};
// 	// check for required field
// 	let my = fieldCheck(req,res);

// 	if(my && my.statusCode == 422) return;

// 	md.createPool(userdata, bet,vl)
// 	  .then( async(result) => {

// 	  	if(result.insertId){

// 			let [username01] = await md.getUserUsername(userdata.user_id);
// 			if(username01.username.substr(-3,3) != '-bt'){
// 				rs1 = await md.updateUserBalance(userdata.user_id, bet,'-',vl);
// 			   }

// 	  		rslt.success = true;
// 			rslt.poolid = result.insertId;

// 		  return res.status(200).json({ result:rslt })

// 	  	}else{
// 	  		result.success = false;
// 	  		return res.status(401).json({ result })
// 	  	}
// 	  })//.catch(err => res.status(401).json({ result:{"error":"There is some error.", success:false, err} }));
// 	});
// });

app.post(
  "/createpool",
  mw.ensureToken,
  [
    check("bet").not().isEmpty().withMessage("Bet amount is Required"),
    //check('otheruser').not().isEmpty().withMessage('Id of second user is Required'),
  ],
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, userdata) {
      let {
        body: { bet, description },
      } = req;

      let rslt = {},
        winning_amount;
      // check for required field
      let my = fieldCheck(req, res);

      if (my && my.statusCode == 422) return;

      userdata.description = description;
      userdata.bet = bet;
      userdata.challenge = 0;

      md.createPool(userdata)
        .then(async (result) => {
          if (result.insertId) {
            //   let [username01] = await md.getUserUsername(userdata.user_id);
            //   if(username01.username.substr(-3,3) != '-bt'){
            // 	  rs1 = await md.updateUserBalance(userdata.user_id, bet,'-');
            // 	 }

            //   let [username02] = await md.getUserUsername(otheruser);
            //   if(username02.username.substr(-3,3) != '-bt'){
            //    rs1 = await md.updateUserBalance(otheruser, bet,'-');
            //   }
            let betData = {
              poolid: result.insertId,
              user_id: userdata.user_id,
              game_id: 1,
              bet_amount: bet,
            };
            await md.addBetHistory(betData);
            await md.deleteOldPool(userdata.user_id, result.insertId);
            //[{percentage}] = await md.getProfitPercent01(bet)
            let percentage = 10;

            if (percentage) {
              winning_amount = Math.round(
                bet * 2 - bet * 2 * (percentage / 100)
              );
              rslt.winning_amount = winning_amount;
            } else {
              rslt.winning_amount = 0;
            }

            rslt.success = true;
            rslt.poolid = result.insertId;

            return res.status(200).json({ result: rslt });
          } else {
            result.success = false;
            return res.status(401).json({ result });
          }
        })
        .catch((err) =>
          res.status(401).json({
            result: { error: "There is some error.", success: false, err },
          })
        );
    });
  }
);
app.post(
  "/createpool-web",
  mw.IsAdmin,
  [
    check("bet").not().isEmpty().withMessage("Bet amount is Required"),
    //check('otheruser').not().isEmpty().withMessage('Id of second user is Required'),
  ],
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, userdata) {
      let {
        body: { bet, gameId },
      } = req;

      let rslt = {},
        winning_amount;
      // check for required field
      let my = fieldCheck(req, res);

      if (my && my.statusCode == 422) return;
      var userdata = {};
      userdata.bet = bet;
      userdata.challenge = 0;
      (userdata.user_id = req.session.id), (userdata.gameId = gameId);

      md.createPool(userdata)
        .then(async (result) => {
          if (result.insertId) {
            //   let [username01] = await md.getUserUsername(userdata.user_id);
            //   if(username01.username.substr(-3,3) != '-bt'){
            // 	  rs1 = await md.updateUserBalance(userdata.user_id, bet,'-');
            // 	 }

            //   let [username02] = await md.getUserUsername(otheruser);
            //   if(username02.username.substr(-3,3) != '-bt'){
            //    rs1 = await md.updateUserBalance(otheruser, bet,'-');
            //   }
            let betData = {
              poolid: result.insertId,
              user_id: userdata.user_id,
              game_id: gameId,
              bet_amount: bet,
            };
            await md.addBetHistory(betData);
            await md.deleteOldPool(userdata.user_id, result.insertId);
            //[{percentage}] = await md.getProfitPercent01(bet)
            let percentage = 10;

            if (percentage) {
              winning_amount = Math.round(
                bet * 2 - bet * 2 * (percentage / 100)
              );
              rslt.winning_amount = winning_amount;
            } else {
              rslt.winning_amount = 0;
            }

            rslt.success = true;
            rslt.poolid = result.insertId;

            return res.status(200).json({ result: rslt });
          } else {
            result.success = false;
            return res.status(401).json({ result });
          }
        })
        .catch((err) =>
          res.status(401).json({
            result: { error: "There is some error.", success: false, err },
          })
        );
    });
  }
);

app.post(
  "/addredeemrequest01",
  [
    check("amount").not().isEmpty().withMessage("amount is Required"),
    check("userid").not().isEmpty().withMessage("userid is Required"),
  ],
  (req, res) => {
    let {
      body: { userid, amount },
    } = req;

    // check for required field
    let my = fieldCheck(req, res);
    if (my && my.statusCode == 422) return;

    let data = { user_id: userid, redeem_amount: amount };

    md.addRedeemHistory(data).then(async (result) => {
      if (result.error) {
        return res.status(401).json({ result });
      }
      if (result.affectedRows > 0) {
        let [{ email }] = await md.getUserEmail(userid);

        if (email) {
          let options = {
            to: email,
            subject: "Withdrawal request received",
          };
          let [{ username }] = await md.getUserUsername(userid);
          let renderable = {
            template: path.join("emails", "users", "withdrawal_request.html"),

            locals: {
              host: req.hostname,
              username: username,
              amount: amount,
            },
          };

          let rr1 = await mail(options, renderable);
        }
        result.success = true;
        return res.status(200).json({ result });
      } else {
        result.success = false;
        return res.status(200).json({ result });
      }
    });
  }
);

app.post(
  "/addredeemrequest",
  mw.ensureToken,
  [check("amount").not().isEmpty().withMessage("amount is Required")],
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, userdata) {
      let {
        body: { amount },
      } = req;
      let user_id = userdata.user_id;
      // check for required field
      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;

      let data = { user_id, redeem_amount: amount };

      md.addRedeemHistory(data).then(async (result) => {
        //console.log(result);
        if (result.error) {
          return res.status(401).json({ result });
        }
        if (result.affectedRows > 0) {
          let options = {
            to: email,
            subject: "Withdrawal request received",
          };

          let renderable = {
            template: path.join("emails", "users", "withdrawal_request.html"),
            locals: {
              host: req.hostname,
              username: userdata.username,
              amount: amount,
            },
          };

          let rr1 = await mail(options, renderable);

          result.success = true;
          return res.status(200).json({ result });
        }
      });
    });
  }
);

app.post(
  "/joinpool",
  mw.ensureToken,
  [
    //check('username').not().isEmpty().withMessage('Username is Required'),
    //check('bet').not().isEmpty().withMessage('Bet amount is Required'),
    check("poolid").not().isEmpty().withMessage("Pool Id is Required"),
  ],
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, userdata) {
      let {
        body: { bet, description, poolid, game_id },
      } = req;
      let user_id = userdata.user_id;
      // check for required field
      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;

      let data = { user_id, poolid };

      md.joinPool(data).then(async (result) => {
        if (result.error) {
          return res.status(200).json({ result });
        }

        if (result.affectedRows > 0) {
          let betData = {
            poolid,
            user_id: userdata.user_id,
            game_id: 1,
            bet_amount: result.bet,
          };

          await md.addBetHistory(betData);

          if (userdata.username.substr(-3, 3) != "-bt") {
            //rs1 = await md.updateUserBalance(userdata.user_id, result.bet,'-');
            //rs2 = await md.updateUserBalance(result.creator_id, result.bet,'-');

            //[{push_id}] = await md.getPushId(creator_id);

            Pushclient.sendMessage(
              "One of user has joined bet",
              "032a9f156c1584a6bac2d87afc095629",
              function (error, response) {
                if (error) {
                  res.status(200).json({ error });
                }
              }
            );
          }

          result.success = true;
          return res.status(200).json({ result });
        }
      }); //.catch(err => res.status(401).json({ result:{"error":"There is some error.", success:false,err} }));
    });
  }
);

app.get("/deletepool", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    // check for required field
    let my = fieldCheck(req, res);
    if (my && my.statusCode == 422) return;

    md.deletePool(data.user_id)
      .then((result) => {
        //console.log('result001',result);
        if (result.affectedRows > 0) {
          result.success = true;
          return res.status(200).json({ result });
        } else {
          return res.status(200).json({
            result: { message: "Record does not exists", success: false },
          });
        }
      })
      .catch((err) =>
        res
          .status(401)
          .json({ result: { error: "There is some error.", success: false } })
      );
  });
});

app.post("/getbethistory", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    let {
      body: { game_id },
    } = req;

    md.getBetHistory(game_id, data.user_id).then((result) => {
      console.log("result001", result);
      if (result.length > 0) {
        result.success = true;
        return res.status(200).json({ result });
      } else {
        return res.status(200).json({ result: { message: "No record found" } });
      }
    }); //.catch(err => res.status(401).json({ result:{"error":"There is some error.", success:false} }));
  });
});
app.get("/get-bets", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
   
    md.getBets().then((result) => {
      if (result.length > 0) {
        result.success = true;
        return res.status(200).json({ result });
      } else {
        return res.status(200).json({ result: { message: "No record found" } });
      }
    }); //.catch(err => res.status(401).json({ result:{"error":"There is some error.", success:false} }));
  });
});
app.get("/getGameBets/:gameid", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    var gameId = req.params.gameid
    console.log(gameId)
    md.getBetsByGame(gameId).then((result) => {
      if (result.length > 0) {
        result.success = true;
        return res.status(200).json({ result });
      } else {
        return res.status(200).json({ result: { message: "No record found" } });
      }
    }); //.catch(err => res.status(401).json({ result:{"error":"There is some error.", success:false} }));
  });
});

app.post(
  "/buycue",
  mw.ensureToken,
  [check("cue_id").not().isEmpty().withMessage("cue id is Required")],
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;

      md.buyCue(req, res, data);
    });
  }
);

app.post(
  "/setcurrentchat",
  mw.ensureToken,
  [check("chat_id").not().isEmpty().withMessage("chat id is Required")],
  (req, res) => {
    let {
      body: { chat_id },
    } = req;
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;

      md.setCurrentChat(data.user_id, chat_id).then((result) => {
        if (result.affectedRows > 0) {
          result.success = true;
          return res.status(200).json({ result });
        } else {
          result.success = false;
          return res.status(200).json({ result });
        }
      });
    });
  }
);

app.post(
  "/updateusername",
  mw.ensureToken,
  [check("username").not().isEmpty().withMessage("Username is Required")],
  (req, res) => {
    let {
      body: { username, avatar },
    } = req;
    var result = {};
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;

      md.updateUsername(username, avatar, data.user_id).then((rslt) => {
        if (rslt.affectedRows > 0) {
          result.success = true;
          return res.status(200).json({ result });
        } else {
          result.success = false;
          return res.status(200).json({ result });
        }
      });
    });
  }
);

app.post(
  "/setcurrentcue",
  mw.ensureToken,
  [check("cue_id").not().isEmpty().withMessage("cue id is Required")],
  (req, res) => {
    let {
      body: { cue_id },
    } = req;
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;

      md.setCurrentCue(data.user_id, cue_id).then((result) => {
        if (result.affectedRows > 0) {
          result.success = true;
          return res.status(200).json({ result });
        } else {
          result.success = false;
          return res.status(200).json({ result });
        }
      });
    });
  }
);

app.post(
  "/buychat",
  mw.ensureToken,
  [check("chat_id").not().isEmpty().withMessage("Chat id is Required")],
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;

      md.buyChat(req, res, data);
    });
  }
);

app.post(
  "/updateuseravatar",
  mw.ensureToken,
  [check("avatar").not().isEmpty().withMessage("Avatar is Required")],
  (req, res) => {
    let {
      body: { avatar },
    } = req;

    jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;
      //console.log('data:',data)
      //console.log('data.user_id:',data.user_id)
      md.updateUserAvatar(data.user_id, avatar).then((result) => {
        if (result.affectedRows > 0) {
          result.success = true;
          return res.status(200).json({ result });
        } else {
          return res.status(401).json({ error: "There is some error." });
        }
      });
    });
  }
);

app.post("/updateuser", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    md.updateUser(req, res, data).then((result) => {
      //console.log('result001',result);
      return res.status(200).json({ result });
    });
  });
});

// app.post('/transaction', mw.ensureToken ,[
//   check('winner_id').not().isEmpty().withMessage('Winner is Required'),
//   check('looser_id').not().isEmpty().withMessage('Looser is Required'),
//   check('poolid').not().isEmpty().withMessage('Poolid is Required')
// ], (req, res) => {
// jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {

// 		// check for required field

// 	let my = fieldCheck(req,res);
// 	if(my && my.statusCode == 422) return;

// 	md.Commit(req, res, data)
// 	  .then(async(result) => {
// 	  //	console.log('result:', result);

// 	if(result.affectedRows > 0){

// 		result.success = true;
// 		return res.status(200).json({ result })

// 		}else{

// 		return res.status(200).json({ result:{message:"Transaction error", success:false} })
// 	  	}

// 	  })//.catch(err => res.status(401).json({ result:{"error":"There is some error.", success:false,err} }));
// 	});
// })
app.post(
  "/transaction",
  mw.ensureToken,
  [
    check("winner_id").not().isEmpty().withMessage("Winner is Required"),
    check("looser_id").not().isEmpty().withMessage("Looser is Required"),
    check("game_id").not().isEmpty().withMessage("Game id is Required"),
    check("poolid").not().isEmpty().withMessage("Poolid is Required"),
  ],
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
      // check for required field

      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;

      md.Commit(req, res, data)
        .then(async (result) => {
          //console.log('result:', result);

          if (result.affectedRows > 0) {
            result.success = true;
            return res.status(200).json({ result });
          } else if (result.error) {
            return res
              .status(200)
              .json({ result: { message: result.error, success: false } });
          } else {
            return res.status(200).json({
              result: { message: "Transaction error", success: false },
            });
          }
        })
        .catch((err) =>
          res.status(401).json({
            result: { error: "There is some error.", success: false, err },
          })
        );
    });
  }
);

app.post(
  "/transaction001",
  mw.ensureToken,
  [
    check("winner_id").not().isEmpty().withMessage("Winner is Required"),
    //check('looser').not().isEmpty().withMessage('Looser is Required'),
    check("game_id").not().isEmpty().withMessage("Game id is Required"),
    check("poolid").not().isEmpty().withMessage("Poolid is Required"),
  ],
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
      // check for required field

      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;

      md.newCommit(req, res, data).then(async (result) => {
        //console.log('result:', result);

        if (result.affectedRows > 0) {
          result.success = true;
          return res.status(200).json({ result });
        } else if (result.error) {
          return res
            .status(200)
            .json({ result: { message: result.error, success: false } });
        } else {
          return res
            .status(200)
            .json({ result: { message: "Transaction error", success: false } });
        }
      }); //.catch(err => res.status(401).json({ result:{"error":"There is some error.", success:false,err} }));
    });
  }
);
//match Draw
app.post(
  "/draw",
  mw.ensureToken,
  [check("poolid").not().isEmpty().withMessage("Poolid is Required")],
  (req, res) => {
    jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
      // check for required field
      let my = fieldCheck(req, res);
      if (my && my.statusCode == 422) return;

      md.newDraw(req, res).then(async (result) => {
        console.log("result:", result);

        if (result.affectedRows > 0) {
          result.success = true;
          return res.status(200).json({ result });
        } else if (result.error) {
          return res
            .status(200)
            .json({ result: { message: result.error, success: false } });
        } else {
          return res
            .status(200)
            .json({ result: { message: "Transaction error", success: false } });
        }
      }); //.catch(err => res.status(401).json({ result:{"error":"There is some error.", success:false,err} }));
    });
  }
);

// TO send friend requestf
app.post("/addfriend", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    if (err) {
      res.sendStatus(403);
    }

    P.coroutine(function* () {
      let insert = {
        user_one_id: data.user_id,
        user_two_id: req.body.user_id,
        status: 0,
        action_user_id: data.user_id,
      };

      if (data.user_id == req.body.user_id) {
        return res.json({
          result: { success: false, message: "You can not be your Friend" },
        });
      } else {
        let requestValidation = yield db.query(
          'SELECT * FROM relationship WHERE user_one_id = "' +
            data.user_id +
            '" AND user_two_id = "' +
            req.body.user_id +
            '" or user_two_id = "' +
            data.user_id +
            '" AND user_one_id = "' +
            req.body.user_id +
            '"'
        );
        // console.log('requestValidation',requestValidation)
        if (requestValidation.length > 0) {
          if (requestValidation[0].status == 1) {
            return res.json({
              result: { success: false, message: "Friend already added" },
            });
          } else {
            return res.json({
              result: { success: true, message: "Request sent" },
            });
          }
        } else {
          let addfriend = yield db.query(
            "INSERT INTO relationship SET ?",
            Object.assign({}, insert)
          );

          if (addfriend.insertId) {
            return res.json({
              result: {
                success: true,
                message: "Friend Request sent successfully!",
              },
            });
          }
        }
      }
    })();
  });
});

/**
 * To unfriend
 */
app.post("/unfriend", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    if (err) {
      res.sendStatus(403);
    }
    P.coroutine(function* () {
      let requestValidation = yield db.query(
        'SELECT * FROM relationship WHERE user_one_id = "' +
          data.user_id +
          '" AND user_two_id = "' +
          req.body.user_id +
          '" or user_two_id = "' +
          data.user_id +
          '" AND user_one_id = "' +
          req.body.user_id +
          '"'
      );

      if (requestValidation.length > 0) {
        db.query(
          "DELETE FROM `relationship` WHERE (`user_one_id` = ? and `user_two_id` = ?) or (`user_one_id` = ? and `user_two_id` = ?)",
          [req.body.user_id, data.user_id, data.user_id, req.body.user_id]
        );
        res.json({ result: { status: true } });
      } else {
        res.json({ result: { status: false } });
      }
    })();
  });
});

app.get("/friends", mw.ensureToken, function (req, res) {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    if (err) {
      res.sendStatus(403);
    } else {
      let friends;
      md.friends(data.user_id).then((rows) => {
        let friendlist = rows.map(function (row) {
          return row.id;
        });

        res.status(200).json({ result: { friends: friendlist } });
      });
    }
  });
});

app.get("/requests", mw.ensureToken, function (req, res) {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    if (err) {
      res.sendStatus(403);
    } else {
      let requests;
      md.friendRequests(data.user_id).then((rows) => {
        requests = rows.map(function (row) {
          return row.user_two_id;
        });
        res.status(200).json({ result: { requests } });
      });
    }
  });
});

/**
 * To accept friend request
 */
app.post("/actiononrequest", mw.ensureToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, function (err, data) {
    let {
      body: { action },
    } = req;

    if (err) {
      res.sendStatus(403);
    }

    if (!req.body.id) {
      generateError(res, "No user selected!");
    }

    P.coroutine(function* () {
      if (action == "accept") {
        var query0 =
          'UPDATE relationship SET status = "1", action_user_id = "' +
          data.user_id +
          '" WHERE user_one_id = "' +
          req.body.id +
          '" AND user_two_id = "' +
          data.user_id +
          '"';
        //console.log(query0);
        let acceptRequest = yield db.query(query0);
        //console.log(acceptRequest);
        if (acceptRequest.affectedRows > 0) {
          res.end(
            JSON.stringify({
              result: {
                success: true,
                message: "Friend request accepted!",
                otherUserId: req.body.id,
              },
            })
          );
        } else {
          generateError(res, "Error accepting request");
        }
      } else {
        var query0 =
          'DELETE FROM relationship WHERE user_one_id = "' +
          req.body.id +
          '" and user_two_id = "' +
          data.user_id +
          '"';
        db.query(query0, function (err, result) {
          if (err) {
            generateError(res, "Error declining request!");
          } else {
            if (JSON.parse(JSON.stringify(result)).affectedRows > 0) {
              res.end(
                JSON.stringify({
                  result: {
                    success: true,
                    message: "Request declined successfully!",
                  },
                })
              );
            } else {
              generateError(res, "Error declining request!");
            }
          }
        });
      }
    })();
  });
});

module.exports = app;
