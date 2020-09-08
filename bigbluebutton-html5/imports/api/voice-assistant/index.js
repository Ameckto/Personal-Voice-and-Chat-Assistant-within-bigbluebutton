import { Meteor } from 'meteor/meteor';

const VoiceAssistant = new Mongo.Collection('VoiceAssistant');

if (Meteor.isServer) {
  // types of queries for the voice users:
  // 1. intId
  // 2. meetingId, intId
  //VoiceAssistant._ensureIndex({ meetingId: 1, userId: 1 });
}
console.log('This is my Voice VoiceAssistant Code B1tches');

var in_test = function() {
  console.log('in module');
}

export default VoiceAssistant;
