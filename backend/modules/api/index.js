const Router = require('express').Router();
const tinchi = require('tinchi-api');
const scheduleModel = require('../db/scheduleModel.js');
const chatfuelController = require('../chatfuel/chatfuelController.js');
const messengerUserModel = require('../db/messengerUserModel.js');
const md5 = require('md5');

Router.post('/login', (req, res) => {
  if (!req.body) res.fail({ message: 'Not enough data' });

  if (req.body.ma_sv && req.body.password) {
    let { ma_sv, password } = req.body;

    let scheduleModelQueryPromise = scheduleModel.findOne({
      ma_sv,
      passwordHash: md5(password)
    })

    scheduleModelQueryPromise
      .then(doc => {
        return new Promise(resolve => {
          if (doc) {
            req.session.loggedIn = true;
            req.session.info = {
              ma_sv: doc.ma_sv,
              passwordHash: doc.passwordHash 
            };

            resolve();
          }

          return tinchi
            .login(ma_sv, password)
            .then(data => {
              req.session.info = {
                ma_sv,
                passwordHash: md5(password)
              };
              req.session.loggedIn = true;

              scheduleModel
                .update(
                  { ma_sv }, 
                  { 
                    $set: {
                      passwordHash: md5(password)
                    }
                  },
                  { upsert: true }
                )
                .then(() => console.log('Updated passwordHash for '+ma_sv));

              res.success({ data });

              resolve();
            });
        });
      })
      .catch(err => {
        console.log(err.message);
        res.fail({data: err, message: err.message})
      });
  }
})

Router.use((req, res, next) => {
  if (!req.session.loggedIn) {
    return res.fail({ message: 'Not logged in' });
  }

  next();
});

Router.get('/tkb', (req, res) => {
  let { jar } = req.session;
  let { query } = req;
  let { ma_sv } = req.session.info;
  let hash = md5(ma_sv+(query.drpSemester || ''));

  let tkbPromise = scheduleModel.findOne({ hash })
    .lean()
    .exec()
    .then(doc => {
      return new Promise(resolve => {
        if (doc) resolve({
          type: 'database',
          ...doc,
          code: hash
        });

        return scheduleModel.findOne({ ma_sv })
          .then(doc1 => {
            let { passwordHash } = doc1;

            return tinchi.login(ma_sv, passwordHash, { jar, shouldNotEncrypt: true })
              .then(() => tinchi.getTkb(query))
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
                  passwordHash: req.session.info.passwordHash
                });
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
  let { jar } = req.session;

  tinchi.getTkb(null, {jar})
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
            { broadcast_text: 'Không tìm thấy lịch học. Vui lòng cập nhật lại code!' }
          )
          .then(data => res.json(data))
          .catch(err => {
            console.log(err.message);

            return res.fail({ data: null, message: err.message });
          });
      }

      return messengerUserModel.updateOne({ messenger_user_id }, {
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