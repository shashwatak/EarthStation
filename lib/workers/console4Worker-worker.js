// console4Worker, the worker side

(function(){
	this.console	= {};
	
	/**
	 * Convert Arguments into an Array passable thru Worker barrier
	*/
	var _convertArgs	= function(args){
		return Array.prototype.slice.call(args).map(function(arg){
			if( typeof arg === "number" )	return arg;
			if( typeof arg === "boolean" )	return arg;
			if( typeof arg === "object" ){
				try {
					return JSON.parse(JSON.stringify(arg));
				}catch(e){
					return (function(){
						var str = "";
						for(var key in arg){
							if( !arg.hasOwnProperty(key) )	continue;
							str += key + " : " + arg[key] + "\n";
						}
						return str;	
					})();
				}
			}		
			return String(arg);
		});
	}
	
	var sendCommand	= function(method, args){
		self.postMessage({
			// mark this message as coming from console4Worker
			type	: "_console4Worker",
			data	: {
				// give it the function
				type	: method,
				data	: _convertArgs(args)
			}
		});
	}

	// define all the methodes from console.*
	var methods	= ["log", "debug", "info", "warn", "error", "assert", "dir", "dirxml",
		"group", "groupEnd", "time", "timeEnd", "count", "trace", "profile", "profileEnd"];
	// go thru all methods
	for(var i = 0; i < methods.length; ++i){
		(function(method){
			// define this method in particular
			console[method]	= function(){
				return sendCommand(method, Array.prototype.slice.call(arguments));
			};
		})(methods[i]);	
	}
	
	
	console.assert	= function(condition, message){
		if( condition )	return;
		sendCommand('assert', [false, message])
	}

}.bind(this))();
