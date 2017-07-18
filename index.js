var express = require('express');
var app = express();
var mm = require('music-metadata')
var fs = require('fs');
var firebase = require("firebase");
var config = {
   apiKey: "AIzaSyAasuPpwOGW5rpIAB69Ng0YtcKYEXkQVFY",
   authDomain: "radiointeractiva-9a96d.firebaseapp.com",
   databaseURL: "https://radiointeractiva-9a96d.firebaseio.com",
   projectId: "radiointeractiva-9a96d",
   storageBucket: "radiointeractiva-9a96d.appspot.com",
   messagingSenderId: "946787529311"
};

firebase.initializeApp(config);
var db = firebase.database();

const dirSongs = '/etc/ices2/music/';

function promiseParseStream(){
  return new Promise((resolve, reject) => {
    var arraySongs = [];
    new Promise((resolve, reject) => {
      dir = fs.readdirSync(dirSongs);
      dir.forEach((file, i, array) => {
        var oggData   = fs.createReadStream(dirSongs+file);
        new Promise((resolve, reject) => {
          mm.parseStream(oggData, {duration: true, native: true}, (err, metadata, underlayingAudioStream) => {
            // important note, the stream is not closed by default. To prevent leaks, you must close it yourself
            oggData.close();
            if (err) throw err;
            var song = {
              "artist" : metadata['common']['artists'],
              "title" : metadata['common']['title'],
              "album" : metadata['common']['album'],
              "year" : metadata['common']['year'],
              "duration" : metadata['common']['duration']
            }
            resolve(song);
          });
        }).then((song)=>{
          arraySongs.push(song);
          if(i == array.length-1){
            resolve(arraySongs);
          }
        });
      });
    }).then((arraySongs) => {
      resolve(arraySongs);
    });
  });
}

function updateSongs(arraySongs){
  return new Promise((resolve, reject)=>{
    // var query = db.ref('active-emission/').orderByChild('nominated').equalTo(true);

    // query.once("value", snapshots => {
    //   resolve(snapshots.val());
    // });
    console.log('OK');
    var arrayVacio = [];
    // db.ref('songs/').set(arrayVacio);
    for(var i=0;i<arraySongs.length;i++){
      console.log('song '+i);
      console.log(arraySongs[i]);
      db.ref('database/songs/').push(arraySongs[i]);
    }
    resolve(arraySongs);
  });
}

function promiseParseStreamMock(){
  return new Promise((resolve, reject) => {
    var arraySongs = [];
    new Promise((resolve, reject) => {
      for(i=0;i<10;i++){
        var song = {
          "artist" : 'Artista '+i,
          "title" : 'Ese titulo '+i,
          "album" : 'Verano '+i,
          "year" : '200'+i,
          "duration" : '182'
        }
        arraySongs.push(song);
      }
      resolve(arraySongs);
    }).then((arraySongs) => {
      resolve(arraySongs);
    }).catch((err)=>{
      console.log(err);
    });;
  });
}

app.get('/songs', function (req, res) {
  promiseParseStreamMock().then((arraySongs)=>{
    updateSongs(arraySongs).then((result)=>{
      console.log(result);
      res.send(result);
    }).catch((err)=>{
      console.log(err);
    });
  }).catch((err)=>{
    console.log(err);
  });
});

app.listen(3010, function () {
  console.log('API Songs ejecutándose en el puerto 3010...');
});
