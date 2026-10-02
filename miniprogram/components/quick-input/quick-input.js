// components/quick-input/quick-input.js

const PLACEHOLDERS = {
  observation: '记录感知到的现象、异常、事实或实测数据...',
  question: '从现象中提炼的核心疑问是什么？...',
  hypothesis: '提出可能因果机制（如果...那么可能是因为...）...',
  evidence: '记录实验数据、文献依据、用户反馈或现实阻力...',
  bottleneck: '定位当前阻碍继续推进的最核心单一瓶颈...'
};

Component({
  properties: {},

  data: {
    selectedType: 'observation',
    inputText: '',
    canSubmit: false,
    placeholderText: PLACEHOLDERS.observation
  },

  methods: {
    handleSelectType: function (e) {
      const type = e.currentTarget.dataset.type;
      this.setData({
        selectedType: type,
        placeholderText: PLACEHOLDERS[type] || PLACEHOLDERS.observation
      });
    },

    handleInputChange: function (e) {
      const val = e.detail.value || '';
      this.setData({
        inputText: val,
        canSubmit: val.trim().length > 0
      });
    },

    handleSubmit: function () {
      const content = this.data.inputText.trim();
      if (!content) return;

      this.triggerEvent('submit', {
        type: this.data.selectedType,
        content
      });

      this.setData({
        inputText: '',
        canSubmit: false
      });
    }
  }
});
