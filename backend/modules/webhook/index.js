const Router = require('express').Router();
const scheduleModel = require('../db/scheduleModel.js');
const messengerUserModel = require('../db/messengerUserModel.js');

Router.post('*', (req, res) => {
  console.log(req.data);
});

Router.post('/update', (req, res) => {
  if (!req.data || !req.data['messenger user id'] || !req.data.code) return res.json({
    messages: [
      {text: 'Không đủ dữ liệu!'}
    ]
  });

  let messenger_user_id = req.data['messenger user id'];
  let { code } = req.data;

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

module.exports = Router;