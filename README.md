# ClassConnect

**ClassConnect** is an application designed to help teachers take attendance efficiently with just a click on their mobile devices. This system integrates biometric authentication and geolocation verification to ensure accurate attendance tracking.

## Workflow

1. **Login and Channel Creation**:
   - Teachers and students open their respective interfaces of the application.
   - Upon login, a dedicated channel is created for each teacher on the WebSocket server.

2. **Student Connection**:
   - Students can join their respective teacher's channel by logging in.

3. **Starting Attendance**:
   - When a teacher clicks on the "Start" button, all connected students on that channel will receive a signal indicating the start of the attendance session.

4. **Biometric Authentication**:
   - An interface will open on the students' devices, prompting them to authenticate themselves using their biometric data (e.g., fingerprint).

5. **Geolocation Check**:
   - The student's geolocation is captured to ensure they are within a specified radius of the teacher.

6. **Attendance Marking**:
   - If a student successfully authenticates their biometrics and is within the defined radius, their data is stored in the session database, and they are marked as present.

7. **End of Session Report**:
   - When the teacher clicks the "Stop" button, a report of all students marked present during the session is generated from database and provided to the teacher.

## System Architecture
The system architecture is divided into three major phases: 
1. **Client Connection and Session Initialization**:
   ![Phase 1](/images/phase1.jpg)
2. **Attendance Verification and Marking**:
   ![Phase 2](/images/phase2.jpg)
3. **Session Closure and Report Generation**:
   ![Phase 3](/images/phase3.jpg)

## Following is the high-level representation of the system
   ![Project Architecture](/images/architecture.jpg)

 ## System Analysis
 1. ### **Data Flow Diagram**
    ![Project Architecture](/images/DFD.jpg)

    
 2. ### **Functional Model**: Use Case Diagram 
    ![Project Architecture](/images/Use_Case_Diagram.png)

    
 3. ### **Structural Model**: Component Diagram
    ![Project Architecture](/images/Component_Diagram.png)

    
 4. ### **Behavioural Model**: Sequence Diagram
    ![Project Architecture](/images/Sequence_Diagram.png)


 ## Deployment
The project is deployed on **Azure** under the resource group `ClassConnect`. The following are the key components of the resource group:

1. **WebSocket Server (App Service)**: Handles communication between teachers and students (named as **student** on Azure).
2. **Flask Servers (App Service)**: Validation server (marks student present in the database), Report Generation server (generates report for teachers), and Student Data insertion server (inserts new student data or updates existing student data in the database), (named as **flask-servers** on Azure).
3. **MySQL Database Server (Azure Database for MySQL flexible server)**: Manages lecture data and stores attendance records (named as **classconnect-database** on Azure).
4. **Redis Server (Virtual Machine)**: Enables communication between WebSockets and Least connection load balancer through **classconnect-channel**. The server is hosted on a Virtual Machine using **Docker** (named as **redis-server** on Azure).
5. **Virtual Network**: Holds the network interface for the redis-server VM (named as **ClassConnect-VNet** on Azure).
6. **Least Connections Load Balancer (App Service)**: Provides students and teachers with the URL of the WebSocket server with least number of active connections (named as **least-connections** on Azure).
7. **Round Robin Load Balancer (App Service)**: Routes the student and teacher requests for interacting with database using round-robin algorithm (named as **round-robin** on Azure).
8. **Websocket server-2 (App Service)**: An additional WebSocket server to handle communication between teachers and students (named as **websocket-2** on Azure).

Following is the overview :
   
![Architecture Image](/images/azure-portal.png)


## Documentation
The following link provides a detailed explanation of how ClassConnect works:
[Documnetation](https://docs.google.com/document/d/1BGWqbTcxqxrzSTfwpRdzLHxN-rtOvTsP/edit?usp=sharing&ouid=100036865083389644506&rtpof=true&sd=true)
