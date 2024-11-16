from flask import Flask,request, jsonify
import pymysql
from flask_cors import CORS
from mysql.connector import pooling
import os

#-----------------------------------------------------------------Flask App definitions----------------------------------------------
app=Flask(__name__)
CORS(app)

#similar to just a single conection but it will allow other routes to use the connection simultaneausly
db_user = os.environ.get('MYSQL_USER')
db_password = os.environ.get('MYSQL_PASSWORD')
db_host = os.environ.get('MYSQL_HOST')
db_port = int(os.environ.get('MYSQL_PORT'))
db_name = os.environ.get('MYSQL_DATABASE')

pool = pooling.MySQLConnectionPool(
    pool_name="mypool",
    pool_size=5,
    user=db_user, 
    password=db_password,
    host=db_host, 
    port=db_port,
    database=db_name,
    ssl_ca="/certificate/DigiCertGlobalRootG2.crt.pem", 
    ssl_disabled=False
)

#------------------------------------------------------------Routes for the server---------------------------------------------
#Route for handling Lecture Insertion amd mapping studnet Database
@app.route('/attendance_data',methods=["POST"])
def validation_server():
    ans=''    #for storing return statement because if returned directly finally block may never get executed
    # Parsing the JSON data
    data = request.get_json()
    try:
        # Extracting necessary details from the data object
        UID = data.get('UID')
        roll_no = data.get('roll_no')
        name = data.get('name')
        branch = data.get('branch')
        division = data.get('division')
        l_id = data.get('lecture_id')
        lecture_name = data.get('lecture_name')
        teacher_initials = data.get('teacher_initials')
        
        conn = pool.get_connection()
        cursor = conn.cursor()
        # If lecture exists just update name; if not, insert into lecture_details
        insert_lecture_query = """INSERT INTO lecture_details (l_id, lecture_name, branch, division, teacher_initials, date) VALUES (%s, %s, %s, %s, %s, CURDATE()) 
        ON DUPLICATE KEY UPDATE lecture_name = VALUES(lecture_name);"""
        cursor.execute(insert_lecture_query, (l_id, lecture_name, branch, division, teacher_initials))

        # Mapping student and lecture (if student submits multiple times-instaed of error for dulicate key the apprpriate UID or LID will change)
        mapping_query = """INSERT INTO attendance (UID, l_id) VALUES (%s, %s) ON DUPLICATE KEY UPDATE UID = VALUES(UID), l_id = VALUES(l_id);;"""
        cursor.execute(mapping_query, (UID, l_id))

        # Commitng the transaction
        conn.commit()
        ans= jsonify({"message": "Data inserted successfully"}), 200
    except Exception as err:
        ans= jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()        #Returning the connection back to the pool
    return ans


#Route for Insertig Student Details
@app.route('/student_data',methods=['POST'])
def update_database():
    ans=''
    data = request.json
    students = data.get('students')                    #Extracting the list of studnets
    try:
        conn = pool.get_connection()
        cursor = conn.cursor()
        #preparing insert query along with handling (duplicate key insertion: Updates the original value)
        insert_query = """
        INSERT INTO student_details (UID, roll_no, name) VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE roll_no=VALUES(roll_no), name=VALUES(name);
        """
        #iterating for each student 
        for student in students:
            UID = student.get('UID')
            roll_no = student.get('roll_no')
            name = student.get('name')  
            cursor.execute(insert_query, (UID, roll_no, name))
             
        #Performing final commit  
        conn.commit()
        ans=jsonify({"message": "Student data updated successfully!"}), 200
    except Exception as err:
        ans=jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()
    return ans


# Route for retriving the data for report generation
@app.route('/report_data', methods=['POST'])
def get_students_by_lecture():
    ans=''
    data = request.json
    l_id=data.get('lecture_id')
    try:
        conn = pool.get_connection()
        cursor = conn.cursor()
        query = """
        SELECT s.roll_no, s.name FROM student_details s
        INNER JOIN attendance a 
        ON s.UID = a.UID
        WHERE a.l_id = %s;
        """
        cursor.execute(query, (l_id,))  
        results = cursor.fetchall()

        # Preparing a list of dictionaries to hold the student details
        students = []
        for row in results:
            student = {
                "roll_no": row[0],
                "name": row[1]
            }
            students.append(student)

        ans= jsonify({"students": students}), 200
    except Exception as err:
        ans= jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()
        
    return ans


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)