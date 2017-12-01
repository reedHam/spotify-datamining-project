var fs = require("fs");
var _ = require("lodash");
var TreeModel = require("tree-model");
TreeModel.prototype.FPinitialize = function(base = null){
    this["header"] = [];   // added header attribute for FPgrowth algorithm
    this["FPArray"] = [];    // multi dimensional Array containing frequent item counts 
    this.FPArray["X"] = {};    // Dictionary to translate strings into indexes for x axis 
    this.FPArray["Y"] = {};    // Dictionary to translate strings into indexes for y axis
    this.FPArray["Xk"] = [];    // Dictionary to translate strings into indexes for x axis 
    this["root"] = this.parse({item: "root"});     // root of the tree
    this["base"] = base; // what the tree was produced using
}

TreeModel.prototype.MFIinitialize = function(base = null){
    this["header"] = [];   // added header attribute for FPgrowth algorithm
    this["root"] = this.parse({item: "root"});     // root of the tree
    this["base"] = base; // what the tree was produced using
}


testingDB = [
    ["a", "d", "e"],
    ["b", "a", "g", "f"],
    ["b", "a", "d", "f"],
    ["b", "a", "c"],
    ["a", "d", "g"],
    ["b", "d", "g", "c"],
    ["b", "d", "g", "e"],
];
testingHeader = [
    {item:"b", support: 5},
    {item:"a", support: 5},
    {item:"d", support: 6},
    {item:"g", support: 2},
    {item:"f", support: 2},
    {item:"e", support: 2},
    {item:"c", support: 2},
];

var minSup = 2; // minimum support
var AllFPs = [];
// Read ordered and pruned db into memory
var orderedTracks = JSON.parse(fs.readFileSync("./JSON/FPgrowthDB.json", 'utf8'));
// read header for FP tree
var headerFile = JSON.parse(fs.readFileSync("./JSON/FPgrowthHeader.json", 'utf8'));




// ---------------- constructing initial FPTree from database ----------------
var FPTree = new TreeModel(); // initialize FPTree
FPTree.FPinitialize();
FPTree.header = testingHeader;
FPTree.header.forEach(element => { // add empty array to each header item
    element['list'] = [];
});
// Build multi dimensional array and dictionaries
initMatrix(FPTree);



// initialize MFTree
var MFTree = new TreeModel()
MFTree.MFIinitialize();



// Build FPTree 
// insert all of the transactions into the fp tree
testingDB.forEach(track => {
    if (FPTree.header.length > 2) { // array cannot be build with only 2 items
        FPArrayInc(FPTree.FPArray, track);
    }
    FPTreeInsert(FPTree, track);
});

BuildFPMaxPlus(FPTree, MFTree);
printTree(MFTree.root);
console.log(mineMFI(MFTree));

// Inserts items from a list into the tree and adds new nodes to the lists in 
// the header. Recursively calls FPTreeInsert until the list is empty.
// Prams:
//      tree:     Tree that contains the header that will have new nodes added 
//                to its lists.
//      node:     Node that will have its children checked.
//      row:      transaction.
// returns: No return value
function FPTreeInsert(tree, track, node = tree.root){
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
        FPTreeInsert(tree, track, newNode);
    }
}


// ------------------------- FPGrowth* --------------------------------
function FPGrowthPlus(tree){
    if (singlePath(tree.root)){
        // generate all combinations of the path and union them with tree.base
        // gets the path, removes root and removes unwanted tree information
        var path = tree.header[tree.header.length - 1].list[0].getPath().slice(1).map(function(element){
            return {item: element.model.item, support: element.model.support};
        });
        
        var combinations = [];
        // pushes all combinations of item, support objects into combinations
        for(let combination of allCombinations(path)){
            if(combination.length !== 0){ // dont add empty arrays
                combinations.push(combination);
            }
        }
        
        // turn {item, support} combinations into {items:[item, item], support} patterns
        combinations.forEach(combo => {
            var supMin = combo[0].support;
            
            var itemCombo = [];
            combo.forEach(item => {
                itemCombo.push(item.item);
                // get the lowest support of the combination
                supMin = supMin > item.support ? item.support : supMin;
            });

            // union tree.base with pattern
            itemCombo = tree.base != null ? tree.base.concat(itemCombo) : itemCombo;
            AllFPs.push({pattern: itemCombo, support: supMin});
        });

    } else {
        // for each item in the header starting with lowest support
        for (let i = tree.header.length - 1; i >= 0; i--){
            var newPattern = tree.base != null ? tree.base.concat([tree.header[i].item]) : [tree.header[i].item];
            
            // initialize tree for the new pattern
            var newTree = new TreeModel();
            newTree.FPinitialize(newPattern);

            AllFPs.push({pattern: newPattern, support: tree.header[i].support});

            
            // build header
            if (tree.FPArray.length > 1){ // the fp array has items in it
                // build header from array
                if (tree.FPArray.Y[tree.header[i].item] != undefined){
                    tree.FPArray[tree.FPArray.Y[tree.header[i].item]].forEach(function(value, index){ 
                        if (value >= minSup){
                            newTree.header.push({item: tree.FPArray.Xk[index], support: value, list: []});
                        }
                    });
                }
            } else {
                // construct header from tree paths
                tree.header[i].list.forEach(listNode => {
                    var leafSup = listNode.model.support;
                    // get the path
                    let path = listNode.getPath().slice(1, -1);
                    // for each node on the path
                    for(let j = 0, len = path.length; j < len; j++){
                        let found = false;
                        let index = 0;
                        // check if it is in the header
                        while(!found && index < newTree.header.length){
                            if (newTree.header[index].item == path[j].model.item){
                                newTree.header[index].support += leafSup;
                                found = true;
                            }
                            index++; 
                        }
                        if (!found){
                            newTree.header.push({item: path[j].model.item, support: leafSup, list: []});
                        }
                    }
                });
                newTree.header = newTree.header.filter(function(value){
                    return value.support >= minSup;
                });
            }

            // sort header collection in ascending order
            newTree.header.sort(function(a, b){ 
                if (a.support < b.support){
                    return 1;
                } else if (a.support > b.support){
                    return -1;
                } else {
                    return 0;
                }
            });

            // initalise newTree's FParray to 0's
            if (newTree.header.length > 2) {
                initMatrix(newTree);
            }

            // construct conditional base
            var conDB = [];
            tree.header[i].list.forEach(leaf => {
                var conPattern = [];
                var leafSupport = leaf.model.support;
                var prefixPath = leaf.getPath().slice(1, -1);
                
                // for each item in the new header
                newTree.header.forEach(element => {
                    // check starting with highest support
                    // if a node.item matches the header header item 
                    // add it to the pattern and break out of the loop
                    let found = false;
                    var index = 0;
                    while(!found && index < prefixPath.length){
                        if(prefixPath[index].model.item == element.item){
                            conPattern.push(prefixPath[index].model.item);
                            found = true;
                        }
                        index++;
                    }
                });
                // dont add a pattern with no items
                if (conPattern.length > 0){
                    if (newTree.header.length > 2) { // array cannot be build with only 2 items
                        FPArrayInc(newTree.FPArray, conPattern);
                    }
                    FPGrowthPlusInsert(newTree, {items: conPattern, support: leafSupport});
                }
            });
            if (newTree.root.hasChildren()){
                FPGrowthPlus(newTree);
            }
        }
    }
}

// Inserts items from a list into the tree and adds new nodes to the lists in 
// the header. Recursively calls FPGrowthPlusInsert until the list is empty.
// Prams:
//      tree:     Tree that contains the header that will have new nodes added 
//                to its lists.
//      node:     Node that will have its children checked.
//      row:      transaction.
// returns: No return value
function FPGrowthPlusInsert(tree, track, node = tree.root){
    var found = false;
    var newNode = {};
    if (node.hasChildren()) { // if node has children
        // check if item matches any of node's children
        for(var i = 0, len = node.children.length; i < len; i++) {
            if (node.children[i].model.item == track.items[0]){ // if the child matches the item
                found = true;
                node.children[i].model.support += track.support;
                newNode = node.children[i];
            } 
        };
    }
    if (!found){ // node not found so insert it
        newNode = node.addChild(tree.parse({
            item: track.items[0], 
            support: track.support
        }));
        for(let i = 0, len = tree.header.length; i < len; i++){
            if (tree.header[i].item == track.items[0]){
                tree.header[i].list.push(newNode);
            }
        }
        
    }
    track.items.shift(); // remove item that was inserted
    if (track.items.length !== 0){
        FPGrowthPlusInsert(tree, track, newNode);
    }
}

// --------------------------------- FPMax -----------------------------------



function BuildFPMaxPlus(tree, MFItree){
    if (singlePath(tree.root)){
        if (tree.root.hasChildren()){
            var MFI = tree.header[tree.header.length - 1].list[0].getPath().slice(1).map(function(element){
                return element.model.item;
            });
            MFIinsert(MFItree, MFI);
        }
    } else {
        // for each item in the header starting with lowest support
        for (let i = tree.header.length - 1; i >= 0; i--){
            var newPattern = tree.base != null ? tree.base.concat([tree.header[i].item]) : [tree.header[i].item];
            var tail = [];
            // initialize tree for the new pattern
            var newTree = new TreeModel();
            newTree.FPinitialize(newPattern);
            
            // build header
            if (tree.FPArray.length > 1){ // the fp array has items in it
                // build header from array
                if (tree.FPArray.Y[tree.header[i].item] != undefined){
                    tree.FPArray[tree.FPArray.Y[tree.header[i].item]].forEach(function(value, index){ 
                        if (value >= minSup){
                            newTree.header.push({item: tree.FPArray.Xk[index], support: value, list: []});
                            // build tail
                            tail.push(tree.FPArray.Xk[index]);
                        }
                    });
                }
            } else {
                // construct header from tree paths
                tree.header[i].list.forEach(listNode => {
                    var leafSup = listNode.model.support;
                    // get the path
                    let path = listNode.getPath().slice(1, -1);
                    // for each node on the path
                    for(let j = 0, len = path.length; j < len; j++){
                        let found = false;
                        let index = 0;
                        // check if it is in the header
                        while(!found && index < newTree.header.length){
                            if (newTree.header[index].item == path[j].model.item){
                                newTree.header[index].support += leafSup;
                                found = true;
                            }
                            index++; 
                        }
                        if (!found){
                            newTree.header.push({item: path[j].model.item, support: leafSup, list: []});
                        }
                    }
                });
                newTree.header = newTree.header.filter(function(value){
                    return value.support >= minSup;
                });
                // sort header collection in ascending order
                newTree.header.sort(function(a, b){ 
                    if (a.support < b.support){
                        return 1;
                    } else if (a.support > b.support){
                        return -1;
                    } else {
                        return 0;
                    }
                });
                // build tail
                tail = newTree.header.map(element => element.item);
            }
            

            var newMFITree = new TreeModel();
            newMFITree.MFIinitialize();
            newMFITree.header = newTree.header.map(function(value){
                return {item: value.item, list: []};
            });

            // base U tail
            var potentialMFI = tail.concat(newTree.base);
            console.log(potentialMFI);

            if (!maxCheck(potentialMFI, MFItree)){
                // initalise newTree's FParray to 0's
                if (newTree.header.length > 2) {
                    initMatrix(newTree);
                }

                // construct conditional base and build tree
                var conDB = [];
                tree.header[i].list.forEach(leaf => {
                    var conPattern = [];
                    var leafSupport = leaf.model.support;
                    var prefixPath = leaf.getPath().slice(1, -1);
                    
                    // for each item in the new header
                    newTree.header.forEach(element => {
                        // check starting with highest support
                        // if a node.item matches the header header item 
                        // add it to the pattern and break out of the loop
                        let found = false;
                        var index = 0;
                        while(!found && index < prefixPath.length){
                            if(prefixPath[index].model.item == element.item){
                                conPattern.push(prefixPath[index].model.item);
                                found = true;
                            }
                            index++;
                        }
                    });
                    // dont add a pattern with no items
                    if (conPattern.length > 0){
                        if (newTree.header.length > 2) { // array cannot be build with only 2 items
                            FPArrayInc(newTree.FPArray, conPattern);
                        }
                        FPGrowthPlusInsert(newTree, {items: conPattern, support: leafSupport});
                    }
                });

                // mine conditional MFI's and initialize MFTree

                tree.header[i].list.forEach(leaf => {
                    var prefixPath = leaf.getPath().slice(1, -1);
                    var conMFIs = [];
                    // for each item in the new header
                    newMFITree.header.forEach(element => {
                        
                        // check starting with highest support
                        // if a node.item matches the header header item 
                        // add it to the pattern and break out of the loop
                        let found = false;
                        var index = 0;
                        while(!found && index < prefixPath.length){
                            if(prefixPath[index].model.item == element.item){
                                conMFIs.push(prefixPath[index].model.item);
                                found = true;
                            }
                            index++;
                        }
                    });
                    
                    if (conMFIs.length > 0){
                        MFIinsert(newMFITree, conMFIs);
                    }
                });
                BuildFPMaxPlus(newTree, newMFITree);
                // merge MFItree with old MFItree
                mineMFI(newMFITree).forEach(MFI => {
                    if (!maxCheck(MFI, MFItree)){
                        MFIinsert(MFItree, MFI);
                    }
                });
            }
        }
    }
}

function mineMFI(MFItree){
    var MFIs = [];
    generateMFI(MFItree.root);

    // Preforms a depth first search 
    function generateMFI(node, MFI = []){
        if (node.hasChildren()){
            if (node.model.item != "root"){
                MFI.push(node.model.item);
            }
            var parentPrefix = MFI.slice();
            node.children.forEach(child => {
                generateMFI(child, parentPrefix);
            });
        } else {
            if (node.model.item != "root"){
                MFI.push(node.model.item);
                MFIs.push(MFI);
            }
        }
    }

    return MFIs;
}



function MFIinsert(tree, track, node = tree.root, level = 1){
    var found = false;
    var newNode = {};
    if (node.hasChildren()) { // if node has children
        // check if item matches any of node's children
        for(var i = 0, len = node.children.length; i < len; i++) {
            if (node.children[i].model.item == track[0]){ // if the child matches the item
                found = true;
                newNode = node.children[i];
            } 
        };
    }
    if (!found){ // node not found so insert it
        newNode = node.addChild(tree.parse({
            item: track[0], 
            level: level
        }));
        for(let i = 0, len = tree.header.length; i < len; i++){
            if (tree.header[i].item == track[0]){
                tree.header[i].list.push(newNode);
            }
        }
    }
    track.shift(); // remove item that was inserted
    if (track.length !== 0){
        level++;
        MFIinsert(tree, track, newNode, level);
    }
}


function maxCheck(set, MFItree){
    var subset = false;
    for (let i = MFItree.header.length - 1; i >= 0; i--){
        if (MFItree.header[i].item == set[set.length - 1]){
            for (let j = 0, len = MFItree.header[i].list.length; j < len; j++){
                var curNode = MFItree.header[i].list[j];
                subset = true;
                _.forEachRight(set, function(setItem){
                    // if index < curNode.level then the path does not have enough nodes for set to be a subset
                    if (setItem == curNode.model.item && set.length < curNode.model.level){
                        curNode = curNode.parent;
                    } else {
                        subset = false;
                        return false; // end forEachRight loop
                    }
                });
            }
            break;
        }
    };
    return subset;
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

function initMatrix(tree){
    for (let i = 1, len = tree.header.length - 1; i <= len; i++){ // start the index at the second element
        tree.FPArray.Y[tree.header[i].item] = i - 1; // add y value to dictionary
        tree.FPArray.X[tree.header[i - 1].item] = i - 1; // add x value to dictionary
        tree.FPArray.Xk.push(tree.header[i - 1].item); // add x value to dictionary
        tree.FPArray.push([]); // initialize empty array
        for (let j = 0; j < i; j++){ // insert 0 for header.length - 1 items
            tree.FPArray[tree.FPArray.length - 1].push(0);
        }
    }
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
            //console.log("first: " + firstItem + " | second: "  + secondItem); // DEBUG
            FPArray[yIndex][xIndex] += 1;
        }
    }
}

// Given an array of items this generator will create all possible combinations 
// reference: https://stackoverflow.com/questions/42773836/how-to-find-all-subsets-of-a-set-in-javascript
// prams:
//      array: array to generate power set from
function* allCombinations(array, offset = 0){
    while(offset < array.length){
        let first = array[offset++];
        for(let combination of allCombinations(array, offset)){
            combination.push(first);
            yield combination;
        }
    }
    yield [];
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

function printTree(node, parent = null, level = -1){  
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