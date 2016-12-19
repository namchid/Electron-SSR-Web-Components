/**
 * @constructor
 * @param {number} capacity The capacity of the cache.
 */
let LRUCache = function(capacity) {
  this.capacity = capacity;
  this.cache = {};
  this.ordering = [];
};

/**
 * @param {number} key The hashed key.
 * @return {number} The values corresponding to the key
 */
LRUCache.prototype.get = function(key) {
  if (key in this.cache) {
    this.ordering =
        [key]
            .concat(this.ordering.splice(0, this.ordering.indexOf(key)))
            .concat(this.ordering.splice(1));
    return this.cache[key];
  }
  return -1;
};

/**
 * @param {number} key The hashed key of the item to store.
 * @param {number} value The value of the item to store.
 */
LRUCache.prototype.set = function(key, value) {
  if (key in this.cache) {
    this.cache[key] = value;
    this.ordering =
        [key]
            .concat(this.ordering.splice(0, this.ordering.indexOf(key)))
            .concat(this.ordering.splice(1));
  } else {
    this.cache[key] = value;
    this.ordering = [key].concat(this.ordering);
    if (this.ordering.length > this.capacity) {
      let lru = this.ordering.pop();
      delete this.cache[lru];
    }
  }
};

module.exports = LRUCache;
