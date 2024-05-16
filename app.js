require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const Sentry = require("./libs/sentry");

const indexRouter = require("./routes/index");
const authRouter = require("./routes/auth");

const app = express();
// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(flash());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use("/", indexRouter);
app.get("/notification/:id", async (req, res, next) => {
  try {
    let userData = await prisma.user.findUnique({
      where: {
        id: +req.params.id,
      },
      include: {
        notification: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
    delete userData?.password;

    res.render("notification", { user: userData, notification: userData?.notification, user_id: req.params.id });
  } catch (error) {
    next(error);
  }
});
app.post("/notification", async (req, res, next) => {
  try {
    let { user_id, title, body } = req.body;

    // push kedalam database
    let createNotif = await prisma.notification.create({
      data: {
        user_id: +user_id,
        title,
        body,
      },
    });
    // kirimkan notifikasi baru
    io.emit(`user-${user_id}`, createNotif);

    return res.status(201).json({
      status: true,
      message: "OK",
      data: createNotif,
    });
  } catch (error) {
    next(error);
  }
});
app.use("/api/v1/auth", authRouter);

app.use(Sentry.Handlers.errorHandler());

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// socket.io (server)
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
