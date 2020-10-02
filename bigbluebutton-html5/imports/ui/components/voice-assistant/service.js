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

  make_post_request(message) {
    console.log('message',message);

    var xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        console.log(xhttp)
        var response = this.response || 'No Response'
        console.log('response: ', response)

        var intent = JSON.parse(response).intent.name || 'No Intent';
        console.log('intent: ', intent)

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
