var string_similarity_test = function string_similarity_test(){

  window.VoiceAssistent_string_similarity_test = (function () {
    var stringSimilarity = require('string-similarity');

    var input_data_arr = [{'input_name': 'Freddy_93', 'expected_name': 'Freddy', 'names_in_meeting': ['Freddy', 'Klaus', 'Niklas']}];
    var output_data_arr = []

    input_data_arr.forEach(test => evaluateTest(test));

    console.log(output_data_arr)

    var evaluateTest = function(test) {
      // util function to sort the result
      function compare( a, b ) {
        if ( a.rating < b.rating ){
          return -1;
        }
        if ( a.rating > b.rating ){
          return 1;
        }
        return 0;
      }

      var input_name = test['input_name'];
      var expected_name = test['expected_name'];

      var names_in_meeting_arr = test['names_in_meeting'];
      var matches_ratings = stringSimilarity.findBestMatch(input_name, names_in_meeting_arr).ratings;

      matches_ratings.sort(compare);

      var rank_name_1 = matches_ratings[0].target;
      var confidence_name_1 = matches_ratings[0].rating;

      var rank_name_2 = matches_ratings[1].target;
      var confidence_name_2 = matches_ratings[1].rating;

      var rank_name_3 = matches_ratings[2].target;
      var confidence_name_3 = matches_ratings[2].rating;


      var data = {'input_name': input_name,
                  'expectet_name': expected_name,
                  'rank_name_1': rank_name_1,
                  'confidence_name_1':confidence_name_1,
                  'rank_name_2': rank_name_2,
                  'confidence_name_2':confidence_name_2,
                  'rank_name_3':rank_name_3,
                  'confidence_name_3':confidence_name_3};

      output_data_arr.push(data);


    };

  });
};
module.exports.string_similarity_test = string_similarity_test;
