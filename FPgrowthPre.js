var fs = require("fs");
var _ = require("lodash");

// 1st step: scan the database and get the support for each attribute in the database
// 2nd step: discard the attributes with less than the minimum support
// 3rd step: sort the attributes in descending order

var tracksJSON = JSON.parse(fs.readFileSync("./JSON/tracks.json", 'utf8')); // read tracks file into memory
var oneItemSets = [];
var minSup = 5; // minimum support

tracksJSON.forEach(element => { // for each track tracksJSON
    element.name.forEach(itmName =>{
        addToOneSet(itmName);
    });
    addToOneSet(element.popularity);
    addToOneSet(element.genre);
});

oneItemSets = oneItemSets.filter(function(x){ // filter values less than min support 
    return x.support >= minSup;
});


oneItemSets.sort(function(a, b){ // sort collection in descending order
    if (a.support < b.support){
        return 1;
    } else if (a.support > b.support){
        return -1;
    } else {
        return 0;
    }
});

// adds an item to the one item set if it is not not already found in the collection 
// if it is in the collection then it adds one to its support count
function addToOneSet(item){
    var found = false;
    oneItemSets.forEach(element => {
        if (element.item == item){
            element.support++;
            found = true;
        } 
    });
    if (!found){
        oneItemSets.push({item: item, support: 1});
    }
}


// -------------------- one item sets have been generated at this point -----------------------
// this block of code removes items from my tracks that are below the min support 
// it also sorts items by highest support
var orderedTracks = [];
tracksJSON.forEach(function(track, index) { // for each track tracksJSON
    orderedTracks.push([]); // add new entry
    oneItemSets.forEach(itemSet => { //  using one-item set as a key parts of a track are inserted into the new list in order
        track.name.forEach(name =>{
            if (name == itemSet.item){
                orderedTracks[index].push(name);
            }
        });
        if (track.popularity == itemSet.item){
            orderedTracks[index].push(track.popularity);
        }
        if (track.genre == itemSet.item){
            orderedTracks[index].push(track.genre);
        }
    });
});

fs.writeFile("./JSON/FPgrowthDB.json", JSON.stringify(orderedTracks), function(err){
    if (err) {return console.log("an error occurred while writing orderedTracks JSON file:", err)}
    console.log("successfully wrote orderedTracks JSON  of " + orderedTracks.length + " length.");
});

fs.writeFile("./JSON/FPgrowthHeader.json", JSON.stringify(oneItemSets), function(err){
    if (err) {return console.log("an error occurred while writing oneItemSets JSON file:", err)}
    console.log("successfully wrote oneItemSets JSON  of " + oneItemSets.length + " length.");
});