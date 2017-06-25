var express = require('express');
var app = express();
var audioMetaData = require('audio-metadata');
var mm = require('music-metadata')
var fs = require('fs');

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

app.get('/songs', function (req, res) {
  promiseParseStream().then((arraySongs)=>{
    res.send(arraySongs);
  });
});

app.listen(3000, function () {
  console.log('API Songs ejecutándose en el puerto 3000...');
});
