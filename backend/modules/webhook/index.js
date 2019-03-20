const Router = require('express').Router();
const scheduleModel = require('../db/scheduleModel.js');
const userModel = require('../db/userModel.js');
const { generateTimeline, groupTimelineByDay } = require('tinchi-api');
var moment = require('moment-timezone');
moment.tz.setDefault('Asia/Ho_Chi_Minh');
const _ = require('lodash');
const tinchi = require('tinchi-api');
const chatfuelController = require('../chatfuel/chatfuelController.js');
const md5 = require('md5');
const async = require('async');
const jsonpack = require('jsonpack');
const request = require('request-promise');
const fs = require('fs');

Router.post('/update', (req, res) => {
  if (!req.body || !req.body['messenger user id'] || !req.body.drpSemester) {
    return res.json({
      messages: [
        {text: 'Không đủ dữ liệu!'}
      ]
    });
  }

  let messenger_user_id = req.body['messenger user id'];
  let { drpSemester } = req.body;

  res.json({
    messages: [
      { text: 'Đang tiến hành cập nhật, bạn vui lòng chờ chút nha...' }
    ]
  });

  let jar = request.jar();

  userModel.findOne({ messenger_user_id })
    .then((doc1) => {
      let hash = md5(doc1.ma_sv + drpSemester);

      return tinchi
        .login(doc1.ma_sv, doc1.passwordHash, { jar, shouldNotEncrypt: true }) 
        .then(() => tinchi.getTkb({ drpSemester }, { jar }))
        .then(({ data, options }) => data)
        .then(tinchi.parseTkb)
        .then(data => {
          return {
            schedule: data,
            lastUpdate: Date.now(),
            messenger_user_id,
            drpSemester,
            ma_sv: doc1.ma_sv,
            hash
          }
        })
        .then(data => {
          return Promise.all([
            scheduleModel.updateOne({ drpSemester }, { $set: data }, { upsert: true }),
            userModel.updateOne({ messenger_user_id }, { $set: { drpSemester, hash } })
          ]);
        })
        .then(() => {
          return chatfuelController
            .sendBroadcast(
              process.env.BOT_ID, 
              messenger_user_id, 
              process.env.BROADCAST_TOKEN, 
              process.env.TEXT_BLOCK, 
              { broadcast_text: 'Cập nhật thành công!' }
            )
            .catch(err => {
              console.log(err.message);
            });
        });
    })
    .catch(err => {
      console.log(err);
      return chatfuelController
        .sendBroadcast(
          process.env.BOT_ID, 
          messenger_user_id, 
          process.env.BROADCAST_TOKEN, 
          process.env.TEXT_BLOCK, 
          { broadcast_text: 'Đã có lỗi xảy ra! '+err.message }
        )
        .catch(err => {
          console.log(err.message);
        });
    });
});

Router.get('/updateOptions', (req, res) => {
  if (!req.query || !req.query['messenger user id']) {
    return res.json({
      messages: [
        {text: 'Không đủ dữ liệu!'}
      ]
    });
  }

  let messenger_user_id = req.query['messenger user id'];

  res.json({
    messages: [
      { text: 'Đang lấy dữ liệu lịch học, xin bạn vui lòng chờ chút...' }
    ]
  });

  return userModel.findOne({ messenger_user_id })
    .then(doc => {
      if (!doc) {
        return chatfuelController
          .sendBroadcast(
            process.env.BOT_ID, 
            messenger_user_id, 
            process.env.BROADCAST_TOKEN, 
            process.env.TEXT_BLOCK, 
            { broadcast_text: 'Không tìm thấy dữ liệu tài khoản, bạn hãy liên kết lại tài khoản để tiếp tục sử dụng!' }
          )
          .catch(err => {
            console.log(err.message);
          });
      }

      let jar = request.jar();
      let { ma_sv, passwordHash } = doc;
      tinchi.login(ma_sv, passwordHash, { jar, shouldNotEncrypt: true })
        .then(() => tinchi.getTkb(null, { jar }))
        .then(({ data, options }) => {
          return options;
        })
        .then(options => {
          let optionsDrpSemester = options.drpSemester.filter(option => option.value && option.value.length)
          .filter(option => {
            let year = parseInt(option.text.split('_')[1]);
            let year1 = parseInt(option.text.split('_')[2]);
            let year2 = new Date().getFullYear();
            return ((2 * year2 - year1 - year) === 1);
          });

          let json = {
            messages: [
              { 
                text: 'Chọn học kì để cập nhật lịch học',
                quick_replies: optionsDrpSemester.map(option => {
                  return {
                    title: option.text,
                    set_attributes: {
                      drpSemester: option.value
                    },
                    block_names: ['Update API']
                  }
                })
              }
            ]
          };

          return chatfuelController
            .sendBroadcast(
              process.env.BOT_ID, 
              messenger_user_id, 
              process.env.BROADCAST_TOKEN, 
              process.env.JSON_BLOCK, 
              { data: jsonpack.pack(json) }
            )
            .catch(err => {
              console.log(err.message);
            });
        });
    })
    .catch(err => {
      console.log(err);
      return chatfuelController
        .sendBroadcast(
          process.env.BOT_ID, 
          messenger_user_id, 
          process.env.BROADCAST_TOKEN, 
          process.env.TEXT_BLOCK, 
          { broadcast_text: 'Đã có lỗi xảy ra! '+err.message }
        )
        .catch(err => {
          console.log(err.message);
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

  userModel.findOne({
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
                text: 'Hãy làm theo các bước sau để bắt đầu sử dụng:\n1. Bấm nút "Đăng nhập", một cửa sổ sẽ hiện lên để bạn điền thông tin\n2. Điền thông tin đăng nhập của bạn trên trang đăng ký học và nhấn "Đăng nhập"\n3. Chọn học kì bạn muốn nhập trên chatbot',
                buttons:[
                  {
                    type: 'web_url',
                    url: 'https://tkb.thao.pw/accountlink?messenger_user_id='+req.query['messenger user id'],
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

    let { drpSemester, ma_sv } = doc;

    scheduleModel.findOne({
      drpSemester,
      ma_sv
    })
    .then(doc => {
      if (!doc || !doc.schedule || !doc.schedule.length) {
        throw 'Không tìm thấy lịch học, vui lòng cập nhật lại';
      }

      let timeline = groupTimelineByDay(generateTimeline(doc.schedule));

      if (req.query.today) {
        timeline = timeline.filter(day => day.today)[0];

        var messages = [];
        if (!timeline || !timeline.subjects || !timeline.subjects.length) {
          messages.push('Bạn không có lịch môn nào hôm nay!');
        } else {
          timeline.subjects = timeline.subjects.filter(subject => subject.timestamp.end.isSameOrAfter(moment()));

          if (!timeline.subjects.length) {
            messages.push('Bạn đã hết lịch môn học hôm nay!');
          } else {
            messages.push(`[${doc.ma_sv}] Hôm nay bạn có các môn:\n`);

            timeline.subjects.map(subject => {
              let location = (subject.locations && subject.locations[subject.phase]) ? subject.locations[subject.phase].location : subject.dia_diem;
              let time_range = `${ subject.timestamp.start.format('H[h]mm') }-${ subject.timestamp.end.format('H[h]mm') }`;
              let name = subject.lop_hoc_phan;

              messages.push(`${name}\nThời gian: ${time_range}\nĐịa điểm: ${location}`);
            });
          }
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

Router.get('/loginOptions', (req, res) => {
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
            text: 'Hãy làm theo các bước sau để bắt đầu sử dụng:\n1. Bấm nút "Đăng nhập", một cửa sổ sẽ hiện lên để bạn điền thông tin\n2. Điền thông tin đăng nhập của bạn trên trang đăng ký học và nhấn "Đăng nhập"\n3. Chọn học kì bạn muốn nhập trên chatbot',
            buttons:[
              {
                type: 'web_url',
                url: 'https://tkb.thao.pw/accountlink?messenger_user_id='+req.query['messenger user id'],
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
  return userModel.updateOne({
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
  
  let jar = request.jar();

  return userModel
    .findOne({ messenger_user_id })
    .then(doc => {
      if (!doc) {
        return res.json({
          messages:[
            { 'text': 'Vui lòng thực hiện liên kết tài khoản!' }
          ]
        });
      }

      res.json({
        messages: []
      });

      let loginPromise = tinchi.login(doc.ma_sv, doc.passwordHash, { shouldNotEncrypt: true, jar });

      if (!req.query.drpHK) {
        return loginPromise
          .then(() => tinchi.getStudentMark(null, { jar }))
          .then(({ data, options }) => {
            let optionsDrpHK = options.drpHK.filter(option => option.value && option.value.length)

            let json = {
              messages: [
                { 
                  text: 'Chọn học kì bạn cần tra cứu điểm',
                  quick_replies: optionsDrpHK.map(option => {
                    return {
                      title: option.text,
                      set_attributes: {
                        drpHK: option.value
                      },
                      block_names: ['Get student mark']
                    }
                  })
                }
              ]
            };

            return chatfuelController
              .sendBroadcast(
                process.env.BOT_ID, 
                messenger_user_id, 
                process.env.BROADCAST_TOKEN, 
                process.env.JSON_BLOCK, 
                { data: jsonpack.pack(json) }
              )
              .catch(err => {
                console.log(err.message);
              });
          });
      } else {
        let { drpHK } = req.query;

        return loginPromise
          .then(() => tinchi.getStudentMark({ drpHK }, { jar }))
          .then(({ data, options }) => data)
          .then(tinchi.parseStudentMark)
          .then(data => {
            let markMessage = data.map(subject => {
              return { text: `${subject.ten_hoc_phan} (${subject.ma_hoc_phan}): \nSố tín chỉ: ${subject.so_tin_chi}\nQuá trình: ${subject.qua_trinh}\nThi: ${subject.thi}\nTKHP: ${subject.tkhp}\nĐiểm chữ: ${subject.diem_chu}` };
            });

            let json = {
              messages: [
                {
                  text: `[${doc.ma_sv}] Các điểm của bạn trong học kì ${drpHK}: `
                },
                ...markMessage
              ]
            };

            return async.mapSeries(json.messages, (message, cb) => {
              return chatfuelController
                .sendBroadcast(
                  process.env.BOT_ID, 
                  messenger_user_id, 
                  process.env.BROADCAST_TOKEN, 
                  process.env.TEXT_BLOCK, 
                  { broadcast_text: message.text }
                )
                .then(() => cb())
                .catch(err => {
                  console.log(err.message);
                  cb();
                });
            });
          }, (err, data) => {
            if (err) console.log(err);
          });
      }
    })
    .catch(err => {
      console.log(err);
      return chatfuelController
        .sendBroadcast(
          process.env.BOT_ID, 
          messenger_user_id, 
          process.env.BROADCAST_TOKEN, 
          process.env.TEXT_BLOCK, 
          { broadcast_text: 'Đã có lỗi xảy ra! '+err.message }
        )
        .catch(err => {
          console.log(err.message);
        });
    });
});

Router.get('/examSchedule', (req, res) => {
  if (!req.query || !req.query['messenger user id']) {
      return res.json({
        messages: [
          {text: 'Không đủ dữ liệu!'}
        ]
      });
    }

    let messenger_user_id = req.query['messenger user id'];

    let jar = request.jar();
    
    return userModel
      .findOne({ messenger_user_id })
      .then(doc => {
        if (!doc) {
          return res.json({
            messages:[
              { 'text': 'Vui lòng thực hiện liên kết tài khoản!' }
            ]
          });
        }

        res.json({
          messages: []
        });

        let loginPromise = tinchi.login(doc.ma_sv, doc.passwordHash, { shouldNotEncrypt: true, jar });

        if (!req.query.examScheduleDrpSemester) {
          return loginPromise
            .then(() => tinchi.getExamList(null, { jar }))
            .then(({ data, options }) => {
              let optionsDrpHK = options.drpSemester
                .filter(option => option.value && option.value.length)
                .filter(option => {
                  let year = parseInt(option.text.split('_').reverse()[0]);
                  return new Date().getFullYear() >= year;
                });

              optionsDrpHK = optionsDrpHK.slice(0, 5);

              let json = {
                messages: [
                  { 
                    text: 'Chọn học kì bạn cần tra cứu lịch thi',
                    quick_replies: optionsDrpHK.map(option => {
                      return {
                        title: option.text,
                        set_attributes: {
                          examScheduleDrpSemester: option.value,
                          examScheduleDrpSemesterName: option.text
                        },
                        block_names: ['Get exam schedule']
                      }
                    })
                  }
                ]
              };

              return chatfuelController
                .sendBroadcast(
                  process.env.BOT_ID, 
                  messenger_user_id, 
                  process.env.BROADCAST_TOKEN, 
                  process.env.JSON_BLOCK, 
                  { data: jsonpack.pack(json) }
                )
                .catch(err => {
                  console.log(err.message);
                });
            });
        } else {
          let drpSemester = req.query.examScheduleDrpSemester;
          let drpSemesterName = req.query.examScheduleDrpSemesterName;

          return loginPromise
            .then(() => tinchi.getExamList({ drpSemester }, { jar }))
            .then(({ data, options, initialFormData }) => {
              delete initialFormData.btnList;
              delete initialFormData.btnPrint;
              return tinchi.getExamList({ drpSemester, drpDotThi: '', drpExaminationNumber: 0 }, { jar }, initialFormData)
            })
            .then(({ data, options }) => data)
            .then(tinchi.parseExamList)
            .then(data => {
              let examScheduleMessage = data.map(subject => {
                return { text: `${subject.ten_hoc_phan} (${subject.ma_hoc_phan}): \nSố tín chỉ: ${subject.so_tin_chi}\nNgày thi: ${subject.ngay_thi}\nCa thi: ${subject.ca_thi}\nHình thức thi: ${subject.hinh_thuc_thi}\nSố báo danh: ${subject.so_bao_danh}\nPhòng thi: ${subject.phong_thi}\nGhi chú: ${subject.ghi_chu}` };
              });

              let json = {};

              if (!data || !data.length) {
                json = {
                  messages: [
                    {
                      text: `[${doc.ma_sv}] Bạn chưa có lịch thi của học kì này!`
                    },
                    ...examScheduleMessage
                  ]
                }
              } else {
                json = {
                  messages: [
                    {
                      text: `[${doc.ma_sv}] Lịch thi của bạn trong học kì ${drpSemesterName}: `
                    },
                    ...examScheduleMessage
                  ]
                };
              }

              return async.mapSeries(json.messages, (message, cb) => {
                return chatfuelController
                  .sendBroadcast(
                    process.env.BOT_ID, 
                    messenger_user_id, 
                    process.env.BROADCAST_TOKEN, 
                    process.env.TEXT_BLOCK, 
                    { broadcast_text: message.text }
                  )
                  .then(() => cb())
                  .catch(err => {
                    console.log(err.message);
                    cb();
                  });
              });
            });
        }
      })
      .catch(err => {
        console.log(err);
        return chatfuelController
          .sendBroadcast(
            process.env.BOT_ID, 
            messenger_user_id, 
            process.env.BROADCAST_TOKEN, 
            process.env.TEXT_BLOCK, 
            { broadcast_text: 'Đã có lỗi xảy ra! '+err.message }
          )
          .catch(err => {
            console.log(err.message);
          });
      });
});

Router.get('/examImage', (req, res) => {
  if (!req.query || !req.query['messenger user id']) {
    return res.json({
      messages: [
        {text: 'Không đủ dữ liệu!'}
      ]
    });
  }

  let messenger_user_id = req.query['messenger user id'];

  request.get('http://web2img.thao.pw/screenshot', { 
    qs: {
      url: 'https://tkb.thao.pw/api1/tkb?messenger_user_id='+messenger_user_id,
      browserOptions: JSON.stringify({defaultViewport:{width:1600,height:785,deviceScaleFactor:1}})
    }
  })
  .then(base64 => {
    let name = messenger_user_id + Date.now() + '.png';

    fs.writeFileSync('/scheduleimgs/' + name, base64, 'base64', (err) => {
      console.log(err);
    });

    setTimeout(() => fs.unlinkSync('/scheduleimgs/' + name), 60000);

    return res.json({
      messages: [
        {
          attachment: {
            type: 'image',
            payload: {
              url: 'https://tkb.thao.pw/imgs/'+ name
            }
          }
        }
      ]
    });
  })
  .catch(err => {
    console.log(err);
    return chatfuelController
      .sendBroadcast(
        process.env.BOT_ID, 
        messenger_user_id, 
        process.env.BROADCAST_TOKEN, 
        process.env.TEXT_BLOCK, 
        { broadcast_text: 'Đã có lỗi xảy ra! '+err.message }
      )
      .catch(err => {
        console.log(err.message);
      });
  });
});

Router.post('/echo', (req, res) => {
  return res.json(jsonpack.unpack(req.body.data));
});

Router.post('*', (req, res) => {
  console.log(req.body);
  res.send('ok');
});

module.exports = Router;