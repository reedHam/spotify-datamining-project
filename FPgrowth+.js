var fs = require("fs");
var _ = require("lodash");
var TreeModel = require("tree-model");

TreeModel["header"] = []; // added header attribute for FPgrowth algorithm
TreeModel["FPObj"] = {} // multi dimensional object containing frequent item counts 
TreeModel["base"] = {item: null}; // what the tree was produced using

var minSup = 5; // minimum support

// Read ordered and pruned db into memory
var orderedTracks = JSON.parse(fs.readFileSync("./JSON/FPgrowthDB.json", 'utf8'));
// read header for FP tree
var headerFile = JSON.parse(fs.readFileSync("./JSON/FPgrowthHeader.json", 'utf8'));

// -------------------------- construct inital 

// Inserts items from a list (each transaction) into the tree and adds new nodes to the lists in 
// the header. Recursively calls FPGrowthInsert until the list is empty.
// Prams:
//      tree:       Tree that contains the header that will have new nodes added 
//                  to its lists.
//      node:       Node that will have its children checked.
//      ilist:      Conditional pattern and support object.
// returns: No return value
function FPtreeInsert(tree, node, iList){
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
        newNode = node.addChild(tree.parse({
            item: iList.items[0], 
            support: iList.support
        }));
        for(let i = 0, len = tree.header.length; i < len; i++){
            if (tree.header[i].item == iList.items[0]){
                tree.header[i].list.push(newNode);
            }
        }
    }
    iList.items.shift(); // remove item that was inserted
    if (iList.items.length !== 0){
        FPGrowthInsert(tree, newNode, iList);
    }
}








// Inserts items from a list (each transaction) into the tree and adds new nodes to the lists in 
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
        newNode = node.addChild(tree.parse({
            item: iList.items[0], 
            support: iList.support
        }));
        for(let i = 0, len = tree.header.length; i < len; i++){
            if (tree.header[i].item == iList.items[0]){
                tree.header[i].list.push(newNode);
            }
        }
    }
    iList.items.shift(); // remove item that was inserted
    if (iList.items.length !== 0){
        FPGrowthInsert(tree, newNode, iList);
    }
}