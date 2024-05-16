const jsonwebtoken = require("jsonwebtoken");
module.exports = {
  middleware: (req, res, next) => {
    try {
      if (req.cookies && req.cookies.token) {
        const token = req.cookies.token.split(" ")[1];
        try {
          const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET);
          req.user = decoded;
          next();
        } catch (err) {
          let error = new Error("Authentication failed, jwt invalid.");
          res.status(401);
          return res.render("error", { error: error, message: error.message });
          //   return res.status(401).json({
          //     status: 401,
          //     message: "Authentication failed, jwt invalid.",
          //     data: null,
          //   });
        }
      } else {
        let error = new Error("Authentication failed, please login.");
        res.status(401);
        return res.render("error", { error: error, message: error.message });

        // return res.status(401).json({
        //   status: 401,
        //   message: "Authentication failed, please login.",
        //   data: null,
        // });
      }
    } catch (error) {
      next(error);
    }
  },
};
