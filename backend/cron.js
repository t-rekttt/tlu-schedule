require('dotenv').config();
var CronJob = require('cron').CronJob;
const scheduleModel = require('./modules/db/scheduleModel.js');
const mongoose = require('mongoose');
const { generateTimeline, groupTimelineByDay } = require('tinchi-api');
const period_board = require('./period_board.js');
const chatfuelController = require('./modules/chatfuel/chatfuelController.js');
const _ = require('lodash');
const async = require('async');
var moment = require('moment-timezone');
moment.tz.setDefault('Asia/Ho_Chi_Minh');

mongoose.connect(process.env.MONGO_URL, { keepAlive: true, keepAliveInitialDelay: 300000, useNewUrlParser: true });

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

let getDataBetweenPeriods = (date, start_period, end_period) => {
  return scheduleModel
    .aggregate([
      {
        $match: {
          schedule: {$ne: null}
        }
      },
      {
        $addFields: {
          size: {$size: '$schedule'}
        }
      },
      {
        $match: {
          size: {$gt: 0}
        }
      },
      {
        $lookup: {
          from: 'messengerusers',
          localField: 'hash',
          foreignField: 'hash',
          as: 'messenger_user_id'
        }
      },
      {
        $unwind: '$messenger_user_id'
      },
      {
        $addFields: {
          messenger_user_id: '$messenger_user_id.messenger_user_id',
          subscription: '$messenger_user_id.subscription'
        }
      },
      {
        $match: {
          subscription: true
        }
      }
    ])
    .then(users => {
      return users.map(user => {
        user.schedule = groupTimelineByDay(generateTimeline(user.schedule));
        return user;
      });
    })
    .then(users => {
      let start = date.hours(period_board[start_period].start.hour).minutes(period_board[start_period].start.minute).clone();
      let end = date.hours(period_board[end_period].start.hour).minutes(period_board[start_period].start.minute).clone();

      return users
        .map(user => {
          user.schedule = user.schedule
            .filter(schedule => schedule.day.isSame(date, 'day'))
            .map(schedule => {
              schedule.subjects = schedule.subjects.filter(subject => subject.timestamp.start.isBetween(start, end, null, '[]'));
              return schedule;
            })
            .filter(schedule => schedule.subjects.length)

          return user;
        })
        .filter(user => user.schedule && user.schedule.length);
    });
}

let createMessageData = (timeline) => {
  let messages = 'NHẮC LỊCH HỌC!!! LỊCH HỌC SẮP TỚI CỦA BẠN: \n';

  timeline.map(day => {
    let timestamp = day.day.format('dddd, [ngày] D [tháng] M [năm] YYYY');

    let message = _.capitalize(`${timestamp}:\n`);

    day.subjects.map(subject => {
      let location = (subject.locations && subject.locations[subject.phase]) ? subject.locations[subject.phase].location : subject.dia_diem;
      let time_range = `${ subject.timestamp.start.format('H[h]mm') }-${ subject.timestamp.end.format('H[h]mm') }`;
      let name = subject.lop_hoc_phan;

      message += `${name}\nThời gian: ${time_range}\nĐịa điểm: ${location}\n\n`;
    });

    messages += message + '\n';
  });

  return messages;
}

let sendSubscription = (date, start_period, end_period) => {
  return getDataBetweenPeriods(date, start_period, end_period)
    .then(users => {
      // users = users.filter(user => user.ma_sv === '1851160076');
      async.mapSeries(users, (user, cb) => {
        let message = createMessageData(user.schedule);

        chatfuelController.sendBroadcast(
          process.env.BOT_ID, 
          user.messenger_user_id, 
          process.env.BROADCAST_TOKEN, 
          process.env.TEXT_BLOCK, 
          { broadcast_text: message }
        )
        .then(() => {
          console.log('Subscription sent to ' + user.messenger_user_id);
          setTimeout(() => cb(), 2000);
        })
        .catch(err => {
          console.log(err);
          setTimeout(() => cb(), 2000);
        });
      });
    })
    .catch(err => console.log(err));
}

db.once('open', () => {
  console.log('DB connected');
  console.log('Starting cronjob');

  new CronJob('0 21 * * *', () => {
    console.log('Running 9pm cronjob');
    
    sendSubscription(moment().add(1, 'days').startOf('day').clone(), 1, 6);
  }, null, true, 'Asia/Ho_Chi_Minh');

  new CronJob('0 8 * * *', () => {
    console.log('Running 8am cronjob');
    
    sendSubscription(moment().startOf('day').clone(), 7, 12);
  }, null, true, 'Asia/Ho_Chi_Minh');
});