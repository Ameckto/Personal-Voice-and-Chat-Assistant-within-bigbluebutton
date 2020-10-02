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
  }

  check_intent(intent_arr, name) {
    result_arr = []
    var arrayLength = intent_arr.length;
    for (var i = 0; i < arrayLength; i++) {
        intent =  intent_arr[i].name;
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

        var intent_arr = JSON.parse(response).intent_ranking || 'no_intents';

        console.log('intent_arr: ', intent_arr)

        if (intent_arr != 'no_intents') {
          if (Voice_Assistant.prototype.check_intent(intent_arr, 'wake_up')){
            if (intent_arr.length > 1) {
              // Do 2 intend
              console.log('do 2 intents')
              intent_1 = intent_arr[0].name
              intent_2 = intent_arr[1].name
              console.log(intent_1, intent_2)
            }
          }
          if (intent_arr.length == 1) {
            // Do 2 intend
            console.log('do 1 intent')
            intent = intent_arr[0].name
          }
        }


        var value = JSON.parse(response).entities[0].value || 'No Value';
        console.log('value: ', value)

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

var handle = GroupChatMsg.find().observe({
  added: function (item) {
    if (!initializing)
        // do stuff with newly added items, this check skips the first run
        //
        console.log('something changed')
        console.log(item)
        a = new Voice_Assistant(item)
  }
});

initializing = false;
