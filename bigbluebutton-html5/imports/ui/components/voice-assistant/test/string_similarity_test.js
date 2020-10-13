var string_similarity_test = function string_similarity_test(){

  window.VoiceAssistent_string_similarity_test = (function () {
    var stringSimilarity = require('string-similarity');

    var input_data_arr = [{'input_name': 'Freddy', 'expected_name': 'Freddy_93', 'names_in_meeting': ['Freddy_93', 'Klaus', 'Niklas']},
              {'input_name': 'niklas', 'expected_name': 'Niklas', 'names_in_meeting': ['Freddy', 'Klaus', 'Niklas']},
              {'input_name': 'Niklas', 'expected_name': 'niklas', 'names_in_meeting': ['Freddy', 'Klaus', 'niklas']},
              {'input_name': 'Nikki', 'expected_name': 'Nikki', 'names_in_meeting': ['Nikki', 'Klaus', 'Paulana']},
              {'input_name': 'Chris', 'expected_name': 'Christian', 'names_in_meeting': ['Christian', 'Klaus', 'Niklas']},
              {'input_name': 'Christian', 'expected_name': 'Chris', 'names_in_meeting': ['Chris', 'Klaus', 'Niklas']},
              {'input_name': 'Robert', 'expected_name': 'Rob3ert', 'names_in_meeting': ['Rob3ert', 'Klaus', 'Roberta']},
              {'input_name': 'Otto', 'expected_name': '0tt0', 'names_in_meeting': ['0tt0', 'Klaus', 'Seid']},
              {'input_name': 'Robert Johanson', 'expected_name': 'Robert', 'names_in_meeting': ['Robert', 'Klaus', 'Seid']},
              {'input_name': 'Robert', 'expected_name': 'Robert Johanson', 'names_in_meeting': ['Robert Johanson', 'Klaus', 'Seid']},
            ];
            
    var output_data_arr = []
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
      matches_ratings.reverse();

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
    input_data_arr.forEach(test => evaluateTest(test));

    console.log(output_data_arr)
  });
};
module.exports.string_similarity_test = string_similarity_test;
