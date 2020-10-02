import { GroupChatMsg } from '/imports/api/group-chat-msg';

console.log('in new voice assistaent')
var initializing = true;

var handle = GroupChatMsg.find().observe({
  added: function (item) {
    if (!initializing)
        // do stuff with newly added items, this check skips the first run
        console.log('something changed')
        console.log(item)
  }
});

initializing = false;
