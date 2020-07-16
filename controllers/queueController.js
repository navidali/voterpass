const PouchDB = require('pouchdb-browser');
PouchDB.plugin(require('pouchdb-find'));

// PouchDB is viewable in dev tools 
// Navigate to Application -> IndexedDB -> name of database
const localDB = new PouchDB('mylocaldb');
const remoteDB = new PouchDB('http://navidali:navid786@127.0.0.1:5984/myremotedb'); // example couchdb server http://user:password@127.0.0.1:5984/database_name
let voters = [];
let eta = 24;

// adds entry to db
function addVoter(){
    var today = new Date();
    localDB.put({
            _id: today.toISOString(),
            voterName: Math.floor(Math.random() * 1000000000),
            time_enter: today.toLocaleTimeString(),
            time_return: new Date(new Date().getTime() + eta * 60000).toLocaleTimeString()   // manually setting 24 min ahead
    }).then(function(result) {
        console.log("new entry recorded");
        eta += 24;
    }).catch(function(err) {
        console.log(err);
    });
}

// removes an entry from db
function removeVoter(name){
    var ddoc = {
        _id: '_design/index',
        views: {
          index: {
            map: function mapFun(doc) {
              if (doc.voterName) {
                emit(doc.voterName);
              }
            }.toString()
          }
        }
      }
      
      // save the design doc
      localDB.put(ddoc).catch(function (err) {
        if (err.name !== 'conflict') {
          throw err;
        }
        // ignore if doc already exists
      }).then(function () {
        // find docs where title === 'Lisa Says'
        return localDB.query('index', {
          key: name,
          include_docs: true
        });
      }).then(function (result) {
        console.log("removed doc");
        return localDB.remove(result.rows[0].doc);
      }).catch(function (err) {
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
        fields: ['_id', 'voterName','time_enter', 'time_return', '_rev']
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
function setVoters(){
    localDB.allDocs({
        include_docs: true,
        startkey: "9",
        endkey: "0",
        descending: true
    }).then(function (result) {
        voters = result.rows;
        console.log(result.rows);
    }).catch(function (err) {
        console.log(err);
    });
}

function getVoters(){
    setVoters();
    return voters;
}

function remove(name){
    var ddoc = {
        _id: '_design/index',
        views: {
          index: {
            map: function mapFun(doc) {
              if (doc.voterName) {
                emit(doc.voterName);
              }
            }.toString()
          }
        }
      }
      
      // save the design doc
      localDB.put(ddoc).catch(function (err) {
        if (err.name !== 'conflict') {
          throw err;
        }
        // ignore if doc already exists
      }).then(function () {
        // find docs where title === 'Lisa Says'
        return localDB.query('index', {
          key: name,
          include_docs: true
        });
      }).then(function (result) {
        console.log(result.rows[0].doc);
        return localDB.remove(result.rows[0].doc);
      }).catch(function (err) {
        console.log(err);
      });
}

function drawTable() {
    const tbody = document.querySelector("tbody");
    localDB.allDocs({
        include_docs: true,
        startkey: "0",
        endkey: "9",
        //descending: true
    }).then(function (result) {
        if (result.rows.length != 0){
            result.rows.forEach( voter => {
                let row = tbody.insertRow();
                let name = row.insertCell(0);
                name.innerHTML = voter.doc.voterName;
                let time_enter = row.insertCell(1);
                time_enter.innerHTML = voter.doc.time_enter;
                let time_return = row.insertCell(2);
                time_return.innerHTML = voter.doc.time_return;
            
            });
        }
        voter = result.rows;
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