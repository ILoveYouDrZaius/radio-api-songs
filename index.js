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
            console.log(metadata)
            if(metadata['common']['artists'] == null || metadata['common']['title'] == null || metadata['common']['album'] == null || metadata['common']['year'] == null || metadata['format']['duration'] == null){
              resolve('EmptySong');
            }else{
              var song = {
                "artist" : metadata['common']['artists'],
                "title" : metadata['common']['title'],
                "album" : metadata['common']['album'],
                "year" : metadata['common']['year'],
                "duration" : metadata['format']['duration'],
                "path" : dirSongs+file
              }
              resolve(song);
            }
          });
        }).then((song)=>{
          if(song == 'EmptySong'){
            console.log('Ha llegado una cancion sin datos');
          }else{
            arraySongs.push(song);
          }
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
    db.ref('database/songs').once('value').then((data)=>{
      keysToDelete = Object.keys(data.val());
      existeEnFirebase = false;
      arraySongs.forEach((songFile)=>{
        db.ref('database/songs').orderByChild('path').equalTo(songFile.path).once('value').then((data)=>{
          if(data.numChildren() == 0){
            db.ref('database/songs/').push(songFile);
          }else if(data.numChildren() == 1){
            data.forEach((song)=>{
              db.ref('database/songs/'+song.key).update({
                "artist" : songFile.artist,
                "title" : songFile.title,
                "album" : songFile.album,
                "year" : songFile.year,
                "duration" : songFile.duration
              });
            });
          }
        });
        data.forEach((songFirebase)=>{
          if(data.child(songFirebase.key).val().path == songFile.path){
            i = keysToDelete.indexOf(songFirebase.key);
            keysToDelete.splice(i, 1);
          }
        });
      });
      keysToDelete.forEach((keyToDelete)=>{
        db.ref('database/songs/'+keyToDelete).remove();
      })
    });
  });
}

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

app.get('/songs', function (req, res) {
  promiseParseStream().then((arraySongs)=>{
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
