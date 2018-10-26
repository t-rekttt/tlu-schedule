<template>
  <div>
    <!-- <div v-for="subject in schedule">
      {{ subject.lop_hoc_phan }}
      <div v-for="range in subject.ranges">
        {{ range.start }} - {{ range.end }}: Giai đoạn: {{ range.phase }}
        <div v-for="phase in range.phases">
          Thứ {{ phase.day }} tiết {{ phase.periods.join(',') }}
          {{ generateClasses(generateTimestamps(parseDate(range.start), parseDate(range.end), parseInt(phase.day)-1), parseInt(phase.periods[0]), parseInt(phase.periods[phase.periods.length-1])) }}
        </div>
      </div>
    </div> -->
    <div v-for="(group, key) in groupTimelineByDay(generateTimeline(schedule))" :key="key">
      {{ capitalize(group.day.format("dddd, [ngày] D [tháng] M [năm] YYYY")) }}
      <div v-for="subject in group.subjects">
        <b-card :bg-variant="subject.timestamp.end.isSameOrAfter(moment()) ? 'success' : ''" :text-variant="subject.timestamp.end.isSameOrAfter(moment()) ? 'white' : ''" :title="subject.lop_hoc_phan">
          <p class="card-text">
            {{ subject.timestamp.start.format('H[h]mm') }} - {{ subject.timestamp.end.format('H[h]mm') }}
          </p>
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

moment.tz('Asia/Ho_Chi_Minh');
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
    schedule: Array
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
                ...subject 
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

      return result;
    },
    moment() {
      return moment();
    },
    capitalize(s) {
      return _.capitalize(s);
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
