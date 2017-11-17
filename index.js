var SpotifyWebApi = require("spotify-web-api-node");
var _ = require("lodash");
var bb = require("bluebird");
var fs = require("fs");

// pull the clientSecret from an gitignored file 
var clientSecret = fs.readFileSync("clientSecret.txt", 'utf8'); 

var spotifyApi = new SpotifyWebApi({
    clientId : 'f58828e1e3e044989aef82999ced5027',
    clientSecret : clientSecret
});


var trackJSON = [];
var genres = ["Metal", "pop", "folk", "country", "rock", "hip hop", "reggae", "jazz", "edm", "classical", "blues", "indie", "r&b", "alterative rock", "rap"]; // array of genres to loop through // TODO add genres
// Retrieve access token from SpotifyWebApi endpoint
spotifyApi.clientCredentialsGrant().then(function(data){
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    spotifyApi.setAccessToken(data.body['access_token']); // save access token to api object 
    var searches = [];
    // Query spotify servers for songs by genre
    genres.forEach(genre => {
        searches.push(spotifyApi.searchTracks("genre:" + genre, {limit : 10}).then(function(data){ 
            data.body.tracks.items.forEach(element => {
                trackJSON.push({
                    name: nameArrayifyer(element.name),
                    popularity: popCat(element.popularity),
                    genre: "genre: " + genre
                });
            });
        }, function(err){
            console.log("an error occurred while querying", err);
        }));
    });
    
    bb.all(searches).done(function(){
        console.log("Length with duplicates: " + trackJSON.length);
        
        trackJSON = _.uniqWith(trackJSON, _.isEqual); // remove duplicate search values

        fs.writeFile("./JSON/tracks.json", JSON.stringify(trackJSON), function(err){
            if (err) {return console.log("an error occurred while writing JSON file:", err)}
            console.log("successfully wrote JSON array of " + trackJSON.length + " length.");
        });
    });

}, function(err){
    console.log('Something went wrong when retrieving an access token', err);
});

// categorizes data popular data for better frequent pattern matching
function popCat(popularity){
    if (popularity > 90){
        return "most popular (90 - 100)";
    } else if (popularity > 80){
        return "very popular (80 - 90)"
    } else if (popularity > 70){
        return "fairly popular (70 - 80)"
    } else if (popularity > 60){
        return "somewhat popular (60 - 70)"
    }  else if (popularity > 50){
        return "popular (50 - 60)"
    }  else {
        return "not very popular (0 - 50)"
    }
}

// removes punctuation and splits the name strings into arrays
function nameArrayifyer(name){
    name = name.toLowerCase();
    name = name.replace(" -", ""); // remove extraneous hyphens e.g. "data-mining" will keep the hyphen but not "rocky - radio edit"
    name = name.replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,.\/:;<=>?@\[\]^_`{|}~]/g,""); // replace all punctuation besides -
    return name.split(/[ ,]+/); // splits the string into an array on space or comma
}


