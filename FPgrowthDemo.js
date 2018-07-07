var FPGrowthPlus = require("./FPgrowth+");
var FPGrowth = require("./FPgrowth");
var fs = require("fs");

patternSet = [];
for (let i = 2, len = process.argv.length; i < len; i++){
    if (process.argv[i] == "fp" && process.argv[i + 1] == "small"){
        patternSet = FPGrowth.demoSmall();
    } else if (process.argv[i] == "fp+" && process.argv[i + 1] == "small"){
        patternSet = FPGrowthPlus.demoSmall();
    } else if (process.argv[i] == "fp" && process.argv[i + 1] == "spotify"){
        patternSet = FPGrowth.demoLarge();
    } else if (process.argv[i] == "fp+" && process.argv[i + 1] == "spotify"){
        patternSet = FPGrowthPlus.demoLarge();
    } else if (process.argv[i] == "prePro") {
        var unTrack = JSON.parse(fs.readFileSync("./JSON/unprocessedTrackExample.json", "utf8"));
        var track = JSON.parse(fs.readFileSync("./JSON/tracks.json", 'utf8'));
        var DBtrack = JSON.parse(fs.readFileSync("./JSON/FPgrowthDB.json", 'utf8'));
        var header = JSON.parse(fs.readFileSync("./JSON/FPgrowthHeader.json", 'utf8'));
        console.log("");
        console.log("Unprocessed Track: ");
        console.log(unTrack.body.tracks);
        console.log("");
        console.log("Track after index.js: ");
        console.log(track[0]);
        console.log("");
        console.log("Track after FPgrowthPre.js: ");
        console.log(DBtrack[0]);
        console.log("");
        console.log("Header entry's after FPgrowthPre.js: ");
        header.forEach(element => {
            if(element.item == DBtrack[0][0] || element.item == DBtrack[0][1] || element.item ==DBtrack[0][2]){
                console.log(element);
            }
        });
    }
}


patternSet.sort(function(a, b){
    return  b.support - a.support || a.pattern.length - b.pattern.length || a.pattern[0].localeCompare(b.pattern[0])
});

if (patternSet.length < 50){
    patternSet.forEach(element => {
        console.log(JSON.stringify(element.pattern) + " " + element.support);
    });
} else {
    console.log("Top 50 patterns: ");
    for (let i = 0; i < 50; i++){
        console.log(JSON.stringify(patternSet[i].pattern) + " " + patternSet[i].support);
    }
}

if (patternSet.length > 0){
    console.log("");
    console.log("Total patterns mined ", patternSet.length);
}
