import React from 'react';
import styled from 'styled-components';
import mockedIcon from 'ui/assets/images/mocked@2x.png';
import unmockedIcon from 'ui/assets/images/unmocked@2x.png';
import expandIcon from 'ui/assets/images/right@2x.png';
import Mock from 'ui/components/Mock';

const Icon = styled.img`
  height: 16px;
  user-select: none;
  margin-right: 5px;
  ${(props) => props.open ? 'transform: rotate(90deg);' : ''}
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 4px;
  background-color: ${(props) => props.isSelected ? '#cbddf5' : 'white'};
  
  &:hover {
    cursor: ${(props) => props.isSelected ? 'default' : 'pointer'};
    background-color: #cbddf5;
  }
`;

const GroupMocks = styled.div`
  margin-left: 20px;
`;

export class Group extends React.Component {

  state = {
    isOpen: false
  };

  toggle = () => {
    this.setState({ isOpen: !this.state.isOpen });
  };

  render() {
    const { name, active, mocks, selectedMock, onSelectMock } = this.props;

    return (
      <div>
        <GroupHeader>
          <Icon src={ active ? mockedIcon : unmockedIcon } onClick={ this.props.toggleGroup }/>
          <Icon src={ expandIcon } onClick={ this.toggle } open={ this.state.isOpen }/>
          { name } {' '} ({ mocks.length })
        </GroupHeader>
        <GroupMocks>
          { this.state.isOpen && mocks.map((mock) => (
            <Mock
              key={ mock.id }
              id={ mock.id }
              name={ mock.name }
              active={ mock.isActive }
              method={ mock.method }
              url={ mock.url }
              isSelected={ mock === selectedMock }
              toggleMock={ this.props.toggleMock(mock) }
              onClick={ onSelectMock(mock) }/>
          ))}
        </GroupMocks>
      </div>
    )
  }
}

Group.propTypes = {
  name: React.PropTypes.string,
  active: React.PropTypes.bool,
  mocks: React.PropTypes.array
};

export default Group;