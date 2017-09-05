//-----------------------------------------------------------------------
// Globals
//-----------------------------------------------------------------------
var seedrandom = require('seedrandom');
var uuid = require('node-uuid');
var rng = seedrandom(uuid.v1());
var mathjs = require('mathjs')

//-----------------------------------------------------------------------
// rnd
//
// returns a random number for a given range
//-----------------------------------------------------------------------
module.exports.rnd = function (minInclussive, maxInclussive) {
    return minInclussive + mathjs.floor(rng() * (maxInclussive - minInclussive + 1));
};

//-----------------------------------------------------------------------
// pick
//
// picks and returns a random item from a given array
//-----------------------------------------------------------------------
module.exports.pick = function(array) {
    return array[this.rnd(0,array.length-1)];
};

//-----------------------------------------------------------------------
// shuffle
//
// Shuffles an array based on the //Fisher-Yates Shuffle
//-----------------------------------------------------------------------
module.exports.shuffle = function(array) {

    //Fisher-Yates Shuffle
    var counter = array.length, temp, index;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        index = this.rnd(0, counter-1);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }

    return array;
};
