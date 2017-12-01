
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

var searchIndex = 0;
var trackJSON = [];
var unPROCESSED = [];
var genres = ["Metal", "pop", "folk", "country", "rock", "hip hop", "reggae", "jazz", "edm", "classical", "blues", "indie", "r&b", "alterative rock", "rap"]; // array of genres to loop through // TODO add genres
var error = false;
preformSearch(searchIndex);

// this function preforms a batch of searches and recursively calls its self until the desired number of records is reached\
// Prams:
//      index: this is the page index that searches should start at
function preformSearch(index){
    let oldIndex = index;
    spotifyApi.clientCredentialsGrant().then(function(data){
        // Retrieve access token from SpotifyWebApi endpoint
        spotifyApi.setAccessToken(data.body['access_token']); // save access token to api object 
        var searches = [];
        // Query spotify servers for songs by genre
        while(index < (oldIndex + 2)){
            genres.forEach(genre => {
                searches.push(spotifyApi.searchTracks("genre:" + genre, {limit : 50, offset:(index*50)}).then(function(data){ 
                    data.body.tracks.items.forEach(element => {
                        //unPROCESSED.push(JSON.stringify(element));
                        trackJSON.push({
                            name: nameArrayifyer(element.name),
                            popularity: popCat(element.popularity),
                            genre: "genre: " + genre
                        });
                    });
                }, function(err){
                    error = true;
                    console.log("an error occurred while querying", err);
                }));
            });
            index++;
        }
        
        
        bb.all(searches).done(function(){
            console.log("Length with duplicates: " + trackJSON.length);

            if (trackJSON.length > 5000){
                trackJSON = _.uniqWith(trackJSON, _.isEqual); // remove duplicate search values
                fs.writeFile("./JSON/tracks.json", JSON.stringify(trackJSON), function(err){
                if (err) {return console.log("an error occurred while writing JSON file:", err)}
                console.log("successfully wrote JSON array of " + trackJSON.length + " length.");
                });
            } else {
                if (error) {
                    return delay(3000).then(function(){
                        preformSearch(index);
                    });
                } else {
                    return preformSearch(index);
                }
                
            }   
        });
     
    }, function(err){
        console.log('Something went wrong when retrieving an access token', err);
    });
}

function delay(t) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, t)
    });
 }

// categorizes data popular data for better frequent pattern matching
//  prams:
//      popularity: popularity of a track
// returns: the category a popularity falls into
function popCat(popularity){
    if (popularity >= 90){
        return "most popular (90 - 100)";
    } else if (popularity >= 80){
        return "very popular (80 - 89)"
    } else if (popularity >= 70){
        return "fairly popular (70 - 79)"
    } else if (popularity >= 60){
        return "somewhat popular (60 - 69)"
    }  else if (popularity >= 50){
        return "popular (50 - 59)"
    }  else if (popularity >= 40){
        return "not very popular (40 - 49)"
    }  else if (popularity >= 30){
        return "not popular (30 - 39)"
    } else {
        return "unpopular (>30)"
    }
}

// removes punctuation and splits the name strings into arrays
//  prams:
//      name: name of the track to split and remove punctuation from
//  returns: an array containing the words in the song title
function nameArrayifyer(name){
    name = name.toLowerCase();
    name = name.replace(" -", ""); // remove extraneous hyphens e.g. "data-mining" will keep the hyphen but not "rocky - radio edit"
    name = name.replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,.\/:;<=>?@\[\]^_`{|}~]/g,""); // replace all punctuation besides -
    name = name.split(/[ ,]+/);
    return _.uniqWith(name, _.isEqual()); // splits the string into an array on space or comma and removes duplicates
}