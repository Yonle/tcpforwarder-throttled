#!/usr/bin/env node

const net = require('net');
const throttle = require('throttle');
const args = process.argv.slice(2);
var verbose = false;
var uri = args[1];
var kbps = args[2] || 56;

if (!args.length) return console.log("Usage: tcpforwarder-throttled <port> <target:port> <byte-per-second>\n\nOptions:\n-v --verbose | Verbose any send & received traffic by Client & Server");
if (Number(args[0]) === 0|| Number(args[0]) === NaN) return console.error("Please provide a valid port to listen to.")
if (!uri) return console.error("No target was provided.");
if (!uri.startsWith("tcp:")) uri = "tcp:" + uri;
var forwardFrom = require("url").parse(uri);
const forwardToPort = Number(args[0]);
if (args.includes("-v") || args.includes("--verbose")) verbose = true;
// Server
const server = new net.Server();

server.listen(forwardToPort, "0.0.0.0");

server.on('connection', socket => {
	// Here client begins
	var client = new net.Socket();
	client.on('error', socket.destroy);
	socket.on('error', socket.destroy);
	client.connect(forwardFrom.port, forwardFrom.hostname);
	var throttledClient = client.pipe(throttle(kbps * 125));
	var throttledSocket = socket.pipe(throttle(kbps * 125));
	socket.pipe(throttle(kbps * 125)).pipe(client).pipe(throttle(kbps * 125)).pipe(socket);
	//throttledSocket.pipe(throttledClient).pipe(throttledSocket);
	if (!verbose) return;
	//throttledSocket.on('data', data => console.log("├── Client:", data.toString('utf8')));
	//throttledClient.on('data', data => console.log("├── Server:", data.toString('utf8')));
	throttledClient.pipe(process.stdout);
	throttledSocket.pipe(process.stdout);
});

server.on('listening', () => {
	console.log(`├── Now forwarding from ${forwardFrom.hostname}:${forwardFrom.port}`)
	console.log(`└── 0.0.0.0:${forwardToPort}`);
	if (!verbose) return;
	console.log("─── Verbose Enabled ───");
});

server.on('error', console.error);
