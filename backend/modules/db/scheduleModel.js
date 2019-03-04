const mongoose = require('mongoose');

const scheduleSchema = mongoose.Schema({
  ma_sv: { type: 'String', unique: true },
  drpSemester: { type: 'String' },
  hash: { type: 'String' },
  schedule: 'Mixed',
  passwordHash: { type: 'String' },
  lastUpdate: { type: 'Date' }
});

module.exports = mongoose.model('schedules', scheduleSchema);