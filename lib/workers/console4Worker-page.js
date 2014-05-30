// console4Worker, the page side
this.console4Worker	=  {}

/**
 * Filter message events for console4Worker
 * 
 * @param {MessageEvent} event the event from the 'message' event
 * @param {Boolean} exec true if the event must be executed, false otherwise. default to false
 * 
 * @return false if the message is for console4Worker, false otherwise 
*/
console4Worker.filterEvent	= function(event, exec){
	// sanity check - check the event
	console.assert(event);
	if( 'data' in event === false )		return false;
	if( typeof event.data !== 'object' )	return false;
	if( 'type' in event.data === false )	return false;
	// get data from the event
	var type	= event.data.type;
	var data	= event.data.data;
	if( type !== '_console4Worker' )	return false;
	// ok now the event is for console4Worker
	if( exec )	console[data.type].apply(console, data.data);
	// return true to notify the event has been filtered
	return true;
}

/**
 * The callback to handle event
 * @param {MessageEvent} event the event from the 'message' event
*/
console4Worker._callback	= function(event){
	//console.log("consoleWorker.bind():", event.data, event)
	if( console4Worker.filterEvent(event, true) )	return;
}

/**
 * make it bind a given worker
 * @param {Worker} Worker the webworker to bind from now on
*/
console4Worker.bind	= function(worker){
	worker.addEventListener('message', this._callback, false);
}

/**
 * make it unbind a given worker
 * @param {Worker} Worker the webworker to no more bind
*/
console4Worker.unbind	= function(worker){
	worker.removeEventListener('message', this._callback, false);
}