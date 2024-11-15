// -----------------------------------------Importing the required modules and specific definitions-------------------------
const http = require('http');
const redis = require('redis');

const servers = [
  { url: 'wss://student-gpfke5b2hha4c0g3.centralindia-01.azurewebsites.net', connections: 0 },
  { url: 'ws://websocket-2-dza4fnfac8hhfpey.centralindia-01.azurewebsites.net', connections: 0 }
];

//-----------------------------------------Redis Functionality------------------------------------
const redisHost = '4.188.77.100'; 
const redisPort = 6379; 
const channel='classconnect-channel'

const redisSubscriber = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`
});
redisSubscriber.connect();

const redisPublisher = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`
});
redisPublisher.connect();

redisPublisher.on('error', (err) => {
    console.error('Redis Publisher Error:', err);
});

redisSubscriber.on('error', (err) => {
        console.error('Redis Subscriber Error:', err);
    });

redisPublisher.on('connect', () => {
    console.log('Redis Publisher connected');
});

redisSubscriber.on('connect', () => {
    console.log('Redis Subscriber connected');
});


// ---------------------------Subscribe to the Redis channel and handling incoming messages directly-------------------------
redisSubscriber.subscribe(channel, (message) => {
    console.log(`Received message on channel ${channel}: ${message}`);
    message = JSON.parse(message);
    console.log(message.action);
    if(message.action=='check')
    {
        count = message.count;
        url=message.url;
        serverIndex = servers.findIndex(s => s.url === message.url);
        if (serverIndex !== -1) {                                      //if index not found then -1 is returned
            servers[serverIndex].connections = count;
            console.log(`Updated server ${url} with connection count: ${count}`);
        }
        else{
            console.log(`${url} not present`);
        }

    }
});
console.log(`Subscribed to channel: ${channel}`);


// --------------------------------Actual server functionality-------------------------------------------

// Function to get the server with the least connections
function getLeastLoadedServer() {
  servers.sort((a, b) => a.connections - b.connections);            // Sorting servers by the number of active connections (ascending order)
  return servers[0];                                                // Returning the server with the least connections
}


const server = http.createServer((req, res) => {
  // Geting the server with the least connections
  const leastLoadedServer = getLeastLoadedServer();
  
  // Send the URL of the server with the least connections as the response
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Allow any origin to access the server
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // Allow specific methods
    'Access-Control-Allow-Headers': 'Content-Type', // Allow specific headers
    'Access-Control-Allow-Credentials': 'true' // Allow credentials if needed (cookies, authentication headers)
  });
  res.end(JSON.stringify({ server: leastLoadedServer.url }));
});

// Starting the http server
server.listen(8085, () => {
  console.log('Load balancer running on http://localhost:8085');
});














