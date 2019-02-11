const Router = require('express').Router();
const scheduleModel = require('../db/scheduleModel.js');
const messengerUserModel = require('../db/messengerUserModel.js');
const { generateTimeline, groupTimelineByDay } = require('tinchi-api');
const moment = require('moment');
const _ = require('lodash');

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
            {text: 'Không tìm thấy lịch học. Vui lòng cập nhật lại code!'}
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
          {text: 'Vui lòng cập nhật lịch học trước khi tra cứu bằng cách sau:\n 1. Đăng nhập trên trang https://tkb.thao.pw\n 2. Chọn lịch của học kì bạn cần cập nhật\n 3. Copy code trên trang \n 4. Chọn "Nhập code" trên page và gửi code vừa copy\n\n Xem video hướng dẫn tại: https://fb.com/322255541956442/'}
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

            messages.push(`${name}\nThời gian: ${time_range}\nĐịa điểm: ${location}`);
          });
        }

        return res.json({
          messages: messages.map(message => { 
            return {
              text: message 
            }
          })
        });
      } else if (req.query.next7days) {
        timeline = timeline.filter(day => day.day.isBetween(moment(), moment().add('1', 'week')));

        var messages = [];
        if (!timeline || !timeline.length) {
          messages.push('Bạn không có lịch môn nào trong vòng 7 ngày tới!');
        } else {
          messages.push('7 ngày tới bạn có lịch các môn:\n');

          timeline.map(day => {
            let timestamp = day.day.format('dddd, [ngày] D [tháng] M [năm] YYYY');

            let message = _.capitalize(`${timestamp}:\n`);

            day.subjects.map(subject => {
              let location = (subject.locations && subject.locations[subject.phase]) ? subject.locations[subject.phase].location : subject.dia_diem;
              let time_range = `${ subject.timestamp.start.format('H[h]mm') }-${ subject.timestamp.end.format('H[h]mm') }`;
              let name = subject.lop_hoc_phan;

              message += `${name}\nThời gian: ${time_range}\nĐịa điểm: ${location}\n\n`;
            });

            messages.push(message);
          });

          return res.json({
            messages: messages.map(message => { 
              return {
                text: message 
              }
            })
          });
        }
      }
    })
  });
});

Router.get('/login_button', (req, res) => {
  if (!req.query || !req.query['messenger user id']) {
    return res.json({
      messages: [
        {text: 'Không đủ dữ liệu!'}
      ]
    });
  }

  return res.json({
    messages:[
      {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            image_aspect_ratio: 'square',
            elements: [{
              title: 'Mời bạn đăng nhập và chọn lịch học để cập nhật!',
              subtitle: 'Choose your preferences',
              buttons:[
                {
                  type: 'web_url',
                  url: 'https://tkb.thao.pw/login?messenger_user_id='+req.query['messenger user id'],
                  title: 'Đăng nhập',
                  messenger_extensions: true,
                  webview_height_ratio: 'tall'
                }
              ]
            }]
          }
        }
      }
    ]
  });
});

Router.post('*', (req, res) => {
  console.log(req.body);
  res.send('ok');
});

module.exports = Router;