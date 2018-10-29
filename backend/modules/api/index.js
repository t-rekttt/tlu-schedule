const Router = require('express').Router();
const tinchi = require('tinchi-api');

Router.post('/login', (req, res) => {
  if (!req.body) res.fail({ message: 'Not enough data' });

  if (req.body.ma_sv && req.body.password) {
    tinchi
      .init()
      .then(jar => {
        req.session.jar = jar;

        return tinchi
          .login(req.body.ma_sv, req.body.password, {jar})
          .then(data => res.success({data}))
      })
      .catch(err => res.fail({data: err, message: err.message}));
  }
})

Router.use((req, res, next) => {
  if (!req.session.jar) {
    res.fail({ message: 'Not logged in' });
  }

  next();
});

Router.get('/tkb', (req, res) => {
  let { jar } = req.session;
  let { query } = req;

  tinchi.getTkb(query, {jar})
    .then(({ data, options }) => data)
    .then(tinchi.parseTkb)
    .then(data => res.success({ data }));
});

Router.get('/tkbOptions', (req, res) => {
  let { jar } = req.session;

  tinchi.getTkb(null, {jar})
    .then(({ data, options }) => {
      return options;
    })
    .then(data => res.success({ data }));
});

module.exports = Router;