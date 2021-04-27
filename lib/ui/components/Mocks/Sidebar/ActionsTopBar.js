import React from 'react';
import * as PropTypes from "prop-types";

import API from 'api';
import EVENTS from "api/constants/events";
import MocksState from 'ui/states/MocksState';
import ActionIcon from 'ui/components/common/ActionIcon';
import IconDropdown from 'ui/components/common/IconDropdown';
import { ActionGroup, ActionsContainer, Action } from 'ui/components/Mocks/Sidebar/styled';
import UIState from "../../../states/UIState";

const toggleRecording = () => {
  if (API.isRecording) {
    API.stopRecording();
  } else {
    API.startRecording();
  }
};

const addNew = (type) => {
  if (type === 'mock') {
    const newMock = API.addMock();

    MocksState.selectItems([newMock]);
  }

  if (type === 'group') {
    const newGroup = API.addGroup({ name: 'New Group' });

    MocksState.addGroup({
      id: newGroup.id,
      isOpen: false,
      lastState: null
    });

    MocksState.selectItems([newGroup]);
  }
};

const onStartRecording = () => {
  localStorage.setItem('_mimic_ui_', JSON.stringify({ enabled: true, isRecording: true }));
  MocksState.triggerUpdates();
};

const onStopRecording = () => {
  localStorage.setItem('_mimic_ui_', JSON.stringify({ enabled: true, isRecording: false }));
  MocksState.triggerUpdates();
};

class ActionsTopBar extends React.Component {
  componentDidMount() {
    API.on(EVENTS.START_RECORDING, onStartRecording);
    API.on(EVENTS.STOPPED_RECORDING, onStopRecording);
  }

  componentUnmount() {
    API.off(EVENTS.START_RECORDING, onStartRecording);
    API.off(EVENTS.STOPPED_RECORDING, onStopRecording);
  }

  render() {
    let {hasSelection} = this.props;
    return (
        <ActionsContainer>
          <ActionGroup marginRight="40">
            <Action>
              <IconDropdown icon="add"
                            options={['mock', 'group']}
                            onChange={addNew}/>
            </Action>
            <Action onClick={toggleRecording} margin="2">
              {
                API.isRecording
                    ? <ActionIcon action="recording" style={{fill: '#c44a13'}}/>
                    : <ActionIcon action="record"/>
              }
            </Action>
          </ActionGroup>

          <ActionGroup autosize>
            <Action onClick={MocksState.collapseAllGroups}>
              <ActionIcon action="collapseAll" disabled={!API.groups.length}/>
            </Action>
            <Action onClick={MocksState.expandAllGroups}>
              <ActionIcon action="expandAll" disabled={!API.groups.length}/>
            </Action>
          </ActionGroup>

          <ActionGroup>
            {/*
      <Action>
        <ActionIcon action="undo"/>
      </Action>
       */}
            <Action onClick={MocksState.deleteSelected} disabled={!hasSelection}>
              <ActionIcon action="remove" disabled={!hasSelection}/>
            </Action>
          </ActionGroup>
        </ActionsContainer>
    );
  }
}

ActionsTopBar.propTypes = { hasSelection: PropTypes.any };

export default ActionsTopBar;
