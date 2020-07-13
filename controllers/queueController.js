const PouchDB = require('pouchdb-browser');

// PouchDB is viewable in dev tools 
// Navigate to Application -> IndexedDB -> name of database
var db = new PouchDB('sample database');

// server db not configured yet
var remoteCouch = false;

// adds entry to db
function add(){
var id = Math.round(Math.random() * 100000);
var QR_code = null;
var today = new Date();
var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();//maybe manully type in the time

var voter = {
    _id: id,
    QR: QR_code,
    time_entered: time,
    completed: false,
    time_left:null
};
db.put(voter, function callback(err, result) {
    if (!err) {
      console.log('Successfully put a voter in line');
    }
 });
}

// removes an entry from db
function remove(){

}

// updates a single entry
function update(){

}

// returns all db entries
function listAll(){

}

// return one entry
function find(){

}