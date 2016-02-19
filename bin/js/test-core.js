(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @file        Main entry point of the main class
 * @file        Here you can listen to the api and trigger events via the eventbus
 * @author      Dreams & Creations <info@dreamsandcreations.be>
 * @copyright   2013-2016
 * @license     {@link }
 */

function MainClass() {

}

Object.defineProperties(MainClass.prototype, {
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

module.exports =  MainClass;

},{}],2:[function(require,module,exports){
(function (global){
/**
 * @file        Main entry point of the main class
 * @file		Here you can listen to the api and trigger events via the eventbus
 * @author      Dreams & Creations <info@dreamsandcreations.be>
 * @copyright   2013-2016
 * @license     {@link }
 */
var mainClass = require('./MainClass');

global.MainClass = mainClass;

module.exports = mainClass;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./MainClass":1}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvTWFpbkNsYXNzLmpzIiwic3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAZmlsZSAgICAgICAgTWFpbiBlbnRyeSBwb2ludCBvZiB0aGUgbWFpbiBjbGFzc1xuICogQGZpbGUgICAgICAgIEhlcmUgeW91IGNhbiBsaXN0ZW4gdG8gdGhlIGFwaSBhbmQgdHJpZ2dlciBldmVudHMgdmlhIHRoZSBldmVudGJ1c1xuICogQGF1dGhvciAgICAgIERyZWFtcyAmIENyZWF0aW9ucyA8aW5mb0BkcmVhbXNhbmRjcmVhdGlvbnMuYmU+XG4gKiBAY29weXJpZ2h0ICAgMjAxMy0yMDE2XG4gKiBAbGljZW5zZSAgICAge0BsaW5rIH1cbiAqL1xuXG5mdW5jdGlvbiBNYWluQ2xhc3MoKSB7XG5cbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoTWFpbkNsYXNzLnByb3RvdHlwZSwge1xuICAgIGV2ZW50czoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAnZXZlbnRzJztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgYXBpOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICdhcGknO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gIE1haW5DbGFzcztcbiIsIi8qKlxuICogQGZpbGUgICAgICAgIE1haW4gZW50cnkgcG9pbnQgb2YgdGhlIG1haW4gY2xhc3NcbiAqIEBmaWxlXHRcdEhlcmUgeW91IGNhbiBsaXN0ZW4gdG8gdGhlIGFwaSBhbmQgdHJpZ2dlciBldmVudHMgdmlhIHRoZSBldmVudGJ1c1xuICogQGF1dGhvciAgICAgIERyZWFtcyAmIENyZWF0aW9ucyA8aW5mb0BkcmVhbXNhbmRjcmVhdGlvbnMuYmU+XG4gKiBAY29weXJpZ2h0ICAgMjAxMy0yMDE2XG4gKiBAbGljZW5zZSAgICAge0BsaW5rIH1cbiAqL1xudmFyIG1haW5DbGFzcyA9IHJlcXVpcmUoJy4vTWFpbkNsYXNzJyk7XG5cbmdsb2JhbC5NYWluQ2xhc3MgPSBtYWluQ2xhc3M7XG5cbm1vZHVsZS5leHBvcnRzID0gbWFpbkNsYXNzO1xuIl19
