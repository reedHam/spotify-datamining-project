var fs = require("fs");
var _ = require("lodash");
var TreeModel = require("tree-model");
TreeModel.prototype.initialize = function(base = null){
    this["header"] = [];   // added header attribute for FPgrowth algorithm
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
console.time("FPgrowth");
var FPTree = new TreeModel(); // initialize FPTree
FPTree.initialize();
FPTree.header = headerFile;
FPTree.header.forEach(element => { // add empty array to each header item
    element['list'] = [];
});


// Build FPTree 
// insert all of the transactions into the fp tree
orderedTracks.forEach(track => {
    FPTreeInsert(FPTree, track);
});

// generate frequent items
FPGrowthPlus(FPTree);
console.timeEnd("FPgrowth");


var fourFPs = AllFPs.filter(function(value){
    return value.pattern.length > 1;
}).sort(function(a, b){ // sort collection in descending order
    if (a.support < b.support){
        return 1;
    } else if (a.support > b.support){
        return -1;
    } else {
        return 0;
    }
});
console.log(fourFPs);



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
            newTree.initialize(newPattern);

            AllFPs.push({pattern: newPattern, support: tree.header[i].support});


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

            // construct conditional base and create fp tree
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
                    let index = 0;
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

function printTree(node, parent = node, level = -1){  
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