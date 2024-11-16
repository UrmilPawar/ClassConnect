const WebSocket = require('ws');
const redis = require('redis');

// ----------------------------------WebSocket server setup---------------------
const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT }, () => {
    console.log(`WebSocket server started on ws://localhost:${PORT}`);
});

const students = new Map();                                                                        // Map to store the student mapping with teachers
const teachers = new Map(); 
let connections=0;
// ---------------------------------Redis connection setup---------------------------
const redisHost = '4.188.77.100'; // Use your Azure Redis host IP or hostname
const redisPort = 6379;           // Default port for Redis

// Create a Redis subscriber client
const redisSubscriber = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`
});
redisSubscriber.connect();

// Create Redis clients for publishing
const redisPublisher = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`
});
redisPublisher.connect();

// Handle connection errors for publisher
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
    


// -------------Subscribe to the Redis channel and handle incoming messages directly------------
const channel='classconnect-channel'
redisSubscriber.subscribe(channel, (message) => {
    console.log(`Received message on channel ${channel}: ${message}`);
    message = JSON.parse(message);
    console.log(message.action);
    if(message.action=='connect')
    {
        
        const teacherDetails=message.message;
        t_id = teacherDetails.t_id;
        branch = teacherDetails.branch;
        division = teacherDetails.division;
        lec_name = teacherDetails.lec_name;
        action = teacherDetails.action; 
        //including the teacher in teacher's set
        teachers.set(t_id, {
            branch: branch,
            division: division,
            lec_name: lec_name
        }); 
        console.log(`Added ${t_id} in 8081 set`);

    }
    else if (message.action=='start')
    {
        const t_id=message.t_id;
        teacher_message=JSON.stringify({ message: 'Attendance Started', teacherLocation: message.teacherLocation });
        if (students.has(t_id)) {                                                         // If there are students connected to this t_id
            const connections = students.get(t_id);
            connections.forEach(studentWs => {
                if (studentWs.readyState === WebSocket.OPEN) {
                    studentWs.send(teacher_message);
                }
            });
            console.log(`Attendance message sent to all students of t_id: ${t_id}`);
        } else {
            console.log(`No students connected for t_id: ${t_id}`);
        }
    }
});
console.log(`Subscribed to channel: ${channel}`);


// --------------------------------------Handle WebSocket connections--------------------------------------------
wss.on('connection', (ws,req) => {
    console.log('New connection Attempt');

    //Publishing the new connections to the channel
    console.log('\n');
    connections=connections+1;
    const message = JSON.stringify({action: 'check',url: 'ws://localhost:8081',count: connections});
    redisPublisher.publish(channel, message);
    console.log('Active connections : ',connections)

    ws.on('message', (message) => {
            const parsedMessage = JSON.parse(message);

            if (parsedMessage.user === 'student') {
                console.log('Student connected');

                //-------------------Going with websocketing part------------------------------
                const t_id = parsedMessage.t_id;
                const branch = parsedMessage.branch;
                const division = parsedMessage.division;
                const lec_name = parsedMessage.lec_name;

                // Checking if the teacher with the provided t_id is connected
                if (!teachers.has(t_id)) {
                    ws.send(JSON.stringify({message: 'Teacher not connected' }));
                    ws.close();                                                                        // Closing the student's connection
                    console.log(`Student connection rejected - no teacher connected for t_id: ${t_id}`);
                    return;
                }
    
                //checking if student has entered the corect UID
                const teacher_params=teachers.get(t_id);
                if(!(branch==teacher_params.branch && division==teacher_params.division && lec_name==teacher_params.lec_name))
                {
                    ws.send(JSON.stringify({message: 'You have entered wrong Teacher Initials' }));
                    ws.close();                                                                        // Closing the student's connection
                    console.log(`Student connection rejected - wrong teacher initials for t_id: ${t_id}`);
                    return;
                }
                
                //Checking if other students are already connected to the same t_id
                if (!students.has(t_id)) {
                    students.set(t_id, new Set());                                                     //using set to avoid adjusting(shifting) the elements in array after removal
                }
                students.get(t_id).add(ws);                                                            // Adding the WebSocket connection to the t_id set
                
                ws.t_id = t_id;                                                                        //associating t_id so we dont have to iterate to all the connections stored in student() map to find the t_id
                ws.user='student'
                console.log(`Student stored with t_id: ${t_id}`);
                // console.log(students);
                console.log('Student connected');
                ws.send(JSON.stringify({ status: 'success', message: 'Data received and processed' }));

            } else if (parsedMessage.user === 'teacher') {
                console.log('Teacher connected');
                ws.user = 'teacher';
                const t_id = parsedMessage.t_id;
                const branch = parsedMessage.branch;
                const division = parsedMessage.division;
                const lec_name = parsedMessage.lec_name;
                const action = parsedMessage.action;                                                   // To track teacher's type of action (create or start)
    
                if (action === 'connect') {                                                             //if action is 'connect'
                    //making the entry of teacher in the same server
                    teachers.set(t_id, {
                        branch: branch,
                        division: division,
                        lec_name: lec_name
                    }); 
                    ws.t_id = t_id;

                    const message = JSON.stringify({ message: parsedMessage, action:'connect' });
                    
                    // Publish the message to the Redis channel to update it in all the servers
                    redisPublisher.publish(channel, message).then(() => {
                        console.log(channel)
                        console.log(`Message sent to channel ${channel}: ${message}`);
                    }).catch((err) => {
                        console.error('Failed to publish message:', err);
                    });
                    
                    console.log(`Teacher added in the current server: ${t_id}`);
                    ws.send(JSON.stringify({ status: 'success', message: 'Data received and processed' }));
                } 
                else if (action === 'start') {                                                        //if action is 'start'
                    const teacherLocation = parsedMessage.location; 
                    const message = JSON.stringify({ message: 'Lecture started' , action:'start', teacherLocation: teacherLocation, t_id: t_id });

                    // Publish the message to the Redis channel
                    redisPublisher.publish(channel, message).then(() => {
                        console.log(`Message sent to channel ${channel}: ${message}`);
                    }).catch((err) => {
                        console.error('Failed to publish message:', err);
                    });
                }
            }
    });

    ws.on('close', () => { 
        //Publishing the new connections to the channel
        connections=connections-1;
        const message = JSON.stringify({action: 'check',url: 'ws://localhost:8081',count: connections});
        redisPublisher.publish(channel, message);
        console.log('Active connections : ',connections)
                                         
        if(ws.user=='student')
        {
            const t_id = ws.t_id;                                                                 // Accessing the t_id directly from the WebSocket
            if (students.has(t_id)) {
                const connections = students.get(t_id);                                           //getting a reference to the actual Set object stored in the map
                connections.delete(ws);                                                           // Removing the connection from the Set
                console.log(`Removed WebSocket connection for student with t_id ${t_id}`);
                if (connections.size === 0) {                                                     // If there are no more connections for this t_id, delete the entry
                    students.delete(t_id);
                    console.log(`All connections removed for t_id ${t_id}. Entry deleted.`);
                }
            }
        }
        else if (ws.user === 'teacher') {
            const t_id = ws.t_id;
            if (teachers.has(t_id)) {
                teachers.delete(t_id);                                                            // Removing the teacher from the teachers map
                console.log(`Teacher with t_id ${t_id} disconnected`);
                
                // Disconnect all students of this t_id
                if (students.has(t_id)) {
                    const connections = students.get(t_id);
                    connections.forEach(studentWs => {
                        studentWs.send(JSON.stringify({message: 'Teacher disconnected' }));
                        studentWs.close();
                    });
                    students.delete(t_id);
                }
            }
        }
    });

    
    // Handle WebSocket errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

