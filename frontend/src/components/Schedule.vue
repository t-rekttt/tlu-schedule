<template>
  <div id="schedule">
    <div v-if="!parsed || !parsed.length">
      <h3 class="text-center text-secondary">Không có lịch của học kì này</h3>
    </div>
    <div v-else v-for="(group, key) in parsed" :key="key">
      <p>
        <h5>
          {{ group.today ? 'Hôm nay' : capitalize(group.day.format("dddd, [ngày] D [tháng] M [năm] YYYY")) }}
        </h5>
      </p>
      <div v-for="subject in group.subjects">
        <b-card class="subject" :bg-variant="subject.timestamp.end.isSameOrAfter(moment()) ? group.today ? 'danger' : 'success' : 'dark'" text-variant="white">
          <div class="row subject-infos">
            <div class="col-md-3 my-auto">
              <div class="row subject-info">
                <div class="col-md-12">
                  <i class="material-icons">access_time</i>
                  <h3 class="my-auto d-inline">
                    {{ subject.timestamp.start.format('H[h]mm') }} - {{ subject.timestamp.end.format('H[h]mm') }}
                  </h3>
                </div>
              </div>
              <div class="row subject-info ">
                <div class="col-md-12">
                  <h3 class="my-auto">
                    <i class="material-icons">location_on</i>
                    <span v-if="subject.locations && subject.locations[subject.phase]">
                      {{ subject.locations[subject.phase].location }}
                    </span>
                    <span v-else>
                      {{ subject.dia_diem }}
                    </span>
                  </h3>
                </div>
              </div>
            </div>
            <div class="col-md-9 my-auto">
              <h4 class="my-auto content">
                {{ subject.lop_hoc_phan }}
                <span v-if="subject.phase">
                  ({{ subject.phase }})
                </span> 
                <br>
                Sĩ số: {{ subject.si_so }}
                <br>
                <div v-if="subject.so_tc">
                  Số tín chỉ: {{ subject.so_tc }}
                </div>
              </h4>
            </div>            
          </div>
        </b-card>
        <!-- {{ subject.lop_hoc_phan }}
        <br>
        {{ subject.timestamp.start.format('DD/MM/YY HH:mm') }} - {{ subject.timestamp.end.format('DD/MM/YY HH:mm') }} -->
      </div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue';
import moment from 'moment-timezone';
import _ from 'lodash';
Vue.use(_);

moment.tz.setDefault('Asia/Ho_Chi_Minh');
moment.locale('vi-VN');

const period_board = {
  1: {
    start: {
      hour: 7,
      minute: 0
    },
    end: {
      hour: 7,
      minute: 50
    }
  },
  2: {
    start: {
      hour: 7,
      minute: 55
    },
    end: {
      hour: 8,
      minute: 45
    }
  },
  3: {
    start: {
      hour: 8,
      minute: 50
    },
    end: {
      hour: 9,
      minute: 40
    }
  },
  4: {
    start: {
      hour: 9,
      minute: 45
    },
    end: {
      hour: 10,
      minute: 35
    }
  },
  5: {
    start: {
      hour: 10,
      minute: 40
    },
    end: {
      hour: 11,
      minute: 30
    }
  },
  6: {
    start: {
      hour: 11,
      minute: 35
    },
    end: {
      hour: 12,
      minute: 25
    }
  },
  7: {
    start: {
      hour: 12,
      minute: 55
    },
    end: {
      hour: 13,
      minute: 45
    }
  },
  8: {
    start: {
      hour: 13,
      minute: 50
    },
    end: {
      hour: 14,
      minute: 40
    }
  },
  9: {
    start: {
      hour: 14,
      minute: 45
    },
    end: {
      hour: 15,
      minute: 35
    }
  },
  10: {
    start: {
      hour: 15,
      minute: 40
    },
    end: {
      hour: 16,
      minute: 30
    }
  },
  11: {
    start: {
      hour: 16,
      minute: 35
    },
    end: {
      hour: 17,
      minute: 25
    }
  },
  12: {
    start: {
      hour: 17,
      minute: 30
    },
    end: {
      hour: 18,
      minute: 20
    }
  },
  13: {
    start: {
      hour: 18,
      minute: 50
    },
    end: {
      hour: 19,
      minute: 40
    }
  },
  14: {
    start: {
      hour: 19,
      minute: 45
    },
    end: {
      hour: 20,
      minute: 35
    }
  },
  15: {
    start: {
      hour: 20,
      minute: 40
    },
    end: {
      hour: 21,
      minute: 30
    }
  },
};

export default {
  name: 'Schedule',
  props: {
    schedule: Array,
    filter: Array
  },
  methods: {
    parseDate(date) {
      return moment(date, "DD/MM/YYYY");
    },
    generateTimestamps(start, end, weekday) {
      let res = [];
      start.weekday(weekday);

      while (start.isSameOrBefore(end)) {
        if (start.isSameOrBefore(end)) {
          res.push(start.clone());
        }
        start.add(1, 'week');
      }


      return res;
    },
    generateClasses(time_arr, start_period, end_period) {
      return time_arr.map(timestamp => {
        return {
          start: timestamp.clone().hour(period_board[start_period].start.hour).minute(period_board[start_period].start.minute),
          end: timestamp.clone().hour(period_board[end_period].end.hour).minute(period_board[end_period].end.minute),
        };
      });
    },
    generateTimeline(schedule) {
      let { generateClasses, generateTimestamps, parseDate } = this;
      let timeline = [];

      schedule.map(subject => {
        subject.ranges.map(range => {
          range.phases.map(phase => {
            let timestamps = generateClasses(generateTimestamps(parseDate(range.start), parseDate(range.end), parseInt(phase.day)-2), parseInt(phase.periods[0]), parseInt(phase.periods[phase.periods.length-1]));

            timestamps.map(timestamp => {
              let data = {
                timestamp,
                ...subject,
                phase: range.phase,
                type: phase.type
              };

              delete data.ranges;

              timeline.push(data);
            });
          });
        });
      });

      timeline.sort((a, b) => a.timestamp.start - b.timestamp.start);
      return timeline;
    },
    groupTimelineByDay(timeline) {
      let days = {};

      timeline.map(subject => {
        let timestamp = subject.timestamp.start.clone().startOf('day');

        if (!days[timestamp]) days[timestamp] = {
          day: timestamp,
          subjects: []
        }

        days[timestamp].subjects.push(subject);
      });

      let result = Object.values(days)

      result = result.map(day => {
        if (day.day.clone().isSame(moment(), 'day')) {
          day.today = true;
        }

        return day;
      });

      return result;
    },
    moment() {
      return moment();
    },
    capitalize(s) {
      return _.capitalize(s);
    }
  },
  computed: {
    parsed() {
      let { schedule, filter, generateTimeline, groupTimelineByDay } = this;

      if (!schedule || !schedule.length) return [];

      let timeline = groupTimelineByDay(generateTimeline(schedule));

      if (!filter.length) return [];

      if (filter.length === 2) return timeline;

      if (filter[0] === 'past')
        return timeline.filter(subject => subject.day.isBefore(moment(), 'day'));

      return timeline.filter(subject => {
        return subject.day.isSameOrAfter(moment(), 'day');
      });
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .subject {
    margin-top: 10px;
    margin-bottom: 10px;
  }

  .content {
    line-height: 1.5;
  }

  .subject-info {
    margin-top: 10px;
    margin-bottom: 10px;
  }

  .subject-infos {
    padding-left: 10px;
  }
</style>
