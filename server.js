require('dotenv').config()
const express = require('express');
const app = express();
const bodyparser = require('body-parser');
// const port = process.env.PORT || 3000;
const port =  3000;
const cors = require('cors');


const authRouter = require('./routes/authrouter');

const admin = require('./routes/adminRoutes')
const student = require('./routes/studentRoutes')
const connectdb = require('./databaseSetup');

app.use(cors());
app.use(bodyparser.json());


// router is hear
app.use("/auth/api", authRouter);
app.use("/admin", admin);
app.use("/student", student);


// connectdb ......
app.listen(port, (req, res) => {
  connectdb();

  console.log(`the server run in port :${port}`)
});
