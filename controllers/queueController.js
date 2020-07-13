const PouchDB = require('pouchdb-browser');
PouchDB.plugin(require('pouchdb-find'));

// PouchDB is viewable in dev tools 
// Navigate to Application -> IndexedDB -> name of database
var localDB = new PouchDB('mylocaldb');

// server db not configured yet
var remoteDB = new PouchDB('http://user:password@127.0.0.1:5984/database'); // example couchdb server http://user:password@127.0.0.1:5984/database_name

// adds entry to db
function addVoter(name){
    localDB.put({
            _id: new Date().toISOString(),
            voterName: name
    }).then(function(result) {
        console.log("new entry recorded");
    }).catch(function(err) {
        console.log(err);
    });
}

// removes an entry from db
function removeVoter(name){

    localDB.createIndex({
        index: {fields: ['voterName']}
    });

    localDB.find({
        selector: {voterName: name},
        fields: ['_id', 'voterName', '_rev']
    }).then(function (result) {
        return localDB.remove(result.docs[0]);
    }).then(function(result){
        console.log("voter was removed from queue");
    }).catch(function(err){
        console.log(err);
    });
}

// updates name of entry 
function updateVoterName(oldName, newName){

    localDB.createIndex({
        index: {fields: ['voterName']}
    });

    localDB.find({
        selector: {voterName: oldName},
        fields: ['_id', 'voterName', '_rev']
    }).then(function (result) {
        return localDB.put({
           _id: result.docs[0]._id,
           voterName: newName,
           _rev: result.docs[0]._rev
        });
        console.log(result);
    }).then(function(result){
        console.log("voter name was updated");
    }).catch(function(err){
        console.log(err);
    });
}

// returns all db entries
function listAllVoters(){
    localDB.allDocs({
        include_docs: true,
        descending: true
    }).then(function(result) {
        console.log(result);
    }).catch(function (err) {
        console.log(err);
    });
}

// currently live two-way sync of databases
localDB.sync(remoteDB, {
    live: true,
    retry: true
  }).on('change', function (change) {
    // yo, something changed!
  }).on('paused', function (info) {
    // replication was paused, usually because of a lost connection
  }).on('active', function (info) {
    // replication was resumed
  }).on('error', function (err) {
});