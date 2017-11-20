var fs = require("fs");
var _ = require("lodash");
var TreeModel = require("tree-model");

TreeModel["header"] = []; // added header attribute for FPgrowth algorithm
// takes an item support and node then looks up the item and returns the index
TreeModel.prototype.itemToindex = function(item){
    var result = -1;
    this.header.forEach(function(head, index){
        if (head.item == item){
            result = index;
        } 
    });
    return result;
};

// Read ordered and pruned db into memory
var orderedTracks = JSON.parse(fs.readFileSync("./JSON/FPgrowthDB.json", 'utf8'));
// read header for FP tree
var header = JSON.parse(fs.readFileSync("./JSON/FPgrowthHeader.json", 'utf8'));
var minSup = 2; // minimum support


// ---------------------------- creating FPtree -----------------------------------
var FPtree = new TreeModel();
FPtree.header = header;
FPtree["root"] = FPtree.parse({item: "root"});


// add an empty list for each frequent 1-itemset
FPtree.header.forEach(element => {
    element["list"] = []; 
});

//  current node stores the results of the insertion allowing subsequent 
//  items to be added to children of successfully operations
orderedTracks.forEach(track => {
    var currentNode = FPtree.root;             
    for(var i = 0, len =  track.length; i < len; i++){
        currentNode = FPtreeInsert(currentNode, track[i]);
    };
});

// takes a node and an item and inserts it into the FPtree based on the FPtree rules
// Adds any newly created nodes into the lists located in the header
// Prams: 
//      node: node that should have its children checked for item matches
//      item: item to evaluate and insert into tree 
// returns: the node that the item evaluated too
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

// ---------------------------- FPtree Mining ---------------------------------
// Recursively finds all frequent patterns in the FPtree.
// prams:
//      tree: the tree to mine
//      patern: the pattern that the conditional base is build upon
// returns: Frequent patterns
function FPgrowth(tree, pattern = null){
    if (singlePath(tree.root)){
        var path = tree.header[tree.header.length - 1].list[0].getPath().slice(1, -1);
        path.forEach(nodeItem => { // transform prefix path into conditional pattern
            item: nodeItem.model.item, support: nodeItem.model.support;
        });

    } else {
        for (i = FPtree.header.length - 1; i >= 0; i--){ // for every item in the header
            newPattern = {items: [], support: 0};
            if (pattern !== null){
                newPattern.items = pattern.items;
            } 
            newPattern.items.push(FPtree.header[i].item);
            newPattern.support = FPtree.header[i].support;
    
            conditionalBase = createConditionalBase(tree);
            conditionalFPtree = buildFPtree(conditionalBase);
            
            if (conditionalFPtree.root.hasChildren()){
                FPgrowth(conditionalFPtree, newPattern);
            }
        }
    }
}


// Given an array of items this generator will create all possible combinations 
// reference: https://stackoverflow.com/questions/42773836/how-to-find-all-subsets-of-a-set-in-javascript
// prams:
//      array: array to generate power set from
function* allCombinations(array, offset = 0){
    while(offset < array.length){
        let first
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

// Creates a database of paths to the root
// prams:
//      tree: Tree that will be used to creat the database
// returns: database of conditional patterns
function createConditionalBase(tree){
    var conditionalBase = [];
    var leafNode = tree.header[i].list[0].model.item;
    tree.header[i].list.forEach(node => {
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
    return conditionalBase;
}

// Initializes the header for a tree by finding every item occurrence
// and inserting them into the header with a support count for frequency.
// prams:
//      tree:   The tree to initialize the header of.
//      conDB:  Conditional database to initialize the header with.
// returns: No return value
function initializeHeader(tree, conDb){
    tree.header = [];
    conDb.forEach(element => {
        element.items.forEach(item => {
            var found = false;
            tree.header.forEach(head => {
                if(head.item == item){
                    head.support += element.support;
                    found = true;
                }
            });
            if (!found){
                tree.header.push({item: item, support: element.support, list: []});
            }
        });
    });  

    tree.header = tree.header.filter(function(x){ // filter values less than min support 
        return x.support >= minSup;
    });

    tree.header.sort(function(a, b){ // sort collection in descending order
        if (a.support < b.support){
            return 1;
        } else if (a.support > b.support){
            return -1;
        } else {
            return 0;
        }
    });
}

// Trims the database based on the elements in the header removing items 
// below the minimum support count.
// prams:
//      db:     conditional database to trim
//      header: header to trim the database with.
// returns: trimmed conditional database.
function trimDb(db, header){
    var trimedDb = [];
    db.forEach(itemSet => {
        var trimedItems = [];
        header.forEach(head => {
            itemSet.items.forEach(item =>{
                if (head.item == item){
                    trimedItems.push(item);
                }
            });
        });
        if(trimedItems.length !== 0){
            trimedDb.push({items: trimedItems, support: itemSet.support});
        }
    });
    return trimedDb;
}

// Inserts items from a list into the tree and adds new nodes to the lists in 
// the header. Recursively calls FPGrowthInsert until the list is empty.
// Prams:
//      tree:       Tree that contains the header that will have new nodes added 
//                  to its lists.
//      node:       Node that will have its children checked.
//      ilist:      Conditional pattern and support object.
// returns: No return value
function FPGrowthInsert(tree, node, iList){
        var found = false;
        var newNode = {};
        if (node.hasChildren()) { // if node has children
            // check if item matches any of node's children
            for(var i = 0, len = node.children.length; i < len; i++) {
                if (node.children[i].model.item == iList.items[0]){ // if the child matches the item
                    found = true;
                    node.children[i].model.support += iList.support;
                    newNode = node.children[i];
                } 
            };
        }
        if (!found){ // node not found so insert it
            newNode = node.addChild(FPtree.parse({
                item: iList.items[0], 
                support: iList.support
            }));
            tree.header[tree.itemToindex(iList.items[0])].list.push(newNode);
        }
        iList.items.shift(); // remove item that was inserted
        if (iList.items.length !== 0){
            FPGrowthInsert(tree, node, iList);
        }
}

//  Builds an fp tree from a conditional pattern database
//  prams:
//      conditionalBase: database of conditional patterns
//  returns: constructed fp tree
function buildFPtree(conditionalBase){
    var conditionalFPtree = new TreeModel();
    conditionalFPtree["root"] = conditionalFPtree.parse({item: "root"})
    initializeHeader(conditionalFPtree, conditionalBase);
    conditionalBase = trimDb(conditionalBase, conditionalFPtree.header);

    conditionalBase.forEach(iList => {
            FPGrowthInsert(conditionalFPtree, conditionalFPtree.root, iList);
    });
    return conditionalFPtree;
}

// --------------------- DEBUG --------------------
// Debuging function checks the support of all the nodes in the list vs the values in the header table
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

function printTree(node, parent, Level = -1){   
    console.log("")
    console.log("level: " + Level + "   parent: " + parent.model.item);
    console.log("node: " + node.model.item + "  Support: " + node.model.support);
    if(node.hasChildren()){
        var inc = Level + 1;
        node.children.forEach(child => {
            printTree(child, node, inc);
        });
    }
}