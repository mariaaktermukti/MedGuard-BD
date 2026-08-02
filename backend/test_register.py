import requests

url = "http://127.0.0.1:8000/api/users/register/"
data = {
    "username": "mukti_test2",
    "email": "mmukti@test.com",
    "password": "password123",
    "full_name": "Maria Akter",
    "phone": "01765882438",
    "role": "citizen"
}

try:
    response = requests.post(url, json=data)
    print("Status Code:", response.status_code)
    print("Response Text:", response.text)
except Exception as e:
    print("Error:", e)
