var fs = require("fs");
var _ = require("lodash");
var TreeModel = require("tree-model");
TreeModel.prototype.initialize = function(base = null){
    this["header"] = [];   // added header attribute for FPgrowth algorithm
    this["FPArray"] = [];    // multi dimensional Array containing frequent item counts 
    this.FPArray["X"] = {};    // Dictionary to translate strings into indexes for x axis 
    this.FPArray["Y"] = {};    // Dictionary to translate strings into indexes for y axis 
    this["root"] = this.parse({item: "root"});     // root of the tree
    this["base"] = base; // what the tree was produced using
}

// testingDB and testingHeader are taken from the data mining textbook pg 258
testingDB = [
    ["I2", "I1", "I5"],
    ["I2", "I4"],
    ["I2", "I3"],
    ["I2", "I1", "I4"],
    ["I1", "I3"],
    ["I2", "I3"],
    ["I1", "I3"],
    ["I2", "I1", "I3", "I5"],
    ["I2", "I1", "I3"]
];
testingHeader = [
    {item:"I2", support: 7},
    {item:"I1", support: 6},
    {item:"I3", support: 6},
    {item:"I4", support: 2},
    {item:"I5", support: 2},
];

var minSup = 2; // minimum support
var AllFPs = [];
// Read ordered and pruned db into memory
var orderedTracks = JSON.parse(fs.readFileSync("./JSON/FPgrowthDB.json", 'utf8'));
// read header for FP tree
var headerFile = JSON.parse(fs.readFileSync("./JSON/FPgrowthHeader.json", 'utf8'));




// ---------------- constructing initial FPTree from database ----------------
var FPTree = new TreeModel(); // initialize FPTree
FPTree.initialize();
FPTree.header = testingHeader;
FPTree.header.forEach(element => { // add empty array to each header item
    element['list'] = [];
});

// Build multi dimensional array and dictionaries
for (let i = 1, len = FPTree.header.length - 1; i <= len; i++){ // start the index at the second element
    FPTree.FPArray.Y[FPTree.header[i].item] = i - 1; // add y value to dictionary
    FPTree.FPArray.X[FPTree.header[i - 1].item] = i - 1; // add x value to dictionary
    FPTree.FPArray.push([]); // initialize empty array
    for (let j = 0; j < i; j++){ // insert 0 for header.length - 1 items
        FPTree.FPArray[FPTree.FPArray.length - 1].push(0);
    }
}

// Build FPTree 
// insert all of the transactions into the fp tree
testingDB.forEach(track => {
    if (FPTree.header.length > 2) { // array cannot be build with only 2 items
        FPArrayInc(FPTree.FPArray, track);
    }
    FPTreeInsert(FPTree, FPTree.root, track);
});

// DEBUG
console.log(FPTree.FPArray.Y);
console.log(FPTree.FPArray.X);
FPTree.FPArray.forEach(element =>{
    console.log(JSON.stringify(element));
});
FPtreeTest(FPTree);
printTree(FPTree.root, FPTree.root);

// Inserts items from a list into the tree and adds new nodes to the lists in 
// the header. Recursively calls FPGrowthInsert until the list is empty.
// Prams:
//      tree:     Tree that contains the header that will have new nodes added 
//                to its lists.
//      node:     Node that will have its children checked.
//      row:      transaction.
// returns: No return value
function FPTreeInsert(tree, node, track){
    var found = false;
    var newNode = {};
    if (node.hasChildren()) { // if node has children
        // check if item matches any of node's children
        for(var i = 0, len = node.children.length; i < len; i++) {
            if (node.children[i].model.item == track[0]){ // if the child matches the item
                found = true;
                node.children[i].model.support++;
                newNode = node.children[i];
            } 
        };
    }
    if (!found){ // node not found so insert it
        newNode = node.addChild(tree.parse({
            item: track[0], 
            support: 1
        }));
        for(let i = 0, len = tree.header.length; i < len; i++){
            if (tree.header[i].item == track[0]){
                tree.header[i].list.push(newNode);
            }
        }
        
    }
    track.shift(); // remove item that was inserted
    if (track.length !== 0){
        FPTreeInsert(tree, newNode, track);
    }
}



// ------------------------- FPGrowth* --------------------------------

function FPGrowthPlus(tree){
    if (singlePath(tree)){

    } else {
        // for each item in the header starting with lowest support
        for (let i = tree.header.length - 1; i >= 0; i--){
            // initialize tree for element at i
            var newTree = new TreeModel();
            newTree.initialize(tree.header[i].item);

            // add frequent pattern at i U tree.base
            AllFPs.push({items: [].push(tree.base).push(newTree.base), support: tree.header[i].support});

            if (tree.FPArray.length < 1){ // the fp array has items in it
                var newHeader = [];
                // build header from array
                tree.FPArray[tree.FPArray.Y[tree.base]].forEach(function(value, index){ 
                    if (value > minSup){
                        var itemName = _.findKey(tree.FPArray.X, index);
                        newHeader.push({item: itemName, support: value, list: []});
                    }
                });
            } else {
                // construct header from tree paths
            }
            // build FPTree for element at i
            // build FPArray if header.length > 2
            if (newTree.root.hasChildren()){

            }
        }
    }
}


// Checks if a tree is a single path
// prams: 
//      root: root of the tree to evaluate
// returns: true if the tree is a single path false otherwise.
function singlePath(root){
    if(root.hasChildren()){
        if (root.children.length == 1){
            return singlePath(root.children[0]);
        } else {
            return false;
        }
    }
    return true;
}



// takes an FPArray and a row and increments the array in the correct places
//  prams:
//      FPArray: multidimensional array 
//      row: row with items to create 2 item subsets from
// return: no return value
function FPArrayInc(FPArray, row){
    //console.log("transaction: ", row); DEBUG

    // generate all 2 item pairs
    // e.g. input array [1, 2, 3, 4]
    //      pairs       [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]
    for(let i = 0, len = row.length; i < (len - 1); i++){ // for each element except the last one
        var firstItem = row[i];
        for (let j = i + 1; j < len; j++){
            var secondItem = row[j];
            // because the array is not symmetrical y index should always be larger than x
            if (FPArray.Y[secondItem] >= FPArray.X[firstItem]){
                var yIndex = FPArray.Y[secondItem];
                var xIndex = FPArray.X[firstItem];
            } else {
                var yIndex = FPArray.Y[firstItem];
                var xIndex = FPArray.X[secondItem];
            }
            //console.log("first: " + firstItem + " | second: "  + secondItem); DEBUG
            FPArray[yIndex][xIndex] += 1;
        }
    }
}



// --------------------- DEBUG --------------------
// Debugging function checks the support of all the nodes in the list vs the values in the header table
function FPtreeTest(tree){
    var fail = false;
    tree.header.forEach(element => {
        var supportTotal = 0;
        element.list.forEach(node => {
            supportTotal += node.model.support;
        });
        if(supportTotal !== element.support){
            fail = true;
            console.log(element.item + " FAIL");
            console.log("Header support: " + element.support);
            console.log("Total support: " + supportTotal);
            console.log("");
        }
    });
    if(!fail){
        console.log("Tree PASSES")
    }
}

function printTree(node, parent, level = -1){  
    var indentation = "";
    var heritage = "";
    for (let i = 0; i < level; i++){
        indentation += "    ";
        if(level >= 2 && i > 0){
            heritage += " great"
        }
    } 
    if (level >= 1){
        heritage += " grand"
    } 
    if (level >= 0 ) {
        heritage += " child"
    }
    
    console.log("")
    console.log(indentation + "level:" + level + " " + heritage);
    console.log(indentation + "node: " + node.model.item + "  Support: " + node.model.support);
    if(node.hasChildren()){
        var inc = level + 1;
        node.children.forEach(child => {
            printTree(child, node, inc);
        });
    }
}