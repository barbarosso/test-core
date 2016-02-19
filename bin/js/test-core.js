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
var signals = require('signals');
console.log(signals);

global.MainClass = mainClass;

module.exports = mainClass;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./MainClass":1,"signals":undefined}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL01haW5DbGFzcy5qcyIsInNyYy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIEBmaWxlICAgICAgICBNYWluIGVudHJ5IHBvaW50IG9mIHRoZSBtYWluIGNsYXNzXG4gKiBAZmlsZSAgICAgICAgSGVyZSB5b3UgY2FuIGxpc3RlbiB0byB0aGUgYXBpIGFuZCB0cmlnZ2VyIGV2ZW50cyB2aWEgdGhlIGV2ZW50YnVzXG4gKiBAYXV0aG9yICAgICAgRHJlYW1zICYgQ3JlYXRpb25zIDxpbmZvQGRyZWFtc2FuZGNyZWF0aW9ucy5iZT5cbiAqIEBjb3B5cmlnaHQgICAyMDEzLTIwMTZcbiAqIEBsaWNlbnNlICAgICB7QGxpbmsgfVxuICovXG5cbmZ1bmN0aW9uIE1haW5DbGFzcygpIHtcblxufVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhNYWluQ2xhc3MucHJvdG90eXBlLCB7XG4gICAgZXZlbnRzOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICdldmVudHMnO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBhcGk6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2FwaSc7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSAgTWFpbkNsYXNzO1xuIiwiLyoqXG4gKiBAZmlsZSAgICAgICAgTWFpbiBlbnRyeSBwb2ludCBvZiB0aGUgbWFpbiBjbGFzc1xuICogQGZpbGVcdFx0SGVyZSB5b3UgY2FuIGxpc3RlbiB0byB0aGUgYXBpIGFuZCB0cmlnZ2VyIGV2ZW50cyB2aWEgdGhlIGV2ZW50YnVzXG4gKiBAYXV0aG9yICAgICAgRHJlYW1zICYgQ3JlYXRpb25zIDxpbmZvQGRyZWFtc2FuZGNyZWF0aW9ucy5iZT5cbiAqIEBjb3B5cmlnaHQgICAyMDEzLTIwMTZcbiAqIEBsaWNlbnNlICAgICB7QGxpbmsgfVxuICovXG52YXIgbWFpbkNsYXNzID0gcmVxdWlyZSgnLi9NYWluQ2xhc3MnKTtcbnZhciBzaWduYWxzID0gcmVxdWlyZSgnc2lnbmFscycpO1xuY29uc29sZS5sb2coc2lnbmFscyk7XG5cbmdsb2JhbC5NYWluQ2xhc3MgPSBtYWluQ2xhc3M7XG5cbm1vZHVsZS5leHBvcnRzID0gbWFpbkNsYXNzO1xuIl19
