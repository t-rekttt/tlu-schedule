const Router = require('express').Router();
const scheduleModel = require('../db/scheduleModel.js');
const messengerUserModel = require('../db/messengerUserModel.js');
const tinchi = require('tinchi-api');

Router.post('/update', (req, res) => {
  if (!req.body || !req.body['messenger user id'] || !req.body.code) return res.json({
    messages: [
      {text: 'Không đủ dữ liệu!'}
    ]
  });

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

      messengerUserModel.update({ messenger_user_id }, {
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

});

Router.post('*', (req, res) => {
  console.log(req.body);
  res.send('ok');
});

module.exports = Router;