import { GroupChatMsg } from '/imports/api/group-chat-msg';
import VoiceUsers from '/imports/api/voice-users';
import Auth from '/imports/ui/services/auth';
import { Meteor } from 'meteor/meteor';

console.log('in new voice assistaent')

class Voice_Assistant {
  constructor(item) {
    this._message = item.message;
    //this._int_id = item.sender;
    this._caller_name = VoiceUsers.findOne({ meetingId: Auth.meetingID, intId: Auth.userID }).callerName;
    console.log('_caller_name: ', this._caller_name)
    this._response = this.make_post_request(this._message)
    this._min_confidence = 0.3
  }

  // retrun intents in array >= min_confidence
  var filter_intent = function(intent_arr, min_confidence) {
    var result_arr = []
    var arrayLength = intent_arr.length;
    for (var i = 0; i < arrayLength; i++) {
        var intent =  intent_arr[i].name;
        var confidence =  intent_arr[i].confidence;
        console.log(confidence)
        console.log(intent)
        if (confidence >= min_confidence) {
          console.log('true')
          result_arr.push(intent)
        }
    }
    return result_arr
  }

  // return true if intend is in array
  check_intent(intent_arr, name) {
    var result_arr = []
    var arrayLength = intent_arr.length;
    for (var i = 0; i < arrayLength; i++) {
        var intent =  intent_arr[i].name;
        if (intent == name) {
          return true
        }
    }
    return false
  }

  make_post_request(message) {
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
        intent_arr = filter_intent(intent_arr, Voice_Assistant.prototype._min_confidence)

        console.log('intent_arr_filter: ', intent_arr)

        if (intent_arr[0] != 'no_intents') {
            // Do 2 intents
            if (intent_arr.length == 2) {
              // check if wake_up is in intent_arr
              if (Voice_Assistant.prototype.check_intent(intent_arr, 'wake_up')){
                //get index of wake_up
                var index = intent_arr.indexOf('wake_up')
                intent_arr.splice(index, 1);
                var intent = intent_arr[0]
                console.log('2 inents: ', intent)
              }
            } else {

              if (intent_arr.length == 1) {
                // Do 1 intend
                // frage ob letzter Intend wake_up war
                if (last_intent == 'wake_up') {
                  var intent = intent_arr[0]
                  console.log('1 intent: ', intent)
                  last_intent = null
                } else {
                  if (Voice_Assistant.prototype.check_intent(intent_arr, 'wake_up')) {
                    last_intent = 'wake_up'
                  } else {
                    console.log('pls wake up bbb first')
                  }
                }
              }
            }
          }
        //var value = JSON.parse(response).entities[0].value || 'No Value';
        //console.log('value: ', value)

        return null;
      }
    };

    var url = "https://www.niklasproject.de/model/parse";

    xhttp.open("POST", url);
    xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhttp.send(JSON.stringify({text:message}));
  }
}

var initializing = true;

var last_intent = null;

var handle = GroupChatMsg.find().observe({
  added: function (item) {
    if (!initializing)
        // do stuff with newly added items, this check skips the first run
        //
        console.log('something changed')
        console.log(item)
        a = new Voice_Assistant(item)
        console.log('last_intent', last_intent)
  }
});

initializing = false;
