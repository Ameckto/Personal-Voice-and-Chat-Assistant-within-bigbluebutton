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
//manage notifications
var make_notify = function(kind, user) {
  switch (kind) {

    // manage mute
    case 'mute':
      notify('I have muted ' + user + ' for you!', 'Voice Assistent', 'success');
      break;
    case 'mute_guessed':
      notify('I guessed that you meant ' + user + '. ' + user + ' is now muted.', 'Voice Assistent', 'success');
      break;
    case 'mute_me':
      notify('You are now muted!', 'Voice Assistent', 'success');
      break;
    case 'mute_not_moderator':
      notify('Only moderators can mute other users.', 'Voice Assistent', 'warning');
      break;
    case 'mute_already_muted':
      notify('Person ' + user + ' is already muted.', 'Voice Assistent', 'warning')
      break;
    case 'mute_me_already_muted':
        notify('You are already muted.', 'Voice Assistent', 'warning')
        break;
    case 'mute_no_person':
      notify('Could not identify ' + user + ' in the meeting to mute.', 'Voice Assistent', 'warning');
      break;
    case 'mute_no_person_given':
      notify('Could not identify a person to mute.', 'Voice Assistent', 'warning')
      break;
    case 'mute_guessed_already_muted':
      notify('I guessed that you meant ' + user + '. But ' + user + ' is already muted.', 'Voice Assistent', 'success');
      break;

    // manage give presenter
    case 'presenter_give':
      notify('Assigned ' + user + ' presenter.', 'Voice Assistent', 'success');
      break;
    case 'presenter_give_me':
      notify('Assigned yourself presenter.', 'Voice Assistent', 'success');
      break;
    case 'presenter_no_person_given':
      notify('Could not identify a person to give presenter to.', 'Voice Assistent', 'warning');
      break;
    case 'presenter_no_user_identified':
      notify('Could not identify ' + user + ' in the meeting to give presenter to.', 'Voice Assistent', 'warning');
      break;
    case 'presenter_person_guessed':
      notify('I guessed that you meant ' + user + '. Assigned ' + user + ' presenter.', 'Voice Assistent', 'success');
      break;
    case 'presenter_only_moderator':
      notify('Only the moderator can assign presenter.', 'Voice Assistent', 'warning');
      break;

    // manage wake up
    case 'wake_up':
      notify( get_greeting() + ' ,' + user + '?', 'Voice Assistent', 'success');
      break;
    case 'wake_up_first':
      notify('please wake me up first.', 'Voice Assistent', 'warning')
      break;

    // manage share Screenshare
    case 'screen_share':
      notify('You can now share your screen.', 'Voice Assistent', 'success');
      break;
    case 'share_screen_only_presenter':
      notify('You can only share your screen if you are presenter.', 'Voice Assistent', 'warning');
      break;

    // manage raise hand
    case 'raise_hand':
      notify('You raised your hand.', 'Voice Assistent', 'success');
      break;

    // manage out of scope
    case 'out_of_scope':
      notify('I could not understand you ' + user + '.', 'Voice Assistent', 'warning');
      break;
    }
}

/**
 * finds the best match for a user with a given ranking
 * must be above a given threshold
 */
var guess_name = function(user) {

  //get all names of meeting
  var selector = {connectionStatus:'online', meetingId: Auth.meetingID};
  var users_collection = Users.find(selector).fetch()

  var arrayLength = users_collection.length;
  var persons_in_meeting = [];

  for (var i = 0; i < arrayLength; i++) {
      var person_name =  users_collection[i].name
      persons_in_meeting.push(person_name)
    }

  var matches = stringSimilarity.findBestMatch(user, persons_in_meeting);
  var best_match_name = matches.bestMatch['target']
  var best_match_raiting = matches.bestMatch['rating']
  console.log('best_match_name ', best_match_name)
  console.log('best_match_raiting ', best_match_raiting)
  if (best_match_raiting >= min_match_raiting) {
    var result = best_match_name;
  } else {
    var result = false;
  }
  return result;
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
  console.log('identified person(s): ', JSON.stringify(result_arr));
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
    var guessed_name = guess_name(user)
    if (guessed_name == false) {
      make_notify('mute_no_person', user);
      return;
    } else {
      user = guessed_name
      guessed = true
    }
  }

  var userId = get_userId(user);
  var is_user_muted = VoiceUsers.findOne({ callerName: user}).muted;
  var selector = {connectionStatus:'online', name: client, meetingId: Auth.meetingID};
  var users_role = Users.findOne(selector).role;

  if (is_user_muted == false) {
    if (userId == Auth.userID) {
      AudioService.toggleMuteMicrophone();
      make_notify('mute_me', '');
    } else if (users_role == 'MODERATOR'){
      makeCall('toggleVoice', userId);
      if (guessed) {
        make_notify('mute_guessed', user);
      } else {
        make_notify('mute', user);
      }
    } else {
      make_notify('mute_not_moderator', '');
    }
  } else {
    if (guessed) {
      make_notify('mute_guessed_already_muted', user);
    } else {
      make_notify('mute_already_muted', user)
    }
  }
}

// gets a random greet and returns it
var get_greeting = function() {
  var greetings_arr = ['More work', 'Are you the king', 'Do you need help', 'Orders', "What is your desire", 'What do you need', 'Any dreams', 'What'];
  var random = Math.floor(Math.random() * greetings_arr.length);
  return greetings_arr[random]
}

//checks if the user exists in the current meeting and is online
var user_exists = function(user) {
  var selector = {connectionStatus:'online', name: user, meetingId: Auth.meetingID}
  var user_document = Users.findOne(selector);
  var exists;
  if (user_document == undefined) {
    exists = false;
  } else {
    exists = true;
  }
  return exists;
}

// executs the intent(s)
var execute_intent = function(intent, response) {
  //get the name of the client person
  client = VoiceUsers.findOne({ meetingId: Auth.meetingID, intId: Auth.userID }).callerName;
  var guessed = false

  switch (intent) {

    case 'mute': //mutes a user
      var person_arr = get_person_of_intent(response, intent, client);
      if (person_arr.length == 0) {
        call_notify('mute_no_person_given', '');
      } else {
        //u can mute multiple user in one intent
        person_arr.forEach(user => mute_user(user, client));
      }
      break;

    case 'wake_up': //wakes up the voice assistent
      make_notify('wake_up', client);
      break;

    case 'give_presenter': // gives a person presenter

      var person_arr = get_person_of_intent(response, intent, client);

      if (person_arr.length == 0) {
        make_notify('presenter_no_person_given');
        return;
      }

      var user = person_arr[0]; //you can only give one presenter at a time
      if (user_exists(user) == false) {
        var guessed_name = guess_name(user);
        if (guessed_name == false) {
          make_notify('presenter_no_user_identified', user);
          return;
        } else {
          user = guessed_name
          guessed = true
        }
      }
      // mute a user
      var userId = get_userId(user);
      var selector = {connectionStatus:'online', name: client, meetingId: Auth.meetingID};
      var users_role = Users.findOne(selector).role;
      if (users_role == 'MODERATOR'){
        makeCall('assignPresenter', userId);
        if (guessed) {
          make_notify('presenter_person_guessed', user);
        } else {
          if (userId == Auth.userID){
            make_notify('presenter_give_me', '');
          } else {
            make_notify('presenter_give', user);
          }
        }
      } else {
        make_notify('presenter_only_moderator', '');
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
        make_notify('share_screen', '')
      } else {
        make_notify('share_screen_only_presenter', '')
      }
      break;

    case 'raise_hand': // raises the clients hand
      var userId = get_userId(client);
      makeCall('setEmojiStatus', userId, 'raiseHand');
      make_notify('raise_hand', '');
      break;

    case 'summarize':
      // inject code summarization
      break;

    case 'out_of_scope':
        make_notify('out_of_scope', client);
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

      console.log('intent identified', intent)
      console.log('confidence', confidence)

      if (confidence < min_confidence) {
        console.log('confidence is less than min_confidence of ' + min_confidence)
        return;
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
              //client = VoiceUsers.findOne({ meetingId: Auth.meetingID, intId: Auth.userID }).callerName;
              execute_intent('wake_up', response)
            } else if (intent != 'wake_up' && last_intent != 'wake_up') {
                make_notify('wake_up_first', '')
              }
          }
        }
      }
    }
  }
  //RASA-Server domnain
  var url = "https://niklasproject.de/model/parse";
  xhttp.open("POST", url);
  xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  //send the post-request
  xhttp.send(JSON.stringify({text:message}));
}

var initializing = true; //util variable for subscribing to the group-chat in the meteor DB
var last_intent = null; //set last intent to null as default
var min_confidence = 0.35 //set the min_confidence to 0.3
var min_match_raiting = 0.5

//subscribe to the GroupChatMsg
var handle = GroupChatMsg.find().observe({
  added: function (item) {
    if (!initializing)
        //check if the sender of the message is the client
        if (VoiceAssistent.state.on){
          if (item.sender == Auth.userID) {
            make_post_request(item.message)
          }
        }
  }
});

initializing = false;

var test_similarity_script = require("./test/string_similarity_test");
test_similarity_script.string_similarity_test()
var notifications_script = require("./lib/notifications"); //import notifications.js
notifications_script.notifications(); //executing notifications.js to set regarding functions onto the window object
