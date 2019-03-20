const mongoose = require('mongoose');

const messengerUserSchema = mongoose.Schema({
  messenger_user_id: { type: 'String', unique: true },
  drpSemester: { type: 'String' },
  subscription: { type: 'Boolean', default: false },
  ma_sv: { type: 'String' },
  passwordHash: { type: 'String' }
});

module.exports = mongoose.model('messengerusers', messengerUserSchema);