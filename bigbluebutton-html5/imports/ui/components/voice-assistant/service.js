import { GroupChatMsg } from '/imports/api/group-chat-msg';
import VoiceUsers from '/imports/api/voice-users';
import Auth from '/imports/ui/services/auth';
import { Meteor } from 'meteor/meteor';
import { makeCall } from '/imports/ui/services/api';
import Service from  '/imports/ui/components/actions-bar/service'
//import assignPresenter from 'imports/api/users/server/methods/assignPresenter'
import Users from '/imports/api/users';
//import Service from '/imports/ui\components/user-list/service'
import AudioService from '/imports/ui/components/audio/service';
import logger from '/imports/startup/client/logger';

var notify = function(text, title, type) {
  window.notificationService.notify({
    // title
    title: title,
    // notification message
    text: text,
    // 'success', 'warning', 'error'
    type: type,
    // 'top-right', 'bottom-right', 'top-left', 'bottom-left'
    position: 'bottom-right',
    // auto close
    autoClose: true,
    // 5 seconds
    duration: 10000,
    // shows close button
    showRemoveButton: true
  })
}

//gets PERSONS of intent and returns them in an array, can be multiple
var get_person_of_intent = function(response, intent, client){
  var result_arr = []
  var entity_arr = response.entities
  var arrayLength = entity_arr.length;

  for (var i = 0; i < arrayLength; i++) {
      var entity_type =  entity_arr[i].entity;
      if (entity_type == 'PERSON') {
        var person =  entity_arr[i].value;
        if (person == 'me' || person == 'myself') {
          person = client

        }
        result_arr.push(person)
      }
  }
  result_arr = [...new Set(result_arr)];
  return result_arr;
}

var get_userId = function(user) {
  console.log(user)
  return Users.findOne({ name: user}).userId;
}

var mute_user = function(user) {

  var userId = get_userId(user)
  var is_user_muted = VoiceUsers.findOne({ callerName: user}).muted
  var selector = {connectionStatus:'online', name: user, meetingId: Auth.meetingID}
  var users_role = Users.findOne(selector).role;
  console.log(users_role)
  //--------------
  const toggleVoice = (userId) => {
    if (userId === Auth.userID) {
        //mute myself
        AudioService.toggleMuteMicrophone();
    } else if (users_role == 'MODERATOR'){
      // mute another person
      makeCall('toggleVoice', userId);
      logger.info({
        logCode: 'usermenu_option_mute_toggle_audio',
        extraInfo: { logType: 'moderator_action', userId },
      }, 'moderator muted user microphone');
    } else {
      notify('Only moderators can mute other users', 'Voice Assistent', 'warning')
    }
  };

  if (is_user_muted == false) {
    toggleVoice(userId)
  } else {
    notify('Person ' + user + ' is already muted', 'Voice Assistent', 'warning')
  }
}

var get_greeting = function() {
  var greetings_arr = ['More work', 'Are you the king', 'Do you need help', 'Orders', "Can I ask you", 'What do you need'];
  var random = Math.floor(Math.random() * greetings_arr.length);
  return greetings_arr[random]
}

var execute_intent = function(intent, response) {

  //get the name of the client person
  client = VoiceUsers.findOne({ meetingId: Auth.meetingID, intId: Auth.userID }).callerName;

  switch (intent) {

    case 'mute':
      var person_arr = get_person_of_intent(response, intent, client)
      if (person_arr.length == 0) {
        notify('Could not identify a person to mute', 'Voice Assistent', 'warning')
      } else {
        person_arr.forEach(user => mute_user(user))
      }
      break;

    case 'wake_up':
      notify( get_greeting() + ' ,' + client + '?', 'Voice Assistent', 'success')
      break;

    case 'give_presentor':

      var person_arr = get_person_of_intent(response, intent, client)
      if (person_arr.length == 0) {
        notify('Could not identify a person to give presentor to', 'Voice Assistent', 'warning')
        return;
      } else {
        var user = person_arr[0]
        var userId = get_userId(user);
        makeCall('assignPresenter', userId);
        notify('Assigned ' + user + ' presenter', 'Voice Assistent', 'success')
      }
      break;

    case 'share_first_screen':
      //
      break;

    case 'raise_hand':
      var userId = get_userId(client)
      makeCall('setEmojiStatus', userId, 'raiseHand');
      notify('You raised your hand', 'Voice Assistent', 'success')
      break;
  }
};

var make_post_request = function(message) {

  var xhttp = new XMLHttpRequest();

  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {

      var response = JSON.parse(this.response) || undefined;
      var intent = response.intent.name || undefined;
      var confidence = response.intent.confidence || undefined;
      if (confidence < min_confidence) {
        console.log('Voice Assistent -- confidence (' + confidence + ') of intent is less than ' + min_confidence )
        return;
      }
      if (typeof(intent) != undefined) {
        if (intent == 'out_of_scope') {
          console.log('Voice Assistent -- Intent out of scope')
          return;
        }
      }
      if (typeof(intent) != undefined) {
        if (intent.includes("+")) {
          // the first one is wake_up
          intent = intent.split('+')[1]
          execute_intent(intent, response)
        } else {
          // 1 intent
          if (last_intent == 'wake_up' && intent != 'wake_up') {
            execute_intent(intent, response)
            last_intent = null
          } else {
            if (intent == 'wake_up') {
              last_intent = 'wake_up'
              client = VoiceUsers.findOne({ meetingId: Auth.meetingID, intId: Auth.userID }).callerName;
              execute_intent(intent, response)
            } else if (intent != 'wake_up' && last_intent != 'wake_up') {
                notify('please wake me up first ', 'Voice Assistent', 'warning')
              }
          }
        }
      }
    }
  }
  var url = "https://www.niklasproject.de/model/parse";
  xhttp.open("POST", url);
  xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  xhttp.send(JSON.stringify({text:message}));
}

var initializing = true;
var last_intent = null;
var min_confidence = 0.3
var handle = GroupChatMsg.find().observe({
  added: function (item) {
    if (!initializing)
        //did I make the post request?
        //sender = item.sender
        //(console.log(sender)
        //console.log(Auth.userID)
        if (item.sender == Auth.userID) {
          console.log('execute command')
          make_post_request(item.message)

        }
  }
});

initializing = false;

var notifications_script = require("./notifications");

notifications_script.notifications();
