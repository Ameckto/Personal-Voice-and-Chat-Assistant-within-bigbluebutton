import Users from '/imports/api/users';
import Auth from '/imports/ui/services/auth';
import { debounce } from 'lodash';
import AudioManager from '/imports/ui/services/audio-manager';
import Meetings from '/imports/api/meetings';
import { makeCall } from '/imports/ui/services/api';
import VoiceUsers from '/imports/api/voice-users';
import logger from '/imports/startup/client/logger';
import { Meteor } from 'meteor/meteor';
import { GroupChatMsg, UsersTyping } from '/imports/api/group-chat-msg';





const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

const init = (messages, intl) => {
  AudioManager.setAudioMessages(messages, intl);
  if (AudioManager.initialized) return;
  const meetingId = Auth.meetingID;
  const userId = Auth.userID;
  const { sessionToken } = Auth;
  const User = Users.findOne({ userId }, { fields: { name: 1 } });
  const username = User.name;
  const Meeting = Meetings.findOne({ meetingId: Auth.meetingID }, { fields: { 'voiceProp.voiceConf': 1 } });
  const voiceBridge = Meeting.voiceProp.voiceConf;

  // FIX ME
  const microphoneLockEnforced = false;

  const userData = {
    meetingId,
    userId,
    sessionToken,
    username,
    voiceBridge,
    microphoneLockEnforced,
  };

  AudioManager.init(userData);
};

const isVoiceUser = () => {
  const voiceUser = VoiceUsers.findOne({ intId: Auth.userID },
    { fields: { joined: 1 } });
  return voiceUser ? voiceUser.joined : false;
};

const toggleMuteMicrophone = () => {
  var run_command = function(intent, value) {

    if (intent == 'mute') {
        //value == person im meeting
        //person.meetingID
        //callerName
        //return collection.intId;
        const personToMute = () => {
          const collection = VoiceUsers.findOne({ callerName: value});
            console.log(collection);
          return [collection._id, collection.muted];
        };

        result = personToMute();
        console.log(result);
        _id = result[0];
        muted = result[1];

        var user = VoiceUsers.findOne({callerName: value});

        if (muted == false) {
          //VoiceUsers.update(selector, modifier_1, cb);
          VoiceUsers.update({_id: user._id}, { $set: { 'muted': true }});
          //collection.insert({muted: true, joined:true});
        }else{
          VoiceUsers.update({_id: user._id}, { $set: { 'muted': false }});
        }
    }
    if (intent == 'wake_up') {
      console.log('Hey, what can I do for you ' + username + '?')
    }
  };

  console.log('in toggle --------------------------------------')

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    response = xhttp.response;
    console.log(response);

    if (this.readyState == 4 && this.status == 200) {

      intent = JSON.parse(xhttp.response).intent.name;
      value = JSON.parse(xhttp.response).entities[0].value;

      console.log(intent);
      console.log(value);
      run_command(intent, value);
    }
  };

  xhttp.open("POST", "https://de7975e7e1e5.ngrok.io/model/parse");
  xhttp.setRequestHeader("Content-Type", "application/json");

  const last_massage = () => {
    const last_massage = GroupChatMsg.find({},{limit: 1, sort: {timestamp: -1}});
    console.log(last_massage)
    return last_massage[0];
  };

  last_massage = GroupChatMsg.find().sort({timestamp:-1}).limit(1)


  console.log(last_massage);


  test = last_massage;
  //replace Hello with input message
  xhttp.send(JSON.stringify({text:test}));


  const user = VoiceUsers.findOne({
    meetingId: Auth.meetingID, intId: Auth.userID,
  }, { fields: { muted: 1 } });

  if (user.muted) {
    logger.info({
      logCode: 'audiomanager_unmute_audio',
      extraInfo: { logType: 'user_action' },
    }, 'microphone unmuted by user');
    makeCall('toggleVoice');
  } else {
    logger.info({
      logCode: 'audiomanager_mute_audio',
      extraInfo: { logType: 'user_action' },
    }, 'microphone muted by user');
    makeCall('toggleVoice');
  }
};

export default {
  init,
  exitAudio: () => AudioManager.exitAudio(),
  transferCall: () => AudioManager.transferCall(),
  joinListenOnly: () => AudioManager.joinListenOnly(),
  joinMicrophone: () => AudioManager.joinMicrophone(),
  joinEchoTest: () => AudioManager.joinEchoTest(),
  toggleMuteMicrophone: debounce(toggleMuteMicrophone, 500, { leading: true, trailing: false }),
  changeInputDevice: inputDeviceId => AudioManager.changeInputDevice(inputDeviceId),
  changeOutputDevice: outputDeviceId => AudioManager.changeOutputDevice(outputDeviceId),
  isConnected: () => AudioManager.isConnected,
  isTalking: () => AudioManager.isTalking,
  isHangingUp: () => AudioManager.isHangingUp,
  isUsingAudio: () => AudioManager.isUsingAudio(),
  isWaitingPermissions: () => AudioManager.isWaitingPermissions,
  isMuted: () => AudioManager.isMuted,
  isConnecting: () => AudioManager.isConnecting,
  isListenOnly: () => AudioManager.isListenOnly,
  inputDeviceId: () => AudioManager.inputDeviceId,
  outputDeviceId: () => AudioManager.outputDeviceId,
  isEchoTest: () => AudioManager.isEchoTest,
  error: () => AudioManager.error,
  isUserModerator: () => Users.findOne({ userId: Auth.userID },
    { fields: { role: 1 } }).role === ROLE_MODERATOR,
  isVoiceUser,
  autoplayBlocked: () => AudioManager.autoplayBlocked,
  handleAllowAutoplay: () => AudioManager.handleAllowAutoplay(),
};
