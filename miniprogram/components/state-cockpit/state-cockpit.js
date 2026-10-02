// components/state-cockpit/state-cockpit.js
const { formatTime } = require('../../utils/format');

Component({
  properties: {
    cockpit: {
      type: Object,
      value: null,
      observer: function (newVal) {
        if (newVal && newVal.last_synced_at) {
          this.setData({
            formatSyncTime: formatTime(newVal.last_synced_at)
          });
        }
      }
    },
    isSyncing: {
      type: Boolean,
      value: false
    }
  },

  data: {
    isExpanded: true,
    formatSyncTime: '刚刚'
  },

  lifetimes: {
    attached: function () {
      if (this.data.cockpit && this.data.cockpit.last_synced_at) {
        this.setData({
          formatSyncTime: formatTime(this.data.cockpit.last_synced_at)
        });
      }
    }
  },

  methods: {
    toggleExpand: function () {
      this.setData({
        isExpanded: !this.data.isExpanded
      });
    },

    handleAiSync: function () {
      this.triggerEvent('sync');
    },

    handleManualEdit: function () {
      this.triggerEvent('edit');
    }
  }
});
