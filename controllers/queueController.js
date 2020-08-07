const ZXing = require('@zxing/library');
const QRCode = require('qrcode');
const PouchDB = require('pouchdb-browser');
PouchDB.plugin(require('pouchdb-find'));


// PouchDB is viewable in dev tools 
// Navigate to Application -> IndexedDB -> name of database
const localDB = new PouchDB('mylocaldb');
const remoteDB = new PouchDB('http://localhost:5984/myremotedb');
remoteDB.info();
let queue = [];

if(localStorage.getItem('eta') === null)
  localStorage.setItem('eta', '12');

function generateId() {
  let S4 = () => {
     return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  };
  return (S4()+"-"+S4()+"-"+S4()+S4());
}

function generateReturnTime() {
  if (queue.length === 0)
    return (new Date().getTime() + localStorage.getItem("eta") * 60000);
  else{
    last = queue[queue.length-1];
    if(last.time_return < new Date().getTime()){
      return (new Date().getTime() + localStorage.getItem("eta") * 60000);
    }
    else{
      return (last.time_return + localStorage.getItem("eta") * 60000);
    }
  }
}

// adds entry to db
function addVoter(){
  var today = new Date();
  
  let obj = {
    _id: today.toISOString(),
      voter_id: generateId(),
      time_enter: today.getTime(),
      time_return: generateReturnTime()
    };
    queue.push(obj);
    localDB.put({
      _id: obj._id,
      voter_id: obj.voter_id,
      time_enter: obj.time_enter,
      time_return: obj.time_return
    }).then(function(result) {
      console.log("new entry recorded");
        console.log(result);
        
        //drawTable();
        addRow(obj);
      }).catch(function(err) {
        console.log(err);
    });
  }

function compareTime(time){
  var today = new Date().getTime();
  var diff = today - time;
  console.log('diff: ', diff);
  var expire = 5*60000;
  if (diff > expire) {
    return true;
  }
  return false;

}

function autoRemove() {
  let timer;
  for(let [index, item] of queue.entries()) {
    const boolean = compareTime(item.time_return);
    if(!boolean) break;

    $('#queue tr').each(function(i,j){     
      if(index === i) {
        $(j).css("background-color", "gray");
      }
    });
  }
  timer = setTimeout(() => {autoRemove()}, 10000)  // check every 10 second
}
autoRemove();
  
  
function drawTable() {
  let tbody =  document.querySelector("tbody");
  tbody.innerHTML = "";
  queue = [];
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
                queue.push(voter.doc);
              });
        }
      }).catch(function (err) {
        console.log(err);
    });

    document.getElementById('eta').innerText = localStorage.getItem('eta');
  }
  
function drawTicket() {
  queue = [];
  localDB.allDocs({
    include_docs: true,
    startkey: "0",
    endkey: "9",
  }).then(function(result){
    result.rows.forEach(voter => {
      queue.push(voter.doc);
    });

    let id = document.getElementById("voterId");
    id.innerHTML = "Voter ID: " + queue[queue.length - 1].voter_id;
  
    let canvas = document.getElementById("canvas");

    QRCode.toCanvas(canvas, "Voter_ID: " + queue[queue.length - 1].voter_id + " Return_By: " + new Date(queue[queue.length - 1].time_return).toLocaleTimeString(), function(error) {
      if(error)
        console.log(error);
      else
        console.log("Success!");
    });

    let message = document.getElementById("message");
    message.innerHTML = "Please Return By: " + new Date(queue[queue.length - 1].time_return).toLocaleTimeString();

  }).catch(function(err){
    console.log(err);
  });
}

function addRow(obj){
  let tbody = document.querySelector("tbody");
  let row = tbody.insertRow();
  let name = row.insertCell(0);
  name.innerHTML = obj.voter_id;
  let time_enter = row.insertCell(1);
  time_enter.innerHTML = new Date(obj.time_enter).toLocaleTimeString();
  let time_return = row.insertCell(2);
  time_return.innerHTML = new Date(obj.time_return).toLocaleTimeString();
}

function scan(){

  let video = document.getElementById('video');
  const codeReader = new ZXing.BrowserQRCodeReader();
  
  codeReader
  .decodeOnceFromVideoDevice(undefined, 'video')
  .then(result => {
    let id = result.text.split(" ", 4)[1];
    let voter = queue.find(function(element) {
      return element.voter_id === id;
    });
    if(voter)
      removeVoter(voter.voter_id);
    else
      console.log("voter has already been removed.");
    
    location.reload();
  }).catch(err => console.error(err));
}

// removes an entry from db
function removeVoter(id){          
  var ddoc = {
    _id: '_design/index',
    views: {
      index: {
        map: function mapFun(doc) {
          if (doc.voter_id) {
            emit(doc.voter_id);
          }
        }.toString()
      }
    }
  };

  // save the design doc
  localDB.put(ddoc).catch(function (err) {
    if (err.name !== 'conflict') {
      throw err;
    }
    // ignore if doc already exists
  }).then(function () {
    return localDB.query('index', {
      key: id,
      include_docs: true
    });
  }).then(function (result) {
    console.log("removed doc");
    localDB.remove(result.rows[0].doc);
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
