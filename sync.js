const request = require('request');
const jsonschema = require('jsonschema');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const winston = require('winston');

const mongodb = 'mongodb://localhost:27017/fffinder';
const central = 'https://raw.githubusercontent.com/freifunk/directory.api.freifunk.net/master/directory.json';


const getCentralList = function getCentralList() {
    if(process.env.NODE_ENV !== 'production')winston.info("Get JSON for: "+central);
    const centralListPromise = new Promise((resolve, reject) => {
        request(central, function (error, response, body) {
            let ffcities = {};
            if (!error && response.statusCode == 200) {
                ffcities = JSON.parse(body);
            }else{
                winston.error(`An error occured when calling ${central}`, error);
                return reject(error);
            }
            return resolve(ffcities);
        });
    });
    return centralListPromise;
};

const getSingleFFCity = function getSingleFFCity(ffcities) {
    winston.info(`Retrieve all cities: ${Object.keys(ffcities).length}`);
    const cityPromises = [];
    let i = 0;
    Object.keys(ffcities).forEach(function(key) {
        if(i < 3) {
            i += 1;
            const url = ffcities[key];

            const cityPromise = new Promise((resolve, reject) => {
                request(url, function (error, response, body) {

                    ffcity = {};
                    if (!error && response.statusCode == 200) {
                        ffcity = JSON.parse(body);
                    } else {
                        winston.error(`An error occured when calling ${url}`, error);
                        return reject(error);
                    }

                    ffcity["dir_name"] = this.key;
                    return resolve(ffcity);
                    //parseFFCity(ffcity);
                }.bind({key:key}));
            });
            cityPromises.push(cityPromise);
        }
    });

    const allPromise = Promise.all(cityPromises.map(p => p.catch(e => e)));
    return allPromise;
};


const getNodeMaps = function (ffcities) {
    winston.info(`Retrieve all nodemaps for cities [${ffcities.length}]`);
    const nodemapsPromise = new Promise((resolve, reject) => {

        const nodemapsPromiseCollection = [];
        ffcities.forEach((ffcity) => {
            let nodeMaps = ffcity.nodeMaps;
            if(nodeMaps === undefined){
                winston.error(new Error(`No nodemap defined for ${ffcity.name}.`));
                nodeMaps = [];
            }

            nodeMaps.forEach(function(nodeMap) {
                const nodemapPromise = new Promise((resolve, reject) => {
                    request(nodeMap.url, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            // const validate = jsonschema.validate;
                            try{
                                nodes = JSON.parse(body);
                            }catch (error){
                                return reject(error);
                            }

                        } else{
                            return reject(error);
                        }

                        if(nodes.nodes != undefined){
                            if(!ffcity.nodes)ffcity.nodes = [];
                            ffcity.nodes.push(nodes);
                            winston.info("Loaded Nodes for: "+ffcity.dir_name);
                            // writeToDB(ffcity, nodes);
                            return resolve(ffcity);
                        }
                        return reject(`No nodes found: ${ffcity.dir_name}`);
                    });
                });
                nodemapsPromiseCollection.push(nodemapPromise);
            });
        });
        return resolve(Promise.all(nodemapsPromiseCollection.map(p => p.catch(e => e))));
    });
    return nodemapsPromise;
};



const writeToDB = function (ffcities) {
    MongoClient.connect(mongodb, function(err, db) {
        assert.equal(null, err);
        const collection = db.collection('fffinder_nodes', function(err, collection) {});
        collection.createIndex( { "createdAt": 1 }, { expireAfterSeconds: 86400 } );

        const updatedDocs = 0;
        const citydocs = [];
        ffcities.forEach((ffcity) => {
            if(ffcity.nodes !== undefined && Array.isArray(ffcity.nodes)) {
                for (let a = 0; a < ffcity.nodes.length; a++){
                    const nodeArray = ffcity.nodes[a];
                    for (let i = 0; i < nodeArray.nodes.length; i++){
                        const node = nodeArray.nodes[i];
                        const nodecityinfo = {"dir_name": ffcity.dir_name};
                        node["ffcity"] = nodecityinfo;
                        node["createdAt"] = new Date();

                        const updateCommand = {
                            updateOne: {
                                "filter": {
                                    ffcity: {
                                        dir_name: node.ffcity.dir_name
                                    },
                                    id: node.id
                                },
                                "update": {$set: node},
                                "upsert": true,
                                "writeConcern": {w:1}
                            }
                        };

                        citydocs.push(updateCommand);
                        /*collection.updateOne({
                         ffcity: {
                         dir_name: node.ffcity.dir_name
                         },
                         id: node.id},
                         {$set:node},
                         {upsert:true, w:1},
                         function(err, result) {
                         updatedDocs = updatedDocs+1;
                         if(updatedDocs==nodes.nodes.length){
                         db.close();
                         winston.info("Wrote Nodes to MongoDB: "+ffcity.dir_name);
                         }
                         });*/
                    }
                }
            }

        });

        const bw = collection.bulkWrite(citydocs);
        winston.info(bw);
        winston.info("Wrote Nodes to MongoDB: "+ffcity.dir_name);

    });
};


const centralList = getCentralList();
centralList
    .then(getSingleFFCity)
    .then(getNodeMaps)
    .then(writeToDB)
    .then((result) => {
        winston.info(result);
    })
    .catch((error) => {
        winston.error(error);
    });

