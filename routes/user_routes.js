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
    res.redirect("/user/dashboard");
  } else {
    req.session.id = null;
    res.redirect("/login");
  }
});

app.get("/add-funds", async (req, res) => {
  if (req.session.usertype == 0) {
      res.render("user/add_funds");
  } else {
    res.redirect("/login");
  }
});
app.get("/profile", async (req, res) => {
  if (req.session.usertype == 0) {
      res.render("user/profile");
  } else {
    res.redirect("/login");
  }
});
app.get("/view-trans", async (req, res) => {
  if (req.session.usertype == 0) {
      res.render("user/view-trans");
  } else {
    res.redirect("/login");
  }
});
app.get("/match-requests", async (req, res) => {
  if (req.session.usertype == 0) {
      res.render("user/match_requests");
  } else {
    res.redirect("/login");
  }
});
app.get("/withdraw", async (req, res) => {
  if (req.session.usertype == 0) {

    md.getUserCoins(req.session.id).then((result) => {
      console.log("result", result[0]);
      res.render("user/withdraw",  {coins:result[0].coins});
    });
  } else {
    res.redirect("/login");
  }
});
app.get("/games", async (req, res) => {
  if (req.session.usertype == 0) {
    md.gamesList().then((games) => {
      res.render("user/games", {
        games,
      });
    });
  } else {
    res.redirect("/login");
  }
});
app.get("/dashboard", async (req, res) => {
  if (req.session.usertype == 0) {

    md.getUserDetails(req.session.id).then((result) => {
      console.log("result", result[0]);
      res.render("user/dashboard", result);
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/success", (req, res) => {
  res.render("front/success");
});



module.exports = app;
