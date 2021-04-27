import xhook from 'xhook';
import uuid from 'uuid';
import forEach from 'lodash/forEach';

import EVENTS from 'api/constants/events';
import Emitter from 'api/emitter';
import Requests from 'api/requests';
import { getHeadersObject } from 'api/utils/headers';
import { normalizeFormData } from 'api/utils/form-data';
import { logGroup, logGroupEnd } from 'api/utils/logger';
import STATUS_CODES from 'api/constants/status-codes';
import SettingsState from 'ui/states/SettingsState';

class WebInterceptor {
  constructor() {
    Emitter.on(EVENTS.STORAGE_READY, () => {
      this.initialized = true;
    });

    Emitter.on(EVENTS.MIMIC_TURN_OFF, this.disable);
    Emitter.on(EVENTS.MIMIC_TURN_ON, this.enable);

    xhook.before(this.handleRequestCaptured.bind(this));
    xhook.after(this.handleRequestFinished.bind(this));
  }

  handleRequestCaptured(capturedRequest, responder) {
    // Use this to determine how much time the request took
    capturedRequest.id = uuid.v4();
    capturedRequest.startTime = Date.now();

    this.getRequestDetails(capturedRequest).then((request) => {
      this.capturePendingRequest(request);

      this.getMocks().then((mocks) => {
        const mock = this.getMatchingMock(mocks, request);

        if (!mock) {
          return responder();
        }

        if (mock) {
          this.setRequestMock(request.id, mock);

          if (mock.isActive) {
            let response = mock.getResponse();

            if (!SettingsState.disableMimicOutput) {
              this.logRequest(request, mock);
            }
            this.buildResponse(responder, response, request);
          } else {
            responder();
          }
        }
      }).catch(() => responder())
    });
  }

  getMatchingMock(mocks, request) {
    for (let mock of mocks) {
      if (mock.matches(request) && mock.isActive) {
        return mock;
      }
    }
  }

  buildResponse(responder, mock, request) {
    const response = {
      url: request.url,
      status: Number(mock.status) || 200,
      statusText: STATUS_CODES[mock.status || 200].toUpperCase(),
      body: mock.body,
      text: mock.body,
      headers: mock.headers || {}
    };

    if (response.headers['content-type'].indexOf('application/json') !== -1) {
      try {
        response.data = JSON.parse(mock.body);
      } catch (error) {
        if (__ENV === 'development') {
          console.log('failed to build response', error);
        }
      }
    }

    return mock.delay > 0
      ? setTimeout(() => responder(response), mock.delay)
      : responder(response);
  }

  logRequest(request, mock) {
    const groupName = `%c MIMIC %c ${request.method} ${request.url.split('://')[1]} | ${mock.response.status} | ${mock.response.delay}ms`;
    logGroup(true, groupName, 'background-color: #efefef; font-weight: 300', 'font-weight: 600');

    logGroup(false, 'Request Headers');
    forEach(request.headers, (value, key) => console.log(`${key}: ${value}`));
    logGroupEnd('Request Headers');

    logGroup(false, 'Request Params');
    console.log(request.params);
    logGroupEnd('Request Params');

    logGroup(false, 'Response Headers');
    forEach(mock.headers, (value, key) => console.log(`${key}: ${value}`));
    logGroupEnd('Response Headers');

    logGroup(false, 'Response Body');
    console.log(mock.response.body);
    logGroupEnd('Response Body');

    logGroupEnd(groupName);
  }

  setRequestMock(id, mock) {
    Requests.setMock(id, mock);
  }

  capturePendingRequest(request) {
    const normalizedRequest = normalizeFormData(request);

    normalizedRequest.origin = typeof window !== "undefined" ? window.location.origin : null;
    Requests.capturePending(normalizedRequest);
  }

  getRequestDetails(request) {
    return new Promise((resolve, reject) => {
      if (!(request instanceof Request)) {
        return resolve({
          id: request.id,
          method: request.method,
          url: request.url,
          headers: request.headers,
          params: request.body,
          startTime: request.startTime,
          origin: null
        });
      }

      const clonedRequest = request.clone();

      clonedRequest.text().then((requestBody) => {
        resolve({
          id: request.id,
          method: request.method,
          url: request.url,
          headers: request.headers,
          params: requestBody,
          startTime: Date.now(),
          origin: null
        });
      }).catch((err) => reject(err));
    });
  }

  getResponseDetails(response) {
    return new Promise((resolve, reject) => {
      if (!(response instanceof Response)) {
        return resolve({
          status: response.status || 404,
          headers: getHeadersObject(response.headers),
          data: response.text || response.body
        })
      }

      const clonedResponse = response.clone();

      clonedResponse
        .text()
        .then((responseBody) => {
          resolve({
            status: clonedResponse.status || 404,
            headers: getHeadersObject(clonedResponse.headers),
            data: responseBody
          })
        }).catch((error) => reject(error))
    });
  }

  handleRequestFinished(request, response) {
    this.getResponseDetails(response)
      .then((capturedResponse) => this.updateCapturedRequest(request, capturedResponse))
  }

  updateCapturedRequest(request, response) {
    Requests.setResponse(request.id, response, request.startTime);
  }

  getMocks() {
    // only require the API when running in the browser
    const API = require('api').default;

    return this.waitForInit()
      .then(() => API.mocks);
  }

  enable() {
    xhook.enable();
  }

  disable() {
    xhook.disable();
  }

  waitForInit() {
    return new Promise((resolve, reject) => {
      if (this.initialized) {
        return resolve();
      }

      Emitter.on(EVENTS.STORAGE_READY, () => {
        this.initialized = true;
        resolve();
      });
    });
  }
}

export default WebInterceptor;
