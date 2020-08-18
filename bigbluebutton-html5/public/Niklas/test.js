var my_test = function() {
  import Users from '/imports/api/users';
  import Auth from '/imports/ui/services/auth';

  console.log(Auth)
  console.log(Users)
  const currentUser = Users.findOne({ userId: Auth.userID }, { fields: { role: 1, locked: 1 } });


  console.log('test');
}
