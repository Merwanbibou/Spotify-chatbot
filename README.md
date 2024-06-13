### Maxime Louward, Merwan Chelouah

## Usage

1. Run the Python API `main.py` file.
2. Run this replit.
3. Wait about 20-40 seconds for the KMeans model to complete. It should indicate completion in the console of the other replit.
4. In Messenger, send a message to our chatbot like 'Hey', 'Hi', 'hello'...
5. Follow the instructions; it should be clear how to proceed. To log in to Spotify, you can use your account if you have one or create a new one
6. Once you choose a playlist, it should take about 10-15 seconds to run, depending on the length of the playlist.
7. You can click on one of the recommended songs to open it in Spotify and listen to it directly.

## Details

### Node.js Side

#### General Info

We use the Messenger API as an interface for our chatbot. The code for this API is in `fbeamer/index.js`, which includes how to connect to the API, send text messages, and send template messages containing images and lists. We also use the `spotify-web-api-node` module to easily connect and authenticate with the Spotify API and make requests to it.

#### Workflow

- `server.js` exposes multiple endpoints used by the different APIs.
  - The `/fb` endpoint is used by the Facebook API to receive user input and send back data.
  - The `/spotify` endpoint is used by the Spotify API to authenticate (necessary).

When a message is received, there are multiple options:

- **Message is a greeting:** We reply with basic instructions on how to use the bot.
- **Message is 'playlists' or 'music':** We get the 10 (Messenger limit size) latest playlists of a user if they are connected, or instruct them on how to connect.
- **Otherwise:** If we don't understand the message, we send "Sorry, I didn't understand 😞".

Once the user chooses a playlist and receives recommendations, they do not have to reconnect, and they can choose another playlist from the same carousel as before to get new recommendations.

### Python Side

We used Python to run our recommendation algorithm and serve the results as an API. The file `recommend.py` contains our KMeans clustering on our music dataset. The dataset contains multiple audio features of 175k Spotify tracks dating back to 1920 until now and can be found [here](#).

We used a subset of the audio features to create a model, mainly those that seemed to best represent music. Here is the list:

- Year of release
- Instrumentalness
- Acousticness
- Danceability
- Speechiness
- Popularity
- Energy
- Liveness
- Loudness
- Valence
- Tempo

When the Python server is launched, it generates the clusters from the dataset. We could also have generated it locally and saved it to a file for better performance, but since it only takes a few seconds, we didn't find it necessary. Also, with the current method, we can update the dataset with recent songs anytime and just relaunch the Python server. The function `recommend_songs` is the main part of the API. From a list of song names and years, it computes the cosine distance to every other song in the dataset and returns the top `n_songs` (by default 10, once again limited by Messenger) that have the lowest distance to the playlist.

The Python code serves as an API communicating with our Node.js code. In `server.js`, `getSongsFromPlaylist` makes a POST request containing the list of Spotify song IDs from the user's playlist and waits for the answer, the list of 10 recommended songs.
