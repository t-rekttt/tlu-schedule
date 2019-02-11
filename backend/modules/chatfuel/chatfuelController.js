const request = require('request-promise');

let sendBroadcast = (bot_id, user_id, chatfuel_token, chatfuel_block_name, attributes = {}, chatfuel_message_tag = 'PAIRING_UPDATE') => {
  let qs = {
    chatfuel_token,
    chatfuel_message_tag,
    chatfuel_block_name,
    ...attributes
  }

  return request.post(`https://api.chatfuel.com/bots/${bot_id}/users/${user_id}/send`, {
    json: true,
    qs
  });
}

module.exports = { sendBroadcast };