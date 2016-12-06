/**
 * @constructor
 */
var LRUCache = function(capacity) {
    this.capacity = capacity;
    this.cache = {};
    this.ordering = [];
};

/**
 * @param {number} key
 * @returns {number}
 */
LRUCache.prototype.get = function(key) {
    if(key in this.cache) {
        this.ordering = [key].concat(this.ordering.splice(0, this.ordering.indexOf(key))).concat(this.ordering.splice(1));
        return this.cache[key];
    }
    return -1;
};

/**
 * @param {number} key
 * @param {number} value
 * @returns {void}
 */
LRUCache.prototype.set = function(key, value) {
    // If in cache, update the priority
    // Else, add to cache and invalidate lowest priority (last element) if over capacity
    if(key in this.cache) {
        // console.log('already in cache');
        this.cache[key] = value;
        this.ordering = [key].concat(this.ordering.splice(0, this.ordering.indexOf(key))).concat(this.ordering.splice(1));
    } else {
        // console.log('adding to cache');
        this.cache[key] = value;
        this.ordering = [key].concat(this.ordering);
        if(this.ordering.length > this.capacity) {
            var lru = this.ordering.pop();
            delete this.cache[lru];
        }
    }
};

module.exports = LRUCache;