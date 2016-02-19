(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @file        Main entry point of the main class
 * @file        Here you can listen to the api and trigger events via the eventbus
 * @author      Dreams & Creations <info@dreamsandcreations.be>
 * @copyright   2013-2016
 * @license     {@link }
 */

function MainCore() {

}

Object.defineProperties(MainCore.prototype, {
    events: {
        get: function () {
            return 'events';
        }
    },
    api: {
        get: function () {
            return 'api';
        }
    }
});

module.exports =  MainCore;

},{}],2:[function(require,module,exports){
(function (global){
/**
 * @file        Main entry point of the main class
 * @file		Here you can listen to the api and trigger events via the eventbus
 * @author      Dreams & Creations <info@dreamsandcreations.be>
 * @copyright   2013-2016
 * @license     {@link }
 */


var Signal = require('signals').Signal;
console.log(Signal);

var mainCore = require('./MainCore');

global.MainCore = mainCore;

module.exports = mainCore;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./MainCore":1,"signals":undefined}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvTWFpbkNvcmUuanMiLCJzcmMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAZmlsZSAgICAgICAgTWFpbiBlbnRyeSBwb2ludCBvZiB0aGUgbWFpbiBjbGFzc1xuICogQGZpbGUgICAgICAgIEhlcmUgeW91IGNhbiBsaXN0ZW4gdG8gdGhlIGFwaSBhbmQgdHJpZ2dlciBldmVudHMgdmlhIHRoZSBldmVudGJ1c1xuICogQGF1dGhvciAgICAgIERyZWFtcyAmIENyZWF0aW9ucyA8aW5mb0BkcmVhbXNhbmRjcmVhdGlvbnMuYmU+XG4gKiBAY29weXJpZ2h0ICAgMjAxMy0yMDE2XG4gKiBAbGljZW5zZSAgICAge0BsaW5rIH1cbiAqL1xuXG5mdW5jdGlvbiBNYWluQ29yZSgpIHtcblxufVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhNYWluQ29yZS5wcm90b3R5cGUsIHtcbiAgICBldmVudHM6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2V2ZW50cyc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGFwaToge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAnYXBpJztcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9ICBNYWluQ29yZTtcbiIsIi8qKlxuICogQGZpbGUgICAgICAgIE1haW4gZW50cnkgcG9pbnQgb2YgdGhlIG1haW4gY2xhc3NcbiAqIEBmaWxlXHRcdEhlcmUgeW91IGNhbiBsaXN0ZW4gdG8gdGhlIGFwaSBhbmQgdHJpZ2dlciBldmVudHMgdmlhIHRoZSBldmVudGJ1c1xuICogQGF1dGhvciAgICAgIERyZWFtcyAmIENyZWF0aW9ucyA8aW5mb0BkcmVhbXNhbmRjcmVhdGlvbnMuYmU+XG4gKiBAY29weXJpZ2h0ICAgMjAxMy0yMDE2XG4gKiBAbGljZW5zZSAgICAge0BsaW5rIH1cbiAqL1xuXG5cbnZhciBTaWduYWwgPSByZXF1aXJlKCdzaWduYWxzJykuU2lnbmFsO1xuY29uc29sZS5sb2coU2lnbmFsKTtcblxudmFyIG1haW5Db3JlID0gcmVxdWlyZSgnLi9NYWluQ29yZScpO1xuXG5nbG9iYWwuTWFpbkNvcmUgPSBtYWluQ29yZTtcblxubW9kdWxlLmV4cG9ydHMgPSBtYWluQ29yZTtcbiJdfQ==
