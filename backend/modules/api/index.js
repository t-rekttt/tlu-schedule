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

    tinchi
      .init()
      .then(jar => {
        req.session.jar = jar;
        req.session.info = {
          ma_sv
        };

        return tinchi
          .login(ma_sv, password, {jar})
          .then(data => res.success({data}))
      })
      .catch(err => {
        console.log(err);
        res.fail({data: err, message: err.message})
      });
  }
})

Router.use((req, res, next) => {
  if (!req.session.jar) {
    return res.fail({ message: 'Not logged in' });
  }

  next();
});

Router.get('/tkb', (req, res) => {
  let { jar } = req.session;
  let { query } = req;
  let { ma_sv } = req.session.info;
  let hash = md5(ma_sv+(query.drpSemester || ''));

  let tkbParsePromise = tinchi.getTkb(query, {jar})
    .then(({ data, options }) => data)
    .then(tinchi.parseTkb)
    .then(data => {
      return {
        type: 'parser',
        ma_sv,
        ...query,
        code: hash,
        hash,
        schedule: data
      }
    });

  let tkbDbPromise = scheduleModel.findOne({ ma_sv, drpSemester: query.drpSemester })
    .lean()
    .exec()
    .then(doc => {
      return new Promise(resolve => {
        if (doc) resolve({
          type: 'database',
          ...doc
        });
      });
    });

  let timeout = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject('timeout');
    }, 5000);
  });

  Promise.race([
    tkbParsePromise,
    tkbDbPromise,
    timeout
  ])
  .then(data => {

    if (data.type === 'parser') {
      scheduleModel
        .update(
          { ma_sv }, 
          data,
          { upsert: true }
        )
        .catch(console.log);
    }

    delete data.type;

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

    console.log(err);
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
            process.env.UPDATE_SCHEDULE_BLOCK_NAME, 
            { broadcast_text: 'Không tìm thấy lịch học. Vui lòng cập nhật lại code!' }
          )
          .then(data => res.json(data))
          .catch(err => {
            console.log(err);

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
        console.log(err);
        
        return res.fail({ data: null, message: err.message });
      });
    });
});

module.exports = Router;