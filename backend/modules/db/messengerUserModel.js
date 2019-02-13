const mongoose = require('mongoose');

const messengerUserSchema = mongoose.Schema({
  messenger_user_id: { type: 'String', unique: true },
  hash: { type: 'String' },
  subscription: { type: 'Boolean', default: false }
});

module.exports = mongoose.model('messengerusers', messengerUserSchema);