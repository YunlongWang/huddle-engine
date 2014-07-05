HuddleOrbiter = function() {

	// A dictionary where each entry represents a single event. The key is the
	// event name. Each entry of the dictionary is an array of callbacks that
	// should be called when the event is triggered.
	this._events = {};
};

/**
 *
 */
HuddleOrbiter.prototype.start = function(port) {
	var orbiter = this;

	if (this.server) {
		console.log("Huddle Orbiter is already running on port " + this.port + ".  Stop running Huddle Orbiter first!");
		return this;
	}

	this.port = port;

	console.log("Starting Huddle Orbiter on port " + port);

	var WebSocketServer = Npm.require('websocket').server;
	var http = Npm.require('http');

	this.server = http.createServer(function(request, response) {});
	this.server.listen(port, function() {
	    console.log((new Date()) + ' Server is listening on port ' + port);
	});

	// create the server
	this.wsServer = new WebSocketServer( {
	    httpServer: this.server
	});

	var count = 0;
	var connected = 0;
	var clients = {};

	/**
	 * Handles incoming connection requests.
	 */
	var onRequest = function (request) {
			var connection = request.accept(null, request.origin);

			++connected;

			// Specific id for this client & increment count
			var id = count++;

			// Store the connection method so we can loop through & contact all clients
			clients[id] = connection;

			console.log('Connection accepted [' + id + ']. #' + connected + ' clients connected.');

			// Meteor.bindEnvironment(orbiter.onConnected());
			this._trigger("connect", {id: id});

			// Create event listener
			connection.on('message', function (message) {
					console.log(message.utf8Data);
			}.bind(this));

			connection.on('close', function ( reasonCode, description ) {
					delete clients[id];
					--connected;

					console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');

					this._trigger("disconnect", {id: id});
			}.bind(this));
	}.bind(this);

	// WebSocket server
	this.wsServer.on('request', onRequest);

	// setInterval(function() {
	// 	// The string message that was sent to us
	// 	var msgString = "{\"Type\":\"Glyph\",\"Id\":\"1\",\"GlyphData\":\"0000001010001000100000000\"}";
	//
	// 	// Loop through all clients
	// 	for (var i in clients) {
	// 	    // Send a message to the client with the message
	// 	    clients[i].sendUTF(msgString);
	// 	}
	// }, 5000);

	return this;
};

HuddleOrbiter.prototype.stop = function() {
	if (this.wsServer) {
		this.wsServer.shutDown();
		delete this.wsServer;
	}

	if (this.server) {
		this.server.close();
		delete this.server;

		console.log("Closed Huddle Orbiter");
	}
};


/**
* Adds a callback for the specified event.
*
* @this HuddleOrbiter
* @param {string} event Event name, e.g., proximity, identify, message
* @param {function} callback Callback function receives object as parameter.
*/
HuddleOrbiter.prototype.on = function (event, callback) {
		this._register(event, callback);
		return this;
};

/**
* Registers the given callback function for the given event. When the event is triggered, the callback will be executed.
*
* @param {string} event The name of the event
* @param {function} callback The callback function to call when the event is triggered
*
* @memberof HuddleOrbiter
*/
HuddleOrbiter.prototype._register = function(event, callback) {

	if (typeof(event) !== "string") throw "Event name must be a string";
	if (typeof(callback) !== "function") throw "Event callback must be a function";

	if (!this._events[event]) this._events[event] = [];
	this._events[event].push(callback);
};

/**
* Triggers the given events, calling all callback functions that have registered for the event.
*
* @param {string} event The name of the event to trigger
*
* @memberof HuddleOrbiter
*/
HuddleOrbiter.prototype._trigger = function(event) {

	if (!this._events[event]) return;

	//Get all arguments passed to trigger() and remove the event
	var args = Array.prototype.slice.call(arguments);
	args.shift();

	for (var i = 0; i < this._events[event].length; i++)
	{
		var callback = this._events[event][i];
		callback.apply(null, args);
	}
};
