var fs = require("fs");
var _ = require("lodash");
var TreeModel = require("tree-model");

TreeModel["header"] = []; // added header attribute for FPgrowth algorithm
TreeModel.prototype.getHeaderByItem = function(item){
    var result = false;
    this.header.forEach(element => {
        console.log(element.item);
        console.log(item);
        if (element.item == item){
            result = element;
        } 
    });
    return result;
};



// 1st step: scan the database and get the support for each attribute in the database
// 2nd step: discard the attributes with less than the minimum support
// 3rd step: sort the attributes in descending order

var tracksJSON = JSON.parse(fs.readFileSync("./JSON/tracks.json", 'utf8')); // read tracks file into memory
var oneItemSets = [];
var minSup = 3; // minimum support

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
var orderedTracks = [];
// this block of code removes items from my tracks that are below the min support 
// it also sorts items by highest support

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


// ---------------------------- creating FPtree -----------------------------------
var FPtree = new TreeModel();
FPtree.header = oneItemSets;
var root = FPtree.parse({item: "root"});



FPtree.header.forEach(element => {
    element["list"] = []; // add an empty list for each frequent 1-itemset
});

orderedTracks.forEach(track => {
    var currentNode = root;             //  current node stores the results of the insertion allowing subsequent items to be added to children of successfully operations
    for(var i = 0, len =  track.length; i < len; i++){
        currentNode = FPtreeInsert(currentNode, track[i]);
    };
});


// takes a node and an item and inserts it into the FPtree based on the FPtree rules
// also adds newly created nodes to the header object
// returns the node that the item evaluated too
function FPtreeInsert(node, item){
    if (node.hasChildren()) { // if node has no children
        for(var i = 0, len = node.children.length; i < len; i++) {
            if (node.children[i].model.item == item){ // if the child matches the item
                node.children[i].model.support++;
                return node.children[i];
            } 
        };
    }
    for(var i = 0, len =  FPtree.header.length; i < len; i++) { // item does not match any nodes on current level 
        if (FPtree.header[i].item == item){
            FPtree.header[i].list.push(node.addChild(FPtree.parse({item: item, support: 1}))); // add a new leaf node to the tree and add it to the linked list
            return node.children[node.children.length - 1]; // return the new node
        }
    };
}

// FPtreeTest() //DEBUG
// Debuging function checks the support of all the nodes in the list vs the values in the header table
function FPtreeTest(){
    FPtree.header.forEach(element => {
        var supportTotal = 0;
        element.list.forEach(node => {
            supportTotal += node.model.support;
        });
        if(supportTotal == element.support){
            console.log(element.item + " PASS");
            console.log("");
        } else {
            console.log(element.item + " FAIL");
            console.log("Header support: " + element.support);
            console.log("Total support: " + supportTotal);
            console.log("");
        }
    });
}
// ----------------- FP growth ------------------------

for (i = FPtree.header.length - 1; i >= FPtree.header.length - 1; i--){ // for every item in the header
    var conditionalBase = [];
    var leafNode = FPtree.header[i].list[0].model.item;
    FPtree.header[i].list.forEach(node => {
        var leafSupport = node.model.support;
        var prefixPath = node.getPath().slice(1, -1); // remove the root and leaf node leaving only the prefix path
        var conditionalPattern = [];
        prefixPath.forEach(nodeItem => { // transform prefix path into conditional pattern
            conditionalPattern.push(nodeItem.model.item);
        });
        conditionalBase.push({
            items: conditionalPattern,
            support: leafSupport
        });
    });

    //console.log(conditionalBase);

    var conditionalFPtree = new TreeModel
    var root = conditionalFPtree.parse({item: "root"});

}

function FPGrowthInsert(tree, node, item, support){
    if (node.hasChildren()) { // if node has children
        // check if item matches any of node's children
        for(var i = 0, len = node.children.length; i < len; i++) {
            if (node.children[i].model.item == item){ // if the child matches the item
                node.children[i].model.support += support;
                return node.children[i];
            } 
        };
    }
    // no spot for item was found so
    // add item to tree
    // add item to header
    // add new node to header
    // return new node

}

