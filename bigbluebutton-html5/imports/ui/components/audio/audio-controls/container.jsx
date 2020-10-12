import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { withModalMounter } from '/imports/ui/components/modal/service';
import AudioManager from '/imports/ui/services/audio-manager';
import { makeCall } from '/imports/ui/services/api';
import lockContextContainer from '/imports/ui/components/lock-viewers/context/container';
import logger from '/imports/startup/client/logger';
import Auth from '/imports/ui/services/auth';
import Users from '/imports/api/users';
import AudioControls from './component';
import AudioModalContainer from '../audio-modal/container';
import Service from '../service';

const ROLE_VIEWER = Meteor.settings.public.user.role_viewer;

const AudioControlsContainer = props => <AudioControls {...props} />;

const processToggleMuteFromOutside = (e) => {
  switch (e.data) {
    case 'c_mute': {
      makeCall('toggleVoice');
      break;
    }
    case 'get_audio_joined_status': {
      const audioJoinedState = AudioManager.isConnected ? 'joinedAudio' : 'notInAudio';
      this.window.parent.postMessage({ response: audioJoinedState }, '*');
      break;
    }
    case 'c_mute_status': {
      const muteState = AudioManager.isMuted ? 'selfMuted' : 'selfUnmuted';
      this.window.parent.postMessage({ response: muteState }, '*');
      break;
    }
    default: {
      // console.log(e.data);
    }
  }
};

const handleLeaveAudio = () => {
  console.log('in leave audio')
  Service.exitAudio();
  logger.info({
    logCode: 'audiocontrols_leave_audio',
    extraInfo: { logType: 'user_action' },
  }, 'audio connection closed by user');
};

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
};

const toggleVoiceAssistentFromOutside = (e) => {
  console.log(e.data)

  if (window.VoiceAssistent.state.on == true) {
    //window.VoiceAssistent.state.on = false
    //notify('You have turned me off!', 'Voice Assistent', 'success')
    this.window.parent.postMessage({ response: window.VoiceAssistent.state.on }, '*');
  } else {
    //window.VoiceAssistent.state.on = true
    //notify('You have turned me on!', 'Voice Assistent', 'success')
    this.window.parent.postMessage({ response: window.VoiceAssistent.state.on }, '*');
  }

}

const {
  isVoiceUser,
  isConnected,
  isListenOnly,
  isEchoTest,
  isMuted,
  isConnecting,
  isHangingUp,
  isTalking,
  toggleMuteMicrophone,
  joinListenOnly,
} = Service;

export default lockContextContainer(withModalMounter(withTracker(({ mountModal, userLocks }) => {
  const currentUser = Users.findOne({ meetingId: Auth.meetingID, userId: Auth.userID }, {
    fields: {
      role: 1,
      presenter: 1,
    },
  });
  const isViewer = currentUser.role === ROLE_VIEWER;
  const isPresenter = currentUser.presenter;

  return ({
    processToggleMuteFromOutside: arg => processToggleMuteFromOutside(arg),
    toggleVoiceAssistentFromOutside: arg => toggleVoiceAssistentFromOutside(arg),
    showMute: isConnected() && !isListenOnly() && !isEchoTest() && !userLocks.userMic,
    muted: isConnected() && !isListenOnly() && isMuted(),
    inAudio: isConnected() && !isEchoTest(),
    listenOnly: isConnected() && isListenOnly(),
    disable: isConnecting() || isHangingUp() || !Meteor.status().connected,
    talking: isTalking() && !isMuted(),
    isVoiceUser: isVoiceUser(),
    handleToggleMuteMicrophone: () => toggleMuteMicrophone(),
    handleJoinAudio: () => (isConnected() ? joinListenOnly() : mountModal(<AudioModalContainer />)),
    handleLeaveAudio,
    inputStream: AudioManager.inputStream,
    isViewer,
    isPresenter,
  });
})(AudioControlsContainer)));
