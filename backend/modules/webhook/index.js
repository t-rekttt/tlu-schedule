const Router = require('express').Router();
const scheduleModel = require('../db/scheduleModel.js');
const messengerUserModel = require('../db/messengerUserModel.js');
const {  } = require('tinchi-api');

Router.post('/update', (req, res) => {
  if (!req.body || !req.body['messenger user id'] || !req.body.code) {
    return res.json({
      messages: [
        {text: 'Không đủ dữ liệu!'}
      ]
    });
  }

  let messenger_user_id = req.body['messenger user id'];
  let { code } = req.body;

  scheduleModel.findOne({ hash: code })
    .then(doc => {
      if (!doc) {
        return res.json({
          messages: [
            {text: 'Không tìm thấy lịch học'}
          ]
        });
      }

      messengerUserModel.updateOne({ messenger_user_id }, {
        messenger_user_id,
        hash: code
      }, { upsert: true })
      .then(doc => {
        return res.json({
          messages: [
            {text: 'Cập nhật thành công!'}
          ]
        });
      });
    });
});

Router.get('/tkb', (req, res) => {
  if (!req.query || !req.query['messenger user id']) {
    return res.json({
      messages: [
        {text: 'Không đủ dữ liệu!'}
      ]
    });
  }

  let messenger_user_id = req.query['messenger user id'];

  messengerUserModel.findOne({
    messenger_user_id
  })
  .then(doc => {
    if (!doc) {
      return res.json({
        messages: [
          {text: 'Vui lòng cập nhật lịch học trước khi tra cứu!'}
        ]
      });
    }

    let { hash } = doc;

    scheduleModel.findOne({
      hash
    })
    .then(doc => {
      if (!doc) {
        return res.json({
          messages: [
            {text: 'Không tìm thấy lịch học'}
          ]
        });
      }

      return doc.schedule;
    })
    .then(generateTimeline)
    .then(groupTimelineByDay)
    .then(timeline => {
      if (req.query.today) {
        timeline = timeline.filter(day => day.today)[0];

        var messages = [];
        if (!timeline) {
          messages.push('Bạn không có lịch môn nào hôm nay!');
        } else {
          messages.push('Hôm nay bạn có các môn:\n');

          timeline.subjects.map(subject => {
            let location = (subject.locations && subject.locations[subject.phase]) ? subject.locations[subject.phase].location : subject.dia_diem;
            let time_range = `${ subject.timestamp.start.format('H[h]mm') }-${ subject.timestamp.end.format('H[h]mm') }`;
            let name = subject.lop_hoc_phan;

            messages.push(`${name}: ${time_range} tại ${location}\n`);
          });
        }

        return res.json({
          messages: messages.map(message => { 
            return {
              text: message 
            }
          })
        });
      }
    })
  });
});

Router.post('*', (req, res) => {
  console.log(req.body);
  res.send('ok');
});

module.exports = Router;