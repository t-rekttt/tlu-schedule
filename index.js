const express = require('express');
const app = express();
const apiRouter = require('./modules/api/');
const bodyParser = require('body-parser');
const session = require('express-session');

let PORT = process.env.PORT || 3000;

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

app.use('/api', apiRouter);

app.get('/test', (req, res) => {
  res.send('It works');
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});