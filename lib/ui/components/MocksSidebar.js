import React from 'react';
import styled from 'styled-components';
import { DropTarget } from 'react-dnd';
import Group from 'ui/components/Group';
import Mock from 'ui/components/Mock';
import ResizeHandle from 'ui/components/ResizeHandle';
import ContextMenu from 'ui/components/ContextMenu';
import API from 'api';
import UIState, { UIStateListener } from 'ui/UIState';
import some from 'lodash/some';
import EVENTS from 'api/constants/events';
import first from 'lodash/first';
import find from 'lodash/find';
import flatten from 'lodash/flatten';

const noop = () => true;

const groupTarget = {
  drop(props, monitor) {
    if (monitor.didDrop()) {
      return;
    }

    const mockId = monitor.getItem().id;
    const mock = API.getMock(mockId);

    if (mock) {
      API.updateMock(mockId, { ...mock, groupId: null });
    }
  }
};

function collect(connector, monitor) {
  return {
    connectDropTarget: connector.dropTarget(),
    isHovered: monitor.isOver()
  };
}

const Sidebar = styled.div`
  position: relative;
  border-right: 1px solid #e7e7e7;
  overflow-y: auto;
  height: 100%;
`;

class MocksSidebar extends React.Component {

  componentDidMount() {
    API.on(EVENTS.UPDATE_MOCK, this.reRender);
    API.on(EVENTS.UPDATE_GROUP, this.reRender);
  }

  componentWillUnmount() {
    API.off(EVENTS.UPDATE_MOCK, this.reRender);
    API.off(EVENTS.UPDATE_GROUP, this.reRender);
  }

  reRender = () => {
    setTimeout(() => this.forceUpdate(), 0);
  };

  selectMock = (mock, isRightClick) => {
    return (event) => {
      if (isRightClick && UIState.selectedMocks.length > 1) {
        return;
      }

      if (!isRightClick) {
        event.stopPropagation();
      }

      if (event.shiftKey) {
        if (UIState.selectedMocks.length > 0) {
          const groups = flatten(API.groups.map((group) => group.mocks));
          const mocks = API.mocks.filter((apiMock) => !apiMock.groupId);

          const mockList = [...groups, ...mocks];
          const selectedMocks = mockList.filter((apiMock) => UIState.selectedMocks.indexOf(apiMock) !== -1);
          const firstMockIndex = mockList.indexOf(first(selectedMocks));
          const currentMockIndex = mockList.indexOf(mock);
          const mocksBetween = currentMockIndex > firstMockIndex
            ? mockList.slice(firstMockIndex, currentMockIndex + 1)
            : mockList.slice(currentMockIndex, firstMockIndex);

          mocksBetween
            .filter((mockInRange) => UIState.selectedMocks.indexOf(mockInRange) === -1)
            .forEach((mockInRange) => this.props.selectMock(mockInRange, true));
          return;
        }
      }

      const multiple = event.metaKey || event.ctrlKey;

      this.props.selectMock(mock, multiple);
    }
  };

  selectGroup = (group, isRightClick) => {
    return (event) => {

      if (!isRightClick) {
        event.stopPropagation();
      }

      this.props.selectGroup(group);
    }
  };

  toggleMock = (mock) => {
    return (event) => {
      event.stopPropagation();

      API.toggleMock(mock.id);
    }
  };

  toggleGroup(group) {
    return (event) => {
      event.stopPropagation();

      API.toggleGroup(group.id);
    }
  }

  getMocks() {
    return API.mocks
      .filter((mock) => !mock.groupId)
      .filter((mock) => mock.url.indexOf(this.props.searchTerm) !== -1)
      .filter(this.props.customFilter || noop)
      .map((mock) => (
        <Mock
          key={ mock.id }
          id={ mock.id }
          name={ mock.name }
          active={ mock.isActive }
          method={ mock.method }
          url={ mock.url }
          response={ mock.response }
          searchTerm={ this.props.searchTerm }
          isSelected={ !!find(this.props.selectedMocks, { id: mock.id }) }
          toggleMock={ this.toggleMock(mock) }
          onClick={ this.selectMock(mock) }
          onContextMenu={ this.selectMock(mock, true) }/>
      ));
  }

  getGroups() {
    return API.groups
      .filter((group) =>  {
        if (!this.props.searchTerm) {
          return true;
        }

        if (group.name.indexOf(this.props.searchTerm) !== -1) {
          return true;
        }

        return some(group.mocks, (mock) => mock.url.indexOf(this.props.searchTerm) !== -1)
      })
      .map((group) => {
        const mocks = group.mocks.filter(this.props.customFilter || noop);

        return (
          <Group
          key={ group.id }
          id={ group.id }
          name={ group.name }
          active={ group.active }
          isSelected={ group === UIState.selectedGroup }
          mocks={ mocks }
          selectedMocks={ this.props.selectedMocks }
          searchTerm={ this.props.searchTerm }
          toggleGroup={ this.toggleGroup(group) }
          toggleMock={ this.toggleMock }
          onSelectMock={ this.selectMock }
          onClick={ this.selectGroup(group) }
          onContextMenu={ this.selectGroup(group, true) }/>
        )
    });
  }

  openContextMenu = (event) => {
    event.preventDefault();

    UIState.update({
      mocksSidebarMenu: {
        visible: true,
        x: event.clientX,
        y: event.clientY
      }
    });
  };

  render() {
    return this.props.connectDropTarget(
      <div>
        <Sidebar style={{ width: UIState.mocksSidebarWidth }}
                 onContextMenu={ this.openContextMenu }>
          { this.getGroups() }
          { this.getMocks() }

          <ResizeHandle value="mocksSidebarWidth"/>

          <ContextMenu/>
        </Sidebar>
      </div>
    );
  }
}

export default DropTarget('mock', groupTarget, collect)(UIStateListener(MocksSidebar));