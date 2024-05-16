const express = require("express");
const { register, login, forgotpassword, resetpassword } = require("../controllers/auth.controllers");
const router = express.Router();

/* GET users listing. */
router.post("/register", register);
router.post("/login", login);
router.post("/forgotpassword", forgotpassword);
router.post("/resetpassword/:token", resetpassword);

module.exports = router;
