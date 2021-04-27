import API from 'api';
import BaseState from 'ui/states/BaseState';

const MIN_HEIGHT = 400;

class UIState extends BaseState {

  mimicEnabled = true;
  viewMode = API.mode === 'remote' ? 'requests' : 'closed';
  latestRequest = null;
  editorHeight = API.mode === 'remote' ? window.innerHeight : 400;

  constructor() {
    super();

    const savedUIState = localStorage.getItem('_mimic_ui_');
    const parsedUIState = savedUIState ? JSON.parse(savedUIState) : null;

    if (parsedUIState && !parsedUIState.enabled) {
      this.toggleMimic(false);
      API.turnOff();
    } else if (parsedUIState.isRecording) {
      API.startRecording();
    }
  }

  toggleMimic(newState) {
    this.mimicEnabled = newState;
    localStorage.setItem('_mimic_ui_', JSON.stringify({ enabled: newState }));

    this.triggerUpdates();
  }

  setViewMode(viewMode) {
    this.viewMode = viewMode;

    this.triggerUpdates();
  }

  updateLatestRequest(latestRequest) {
    this.latestRequest = latestRequest;
  }

  setEditorHeight(editorHeight) {
    if (editorHeight < MIN_HEIGHT || editorHeight > window.innerHeight) {
     return;
    }

    this.editorHeight = editorHeight;
    this.triggerUpdates();
  }

  adjustEditorHeightOnResize = () => {
    if (this.editorHeight < window.innerHeight) {
      return;
    }

    if (this.editorHeight <= MIN_HEIGHT) {
      return;
    }

    this.editorHeight = window.innerHeight;
    this.triggerUpdates();
  }
}

export default new UIState();
