const Router = require('express').Router();
const tinchi = require('tinchi-api');
const scheduleModel = require('../db/scheduleModel.js');
const chatfuelController = require('../chatfuel/chatfuelController.js');
const userModel = require('../db/userModel.js');
const md5 = require('md5');
const request = require('request');
var { MemoryCookieStore } = require('tough-cookie');
var s = require("serialijse");

s.declarePersistable(MemoryCookieStore);

Router.post('/login', (req, res) => {
  if (!req.body || !req.body.ma_sv || !req.body.password) return res.fail({ message: 'Not enough data' });

  let { ma_sv, password } = req.body;

  let userModelQueryPromise = userModel.findOne({
    ma_sv,
    passwordHash: md5(password)
  })

  let jar = new MemoryCookieStore();

  userModelQueryPromise
    .then(doc => {
      if (doc) {
        req.session.loggedIn = true;

        req.session.info = {
          ma_sv: doc.ma_sv,
          passwordHash: doc.passwordHash 
        };
      }

      return tinchi
        .login(ma_sv, password, { jar })
        .then(data => {
          req.session.info = {
            ma_sv,
            passwordHash: md5(password)
          };

          req.session.loggedIn = true;

          req.session.jar = s.serialize(jar);;

          res.success({ data });

          if (!doc) {
            return userModel
              .update(
                { ma_sv }, 
                { 
                  $set: {
                    passwordHash: md5(password)
                  }
                },
                { upsert: true }
              )
              .then(() => {
                console.log('Updated passwordHash for '+ma_sv)
                resolve();
              })
          }
        });
    })
    .catch(err => {
      req.session.loggedIn = false;

      console.log(err.message);
      res.fail({data: err, message: err.message})
    });
});

Router.post('/accountlink', (req, res) => {
  if (!req.body || !req.body.ma_sv || !req.body.password || !req.body.messenger_user_id) return res.fail({ message: 'Not enough data' });

  let { ma_sv, password, messenger_user_id } = req.body;
  let { jar } = req.session;

  chatfuelController
    .sendBroadcast(
      process.env.BOT_ID, 
      messenger_user_id, 
      process.env.BROADCAST_TOKEN, 
      process.env.TEXT_BLOCK, 
      { broadcast_text: 'Đang thực hiện liên kết với tài khoản sinh viên '+ma_sv+', bạn vui lòng đợi một lát nhé' }
    )
    .catch(err => {
      console.log(err.message);
    });

  return tinchi
    .login(ma_sv, password, { jar })
    .then(data => {
      req.session.info = {
        ma_sv,
        passwordHash: md5(password)
      };

      res.success({});

      return Promise.all([
        chatfuelController
          .sendBroadcast(
            process.env.BOT_ID, 
            messenger_user_id, 
            process.env.BROADCAST_TOKEN, 
            process.env.ACCOUNT_LINKING_SUCCESS_BLOCK_NAME, 
            { broadcast_text: 'Đã liên kết thành công với tài khoản sinh viên '+ma_sv }
          ),
        userModel
          .update(
            { messenger_user_id }, 
            { 
              $set: {
                passwordHash: md5(password),
                ma_sv,
                messenger_user_id
              }
            },
            { upsert: true }
          )
          .then(() => {
            console.log('Updated passwordHash for '+ma_sv)
          })
      ]);
    })
    .catch(err => {
      console.log(ma_sv, err.message);

      chatfuelController
        .sendBroadcast(
          process.env.BOT_ID, 
          messenger_user_id, 
          process.env.BROADCAST_TOKEN, 
          process.env.ACCOUNT_LINKING_ERROR_BLOCK_NAME, 
          { broadcast_text: 'Liên kết tài khoản thất bại. Lỗi: '+err.message }
        )
        .catch(err => {
          console.log(err.message);
        });
      res.fail({data: err, message: err.message})
    });
});

Router.use((req, res, next) => {
  if (!req.session.loggedIn) {
    return res.fail({ message: 'Not logged in' });
  }

  next();
});

Router.get('/tkb', (req, res) => {
  let jar = s.deserialize(req.session.jar);
  let { query } = req;
  let { ma_sv } = req.session.info;
  let hash = md5(ma_sv+(query.drpSemester || ''));

  let tkbPromise = scheduleModel.findOne({ hash })
    .lean()
    .exec()
    .then(doc => {
      return new Promise(resolve => {
        if (doc && doc.schedule && doc.schedule.length)  {
          resolve({
            type: 'database',
            ...doc,
            code: hash
          });
        }

        tinchi.getTkb(query, { jar })
          .then(({ data, options }) => data)
          .then(tinchi.parseTkb)
          .then(data => {
            resolve({
              type: 'parser',
              ma_sv,
              ...query,
              code: hash,
              hash,
              schedule: data,
              lastUpdate: Date.now()
            });
          });
      });
    });

  let timeout = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject('timeout');
    }, 20000);
  });

  Promise.race([
    tkbPromise,
    timeout
  ])
  .then(data => {
    if (data.type === 'parser') {
      scheduleModel
        .update(
          { hash }, 
          { $set: data },
          { upsert: true }
        )
        .then(() => console.log('Updated schedule for '+ma_sv))
        .catch(console.log);
    }

    return res.success({ data });
  })
  .catch(err => {
    if (err === 'timeout') {
      return res.success({ 
        data: {
          schedule: [],
          code: 'Tải dữ liệu thất bại do hệ thống chậm phản hồi! Vui lòng thử lại sau!'
        }
      });
    }

    console.log(err.message);
    return res.success({ 
      data: {
        schedule: [],
        code: 'Lỗi không xác định! Vui lòng tải lại trang'
      } 
    });
  })
});

Router.get('/tkbOptions', (req, res) => {
  let jar = s.deserialize(req.session.jar);

  tinchi.getTkb(null, { jar })
    .then(({ data, options }) => {
      return options;
    })
    .then(data => res.success({ data }));
});

Router.post('/updateFromMessenger', (req, res) => {
  if (!req.query || !req.query.messenger_user_id || !req.query.code || !req.query.schedule_name) {
    return res.json({
      messages: [
        { text: 'Không đủ dữ liệu!' }
      ]
    });
  }

  let messenger_user_id = req.query.messenger_user_id;
  let { code } = req.query;

  scheduleModel.findOne({ hash: code })
    .then(doc => {
      if (!doc) {
        return chatfuelController
          .sendBroadcast(
            process.env.BOT_ID, 
            messenger_user_id, 
            process.env.BROADCAST_TOKEN, 
            process.env.CANT_FIND_SCHEDULE_BLOCK_NAME, 
            { broadcast_text: 'Không tìm thấy lịch học. Vui lòng thử cập nhật lại!' }
          )
          .then(data => res.json(data))
          .catch(err => {
            console.log(err.message);

            return res.fail({ data: null, message: err.message });
          });
      }

      return userModel.updateOne({ messenger_user_id }, {
        messenger_user_id,
        hash: code
      }, { upsert: true })
      .then(doc => {
        return chatfuelController
          .sendBroadcast(
            process.env.BOT_ID, 
            messenger_user_id, 
            process.env.BROADCAST_TOKEN, 
            process.env.UPDATE_SCHEDULE_BLOCK_NAME, 
            { broadcast_text: `Cập nhật thành công. Tên lịch học: ${req.query.schedule_name}` }
          );
      })
      .then(data => res.json(data))
      .catch(err => {
        console.log(err.message);
        
        return res.fail({ data: null, message: err.message });
      });
    });
});

module.exports = Router;