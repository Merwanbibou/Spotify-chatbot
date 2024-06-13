const request = require ('request');
const apiVersion = 'v9.0';

class FBeamer {
  constructor({ pageAccessToken, VerifyToken, appSecret }) {
    try {
      this.pageAccessToken = pageAccessToken;
      this.verifyToken = VerifyToken;
      this.appSecret = appSecret;
    } catch (error) {
      console.log(error);
    }
  }

  registerHook(req, res) {
  const params = req.query;
  const mode = params['hub.mode'];
  const token = params["hub.verify_token"];
  const challenge = params["hub.challenge"];
  try {
    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log("webhook registered");
      return res.send(challenge);
    } else {
      console.log("Could not register webhook!");
      return res.sendStatus(200);
    }
  } catch (e) {
    console.log(e);
  }}

  // Middleware: verification to send back to facebook
  verifySignature(req, res, buf) {
    return (req, res, buf) => {
      if (req.method === 'POST') {
        try {
          const signature = req.query["x-hub-signature"];
          let tempo_hash = crypto.createHmac('sha1', '6deee808a13f595b0d2649caf9168ce3').update(buf, 'utf-8');
          return signature === tempo_hash;
        } catch (e) {
          console.log(e);
        }
      }
    }
  }

  // Process incoming messages and postbacks from fb or the user
  incoming(req, res, cb) {
    res.sendStatus(200);
    if (req.body.object === 'page' && req.body.entry) {
      let data = req.body;
      for (const entry of data.entry) {
        if (entry.messaging){
          for (const msg of entry.messaging){
            console.log(msg.message);
            if (msg.message)
              cb(this.messageHandler(msg));
            else if (msg.postback)
              cb(this.postbackHandler(msg));
          }
        }
      }
    }
  }

  // handle postbacks and return sender ID + postback data
  postbackHandler(obj) {
    if (obj.postback.payload) {
      const sender = obj.sender.id;
      const pb = obj.postback;
      return {
        sender,
        pb
        };
    } else {
      console.log("postbackHandler problem");
    }
  }

  // handle messages and return sender ID + message data
  messageHandler(obj) {
    const msg = obj.message;
    if (msg.nlp) {
      extract(msg.nlp)
        .then(movieData => {
          const message_response = `Movie ID: ${movieData.id}\nTitle: ${movieData.title}\nSummary: ${movieData.overview}\nRelease date: ${movieData.release_date}`;
          this.img(obj.sender.id, movieData.poster_path);
          this.txt(obj.sender.id, message_response);
        })
        .catch(err => {
          this.sendMessage({
            sender: obj.sender.id, 
            type: 'text',
            content: err})
        });
    }
    if (msg.text) {
      const sender = obj.sender.id;
      return {
        sender,
        type: 'text',
        content: msg.text
      };
    } else {
      console.log("messageHandler problem");
    }
  }

  // send a message to the user (image/txt/button)
  sendMessage(payload) {
    return new Promise((resolve, reject) => {
      request({
        uri: `https://graph.facebook.com/${apiVersion}/me/messages`,
        qs: {
          access_token: this.pageAccessToken
        },
        method: 'POST',
        json: payload
      }, (error, response, body) => {
        if (!error && response.statusCode === 200){
          resolve({
            mid: body.message_id
          });
        } else {
          reject(error);
        }
      })
    });
  }

  
  // generate text message payload
  txt(id, text, messaging_type="RESPONSE"){
    const obj = {
      messaging_type,
      recipient: {
        id
      },
      message: {
        text
      }
    };
    return this.sendMessage(obj);
  }

  carrousel(id, playlists) {
    let elements = [];
    const tmp = playlists.slice(0, 10);
    for (const playlist of tmp) {
      elements.push(
        {
          title: playlist.name,
          image_url: playlist.image,
          buttons: [{
            type: "postback",
            title: "Choose",
            payload: playlist.tracks_url
          }]
        }
      )
    }

    const obj = {
      recipient: {
        id
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: 'generic',
            elements
          }
        }
      }
    }
    return this.sendMessage(obj);
  }

}

module.exports = FBeamer;