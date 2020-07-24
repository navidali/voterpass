const QRCode = require('qrcode')
const PouchDB = require('pouchdb-browser');
PouchDB.plugin(require('pouchdb-find'));

// PouchDB is viewable in dev tools 
// Navigate to Application -> IndexedDB -> name of database
const localDB = new PouchDB('mylocaldb');
const remoteDB = new PouchDB('http://localhost:5984/myremotedb');
let queue = [];
let eta = 24;
       
function generateId() {
  let S4 = () => {
     return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  };
  return (S4()+"-"+S4()+"-"+S4()+S4());
}

function generateReturnTime(eta) {
  if (queue.length === 0)
    return new Date().getTime();
  else{
    last = queue[queue.length - 1];
    return new Date(last.time_return + eta * 60000).getTime();
  }
}

function drawTicket() {
  localDB.allDocs({
    include_docs: true,
    startkey: "9",
    endkey: "0",
    descending: true,
    limit: 1
  }).then(function(result){
    let id = document.getElementById("voterId");
    id.innerHTML = "Voter ID: " + result.rows[0].doc.voter_id;

    let canvas = document.getElementById('canvas')
 
    QRCode.toCanvas(canvas, 'Voter ID: ' + result.rows[0].doc.voter_id + "\nReturn By: " + new Date(result.rows[0].doc.time_return).toLocaleTimeString(), function (error) {
      if (error) console.error(error)
        console.log('success!');
    });


    let message = document.getElementById("message");
    message.innerHTML = "Please Return By: " + new Date(result.rows[0].doc.time_return).toLocaleTimeString();

  }).catch(function(err){
    console.log(err);
  });   
}

// adds entry to db
function addVoter(eta){
    let today = new Date();
    let obj = {
      _id: today.toISOString(),
      voter_id: generateId(),
      time_enter: today.getTime(),
      time_return: generateReturnTime(eta)
    };

    localDB.put({
            _id: obj._id,
            voter_id: obj.voter_id,
            time_enter: obj.time_enter,
            time_return: obj.time_return
    }).then(function(result) {
        console.log("new entry recorded");
        console.log(result); 
        queue.push(obj);
        //addRow(obj)
    }).catch(function(err) {
        console.log(err);
    });
}

// removes an entry from db
/*
function removeVoter(name){          
  // find docs where title === 'Lisa Says'
  localDB.query('index', {
    key: name,
    include_docs: true
  }).then(function (result) {
    console.log("removed doc");
    return localDB.remove(result.rows[0].doc);
  }).catch(function (err) {
    console.log(err);
  });
}

function remove(time_enter){
  var ddoc = {
      _id: '_design/index',
      views: {
        index: {
          map: function (doc) {
            if (new Date() - new Date(doc.time_enter) ) {
              emit(doc.time_enter);
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
          key: time_enter,
          include_docs: true
        });
      }).then(function (result) {
        console.log(result);
        console.log(result.rows[0].doc);
        return localDB.remove(result.rows[0].doc);
      }).catch(function (err) {
        console.log(err);
      });
}
*/

//called on page refresh/load
function drawTable() {
    let tbody =  document.querySelector("tbody");
    tbody.innerHTML = "";
    localDB.allDocs({
        include_docs: true,
        startkey: "0",
        endkey: "9",
    }).then(function (result) {
        if (result.rows.length != 0){
            result.rows.forEach( voter => {
                let row = tbody.insertRow();
                let name = row.insertCell(0);
                name.innerHTML = voter.doc.voter_id;
                let time_enter = row.insertCell(1);
                time_enter.innerHTML = new Date(voter.doc.time_enter).toLocaleTimeString();
                let time_return = row.insertCell(2);
                time_return.innerHTML = new Date(voter.doc.time_return).toLocaleTimeString();
            });
        }
    }).catch(function (err) {
        console.log(err);
    });
}

// adds a tr element 
function addRow(obj) {
  let tbody =  document.querySelector("tbody");
  let row = tbody.insertRow();
  let name = row.insertCell(0);
  name.innerHTML = obj.voter_id;
  let time_enter = row.insertCell(1);
  time_enter.innerHTML = new Date(obj.time_enter).toLocaleTimeString();
  let time_return = row.insertCell(2);
  time_return.innerHTML = new Date(obj.time_return).toLocaleTimeString();
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
