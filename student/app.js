//-----------------------------This file registers the Service Worker.------------------------------------------------------
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

//----------------------------------------------------Necessary functions------------------------------------------------------------------------

//function to calculate the distance between student and teachers based on lat and long
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;                                                                       // Earth's radius in meters
    const toRadians = degrees => degrees * (Math.PI / 180);

    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;                                                                   // Distance in meters
    return distance;
}

//function to carry out user biometric authentication
function AuthenticateUser(){
    return true;
}


// Function to send student data to Flask server
function sendStudentDataToFlask(studentData,DistanceCheck,BiometricCheck) {
    if(DistanceCheck && BiometricCheck)
    {
        //forming the lecture_id (First 3 chars of UID + Branch + Div+ t_id + lec_name + last 3 chars of UID)
        const lectureId = studentData.uid.substring(0, 3) + studentData.branch + studentData.division + studentData.t_id + studentData.lec_name + studentData.uid.slice(-3);  

        const dataToSend = {
            UID: studentData.uid, 
            roll_no: studentData.rollno, 
            name: studentData.name,
            branch: studentData.branch,
            division: studentData.division,
            lecture_id: lectureId,
            lecture_name: studentData.lec_name,
            teacher_initials: studentData.t_id.toUpperCase()
        };     

        // Sending data to Flask server
        //'https://flask-servers-gqazghgmg7hnbsgv.centralindia-01.azurewebsites.net/attendance_data'
        //'http://127.0.0.1:3001/attendance_data'
        fetch('https://round-robin-d0b9f9dhbzcdbrgn.centralindia-01.azurewebsites.net/round_robin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'validation', 
                data: dataToSend 
            }),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            alert('Attendance Marked Succesfully');
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Error sending student data');
        });
  }
}

//function to get the websocket serverURL as 'fetch' is asynchronous : so a connection attempt with websocket is being made before the fetch reslts
//We are using async/await here forcefully because we require response frome fetch before returning it
async function fetchSocketURL() {
    try {
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
    } catch (error) {
        console.error('Error fetching socket URL:', error);
        alert('Error fetching socket URL');
    }


}

//------------------------------------------- For sending the student data to the websocket----------------------------------------------
let socket=null;

document.getElementById('studentForm').addEventListener('submit', async function(event) {
    event.preventDefault(); 

    const studentData = {
        user: document.getElementById('user').value,
        name: document.getElementById('name').value,
        rollno: document.getElementById('rollno').value,
        uid: document.getElementById('uid').value,
        branch: document.getElementById('branch').value,
        division: document.getElementById('division').value,
        year: document.getElementById('year').value,
        t_id: document.getElementById('t_id').value,
        lec_name: document.getElementById('lec_name').value
    };

    const dataToSend = {
        user: studentData.user,
        t_id: studentData.t_id.toUpperCase(),
        branch:studentData.branch,
        division:studentData.division,
        lec_name:studentData.lec_name.toUpperCase()
    };

    //--------------funcionality to fetch location (Cant call as a function call because it is asynchronous)---------
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
                // Handling errors while fetching location
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        alert('User denied the request for Geolocation.');
                        break;
                    case error.POSITION_UNAVAILABLE:                                              //the device's location is turned off or cannot be determined
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
    

    let socket_serverURL = await fetchSocketURL();
    if (!socket || socket.readyState === WebSocket.CLOSED) {                                      //to avoid creating multiple connection if user clicks on submit multiple times
        // socket = new WebSocket('wss://student-gpfke5b2hha4c0g3.centralindia-01.azurewebsites.net');
        // socket = new WebSocket('ws://localhost:8080');
        socket = new WebSocket(socket_serverURL);
        console.log(`Hello`);
        socket.onopen = function(event) {
            alert('WebSocket connection Established');
            socket.send(JSON.stringify(dataToSend));
            alert('Data sent to the WebSocket Server');
        };
        
        socket.onmessage = function(event) {
            const serverMessage = JSON.parse(event.data);
            if (serverMessage.message) {
                alert('Message from server : '+ serverMessage.message);                                  // Display incoming message as alert
            }
            if(serverMessage.message=='Attendance Started')
            {
                
                const button = document.createElement('button');
                button.classList.add('mt-6', 'w-full', 'h-12', 'bg-gray-500', 'text-white', 'font-semibold', 'rounded-lg', 'shadow-lg', 'hover:bg-gray-600');                
                button.id = 'authenticate';
                button.textContent = 'Authenticate';
                const container = document.getElementById('button-container');
                container.innerHTML='';
                container.appendChild(button);


                alert('Attendance Started');
                alert(`Teacher's Location: Lat ${serverMessage.teacherLocation.latitude}, Long ${serverMessage.teacherLocation.longitude}`);


                const distance = calculateDistance(                                              //calculated distance between student and teacher
                    dataToSend.location.latitude, 
                    dataToSend.location.longitude, 
                    serverMessage.teacherLocation.latitude, 
                    serverMessage.teacherLocation.longitude
                );
                alert(`Distance to teacher: ${distance} meters`);
                distanceCheck = (distance) => distance < 30; 
                DistanceCheck = distanceCheck(distance)
                if(!DistanceCheck)
                {
                    alert('You do not lie in 30m of the teacher');
                    disconnectWebSocket();
                }

                document.getElementById('authenticate').addEventListener('click', function() {
                    BiometricCheck=AuthenticateUser();
                    if(!BiometricCheck)
                    {
                        alert('Unsoccessfull Biometric authentication');
                        disconnectWebSocket();
                    }
                    sendStudentDataToFlask(studentData, DistanceCheck, BiometricCheck);
                });
                
            }
        };
        
        socket.onclose = function(event) {
            alert('WebSocket connection closed');                                                //shows alert when connection is closed
        };
        
        socket.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
    }

});

//-------------------------------------------------Disconnecting with websocket----------------------------------------------------------------------
function disconnectWebSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
    } else {
        alert('WebSocket is not open or already closed');
    }
}
document.getElementById('close').addEventListener('click', disconnectWebSocket);



  
