var request = require('request'),
    jsonschema = require('jsonschema');

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
            ffcity.dir_name = key;
            parseFFCity(ffcity);
        });
    });

});

var parseFFCity = function(ffcity){

    var nodeMaps = ffcity.nodeMaps;
    if(nodeMaps!=undefined){
        parseNodeMap(nodeMaps, ffcity);
    }

};

var parseNodeMap = function (nodeMaps, ffcity) {

    nodeMaps.forEach(function(nodeMap) {
        request(nodeMap.url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var validate = jsonschema.validate;
                try{
                    nodes = JSON.parse(body);
                }catch (error){
                    nodes = {};
                }

            }else{
                nodes = {};
            }
            if(nodes.nodes != undefined){
                console.log(ffcity.dir_name);
                writeToDB(ffcity, nodes);
            }
        });
    });
};

var writeToDB = function (ffcity, nodes) {

};