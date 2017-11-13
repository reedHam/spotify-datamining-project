var SpotifyWebApi = require("spotify-web-api-node");
var _ = require("lodash");
var fs = require("fs");

// pull the clientSecret from an gitignored file 
var clientSecret = fs.readFileSync("clientSecret.txt", 'utf8'); 

var spotifyApi = new SpotifyWebApi({
    clientId : 'f58828e1e3e044989aef82999ced5027',
    clientSecret : clientSecret
});


var trackJSON = [];
var genres = ["pop"] // array of genres to loop through // TODO add genres
// Retrieve access token from SpotifyWebApi endpoint
spotifyApi.clientCredentialsGrant().then(function(data){
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    spotifyApi.setAccessToken(data.body['access_token']); // save access token to api object 

    // Query spotify servers for songs by genre
    spotifyApi.searchTracks("genre:" + genres[0], {limit : 10}).then(function(data){ // TODO loop through genres
        data.body.tracks.items.forEach(element => {
            trackJSON.push(new track(element.name, element.popularity, genres[0]))
        });
        trackJSON.forEach(element => { // DEBUG
            console.log(element);
        });
    }, function(err){
        console.log("an error occurred while querying", err);
    });



}, function(err){
    console.log('Something went wrong when retrieving an access token', err);
});

// creates a track object to store into the array
function track(name, popularity, genre){ // TODO Categorize popularity 
    this.name = nameArrayifyer(name);
    this.popularity = popularity;
    this.genre = genre;
}

// removes punctuation and splits the name strings into arrays
function nameArrayifyer(name){
    name = name.replace(" -", ""); // remove extraneous hyphens e.g. "data-mining" will keep the hyphen but not "rocky - radio edit"
    name = name.replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,.\/:;<=>?@\[\]^_`{|}~]/g,""); // replace all punctuation besides -
    return name.split(/[ ,]+/);
}

