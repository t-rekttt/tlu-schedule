require('dotenv').config();
require('./cron.js');
const express = require('express');
const app = express();
const apiRouter = require('./modules/api/');
const webhookRouter = require('./modules/webhook/');
const bodyParser = require('body-parser');
const session = require('express-session');
const history = require('connect-history-api-fallback');
const mongoose = require('mongoose');

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

app.use(history());

app.use('/', express.static(__dirname + '/dist'));

app.get('/test', (req, res) => {
  res.send('It works');
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});