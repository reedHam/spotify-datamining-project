var fs = require("fs");
var _ = require("lodash");
var TreeModel = require("tree-model");

TreeModel["header"] = [];   // added header attribute for FPgrowth algorithm
TreeModel["FPArray"] = [];    // multi dimensional Array containing frequent item counts 
TreeModel["FPArrayX"] = [];    // Dictionary to translate strings into indexes for x axis 
TreeModel["FPArrayY"] = [];    // Dictionary to translate strings into indexes for y axis 
TreeModel["root"] = {};     // root of the tree
TreeModel["base"] = {item: null}; // what the tree was produced using

var minSup = 5; // minimum support

// Read ordered and pruned db into memory
var orderedTracks = JSON.parse(fs.readFileSync("./JSON/FPgrowthDB.json", 'utf8'));
// read header for FP tree
var headerFile = JSON.parse(fs.readFileSync("./JSON/FPgrowthHeader.json", 'utf8'));

// ---------------- constructing initial FPTree from database ----------------

var FPTree = new TreeModel(); // initialize FPTree
FPTree.header = headerFile;
FPTree.FPArray = [];
FPTree.FPArrayX = [];
FPTree.FPArrayY = [];
FPTree.root = FPTree.parse({item: "root"}); 


// Build multi dimensional array and dictionaries
for (let i = 1, len = headerFile.length - 1; i <= len; i++){ // start the index at the second element
    FPTree.FPArrayY.push(headerFile[i]); // add y value to dictionary
    FPTree.FPArrayX.push(headerFile[i - 1]); // add x value to dictionary
    FPTree.FPArray.push([]); // initialize empty array at end of array
    for (let j = 0; j < i; j++){
        FPTree.FPArray[FPTree.FPArray.length - 1].push(0);
    }
}

// Build FPTree 






console.log("-------------- header");
console.log(FPTree.header);
console.log(FPTree.header.length);
console.log("-------------- FPTree.FPArrayX");
console.log(FPTree.FPArrayX);
console.log("-------------- FPTree.FPArrayY");
console.log(FPTree.FPArrayY);
var index = 0;
FPTree.FPArray.forEach(element => {
    console.log(++index);
    console.log(JSON.stringify(element));
});