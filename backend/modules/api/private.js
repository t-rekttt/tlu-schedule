const Router = require('express').Router();

Router.get('/tkb', (req, res) => {
  if (!req.query || !req.query.messenger_user_id) {
    return res.fail(null, 'Not enough data');
  }

  
});