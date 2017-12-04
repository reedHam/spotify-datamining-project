var FPGrowthPlus = require("./FPgrowth+");
var FPGrowth = require("./FPgrowth");


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

console.log("");
console.log("Total patterns mined ", patternSet.length);