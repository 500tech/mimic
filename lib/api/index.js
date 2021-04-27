import Emitter from 'api/emitter';
import { PersistentStorage } from 'api/storage';
import Mocks from 'api/mocks';
import Groups from 'api/groups';
import Requests from 'api/requests';
import EVENTS from 'api/constants/events';
import { bootstrapWorker } from 'api/utils/worker';
import { connect } from 'api/utils/remote';
import { request } from 'ui/utils/request';
import { migrateData } from 'api/migrations';
import flatten from 'lodash/flatten';
import postManParser from 'api/utils/postman-parser'

class PublicAPI {

  constructor() {
    this.version = __VERSION;
    this.enabled = true;
    this.isRecording = false;
    this.interceptor = null;
    this.init();
  }

  init() {
    PersistentStorage.init();
    Mocks.init();
    Groups.init();
  }

  registerInterceptor(interceptor) {
    this.interceptor = interceptor;

    if (!this.enabled) {
      this.interceptor.disable();
    }
  }

  connect(options) {
    connect(options, API);
  }

  turnOn() {
    this.enabled = true;

    if (this.interceptor) {
      this.interceptor.enable();
    }

    Emitter.emit(EVENTS.MIMIC_TURN_ON);
  }

  turnOff() {
    this.enabled = false;

    if (this.interceptor) {
      this.interceptor.disable();
    }

    Emitter.emit(EVENTS.MIMIC_TURN_OFF);
  }

  setMode(mode) {
    this.mode = mode;
  }

  bootstrapWorker(worker) {
    bootstrapWorker(worker, API, this.enabled);
  }

  getCapturedRequest(requestId) {
    return Requests.find({ id: requestId });
  }

  get capturedRequests() {
    return Requests.capturedRequests;
  }

  get mocks() {
    return Mocks.all;
  }

  getMock(mockId) {
    return Mocks.find({ id: mockId });
  }

  get activeMocks() {
    return Mocks.findAll({ isActive: true });
  }

  get groups() {
    return Groups.all;
  }

  addMock() {
    const newMock = Mocks.addMock();
    Emitter.emit(EVENTS.ADD_MOCK);

    return newMock;
  }

  getGroup(groupId) {
    return Groups.find({ id: groupId });
  }

  addGroup(group) {
    const newGroup = Groups.addGroup(group);
    Emitter.emit(EVENTS.ADD_GROUP);

    return newGroup;
  }

  updateGroup(groupId, group) {
    Groups.updateGroup(groupId, group);
    Emitter.emit(EVENTS.UPDATE_GROUP);
  }

  toggleGroup(groupId) {
    Groups.toggleGroup(groupId);
    Emitter.emit(EVENTS.UPDATE_GROUP);
  }

  removeGroup(groupId) {
    Groups.removeGroup(groupId);
    Emitter.emit(EVENTS.UPDATE_GROUP);
  }

  duplicateGroup(groupId) {
    Groups.duplicateGroup(groupId);
    Emitter.emit(EVENTS.UPDATE_GROUP);
  }

  getAppName() {
    return PersistentStorage.getAppName();
  }

  setAppName(appName) {
    PersistentStorage.setAppName(appName);
    this.init();
    return this; // Allow chaining
  }

  import(data = '{}', options) {
    return new Promise((resolve, reject) => {
      if (this.interceptor) {
        return this.interceptor.waitForInit()
          .then(() => {
            try {
              let dataTree = JSON.parse(data);

              // Auto recognize PostMan import
              if (dataTree.info && dataTree.info._postman_id){
                dataTree = postManParser(dataTree)
              }

              if (!dataTree.version && !dataTree.mocks && !dataTree.groups) {
                resolve({ success: false, error: 'Unsupported format' });
                return;
              }

              const migratedDataTree = migrateData(dataTree);
              Mocks.mergeMocks(migratedDataTree.mocks || [], options);
              Groups.mergeGroups(migratedDataTree.groups || []);
              Emitter.emit(EVENTS.IMPORT);
            } catch (error) {
              if (__ENV === 'development') {
                console.log('Import error', error);
              }

              resolve({ success: false, error: error.message });
            }

            resolve({ success: true });
          });
      }

      reject('interceptor not ready');
    });
  }

  importUrl(url, options, done) {
    request({
      method: 'GET',
      url: 'https://query.yahooapis.com/v1/public/yql?format=json&q=select * from html where url=\"' + url + '\"'
    }, (response) => {
      try {
        const dataTree = JSON.parse(response.body).query.results.body;

        this.import(dataTree, options)
          .then(done)
          .catch(done);
      } catch (error) {
        done({ success: false, error: error.message });
      }
    });
  }

  export(prettify) {
    const mocks = Mocks.all.map((mock) => mock.export());
    const groups = flatten(Groups.all.map((group) => group.export()));

    const exportObject = {
      "version": PersistentStorage.getVersion(),
      "mocks": mocks,
      "groups": groups
    };

    return JSON.stringify(exportObject, null, prettify ? 2 : null);
  }

  exportMocks(mockIds, groupIds, prettify) {
    const mocks = Mocks.export(mockIds);
    const groups = Groups.export(groupIds);
    const groupMocks = flatten(groups.map((group) => group.mocks));

    const exportObject = {
      "version": PersistentStorage.getVersion(),
      "mocks": [...mocks, ...groupMocks],
      "groups": groups
    };

    return JSON.stringify(exportObject, null, prettify ? 2 : null);
  }

  startRecording() {
    const mockRequest = ({ requestId }) => Mocks.mockRequest(Requests.find({ id: requestId }));

    this.on(EVENTS.RESPONSE_RECEIVED, mockRequest);
    this.once(EVENTS.STOPPED_RECORDING, () => this.off(EVENTS.RESPONSE_RECEIVED, mockRequest));

    this.isRecording = true;
    Emitter.emit(EVENTS.START_RECORDING);
  }

  stopRecording() {
    this.isRecording = false;
    Emitter.emit(EVENTS.STOPPED_RECORDING);
  }

  recaptureMocks(mockIds, done) {
    Mocks.recapture(mockIds, done);
  }

  mockRequest(request) {
    const mock = Mocks.mockRequest(request);
    Emitter.emit(EVENTS.ADD_MOCK);

    return mock;
  }

  updateMock(mockId, request) {
    Mocks.updateMock(mockId, request);
    Emitter.emit(EVENTS.UPDATE_MOCK);
  }

  duplicateMock(mockId) {
    Mocks.duplicateMock(mockId);
    Emitter.emit(EVENTS.UPDATE_MOCK);
  }

  removeMock(mockId) {
    Mocks.removeMock(mockId);

    this.capturedRequests
      .filter((request) => (request.mock || {}).id === mockId)
      .forEach((request) => request.removeMock());

    Emitter.emit(EVENTS.UPDATE_MOCK);
  }


  renameMock(mockId, newName) {
    Mocks.renameMock(mockId, newName);
    Emitter.emit(EVENTS.UPDATE_MOCK);
  }

  toggleMock(mockId) {
    Mocks.toggleMock(mockId);
    Emitter.emit(EVENTS.UPDATE_MOCK);
  }

  getMatchingMocks(request) {
    return Mocks.getMatchingMocks(request);
  }

  clearStorage() {
    PersistentStorage.clear();
    Emitter.emit(EVENTS.UPDATE_MOCK);
  }

  on(event, callback, context) {
    Emitter.on(event, callback, context);
  }

  once(event, callback, context) {
    Emitter.once(event, callback, context);
  }

  off(event, callback, context) {
    Emitter.removeListener(event, callback, context);
  }

}

const API = new PublicAPI();

export { API as default, Requests };
