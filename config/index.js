'use strict';

if (process.env.NODE_ENV === 'production') {
  console.log('env')
  module.exports = {
    FB: {
      pageAccessToken: process.env.pageAccessToken,
      VerifyToken: process.env.VerifyToken,
      appSecret: process.env.appSecret
    },
    Spotify: {
      clientId: process.env.clientId,
      clientSecret: process.env.clientSecret
    }
  }
} else {
  console.log('noenv');
}