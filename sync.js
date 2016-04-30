var request = require('request');

var central = 'https://raw.githubusercontent.com/freifunk/directory.api.freifunk.net/master/directory.json';

var ffcities = {};
if(process.env.NODE_ENV === 'development')console.log("Get JSON for: "+central);

request(central, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        ffcities = JSON.parse(body);
    }else{
        ffcities = {};
    }

    Object.keys(ffcities).forEach(function(key) {
    var url = ffcities[key];

        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                ffcity = JSON.parse(body);
            }else{
                ffcity = {};
            }

            savetoDB(ffcity);
        });
    });

});

var savetoDB = function(ffcity){
    var location = ffcity.location;
    var contact = ffcity.contact;
    var state = ffcity.state;
    var feeds = ffcity.feeds;
    var nodeMaps = ffcity.nodeMaps;
    var techDetails = ffcity.techDetails;
    var apiVersion = ffcity.api;
};