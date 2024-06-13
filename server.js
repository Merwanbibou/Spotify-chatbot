'use strict';

require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const FBeamer = require('./fbeamer');
const Spotify = require('./spotify.js');
const config = require('./config');
const f = new FBeamer(config.FB);
const spotify = new Spotify(config.Spotify);
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json())

//Home page
app.get('/', (_, res) => res.send('Hello, World!'));

// facebook bot endpoint for registering hook
app.get('/fb', (req, res) => f.registerHook(req, res));

// facebook bot endpoint for handling post requests
app.post('/fb', (req, res) => {
  return f.incoming(req, res, async data => {
    try {
      // message = Connect: send spotify connect url
      if (data.content === 'Connect') {
        await f.txt(data.sender, 'Hello, please login with your spotify account to continue:');
        await f.txt(data.sender, spotify.loginUrl);
      }
      else if (data.content === 'Playlists') {
        await f.txt(data.sender, 'Here are your 10 latest playlists:');
        await f.carrousel(data.sender, spotify.playlists);
      }
      else if (data.pb) {
        const urlPlaylistChosen = data.pb.payload;
        // POST request to our Python server
        const recommendedSongs = await getSongsFromPlaylist(urlPlaylistChosen);
        // Send recommended songs to user
        console.log('songs', recommendedSongs);
        //for (song of recommendedSongs) {
        //  f.txt(song);
        //}
      }
      //else
      //  await f.txt(data.sender, "I didn't understand");
    } catch (e) {
      console.log(e);
    }
  })
});

app.get("/spotify", (req, res) => {
  console.log(req.body)
  spotify.receivedAuthCode(req.query.code);
  res.status(200).send();
});

app.get("/me", (req, res) => {
  console.log(req);
});
 
async function getSongsFromPlaylist(payload) {
  return await fetch('https://APISpotifyRecommendation.maximelouward.repl.co/post-songs',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })
  .then(response => { return response.json() })
  .then(data => { return data })
  .catch(err => { console.log(err) });
}

app.listen(PORT, () => console.log(`The bot server is running on port ${PORT}`));