var request = require('request'),
    jsonschema = require('jsonschema'),
    MongoClient = require('mongodb').MongoClient,
    assert = require('assert');

var mongodb = 'mongodb://localhost:27017/fffinder';
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

            ffcity = {};
            if (!error && response.statusCode == 200) {
                ffcity = JSON.parse(body);
            }

            ffcity["dir_name"] = this.key;
            parseFFCity(ffcity);
        }.bind({key:key}));
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
                console.log("Loaded Nodes for: "+ffcity.dir_name);
                writeToDB(ffcity, nodes);
            }
        });
    });
};

var writeToDB = function (ffcity, nodes) {

    MongoClient.connect(mongodb, function(err, db) {
        assert.equal(null, err);
        var collection = db.collection('fffinder_nodes', function(err, collection) {});
        collection.createIndex( { "createdAt": 1 }, { expireAfterSeconds: 86400 } );

        var updatedDocs = 0;
        for (var i = 0; i < nodes.nodes.length; i++){
            var node = nodes.nodes[i];
            var nodecityinfo = {"dir_name": ffcity.dir_name};
            node["ffcity"] = nodecityinfo;
            node["createdAt"] = new Date();


            collection.updateOne({
                ffcity: {
                    dir_name: node.ffcity.dir_name
                },
                id: node.id},
                node,
                {upsert:true, w:1},
                function(err, result) {
                    updatedDocs = updatedDocs+1;
                    if(updatedDocs==nodes.nodes.length){
                        db.close();
                        console.log("Wrote Nodes to MongoDB: "+ffcity.dir_name);
                    }
                });
        }

    });
};