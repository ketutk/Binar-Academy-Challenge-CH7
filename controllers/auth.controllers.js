const { PrismaClient } = require("@prisma/client");
const jsonwebtoken = require("jsonwebtoken");
const prisma = new PrismaClient();
const axios = require("axios");
const bcrypt = require("bcrypt");
const { sendResetEmail } = require("../libs/nodemailer");

module.exports = {
  register: async (req, res, next) => {
    try {
      let { name, email, password } = req.body;
      if (!name || !email || !password) {
        req.flash("error", "Missing field");
        res.status(400);
        return res.redirect("/register");
      }
      let exist = await prisma.user.findFirst({ where: { email } });
      if (exist) {
        req.flash("error", "email has already been used!");
        res.status(400);
        return res.redirect("/register");
      }

      let encryptedPassword = await bcrypt.hash(password, 10);
      let userData = await prisma.user.create({ data: { name, email, password: encryptedPassword } });
      const response = await axios.post(`${process.env.FE_URL}/notification`, {
        user_id: userData.id,
        title: `Welcome, ${userData.name}`,
        body: "We welcoming your presence here",
      });
      req.flash("success", "Account successfully created");
      return res.redirect("/login");
    } catch (error) {
      next(error);
    }
  },
  login: async (req, res, next) => {
    try {
      let { email, password } = req.body;
      if (!email || !password) {
        req.flash("error", "Missing field");
        res.status(400);
        return res.redirect("/login");
      }
      let user = await prisma.user.findUnique({
        where: {
          email: email,
        },
      });

      if (!user) {
        req.flash("error", "Invalid email or password");
        res.status(400);
        return res.redirect("/login");
      }

      let isPasswordCorrect = await bcrypt.compare(password, user.password);

      if (!isPasswordCorrect) {
        req.flash("error", "Invalid email or password");
        return res.redirect("/login");
      }

      const token = await jsonwebtoken.sign({ id: user.id, name: user.name, email: user.email }, process.env.JWT_SECRET);

      delete user.password;
      res.cookie("token", `Bearer ${token}`, {
        maxAge: 60000,
      });
      return res.redirect("/whoami");
    } catch (error) {
      next(error);
    }
  },
  forgotpassword: async (req, res, next) => {
    try {
      let { email } = req.body;
      if (!email) {
        req.flash("error", "Missing field");
        res.status(400);
        return res.redirect("/forgotpassword");
      }

      let user = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!user) {
        req.flash("error", "Email not registered");
        res.status(400);
        return res.redirect("/forgotpassword");
      }

      const token = jsonwebtoken.sign({ id: user.id, password: user.password }, process.env.JWT_SECRET, {
        expiresIn: "15m",
      });

      try {
        const sentMail = await sendResetEmail(user, token);
      } catch (error) {
        req.flash("error", "Failed to sent mail");
        res.status(400);
        return res.redirect("/forgotpassword");
      }
      req.flash("success", "Mail sent. Please check your email");
      return res.redirect("/forgotpassword");
    } catch (error) {
      next(error);
    }
  },
  resetpassword: async (req, res, next) => {
    try {
      const { token, password, confirm } = req.body;

      if (!token || !password || !confirm) {
        return res.redirect(`/login`);
      }

      if (password !== confirm) {
        req.flash("error", "Both password doesnt match");
        res.status(400);
        return res.redirect(`/resetpassword/${token}`);
      }

      let decoded;
      try {
        decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        throw new Error(error.message);
      }

      let user = await prisma.user.findUnique({
        where: {
          id: +decoded.id,
          password: decoded.password,
        },
      });

      if (!user) {
        throw new Error("Invalid process");
      }

      let hashedNewPassword = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: {
          id: +decoded.id,
          password: decoded.password,
        },
        data: {
          password: hashedNewPassword,
        },
      });

      const response = await axios.post(`${process.env.FE_URL}/notification`, {
        user_id: user.id,
        title: "Reset Password Success",
        body: "Your account's password had been sucessfully reset",
      });
      req.flash("success", "Successfully reset password");
      return res.redirect("/login");
    } catch (error) {
      next(error);
    }
  },
};
