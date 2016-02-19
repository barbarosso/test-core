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
