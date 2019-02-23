const Router = require('express').Router();
const scheduleModel = require('../db/scheduleModel.js');
const messengerUserModel = require('../db/messengerUserModel.js');
const { generateTimeline, groupTimelineByDay } = require('tinchi-api');
var moment = require('moment-timezone');
moment.tz.setDefault('Asia/Ho_Chi_Minh');
const _ = require('lodash');
const tinchi = require('tinchi-api');

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
            {text: 'Không tìm thấy lịch học. Vui lòng thử cập nhật lại hoặc thử lại sau'}
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
          {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'button',
                text: 'Hãy làm theo các bước sau để bắt đầu sử dụng:\n1. Bấm nút "Đăng nhập", một cửa sổ sẽ hiện lên để bạn điền thông tin\n2. Điền thông tin đăng nhập của bạn trên trang đăng ký học và nhấn "Đăng nhập"\n3. Chọn lịch của học kì bạn muốn thêm vào chatbot\n4. Nhấn "Thêm vào chatbot"',
                buttons:[
                  {
                    type: 'web_url',
                    url: 'https://tkb.thao.pw/login?messenger_user_id='+req.query['messenger user id'],
                    title: 'Đăng nhập',
                    messenger_extensions: true,
                    webview_height_ratio: 'tall'
                  }
                ]
              }
            }
          }
        ]
      });
    }

    let { hash } = doc;

    scheduleModel.findOne({
      hash
    })
    .then(doc => {
      if (!doc) {
        throw 'Không tìm thấy lịch học';
      }

      let timeline = groupTimelineByDay(generateTimeline(doc.schedule));

      if (req.query.today) {
        timeline = timeline.filter(day => day.today)[0];

        var messages = [];
        if (!timeline) {
          messages.push('Bạn không có lịch môn nào hôm nay!');
        } else {
          messages.push(`[${doc.ma_sv}] Hôm nay bạn có các môn:\n`);

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
        timeline = timeline.filter(day => day.day.isBetween(moment().startOf('day'), moment().add('1', 'week'), null, '[]'));

        var messages = [];
        if (!timeline || !timeline.length) {
          messages.push('Bạn không có lịch môn nào trong vòng 7 ngày tới!');
        } else {
          messages.push(`[${doc.ma_sv}] 7 ngày tới bạn có lịch các môn:\n`);

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
    .catch(err => {
      if (typeof err === 'string') {
        return res.json({
          messages: [
            {text: err}
          ]
        });
      }

      console.log(err.message);

      return res.json({
        messages: [
          {text: err.message}
        ]
      });
    });
  });
});

Router.get('/login_options', (req, res) => {
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
            template_type: 'button',
            text: 'Hãy làm theo các bước sau để bắt đầu sử dụng:\n1. Bấm nút "Đăng nhập", một cửa sổ sẽ hiện lên để bạn điền thông tin\n2. Điền thông tin đăng nhập của bạn trên trang đăng ký học và nhấn "Đăng nhập"\n3. Chọn lịch của học kì bạn muốn thêm vào chatbot\n4. Nhấn "Thêm vào chatbot"',
            buttons:[
              {
                type: 'web_url',
                url: 'https://tkb.thao.pw/login?messenger_user_id='+req.query['messenger user id'],
                title: 'Đăng nhập',
                messenger_extensions: true,
                webview_height_ratio: 'tall'
              }
            ]
          }
        }
      }
    ]
  });
});

Router.post('/subscribe', (req, res) => {
  if (!req.body || !req.body['messenger user id']) {
    return res.json({
      messages: [
        {text: 'Không đủ dữ liệu!'}
      ]
    });
  }

  let messenger_user_id = req.body['messenger user id'];
  return messengerUserModel.updateOne({
    messenger_user_id
  }, {
    $set: {
      subscription: true
    }
  })
  .then(() => {
    return res.json({
      messages:[
        { 'text': 'Bật tính năng nhắc lịch học thành công! \nLịch học các tiết buổi sáng sẽ được thông báo cho bạn vào 21h tối hôm trước. \nLịch học các tiết buổi chiều sẽ được thông báo vào 8h sáng cùng ngày!' }
      ]
    });
  })
  .catch(err => {
    console.log(err);

    return res.json({
      messages:[
        { 'text': 'Đã có lỗi xảy ra, hãy báo với admin để được hỗ trợ!' }
      ]
    });
  });
});

Router.get('/studentMark', (req, res) => {
  if (!req.query || !req.query['messenger user id']) {
    return res.json({
      messages: [
        {text: 'Không đủ dữ liệu!'}
      ]
    });
  }

  let messenger_user_id = req.query['messenger user id'];
  
  return messengerUserModel
    .aggregate([
      {$match: { messenger_user_id }},
      {
        $lookup: {
          from: 'schedules',
          localField: 'hash',
          foreignField: 'hash',
          as: 'passwordHash'
        }
      },
      {$unwind: '$passwordHash'},
      {$addFields: { 
        'ma_sv': '$passwordHash.ma_sv',
        'passwordHash': '$passwordHash.passwordHash' }
      }
    ])
    .then(doc => {
      if (!doc || !doc.length) {
        return res.json({
          messages:[
            { 'text': 'Vui lòng cập nhật lịch học trước khi tra cứu điểm để hệ thống có thể liên kết tài khoản của bạn với trang đăng ký học' }
          ]
        });
      }

      doc = doc[0];

      let loginPromise = tinchi.login(doc.ma_sv, doc.passwordHash, { shouldNotEncrypt: true });
      if (!req.query.drpHK) {
        loginPromise
          .then(() => tinchi.getStudentMark())
          .then(({ data, options }) => {
            let optionsDrpHK = options.drpHK.filter(option => option.value && option.value.length)

            return res.json({
              messages: [
                { 
                  text: 'Chọn học kì bạn cần tra cứu điểm',
                  quick_replies: optionsDrpHK.map(option => {
                    return {
                      title: option.text,
                      set_attributes: {
                        drpHK: option.value
                      }
                    }
                  }),
                  block_names: ['Get student mark']
                }
              ]
            });
          });
      } else {
        let { drpHK } = req.query;
        
        loginPromise
          .then(() => tinchi.getStudentMark({ drpHK }))
          .then(({ data, options }) => data)
          .then(tinchi.parseStudentMark)
          .then(data => {
            let markMessage = data.map(subject => {
              return `${subject.ten_hoc_phan} (${subject.ma_hoc_phan}): \nSố tín chỉ: ${subject.so_tin_chi}\nQuá trình: ${subject.qua_trinh}\nThi: ${subject.thi}\nTKHP: ${subject.tkhp}\nĐiểm chữ: ${subject.diem_chu}`;
            });

            return res.json({
              messages: [
                {
                  text: `[${doc.ma_sv}] Các điểm của bạn trong học kì ${drpHK}: `
                },
                ...markMessage
              ]
            });
          });
      }
        
    });
});

Router.post('*', (req, res) => {
  console.log(req.body);
  res.send('ok');
});

module.exports = Router;