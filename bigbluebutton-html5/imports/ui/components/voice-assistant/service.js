import { GroupChatMsg } from '/imports/api/group-chat-msg';
import VoiceUsers from '/imports/api/voice-users';
import Auth from '/imports/ui/services/auth';
import { Meteor } from 'meteor/meteor';
import { makeCall } from '/imports/ui/services/api';
import Service from  '/imports/ui/components/actions-bar/service'
import Users from '/imports/api/users';
import AudioService from '/imports/ui/components/audio/service';
import logger from '/imports/startup/client/logger';
import Meetings from '/imports/api/meetings';
import KurentoBridge from '/imports/api/screenshare/client/bridge';
import BridgeService from '/imports/api/screenshare/client/bridge/service';
var stringSimilarity = require('string-similarity');

// function to show notifications for the end-user
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


/**
 * finds the best match for a person_name with a given ranking
 * must be above a given threshold
 */
var guess_name = function(person_name, min_match_raiting) {

  //get all names of meeting
  var selector = {connectionStatus:'online', meetingId: Auth.meetingID};
  var users_collection = Users.find(selector).fetch()

  console.log(users_collection)

  var arrayLength = users_collection.length;
  var persons_in_meeting = [];

  for (var i = 0; i < arrayLength; i++) {
      var person_name =  users_collection[i].name
      persons_in_meeting.push(person_name)
    }
  var matches = stringSimilarity.findBestMatch(person_name, persons_in_meeting);
  console.log(matches)




}
//gets PERSONS of intent and returns them in an array, can be multiple
var get_person_of_intent = function(response, intent, client){
  var result_arr = [];
  var entity_arr = response.entities;
  var arrayLength = entity_arr.length;

  for (var i = 0; i < arrayLength; i++) {
      var entity_type =  entity_arr[i].entity;
      if (entity_type == 'PERSON') {
        var person =  entity_arr[i].value;
        if (person == 'me' || person == 'myself') {
          person = client; // if person is me or myself set it to clients name
        }
        result_arr.push(person);
      }
  }
  result_arr = [...new Set(result_arr)];
  return result_arr;
}

//gets the userId of a given person (must be online and in the meeting of the client)
var get_userId = function(user) {
  var selector = {connectionStatus:'online', name: user, meetingId: Auth.meetingID};
  return Users.findOne(selector).userId;
}

//mutes a user
var mute_user = function(user, client) {
  if (user_exists(user) == false) {
    notify('Could not identify ' + user + ' in the meeting to mute', 'Voice Assistent', 'warning');
    return;
  }
  var userId = get_userId(user);
  var is_user_muted = VoiceUsers.findOne({ callerName: user}).muted;
  var selector = {connectionStatus:'online', name: client, meetingId: Auth.meetingID};
  var users_role = Users.findOne(selector).role;

  const toggleVoice = (userId) => {
    if (userId === Auth.userID) {
        //mute myself
        AudioService.toggleMuteMicrophone();
        notify('You are now muted!', 'Voice Assistent', 'success');
    } else if (users_role == 'MODERATOR'){
      // mute another person
      makeCall('toggleVoice', userId);
      notify('I have muted ' + user + ' for you!', 'Voice Assistent', 'success');
      logger.info({
        logCode: 'usermenu_option_mute_toggle_audio',
        extraInfo: { logType: 'moderator_action', userId },
      }, 'moderator muted user microphone');
    } else {
      notify('Only moderators can mute other users', 'Voice Assistent', 'warning');
    }
  }
  if (is_user_muted == false) {
    toggleVoice(userId);
  } else {
    notify('Person ' + user + ' is already muted', 'Voice Assistent', 'warning')
  }
}

// gets a random greet and returns it
var get_greeting = function() {
  var greetings_arr = ['More work', 'Are you the king', 'Do you need help', 'Orders', "Can I ask you", 'What do you need'];
  var random = Math.floor(Math.random() * greetings_arr.length);
  return greetings_arr[random]
}

//checks if the user exists in the current meeting and is online
var user_exists = function(user) {
  var selector = {connectionStatus:'online', name: user, meetingId: Auth.meetingID}
  var user_document = Users.findOne(selector);
  var exists;
  console.log(typeof(user_document))
  if (user_document == undefined) {
    console.log('in undefined block')
    exists = false;
  } else {
    exists = true;
  }
  console.log(exists);
  return exists;
}

// executs the intent(s)
var execute_intent = function(intent, response) {
  //get the name of the client person
  client = VoiceUsers.findOne({ meetingId: Auth.meetingID, intId: Auth.userID }).callerName;

  switch (intent) {

    case 'mute': //mutes a user
      var person_arr = get_person_of_intent(response, intent, client);
      if (person_arr.length == 0) {
        notify('Could not identify a person to mute', 'Voice Assistent', 'warning');
      } else {
        //u can mute multiple user in one intent
        person_arr.forEach(user => mute_user(user, client));
      }
      break;

    case 'wake_up': //wakes up the voice assistent
      notify( get_greeting() + ' ,' + client + '?', 'Voice Assistent', 'success');
      break;

    case 'give_presentor': // gives a person presentor
      var person_arr = get_person_of_intent(response, intent, client);
      if (person_arr.length == 0) {
        notify('Could not identify a person to give presentor to', 'Voice Assistent', 'warning');
      } else {
        var user = person_arr[0];
        if (user_exists(user) == false) {
          notify('Could not identify ' + user + ' in the meeting to give presenter to', 'Voice Assistent', 'warning');
          return;
        }
        var userId = get_userId(user);
        var selector = {connectionStatus:'online', name: client, meetingId: Auth.meetingID};
        var users_role = Users.findOne(selector).role;
        if (users_role == 'MODERATOR'){
          makeCall('assignPresenter', userId);
          notify('Assigned ' + user + ' presenter', 'Voice Assistent', 'success');
        } else {
          notify('Only the moderator can assign presenter', 'Voice Assistent', 'warning');
        }
      }
      break;

    case 'share_screen': //shares the client screen
      var selector = {connectionStatus:'online', name: client, meetingId: Auth.meetingID};
      var users_is_presenter = Users.findOne(selector).presenter;
      if (users_is_presenter) {
        const shareScreen = (onFail) => {
          // stop external video share if running
          const meeting = Meetings.findOne({ meetingId: Auth.meetingID });
          if (meeting && meeting.externalVideoUrl) {
            stopWatching();
          }
          BridgeService.getScreenStream().then((stream) => {
            KurentoBridge.kurentoShareScreen(onFail, stream);
          }).catch(onFail);
        };
        shareScreen();
        notify('You can now share your screen', 'Voice Assistent', 'success');
      } else {
        notify('You can only share your screen if you are presenter', 'Voice Assistent', 'warning');
      }
      break;

    case 'raise_hand': // raises the clients hand
      var userId = get_userId(client);
      makeCall('setEmojiStatus', userId, 'raiseHand');
      notify('You raised your hand', 'Voice Assistent', 'success');
      break;
  }
};

// makes the post request to the RASA-NLU server
var make_post_request = function(message) {
  var xhttp = new XMLHttpRequest();

  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {

      var response = JSON.parse(this.response) || undefined;
      var intent = response.intent.name || undefined;
      var confidence = response.intent.confidence || undefined;

      //filters intents where the RASA-NLU responses intents confidence is less then min_confidence
      if (confidence < min_confidence) {
        console.log('Voice Assistent -- confidence (' + confidence + ') of intent is less than ' + min_confidence );
        return;
      }
      //filters all out_of_scope intents
      if (typeof(intent) != undefined) {
        if (intent == 'out_of_scope') {
          console.log('Voice Assistent -- Intent out of scope');
          return;
        }
      }
      if (typeof(intent) != undefined) {
        if (intent.includes("+")) { // multy intent
          intent = intent.split('+')[1]; //first one must be the wake_up intent
          execute_intent(intent, response);
        } else {
          // just one intent
          if (last_intent == 'wake_up' && intent != 'wake_up') { // if the voice assistent is already awake
            execute_intent(intent, response)
            last_intent = null // sets the last intent to null after executing
          } else {
            if (intent == 'wake_up') {
              last_intent = 'wake_up' //sets the last intent to wake_up
              client = VoiceUsers.findOne({ meetingId: Auth.meetingID, intId: Auth.userID }).callerName;
              execute_intent('wake_up', response)
            } else if (intent != 'wake_up' && last_intent != 'wake_up') {
                notify('please wake me up first ', 'Voice Assistent', 'warning')
              }
          }
        }
      }
    }
  }
  //RASA-Server domnain
  var url = "https://www.niklasproject.de/model/parse";
  xhttp.open("POST", url);
  xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  //send the post-request
  xhttp.send(JSON.stringify({text:message}));
}

var initializing = true; //util variable for subscribing to the group-chat in the meteor DB
var last_intent = null; //set last intent to null as default
var min_confidence = 0.3 //set the min_confidence to 0.3

//subscribe to the GroupChatMsg
var handle = GroupChatMsg.find().observe({
  added: function (item) {
    if (!initializing)
        //check if the sender of the message is the client
        if (item.sender == Auth.userID) {
          make_post_request(item.message)
        }
  }
});

initializing = false;

var notifications_script = require("./notifications"); //import notifications.js
notifications_script.notifications(); //executing notifications.js to set regarding functions onto the window object
