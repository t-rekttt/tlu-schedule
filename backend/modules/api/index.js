const Router = require('express').Router();
const tinchi = require('tinchi-api');
const scheduleModel = require('../db/scheduleModel.js');
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

  let tkbPromise = tinchi.getTkb(query, {jar})
    .then(({ data, options }) => data)
    .then(tinchi.parseTkb);

  let { ma_sv } = req.session.info;

  tkbPromise
    .then(data => {
      if (!data || !data.length) {
        return;
      }
      
      let hash = md5(ma_sv+(query.drpSemester || ''));

      return scheduleModel.update({ ma_sv }, { 
        ma_sv,
        ...query,
        hash,
        schedule: data
      }, { upsert: true });
    })
    .catch(console.log);

  tkbPromise
    .then(data => {
      let hash = md5(ma_sv+(query.drpSemester || ''));
      
      return res.success({ 
        data: {
          schedule: data,
          code: hash
        }
      });
    })
    .catch(err => {
      return res.success({ 
        data: {
          schedule: data,
          code: 'Lỗi không xác định! Vui lòng tải lại trang'
        } 
      });
    });
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