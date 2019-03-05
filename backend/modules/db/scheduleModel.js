const mongoose = require('mongoose');

const scheduleSchema = mongoose.Schema({
  ma_sv: { type: 'String' },
  drpSemester: { type: 'String' },
  hash: { type: 'String' },
  schedule: 'Mixed',
  lastUpdate: { type: 'Date', default: Date.now() }
});

module.exports = mongoose.model('schedules', scheduleSchema);