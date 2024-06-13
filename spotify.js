const SpotifyWebApi = require('spotify-web-api-node');


class Spotify {

  constructor({clientId, clientSecret}) {
    const scopes = ['user-read-private', 'playlist-read-private'],
      redirectUri = 'https://ProjectSpotifyMaximeLMerwanC.maximelouward.repl.co/spotify',
      clientId = clientId,
      clientSecret = clientSecret;

    this.spotifyApi = new SpotifyWebApi({
      redirectUri: redirectUri,
      clientId: clientId,
      clientSecret: clientSecret
    });

    // Create the authorization URL and send it via Messenger
    const authorizeURL = this.spotifyApi.createAuthorizeURL(scopes);
    this.loginUrl = authorizeURL;
    console.log(authorizeURL);
  }

  isAuthTokenValid() {
    if (this.auth == undefined || this.auth.expires_at == undefined) {
      return false;
    }
    else if (this.auth.expires_at < new Date()) {
      return false;
    }
    return true;
  }

  async receivedAuthCode(authCode) {
    const authFlow = await this.spotifyApi.authorizationCodeGrant(authCode);
    this.auth = authFlow.body;
    // Note the expiry time so that we can efficiently refresh the tokens
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + authFlow.body.expires_in);
    this.auth.expires_at = expiresAt;

    // Provide the Spotify library with the tokens
    this.spotifyApi.setAccessToken(this.auth.access_token);
    this.spotifyApi.setRefreshToken(this.auth.refresh_token);
    console.log(this.auth);

    // Perform other start-up tasks, now that we have access to the api
    this.initialized();
  }

  async initialized() {
    const playlists = [];

    const limit = 50;
    let offset = -limit;
    let total = 0;

    // Download all playlists from Spotify
    do {
      offset += limit;
      let result;
      try {
        result = await this.spotifyApi.getUserPlaylists(undefined, { offset: offset, limit: 50 });
        total = result.body.total;
        const subset = result.body.items.map((playlist) => {
          return { link: playlist.external_urls.spotify, tracks_url: playlist.tracks.href, name: playlist.name, image: playlist.images.slice(-2)[0].url };
        });
        playlists.push(...subset);
      } catch (err) {
        console.log(err);
        return;
      }
    } while ((offset + limit) < total);

    this.playlists = playlists;
    console.log("Spotify is ready!");
  }
  
  async refreshAuthToken() {
    const result = await this.api.refreshAccessToken();

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + result.body.expires_in);
    this.settings.auth.access_token = result.body.access_token;
    this.settings.auth.expires_at = expiresAt;

    this.api.setAccessToken(result.body.access_token);
  }

}

module.exports = Spotify;