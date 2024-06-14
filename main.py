import flask
from flask import Flask, request, jsonify

import recommend as rc


app = Flask('app')


@app.route('/')
def index():
  return jsonify({'error' : 'GET request not available here'})


@app.route('/post-songs', methods=['POST'])
def get_items():
    if not request.json:
        flask.abort(400)
    playlist_url = request.json
    print("Received playlist url:", playlist_url)
    tracks = rc.get_tracks_from_playlist(playlist_url)
    # Run recommendation algorithm and return top 10 tracks
    output_songs = rc.recommend_songs(tracks, 10)
    return jsonify(output_songs)


app.run(host='0.0.0.0', port=8080)
