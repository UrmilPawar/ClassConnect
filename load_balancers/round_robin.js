const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');

const app = express(); // Creating the instance of the Express application
const PORT = 5000;

app.use(cors());

// Middleware to parse incoming JSON request bodies
app.use(bodyParser.json());

const servers = [
    'https://flask-servers-gqazghgmg7hnbsgv.centralindia-01.azurewebsites.net'
    // 'http://127.0.0.1:3002',
];

// Variable to keep track of the current server index
let currentServerIndex = 0;

// POST endpoint to handle the incoming request
app.post('/round_robin', async (req, res) => {
    const { type, data } = req.body;
    console.log('Received Data:', data);

    const server = servers[currentServerIndex];
    currentServerIndex = (currentServerIndex + 1) % servers.length;

    try {
        let response;
        let serverUrl;

        // Determine the appropriate server based on the request type
        switch (type) {
            case 'validation':
                serverUrl = server + '/attendance_data'; // Validation server URL
                break;
            case 'report':
                serverUrl = server + '/report_data'; // Report generation server URL
                break;
            case 'insert':
                serverUrl = server + '/student_data'; // Student data insertion server URL
                break;
            default:
                return res.status(400).json({ message: 'Invalid request type' });
        }
        console.log(serverUrl);
        // Sending the student data to the appropriate server
        response = await axios.post(serverUrl, data);  //axios bydeafult converst data to json

        res.status(response.status).json({
            message: 'Request processed successfully!',
            dataToReturn: response.data,
        });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({
            message: 'Error processing request.',
        });
    }
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server is running on http://127.0.0.1:${PORT}`);
});



