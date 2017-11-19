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
    
    // ------------ creating FPtree ---------------
    var conditionalFPtree = new TreeModel();
    var conditionalRoot = conditionalFPtree.parse({item: "root"});
    initializeHeader(conditionalFPtree, conditionalBase);
    conditionalBase = trimDb(conditionalBase, conditionalFPtree.header);

    conditionalBase.forEach(element => {
        var conditionalCurrentNode = conditionalRoot;
        element.items.forEach(item => {
            conditionalCurrentNode = FPGrowthInsert(conditionalFPtree, conditionalCurrentNode, item, element.support);
        });
    });

    console.log(conditionalBase);
    printTree(conditionalRoot, conditionalRoot);
    FPtreeTest(conditionalFPtree);
}

// takes a FPtree and a conditional DB and creates a new header for the projection preserving order from the FP tree
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

function FPGrowthInsert(tree, node, item, support){
    var itemIndex = tree.itemToindex(item);
    if(itemIndex != -1){
        if (node.hasChildren()) { // if node has children
            // check if item matches any of node's children
            for(var i = 0, len = node.children.length; i < len; i++) {
                if (node.children[i].model.item == item){ // if the child matches the item
                    node.children[i].model.support += support;
                    return node.children[i];
                } 
            };
        }
        var newNode = node.addChild(FPtree.parse({item: item, support: support}));
        tree.header[itemIndex].list.push(newNode);
        return newNode;
    }
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