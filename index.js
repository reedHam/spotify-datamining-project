var SpotifyWebApi = require("spotify-web-api-node");
var fs = require("fs");

// pull the clientSecret from an gitignored file 
var clientSecret = fs.readFileSync("clientSecret.txt", 'utf8'); 

var spotifyApi = new SpotifyWebApi({
    clientId : 'f58828e1e3e044989aef82999ced5027',
    clientSecret : clientSecret
});

