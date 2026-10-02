// components/lens-dialog/lens-dialog.js

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    mode: {
      type: String,
      value: 'cockpit' // 'cockpit' | 'lens'
    },
    isLoading: {
      type: Boolean,
      value: false
    },
    dialogTitle: {
      type: String,
      value: '认知透镜见解'
    },
    cockpitProposal: {
      type: Object,
      value: null
    },
    lensResult: {
      type: Object,
      value: null
    }
  },

  data: {},

  methods: {
    preventBubble: function () {},

    handleClose: function () {
      this.triggerEvent('close');
    },

    handleProposalChange: function (e) {
      const field = e.currentTarget.dataset.field;
      const val = e.detail.value;
      const proposal = this.data.cockpitProposal || {};
      proposal[field] = val;
      this.setData({
        cockpitProposal: proposal
      });
    },

    handleConfirmCockpit: function () {
      this.triggerEvent('confirmcockpit', {
        proposal: this.data.cockpitProposal
      });
    },

    handleMountLens: function () {
      this.triggerEvent('mountlens', {
        result: this.data.lensResult
      });
    }
  }
});
