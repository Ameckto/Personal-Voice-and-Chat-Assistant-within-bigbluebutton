import Auth from '/imports/ui/services/auth';
import Users from '/imports/api/users';

console.log('in script')

export default function muteUser() {

  console.log('in export')

  const getUsers = () => {

    console.log('in muteUser')

    let users = Users
      .find({
        meetingId: Auth.meetingID,
        connectionStatus: 'online',
      }, userFindSorting)
      .fetch();

      console.log(users)

      return 1;
}
