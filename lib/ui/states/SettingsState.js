import BaseState from 'ui/states/BaseState';

class SettingsState extends BaseState{

  mimicHotkey = 'Alt + Shift + M';
  alwaysShowMimicButtons = true;
  disableMimicOutput = false;
  sendAnalytics = false;
  allowWipeout = false;
  exportFilename = 'mocks.json';
  prettifyExport = true;
  importFailed = false;
  importSuccess = false;
  error = null;

  set(key, value) {
    this[key] = value;
    this.triggerUpdates();
  }

  setError(error) {
    this.importFailed = true;
    this.importSuccess = false;
    this.error = error;

    this.triggerUpdates();
  }

  resetErrors() {
    this.importFailed = false;
    this.importSuccess = false;
    this.error = null;
  }
}

export default new SettingsState();
