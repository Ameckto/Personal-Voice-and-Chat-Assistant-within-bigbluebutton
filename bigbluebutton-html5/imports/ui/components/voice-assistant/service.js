import { GroupChatMsg } from '/imports/api/group-chat-msg';
import VoiceUsers from '/imports/api/voice-users';
import Auth from '/imports/ui/services/auth';
import { Meteor } from 'meteor/meteor';
import { makeCall } from '/imports/ui/services/api';
import Service from  '/imports/ui/components/actions-bar/service'

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
var get_person_of_intent = function(response, intent){
  var result_arr = []
  var entity_arr = response.entities
  var arrayLength = entity_arr.length;

  for (var i = 0; i < arrayLength; i++) {
      var entity_type =  entity_arr[i].entity;
      if (entity_type == 'PERSON') {
        var person =  entity_arr[i].value;
        result_arr.push(person)
      }
  }
  result_arr = [...new Set(result_arr)];
  return result_arr;
}

var mute_user = function(user) {
  //get the _id, muted boolean and the name of the person to mute
  const personToMute = () => {
    const collection = VoiceUsers.findOne({ callerName: user});
    if (typeof(collection) != 'undefined') {
      return [collection._id, collection.muted, collection.callerName];
    } else {
      return ['none', user]
    }
  };

  person = personToMute();

  if (person[0] != 'none') {

    _id = person[0];
    muted_boolean = person[1];
    person_to_mute = person[2]

    if (muted_boolean == false) {
      //var user = VoiceUsers.findOne({callerName: person_to_mute});
      VoiceUsers.update({_id: _id}, { $set: { 'muted': true }});
      notify(user + ' muted', 'Voice Assistent', 'success')
    } else {
      notify(user + ' is already muted', 'Voice Assistent', 'warning')
    }
  } else {
    notify('There is no person called ' + user, 'Voice Assistent', 'warning')
  }
}

var get_greeting = function() {
  var greetings_arr = ['More work', 'Are you the king', 'Do you need help', 'Orders', "Can I ask you", 'What do you need'];
  var random = Math.floor(Math.random() * greetings_arr.length);
  return greetings_arr[random]
}

var wake_up = function(client) {
  var text = get_greeting() + ' ' + client + '?';
  notify(text, 'Voice Assistent', 'success')
}

var execute_intent = function(intent, response) {

  //get the name of the client person
  client = VoiceUsers.findOne({ meetingId: Auth.meetingID, intId: Auth.userID }).callerName;

  switch (intent) {

    case 'mute':
      var person_arr = get_person_of_intent(response, intent)
      if (person_arr.length == 0) {
        notify('Could not identify a person to mute', 'Voice Assistent', 'warning')
      } else {
        person_arr.forEach(person => mute_user(person))
      }
      break;

    case 'wake_up':
      wake_up(client)
      break;

    case 'give_presentor':

      var person_arr = get_person_of_intent(response, intent)
      if (person_arr.length == 0) {
        notify('Could not identify a person to give presentor to', 'Voice Assistent', 'warning')
        return;
      } else {
        user = person_arr[0]

        Service.takePresenterRole()
        console.log('Should have give yourself presentor')
      }
      break;

    case 'share_first_screen':
      //
      break;

    case 'raise_hand':
      //
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
              wake_up(client)
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
        make_post_request(item.message)
        console.log('last_intent', last_intent)
  }
});

initializing = false;

var notifications_script = require("./notifications");

notifications_script.notifications();
