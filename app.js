const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const axios = require("axios");
const ejs = require("ejs");
require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/public", express.static("public"));
app.use(express.json());
app.use(cors());
app.set("view engine", "ejs");
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("connected to MongoDB");
});

const userSchema = new mongoose.Schema({
  username: String,
  logs: [{ description: String, duration: Number, date: String }],
});

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  const newUser = new User({
    username: username,
  });
  await newUser.save().then((data) => {
    res.json({ username: data.username, _id: data._id });
  });
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

app.get("/api/users/table-view", async (req, res) => {
  const users = await User.find({});
  res.render("tableView", { users: users });
});

app.get("/api/users/delete", async (req, res) => {
  if (
    req.query.key === process.env.ACCESS_KEY ||
    req.body.key === process.env.ACESSS_KEY
  ) {
    await User.deleteMany({}).then(() => {
      res.json({ message: "All users are deleted successfully." });
    });
  } else {
    res.status(401).json({ error: "Not Authorised" });
  }
});

app.get("/api/users/bulkadd", async (req, res) => {
  if (
    req.query.key === process.env.ACCESS_KEY ||
    req.body.key === process.env.ACESSS_KEY
  ) {
    res.sendFile(__dirname + "/views/addBulk.html");
  } else {
    res.status(401).json({ error: "Not Authorised" });
  }
});

app.post("/api/users/bulkadd", async (req, res) => {
  try {
    const userData = req.body;
    const result = await User.insertMany(userData);
    res.json({
      message: "Bulk data added successfully",
      insertedUsers: result,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/users/bulkadd-filter", async (req, res) => {
  const apiLink = req.body.url;
  const uniqueData = [];
  var count = 0;
  const response = await axios.get(apiLink);
  const filteredData = response.data.filter(
    (entry) => !entry.username.includes("fcc") && entry.username.includes("@")
  );
  const uniqueUsernames = new Set();

  for (const entry of filteredData) {
    if (!uniqueUsernames.has(entry.username)) {
      const logUrl = `https://exercise-tracker.freecodecamp.rocks/api/users/${entry._id}/logs`;
      try {
        const response = await axios.get(logUrl);
        if (response.data.log.length > 0) {
          entry.logs = response.data.log;
          uniqueUsernames.add(entry.username);
          uniqueData.push(entry);
          count++;
        }
      } catch (err) {
        console.log(`Error in loading ${entry.username} with id: ${entry._id}`);
      }
    }
  }
  const newUsers = await User.insertMany(uniqueData);
  res.json({ message: "Data from API is added succesfully", count: count });
});

app.post("/api/users/:id/exercises", async (req, res) => {
  const date = req.body.date
    ? new Date(req.body.date).toDateString()
    : new Date().toDateString();
  const newExercise = {
    description: req.body.description,
    duration: req.body.duration,
    date: date,
  };
  try {
    await User.findByIdAndUpdate(
      req.params.id,
      { $push: { logs: newExercise } },
      { new: true }
    ).then((data) => {
      res.send({
        _id: data._id,
        username: data.username,
        date: newExercise.date,
        duration: newExercise.duration,
        description: newExercise.description,
      });
    });
  } catch (err) {
    console.log(err);
    res.json({ error: "Invalid ID" });
  }
});

app.get("/api/users/:id/logs", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const logs = user.logs || [];

    const fromDate = new Date(req.query.from);
    const toDate = new Date(req.query.to);

    const filteredLogs = logs.filter((log) => {
      const logDate = new Date(log.date);
      return (
        (!req.query.from || logDate >= fromDate) &&
        (!req.query.to || logDate <= toDate)
      );
    });
    const limit = req.query.limit
      ? parseInt(req.query.limit, 10)
      : filteredLogs.length;
    const limitedLogs = filteredLogs.slice(0, limit);

    const logData = limitedLogs.map((log) => ({
      description: log.description,
      duration: log.duration,
      date: log.date,
    }));

    const userData = {
      _id: user._id,
      username: user.username,
      count: limitedLogs.length,
      log: logData,
    };

    res.json(userData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/users/:id/delete", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: `Username= ${user.username} is deleted.` });
  } catch (err) {
    res.status(500).json({ error: "Internal server Error" });
  }
});

app.listen(3000, () => {
  console.log("connected");
});
