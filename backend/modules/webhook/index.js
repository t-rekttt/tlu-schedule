const Router = require('express').Router();
const scheduleModel = require('../db/scheduleModel.js');
const messengerUserModel = require('../db/messengerUserModel.js');

Router.post('*', (req, res) => {
  console.log(req.data);
});

Router.post('/update', (req, res) => {
  if (!req.data) return res.fail({ message: 'Not enough data' });
});

module.exports = Router;