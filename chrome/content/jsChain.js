/**
 * jsChain 
 * Author: rereaydou Version: 0.0.1 Date: 8/3/2012
 */

 var jsChain = function(){
		return {
			run: function(){
				alert('ok');
				console.info('js Chain is barking...');
			}
		};
 };

 var jsc = new jsChain();
 
 jsc.run();