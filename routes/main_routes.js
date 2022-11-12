const app = require("express").Router(),
  db = require("../models/db"),
  md = require("../models/user"),
  mw = require("../models/middlewares"),
  mail = require("../models/mail"),
  fileUpload = require("express-fileupload"),
  http = require("http"),
  atob = require("atob"),
  path = require("path");

const { check, validationResult } = require("express-validator");

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

// default options
app.use(fileUpload());

app.get("/", (req, res) => {
  //res.send('hello');
  if (req.session.id) {
    if (req.session.usertype == 0) {
      res.redirect("user/dashboard");
    } else {
      res.redirect("admin/dashboard");
    }
  } else {
    req.session.id = null;
    res.redirect("/login");
  }
});
app.get("/login", mw.NotLoggedIn, function (req, res) {
  res.render("admin/login");
});
app.get("/register", mw.NotLoggedIn, function (req, res) {
  res.render("admin/register");
});
app.get("/forgot-pass", mw.NotLoggedIn, function (req, res) {
  res.render("front/forgotpassword");
});
app.get("/verify-phone", mw.NotLoggedIn, function (req, res) {
  res.render("front/verify_phone");
});
app.get("/success", (req, res) => {
  res.render("front/success");
});
// Reset password
app.get("/reset/:token", mw.NotLoggedIn, (req, res) => {
  md.reset(req, res);
});

app.get("/downloadapk", function (req, res) {
  var filePath = "./public/apk/192Pool.apk"; // Or format the path using the `id` rest param

  res.download(filePath);
});
app.post("/paywithpaytmsuccess1", (req, res) => {
  responsePayment(req.body).then(async (success) => {
    console.log("success", success);
  });
});
app.post("/paywithpaytmsuccess", (req, res) => {
  responsePayment(req.body).then(
    async (success) => {
      let [{ offer_percentage }] = await md.getOffer();
      if (success.RESPCODE == "01") {
        var offer_amount =
          parseInt(success.TXNAMOUNT) * (offer_percentage / 100);
        var final_amount = parseInt(success.TXNAMOUNT) + parseInt(offer_amount);

        let rs = await md.updatePaymentHistory(
          final_amount,
          success.TXNID,
          success.STATUS,
          success.RESPCODE,
          success.RESPMSG,
          success.ORDERID
        );

        if (rs) {
          var rr = await md.getPaymentRec(success.ORDERID);

          var rr02 = await md.getUserDetail("phone", rr[0].user_id);

          var message =
            "You have successfully deposited an amount of Rs. " +
            final_amount +
            " to your 192 Pool account. In case of any queries, drop us an email at support@192pool.com";

          var rp = await md.getUserEmail(rr[0].user_id);

          var rs1 = await md.updateUserBalance(
            rr[0].user_id,
            final_amount,
            "+"
          );

          let options = {
            to: rp[0].email,
            subject: "Amount Deposited",
          };

          let renderable = {
            template: path.join("emails", "users", "tokenSuccessful.html"),
            locals: {
              host: req.hostname,
              amount: final_amount,
            },
          };

          let rr03 = await mail(options, renderable);
          let data = { mobile: rr02[0].phone, message };
          let rr01 = await sms(data);
        }

        res.redirect(
          "intent:#Intent;action=com.poolgame.launch;category=android.intent.category.DEFAULT;category=android.intent.category.BROWSABLE;end"
        );
      } else {
        let rs = await md.updatePaymentHistory(
          final_amount,
          success.TXNID,
          success.STATUS,
          success.RESPCODE,
          success.RESPMSG,
          success.ORDERID
        );
        if (rs) {
          res.redirect(
            "intent:#Intent;action=com.poolgame.launch;category=android.intent.category.DEFAULT;category=android.intent.category.BROWSABLE;end"
          );
          //   res.render("front/response.ejs", {resultData: "true", responseData: success});
        }
      }
    },
    (error) => {
      res.send(error);
    }
  );
});

app.get("/mytest", (req, res) => {
  let success = {
    RESPCODE: "lllllllkkk",
  };
  res.render("front/response.ejs", {
    resultData: "true",
    responseData: success,
  });
});
//https://be.192pool.com/kyc/MTYw
app.get("/kyc/:uid", async (req, res) => {
  let data = atob(req.params.uid).split("-");

  let userid = data[1];
  var rs = await md.getKycStatus(userid),
    status = "";

  if (rs.length > 0) {
    status = rs[0].status;
  }

  if (status == "approved") {
    res.redirect("/withdraw/" + req.params.uid);
  }
  res.render("front/kyc.ejs", { user_id: userid, status });
});

app.get("/kyc_res", (req, res) => {
  let uid = req.params.uid;
  res.render("front/kyc_res.ejs", { user_id: uid });
});

app.get("/withdraw/:uid", async (req, res) => {
  let data = atob(req.params.uid).split("-");

  let userid = data[1];

  console.log("req.params.uid", req.params.uid);
  console.log("userid", userid);

  var rs = await md.getKycStatus(userid),
    status = "";

  if (rs.length > 0) {
    status = rs[0].status;
  }

  if (status != "approved") {
    res.redirect("/kyc/" + req.params.uid);
  }

  let [{ no_of_coins, win_amount }] = await md.getUserCredit(userid);

  res.render("front/withdrawal.ejs", { user_id: userid, amount: win_amount });
});

app.post(
  "/kyc",
  [
    check("full_name").not().isEmpty().withMessage("Please ener full Name"),
    check("bank_name").not().isEmpty().withMessage("Bank Name is Required"),
    check("acc_num").not().isEmpty().withMessage("Account Number is Required"),
    check("ifsc_code").not().isEmpty().withMessage("IFSC code is Required"),
    check("phone").not().isEmpty().withMessage("Phone is Required"),
    check("pan_num").not().isEmpty().withMessage("Pan Number is Required"),
    check("user_id").not().isEmpty().withMessage("User id is Required"),
  ],
  async (req, res) => {
    // check for required field
    let my = fieldCheck(req, res);
    if (my && my.statusCode == 422) return;

    let {
      body: {
        full_name,
        bank_name,
        acc_num,
        ifsc_code,
        pan_num,
        user_id,
        phone,
      },
    } = req;

    var pan_doc, bank_doc;

    let data = {
      full_name,
      bank_name,
      acc_num,
      ifsc_code,
      pan_num,
      phone,
      user_id,
    };

    if (req.files) {
      if (req.files.pan_doc) {
        var ext = path.extname(req.files.pan_doc.name);
        var d = new Date();
        var n = d.getTime();
        var filename = path.basename(req.files.pan_doc.name, ext);

        data.pan_doc = filename + "_" + n + ext;

        await md.uploadDoc(
          "./public/uploads/" + data.pan_doc,
          req.files.pan_doc
        );
      }
    } else {
      data.pan_doc = null;
    }

    if (req.files) {
      if (req.files.bank_doc) {
        var ext = path.extname(req.files.bank_doc.name);
        var d = new Date();
        var n = d.getTime();
        var filename = path.basename(req.files.bank_doc.name, ext);

        data.bank_doc = filename + "_" + n + ext;

        await md.uploadDoc(
          "./public/uploads/" + data.bank_doc,
          req.files.bank_doc
        );
      }
    } else {
      data.bank_doc = null;
    }

    md.addKyc(data).then(
      async (result) => {
        console.log("result-kyc:", result);
        let [{ email }] = await md.getUserEmail(user_id);

        if (email) {
          let options = {
            to: email,
            subject: "PAN card upload with 192 Pool successful ",
          };

          let renderable = {
            template: path.join("emails", "users", "kyc.html"),
            locals: {
              host: req.hostname,
            },
          };
          await mail(options, renderable);
        }

        res.redirect("/kyc_res");
      },
      (err) => {
        console.log("err", err);
        res.send(err);
      }
    );
  }
);

module.exports = app;
