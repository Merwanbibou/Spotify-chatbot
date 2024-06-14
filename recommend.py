import os
from collections import defaultdict

import numpy as np
import pandas as pd
import requests
import spotipy
from dotenv import load_dotenv
from scipy.spatial.distance import cdist
from sklearn.cluster import KMeans
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from spotipy.oauth2 import SpotifyClientCredentials


load_dotenv()
CLIENT_SECRET = os.environ['CLIENT_SECRET']
CLIENT_ID = os.environ['CLIENT_ID']

sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
    client_id=os.environ["CLIENT_ID"], client_secret=os.environ["CLIENT_SECRET"]))


# load dataset
spotify_data = pd.read_csv('data.csv')
# drop features that we do not want to use for prediction
spotify_data.drop(columns=['duration_ms', 'key',
                           'mode', 'explicit'], inplace=True)


song_cluster_pipeline = Pipeline([('scaler', StandardScaler()),
                                  ('kmeans', KMeans(12))], verbose=True)
X = spotify_data.select_dtypes(np.number)
song_cluster_pipeline.fit(X)

song_cluster_labels = song_cluster_pipeline.predict(X)

spotify_data['cluster_label'] = song_cluster_labels




# get list of tracks from a playlist
def get_tracks_from_playlist(url):
    # Get playlists from spotify
    AUTH_URL = 'https://accounts.spotify.com/api/token'
    # POST request to get auth token
    print("sending request to spotify api")
    auth_response = requests.post(AUTH_URL, {
        'grant_type': 'client_credentials',
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
    })
    auth_response_data = auth_response.json()
    # save the access token
    access_token = auth_response_data['access_token']

    # get list of tracks from playlist
    playlist = requests.get(
        url, headers={'Authorization': 'Bearer {token}'.format(token=access_token)})
    with open('test.json', 'w+') as f:
      f.write(playlist.text)
    tracks = []
    for item in playlist.json()['items']:
        tracks.append({'name': item['track']['name'], 'year': int(
            item['track']['album']['release_date'].split('-')[0])})
    return tracks



def find_song(name, year):
    song_data = defaultdict()
    results = sp.search(q='track: {} year: {}'.format(name,
                                                      year), limit=1)
    if results['tracks']['items'] == []:
        return None

    results = results['tracks']['items'][0]

    track_id = results['id']
    audio_features = sp.audio_features(track_id)[0]

    song_data['name'] = [name]
    song_data['year'] = [year]
    song_data['explicit'] = [int(results['explicit'])]
    song_data['duration_ms'] = [results['duration_ms']]
    song_data['popularity'] = [results['popularity']]

    for key, value in audio_features.items():
        song_data[key] = value

    return pd.DataFrame(song_data)


number_cols = ['valence', 'year', 'acousticness', 'danceability', 'energy',
               'instrumentalness', 'liveness', 'loudness', 'popularity', 'speechiness', 'tempo'] 


def get_song_data(song, spotify_data):
    try:
        song_data = spotify_data[(spotify_data['name'] == song['name'])
                                 & (spotify_data['year'] == song['year'])].iloc[0]
        return song_data

    except IndexError:
        return find_song(song['name'], song['year'])


def get_mean_vector(song_list, spotify_data):
    song_vectors = []

    for song in song_list:
        song_data = get_song_data(song, spotify_data)
        if song_data is None:
            print('Warning: {} does not exist in Spotify or in database'.format(
                song['name']))
            continue
        song_vector = song_data[number_cols].values
        song_vectors.append(song_vector)

    song_matrix = np.array(song_vectors, dtype=object)
    return np.mean(song_matrix, axis=0)


def recommend_songs(song_list, n_songs=10):
    print("finding recommended songs...")
    song_center = get_mean_vector(song_list, spotify_data)
    scaler = song_cluster_pipeline.steps[0][1]
    scaled_data = scaler.transform(spotify_data[number_cols])
    scaled_song_center = scaler.transform(song_center.reshape(1, -1))
    distances = cdist(scaled_song_center, scaled_data, 'cosine')
    
    # Prevent same songs to be in double (some are on different albums)
    # We take the 10 first different songs
    already_in = set()
    indexes = []
    for idx in np.argsort(distances)[0]:
      print(spotify_data.iloc[idx]['name'])
      if spotify_data.iloc[idx]['name'] in already_in:
        continue
      already_in.add(spotify_data.iloc[idx]['name'])
      indexes.append(idx)
      if len(indexes) == 10:
        break

    rec_songs = spotify_data.iloc[indexes]
    rec_songs = rec_songs[['id']]
    return rec_songs.to_dict(orient='records')
