require('dotenv').config();
require('./cron.js');
const express = require('express');
const app = express();
const privateApp = express();
const apiRouter = require('./modules/api/');
const webhookRouter = require('./modules/webhook/');
const bodyParser = require('body-parser');
const session = require('express-session');
const history = require('connect-history-api-fallback');
const mongoose = require('mongoose');
const privateRouter = require('./modules/api/private.js');

let PORT = process.env.PORT || 3000;

mongoose.connect(process.env.DB_URI, { keepAlive: true, keepAliveInitialDelay: 300000, useNewUrlParser: true });

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', () => {
  console.log('DB connected');
});

app.use(session({
  secret: 'ahihihihihi',
  resave: false,
  saveUninitialized: true
}));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.success = ({ data, message }) => res.json({success: 1, data, message});
  res.fail = ({ data, message }) => res.status(500).json({success: 0, data, message});

  next();
});

app.use((req, res, next) => {
  if (req.body && req.body.ma_sv) {
    req.body.ma_sv = req.body.ma_sv.trim();
  }
  
  next();
});

app.use('/api', apiRouter);

app.use('/webhook', webhookRouter);

app.use('/scheduletable', express.static(__dirname + '/scheduletable'));

app.use(history());

app.use('/', express.static(__dirname + '/dist'));

app.get('/test', (req, res) => {
  res.send('It works');
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

privateApp.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'https://tkb.thao.pw');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

privateApp.use((req, res, next) => {
  res.success = ({ data, message }) => res.json({success: 1, data, message});
  res.fail = ({ data, message }) => res.status(500).json({success: 0, data, message});

  next();
});

privateApp.use('/api', privateRouter);

privateApp.listen(process.env.PRIVATE_PORT, () => {
  console.log(`Private API listening on port ${process.env.PRIVATE_PORT}`);
});