import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { defineMessages, injectIntl } from 'react-intl';
import Button from '/imports/ui/components/button/component';
import getFromUserSettings from '/imports/ui/services/users-settings';
import withShortcutHelper from '/imports/ui/components/shortcut-help/service';
import MutedAlert from '/imports/ui/components/muted-alert/component';
import { styles } from './styles';

const intlMessages = defineMessages({
  joinAudio: {
    id: 'app.audio.joinAudio',
    description: 'Join audio button label',
  },
  leaveAudio: {
    id: 'app.audio.leaveAudio',
    description: 'Leave audio button label',
  },
  muteAudio: {
    id: 'app.actionsBar.muteLabel',
    description: 'Mute audio button label',
  },
  unmuteAudio: {
    id: 'app.actionsBar.unmuteLabel',
    description: 'Unmute audio button label',
  },
});

const propTypes = {
  processToggleMuteFromOutside: PropTypes.func.isRequired,
  handleToggleMuteMicrophone: PropTypes.func.isRequired,
  handleJoinAudio: PropTypes.func.isRequired,
  handleLeaveAudio: PropTypes.func.isRequired,
  disable: PropTypes.bool.isRequired,
  muted: PropTypes.bool.isRequired,
  showMute: PropTypes.bool.isRequired,
  inAudio: PropTypes.bool.isRequired,
  listenOnly: PropTypes.bool.isRequired,
  intl: PropTypes.object.isRequired,
  talking: PropTypes.bool.isRequired,
};

class AudioControls extends PureComponent {
  componentDidMount() {
    const { processToggleMuteFromOutside } = this.props;
    if (Meteor.settings.public.allowOutsideCommands.toggleSelfVoice
      || getFromUserSettings('bbb_outside_toggle_self_voice', false)) {
      window.addEventListener('message', processToggleMuteFromOutside);
    }
  }

  render() {
    const {
      handleToggleMuteMicrophone,
      handleJoinAudio,
      handleLeaveAudio,
      showMute,
      muted,
      disable,
      talking,
      inAudio,
      listenOnly,
      intl,
      shortcuts,
      isVoiceUser,
      inputStream,
      isViewer,
      isPresenter,
    } = this.props;

    let joinIcon = 'audio_off';
    if (inAudio) {
      if (listenOnly) {
        joinIcon = 'listen';
      } else {
        joinIcon = 'audio_on';
      }
    }

    window.VoiceAssistent = {};
    window.VoiceAssistent.state = { on: false }

    var notifications_script = require("/imports/ui/components/voice-assistant/lib/notifications");
    notifications_script.notifications();

    var notify = function(text, title, type) {
      window.notificationService.notify({
        title: title, // title
        text: text, // notification message
        type: type, // 'success', 'warning', 'error'
        position: 'bottom-right', // 'top-right', 'bottom-right', 'top-left', 'bottom-left'
        autoClose: true, // auto close
        duration: 10000, // 5 seconds
        showRemoveButton: true // shows close button
      })
    }

    function toggleVoiceAssistent(){
      if (window.VoiceAssistent.state.on == true) {
        window.VoiceAssistent.state.on = false
        notify('You have turned me off!', 'Voice Assistent', 'success')
      } else {
        window.VoiceAssistent.state.on = true
        notify('You have turned me on!', 'Voice Assistent', 'success')
      }
    }

    const label = muted ? intl.formatMessage(intlMessages.unmuteAudio)
      : intl.formatMessage(intlMessages.muteAudio);

    const toggleMuteBtn = (
      <Button
        className={cx(styles.muteToggle, !talking || styles.glow, !muted || styles.btn)}
        onClick={handleToggleMuteMicrophone}
        disabled={disable}
        hideLabel
        label={label}
        aria-label={label}
        color={!muted ? 'primary' : 'default'}
        ghost={muted}
        icon={muted ? 'mute' : 'unmute'}
        size="lg"
        circle
        accessKey={shortcuts.togglemute}
      />
    );

    return (
      <span className={styles.container}>
        {muted ? <MutedAlert {...{ inputStream, isViewer, isPresenter }} /> : null}
        {showMute && isVoiceUser ? toggleMuteBtn : null}
        <Button
          className={cx(inAudio || styles.btn)}
          onClick={inAudio ? handleLeaveAudio : handleJoinAudio}
          disabled={disable}
          hideLabel
          aria-label={inAudio ? intl.formatMessage(intlMessages.leaveAudio)
            : intl.formatMessage(intlMessages.joinAudio)}
          label={inAudio ? intl.formatMessage(intlMessages.leaveAudio)
            : intl.formatMessage(intlMessages.joinAudio)}
          color={inAudio ? 'primary' : 'default'}
          ghost={!inAudio}
          icon={joinIcon}
          size="lg"
          circle
          accessKey={inAudio ? shortcuts.leaveaudio : shortcuts.joinaudio}
        />

        <Button
          Voice Assistent
          onClick={toggleVoiceAssistent}>
          className={cx(inAudio || styles.btn)}
          disabled={disable}
          size="lg"
          circle
        </button>

      </span>


    );
  }
}

AudioControls.propTypes = propTypes;

export default withShortcutHelper(injectIntl(AudioControls), ['joinAudio', 'leaveAudio', 'toggleMute']);
