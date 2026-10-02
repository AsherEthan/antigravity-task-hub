// components/stream-item/stream-item.js
const { COGNITIVE_TYPES, formatTime } = require('../../utils/format');

Component({
  properties: {
    item: {
      type: Object,
      value: null,
      observer: function (newVal) {
        if (newVal) {
          this.updateComputed(newVal);
        }
      }
    }
  },

  data: {
    typeMeta: {},
    formatCreateTime: ''
  },

  lifetimes: {
    attached: function () {
      if (this.data.item) {
        this.updateComputed(this.data.item);
      }
    }
  },

  methods: {
    updateComputed: function (item) {
      const meta = COGNITIVE_TYPES[item.type] || COGNITIVE_TYPES.observation;
      this.setData({
        typeMeta: meta,
        formatCreateTime: formatTime(item.created_at)
      });
    },

    getLensDisplayName: function (lens) {
      const map = {
        socratic: '🔍 穿透追问分析',
        hypotheses: '💡 竞争性假设发散',
        test: '⚡ 最小实验验证设计',
        attribution: '🎯 失败层级归因排查'
      };
      return map[lens] || '✨ 认知透镜见解';
    },

    formatInsightTime: function (t) {
      return formatTime(t);
    },

    handleTriggerLens: function (e) {
      const lensType = e.currentTarget.dataset.lens;
      this.triggerEvent('triggerlens', {
        lensType,
        item: this.data.item
      });
    },

    handleSpinOff: function (e) {
      const text = e.currentTarget.dataset.text;
      const lens = e.currentTarget.dataset.lens;
      
      // 根据透镜智能推导衍生卡片类型
      let targetType = 'question';
      if (lens === 'socratic') targetType = 'question';
      else if (lens === 'hypotheses') targetType = 'hypothesis';
      else if (lens === 'test') targetType = 'evidence'; // 实验/行动记录
      else if (lens === 'attribution') targetType = 'bottleneck';

      this.triggerEvent('spinoff', {
        content: text,
        type: targetType,
        parentId: this.data.item._id
      });
    },

    handleDelete: function () {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条探索记录吗？',
        confirmColor: '#fb7185',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('deleteitem', {
              itemId: this.data.item._id
            });
          }
        }
      });
    }
  }
});
