//------------------------------------------------This file registers the Service Worker.----------------------------------
// if ('serviceWorker' in navigator) {                                                     
//     window.addEventListener('load', () => {
//         navigator.serviceWorker.register('/service-worker.js')
//         .then(registration => {
//             console.log('Service Worker registered ', registration.scope);  //the succussfu registration will return an object to be named as 'regisration' containing information about the service worker
//         })
//         .catch(error => {
//             console.error('Service Worker registration failed:', error);
//         });
//     });
// }

//function to get the websocket serverURL as 'fetch' is asynchronous : so a connection attempt with websocket is being made before the fetch reslts
async function fetchSocketURL() {
    const response = await fetch('https://least-connections-gthjh7ddgtc0eqcs.centralindia-01.azurewebsites.net', {
        method: 'GET',
        mode: 'cors', // Ensure CORS is enabled
        headers: {
            'Content-Type': 'application/json',
        }
    });

    const data = await response.json();  // Wait for the response to be parsed
    alert(`fetched : ${data.server}`)
    return data.server;  // Return the server URL
}


//------------------------------------------- For sending the signal to the websocket----------------------------------------------
let socket=null;
let teacherData = {};
let dataToSend={}

document.getElementById('teacherForm').addEventListener('submit', async function(event) {
    event.preventDefault(); 

    teacherData = {
        user: document.getElementById('user').value,
        name: document.getElementById('name').value,
        branch: document.getElementById('branch').value,
        division: document.getElementById('division').value,
        year: document.getElementById('year').value,
        t_id: document.getElementById('t_id').value,
        lec_name: document.getElementById('lec_name').value,
        pass_year: document.getElementById('pass_year').value    //extracted as string
    };

    dataToSend = {
        user: teacherData.user,
        t_id: teacherData.t_id.toUpperCase(),
        branch: teacherData.branch,
        division: teacherData.division,
        lec_name: teacherData.lec_name.toUpperCase(),
        location: {},
        action: null
    };

    //--------------funcion to fetch location (Cant call as a function call because it is asynchronous)---------
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                // Set the location in dataToSend
                dataToSend.location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                alert('Location fetched successfully: Latitude: ' + dataToSend.location.latitude + ', Longitude: ' + dataToSend.location.longitude);
            },
            function (error) {
                // Handle errors
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        alert('User denied the request for Geolocation.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert('Location information is unavailable.');
                        break;
                    case error.TIMEOUT:
                        alert('The request to get user location timed out.');
                        break;
                    case error.UNKNOWN_ERROR:
                        alert('An unknown error occurred.');
                        break;
                }
            }
        );
    } else {
        alert('Geolocation is not supported by this browser.');
    }

    socket_serverURL =await fetchSocketURL();
    if (!socket || socket.readyState === WebSocket.CLOSED) {   //to avoid creating multiple connection if user clicks on submit multiple times
        // socket = new WebSocket('wss://student-gpfke5b2hha4c0g3.centralindia-01.azurewebsites.net');
        // socket = new WebSocket('ws://localhost:8081');
        socket = new WebSocket(socket_serverURL);

        socket.onopen = function(event) {
            alert('WebSocket connection Established');
            dataToSend.action = 'connect';
            socket.send(JSON.stringify(dataToSend));
            alert('Data sent to the WebSocket Server');
        };
        
        socket.onmessage = function(event) {
            const serverMessage = JSON.parse(event.data);
            if (serverMessage.status === 'success') {
                alert('Data Received by the server');
            }
        };
        
        socket.onclose = function(event) {
            alert('WebSocket connection closed',event);                  //shows alert when connection is closed
            console.log('WebSocket connection closed',event); 
        };
        
        socket.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
    }
});

//-------------------------------------------------Necessary Functions-------------------------------------------

//Function to start the attendnace
document.getElementById('start').addEventListener('click', function() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        dataToSend.action = 'start';
        socket.send(JSON.stringify(dataToSend));
        alert('Start message sent to the WebSocket Server');
    } else {
        alert('WebSocket is not connected');
    }
});

// Function to fetch student data from the Flask server
function fetchteacherData() {
    //Getting the course duration
    passYear=teacherData.pass_year;
    admissionYear = Number(passYear) - 4;
    passYearLastTwoDigits = passYear.slice(-2);
    admissionYearLastTwoDigits = String(admissionYear).slice(-2);


    const lectureId = passYearLastTwoDigits+ '-' + teacherData.branch + teacherData.division + teacherData.t_id + teacherData.lec_name + '-' +admissionYearLastTwoDigits;
    const lectureData = {
        lecture_id: lectureId
    };

    //'https://flask-servers-gqazghgmg7hnbsgv.centralindia-01.azurewebsites.net/report_data'
    //'http://127.0.0.1:3001/report_data'
    fetch('https://round-robin-d0b9f9dhbzcdbrgn.centralindia-01.azurewebsites.net/round_robin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type:'report',
            data : lectureData
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Data received:', data); // Log the data received
        student_data=data.dataToReturn;
        displaystudentData(student_data);
        alert('Student data fetched successfully');
    })
    .catch((error) => {
        console.error('Error fetching student data:', error);
        alert('Error fetching student data');
    });
}


// Function to display student data in a table format
function displaystudentData(studentData) {
    const students = studentData.students; // Accessing the 'students' array
    const container = document.getElementById('TableBody');

    // Clearing any previous data
    container.innerHTML = '';

    // Create a table
    const table = document.createElement('table');
    table.classList.add('min-w-full', 'bg-white', 'shadow-md', 'rounded-lg', 'overflow-hidden', 'border', 'border-gray-300');

    // Create table header
    const headerRow = document.createElement('tr');
    headerRow.classList.add('bg-gray-200', 'text-gray-600', 'text-left', 'uppercase', 'text-xs', 'font-semibold', 'border-b', 'border-gray-300');
    const headers = ['Name', 'Roll Number'];
    headers.forEach(headerText => {
        const header = document.createElement('th');
        header.classList.add('px-6', 'py-3');
        header.textContent = headerText;
        headerRow.appendChild(header);
    });
    table.appendChild(headerRow);

    // Check if students array is empty
    if (students.length === 0) {
        alert('No Students in the class');
    } else {
        // Create rows for each student object in the array
        students.forEach(student => {
            const dataRow = document.createElement('tr');
            dataRow.classList.add('border-b', 'border-gray-200', 'hover:bg-gray-100'); // Add hover effect and border
            const values = [student.name, student.roll_no]; // Get name and roll number
            values.forEach(value => {
                const cell = document.createElement('td');
                cell.classList.add('px-6', 'py-4', 'text-gray-700');
                cell.textContent = value;
                dataRow.appendChild(cell);
            });
            table.appendChild(dataRow);
        });
    }

    // Appending the table to the container
    container.appendChild(table);
}




//-------------------------------------------------Disconnecting with websocket----------------------------------------------------------------------
function disconnectWebSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
        fetchteacherData();
    } else {
        alert('WebSocket is not open or already closed');
    }
}
document.getElementById('close').addEventListener('click', disconnectWebSocket);




































// const ws = new WebSocket('ws://localhost:8765?role=teacher&teacherId=TEACHER_ID');

// ws.onopen = () => {
//     console.log('Connected as teacher');
// };

// ws.onmessage = (event) => {
//     const message = JSON.parse(event.data);
//     console.log(`Message from student: ${message.text}`);
// };

// document.getElementById('sendMessage').addEventListener('click', () => {
//     const text = document.getElementById('messageInput').value;
//     ws.send(JSON.stringify({ type: 'sendMessage', text }));
// });



