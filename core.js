/**
 * Created by pascal on 16/02/16.
 */
function testCore(){
		console.log('test core log');
}

testCore.prototype.test = function(){
		console.log('test from testcore');
}

testCore.prototype.constructor = testCore;

