var SpotifyWebApi = require("spotify-web-api-node");
var _ = require("lodash");
var fs = require("fs");

// pull the clientSecret from an gitignored file 
var clientSecret = fs.readFileSync("clientSecret.txt", 'utf8'); 

var spotifyApi = new SpotifyWebApi({
    clientId : 'f58828e1e3e044989aef82999ced5027',
    clientSecret : clientSecret
});

// Retrieve access token from SpotifyWebApi endpoint
spotifyApi.clientCredentialsGrant().then(function(data){
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    spotifyApi.setAccessToken(data.body['access_token']); // save access token to api object

    // Query spotify servers for songs by genre
    spotifyApi.searchTracks('genre:pop', {limit : 10}).then(function(data){
        data.body.tracks.items.forEach(element => {
            console.log("track found:", element.name);
        });
    }, function(err){
        console.log("an error occurred while querying", err);
    });

}, function(err){
    console.log('Something went wrong when retrieving an access token', err);
});


