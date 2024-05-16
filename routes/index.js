const express = require("express");
const { middleware } = require("../middleware/auth.middleware");
const router = express.Router();

router.get("/", (req, res) => {
  res.redirect("/login");
});
router.get("/register", (req, res) => {
  if (req.cookies && req.cookies.token) {
    return res.redirect("/whoami");
  }
  res.render("register");
});
router.get("/login", (req, res) => {
  if (req.cookies && req.cookies.token) {
    return res.redirect("/whoami");
  }
  res.render("login");
});
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  return res.redirect("/login");
});
router.get("/whoami", middleware, (req, res) => {
  res.render("whoami", { user: req.user });
});

router.get("/forgotpassword", (req, res) => {
  res.render("forgotpassword");
});
router.get("/resetpassword/:token", (req, res) => {
  const { token } = req.params;
  res.render("resetpassword", { token });
});

module.exports = router;
