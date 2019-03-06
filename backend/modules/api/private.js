const Router = require('express').Router();
const scheduleModel = require('../db/scheduleModel.js');
const userModel = require('../db/userModel.js');
const { generateTimeline, groupTimelineByDay } = require('tinchi-api');
const fs = require('fs');
const cheerio = require('cheerio');
const period_board = require('../../period_board.js');
let template = fs.readFileSync(__dirname + '/template.html');
var moment = require('moment-timezone');
moment.tz.setDefault('Asia/Ho_Chi_Minh');
moment.locale('vi-VN');

let colors = ['#6F1E51', '#1B1464', '#0652DD', '#ED4C67', '#006266', '#2f3640', '#c23616', '#cd6133', '#b33939']

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
    .then(json => {
      let $ = cheerio.load(template);

      let week = [];

      let subjectsCode = {};

      json.map(day => {
        let subjects = day.subjects;

        subjects.map(subject => subjectsCode[subject.hoc_phan] = 1);

        let j = 0;

        let current = {};

        let day_subjects = [];

        for (let i = 1; i <= 15; i++) {
          if (j >= subjects.length) break;
          let start = moment(subjects[j].timestamp.start);
          let end = moment(subjects[j].timestamp.end);
          let start_period = moment(day.day).hour(period_board[i].start.hour).minute(period_board[i].start.minute);
          let end_period = moment(day.day).hour(period_board[i].end.hour).minute(period_board[i].end.minute);

          if (start.isSame(start_period)) {
            current = subjects[j];
            current.periods = 1;
          }
          else if (start_period.isBetween(start, end, null, '()') && end_period.isBetween(start, end, null, '()')) {
            current.periods++;
          }
          else if (end.isSame(end_period)) {
            current.periods++;
            day_subjects.push(current);
            current = {};
            j++;
          } else {
            day_subjects.push(current);
            current = {};
          }
        }

        week.push({
          day: day.day, 
          subjects: day_subjects
        });
      });

      Object.keys(subjectsCode).map((key, i) => {
        subjectsCode[key] = colors[i % colors.length];
      });

      week.map(day => {
        let dayOfWeek = moment(day.day).day() + 1;
        let period = 0;
        day.subjects.map((subject, i) => {
          period++;
          if (subject.periods) {
            let subjectElem = $('#t'+dayOfWeek+'_'+period);
            subjectElem.text(`${subject.lop_hoc_phan}\nĐịa điểm: ${subject.dia_diem}`);
            subjectElem.attr('rowspan', subject.periods);
            subjectElem.css('color', 'white');
            subjectElem.css('background-color', subjectsCode[subject.hoc_phan]);
            for (let j = 1; j < subject.periods; j++) {
              period++;
              $('#t'+dayOfWeek+'_'+period).remove()
            }
          }
        });
      });

      return $.html();
    })
    .then(html => res.send(html));
});

module.exports = Router;