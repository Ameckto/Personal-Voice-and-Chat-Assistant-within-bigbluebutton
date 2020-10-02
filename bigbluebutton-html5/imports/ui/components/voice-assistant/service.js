import { GroupChatMsg } from '/imports/api/group-chat-msg';
import VoiceUsers from '/imports/api/voice-users';
import Auth from '/imports/ui/services/auth';
import { Meteor } from 'meteor/meteor';

//console.log('in new voice assistaent')

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
  return result_arr
}

// retrun intents in array >= min_confidence
var filter_intent = function(intent_arr, min_confidence) {
  var result_arr = []
  var arrayLength = intent_arr.length;
  for (var i = 0; i < arrayLength; i++) {
      var intent =  intent_arr[i].name;
      var confidence =  intent_arr[i].confidence;
      if (confidence >= min_confidence) {
        result_arr.push(intent)
      }
  }
  return result_arr
}

// return true if intend is in array
var check_intent = function(intent_arr, name) {
  var result_arr = []
  var arrayLength = intent_arr.length;
  for (var i = 0; i < arrayLength; i++) {
      var intent =  intent_arr[i];
      if (intent == name) {
        return true
      }
  }
  return false
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

    console.log('person_to_mute: ' + person_to_mute);

    if (muted == false) {
      //var user = VoiceUsers.findOne({callerName: person_to_mute});
      VoiceUsers.update({_id: _id}, { $set: { 'muted': true }});
    } else {
      console.log(user + ' is already muted')
    }
  } else {
    console.log('There is no Person called: ' + user)
  }
}

var wake_up = function(client) {
  sentence = 'Hey, what can I do for you ' + client + '?';
  console.log(sentence);
  const utterance = new SpeechSynthesisUtterance(sentence);
  //window.speechSynthesis.speak(utterance);
}

var execute_intent = function(intent, response) {

  //get the name of the client person
  client = VoiceUsers.findOne({ meetingId: Auth.meetingID, intId: Auth.userID }).callerName;

  if (intent == 'mute') {
      // the persons the client wants to mute
      person_arr = get_person_of_intent(response, intent)
      if (person_arr.length == 0) {
        console.log('Could not identify a person')
      }
      person_arr.forEach(person => mute_user(person))
  }

  if (intent == 'wake_up') {
    wake_up(client)
  }
};

var make_post_request = function(message) {
  console.log('message',message);
  var xhttp = new XMLHttpRequest();

  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      console.log(xhttp)
      var response = this.response || 'No Response'
      console.log('response: ', response)

      var intent_arr = JSON.parse(response).intent_ranking || ['no_intents'];

      console.log('intent_arr: ', intent_arr)

      // filter all intends < _min_confidence
      intent_arr = filter_intent(intent_arr, min_confidence)

      console.log('intent_arr_filter: ', intent_arr)

      if (intent_arr[0] != 'no_intents') {
          var response  = JSON.parse(response)
          // Do 2 intents
          if (intent_arr.length == 2) {
            // check if wake_up is in intent_arr
            if (check_intent(intent_arr, 'wake_up')){
              //get index of wake_up
              var index = intent_arr.indexOf('wake_up')
              intent_arr.splice(index, 1);
              var intent = intent_arr[0]
              console.log('2 intent: ', intent)
              execute_intent(intent, response)
            }
          } else {

            if (intent_arr.length == 1) {
              var intent = intent_arr[0]
              // Do 1 intend
              // frage ob letzter Intend wake_up war
              if (last_intent == 'wake_up') {

                console.log('1 intent: ', intent)
                execute_intent(intent, response)
                last_intent = null
              } else {
                if (check_intent(intent_arr, 'wake_up')) {
                  last_intent = 'wake_up'
                  if (intent == 'wake_up') {
                    execute_intent(intent, response)
                  }
                } else {
                  console.log('pls wake up bbb first')
                }
              }
            }
          }
        }
      return null;
    }
  };

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
        // do stuff with newly added items, this check skips the first run
        //console.log('something changed')
        //console.log(item)
        make_post_request(item.message)
        //a = new Voice_Assistant(item, min_confidence)
        console.log('last_intent', last_intent)
  }
});

initializing = false;


var domNotifications = require('dom-notifications')
var notifications = domNotifications(options)

document.body.appendChild(notifications.render())

notifications.add({message: 'You are now logged in'}) // defaults to `info`
notifications.add({message: 'This is a warning', type: 'warning'})
notifications.error('Oh noes: File not found')
