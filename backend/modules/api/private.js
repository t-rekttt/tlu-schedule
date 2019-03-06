const Router = require('express').Router();
const scheduleModel = require('../db/scheduleModel.js');
const userModel = require('../db/userModel.js');
const { generateTimeline, groupTimelineByDay } = require('tinchi-api');
var moment = require('moment-timezone');
moment.tz.setDefault('Asia/Ho_Chi_Minh');

let filterThisWeek = (timeline) => {
  return timeline.filter(day => day.day.isSame(moment(), 'week'));
}

Router.get('/tkb', (req, res) => {
  if (!req.query || !req.query.messenger_user_id) {
    return res.fail(null, 'Not enough data');
  }

  let { messenger_user_id } = req.query;

  return userModel.findOne({ messenger_user_id })
    .then(doc => {
      let { hash } = doc;
      return scheduleModel.findOne({ hash })
    })
    .then(doc => {
      let { schedule } = doc;
      return filterThisWeek(groupTimelineByDay(generateTimeline(schedule)));
    })
    .then(data => res.json(data))
});

module.exports = Router;