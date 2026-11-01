# Employee Leave Management System

## Project Overview
A web-based Employee Leave Management System developed using React.js, Spring Boot, MySQL, and JWT authentication.

This application helps employees apply for leave, manage leave requests, and track their leave status. Administrators can view employee requests and approve or reject them.

## Technologies Used

### Frontend
- React.js
- JavaScript
- HTML and CSS
- Axios
- Vite

### Backend
- Java 21
- Spring Boot
- Spring Security
- Spring Data JPA
- REST APIs
- JWT Authentication
- Maven

### Database
- MySQL

### Tools
- Visual Studio Code
- Eclipse IDE
- Postman
- Git and GitHub
- XAMPP

## Features

### Employee Features
- User registration and login
- JWT-based authentication
- Apply for leave
- View personal leave requests
- Edit pending leave requests
- Cancel pending leave requests
- Track leave request status

### Admin Features
- Admin login
- View employee leave requests
- Approve or reject leave requests
- Manage leave applications

## Project Structure

```text
Employee-Leave-Management-System/
│
├── backend/
│   └── Spring Boot Application
│
├── frontend/
│   └── React Application
│
├── database/
│   └── SQL Files
│
├── .gitignore
└── README.md
```

## Database Configuration

1. Start MySQL using XAMPP.
2. Create a database named `settribe_leave_db`.
3. Configure your database username and password in `application.properties`.
4. Configure the JWT secret using an environment variable.

## How to Run the Project

### 1. Start Backend

Open the backend project in Eclipse and run:

`LeaveManagementApplication.java`

Backend URL:

`http://localhost:8080`

### 2. Start Frontend

Open the frontend folder in VS Code terminal and execute:

```bash
npm install
npm run dev
```

Frontend URL:

`http://localhost:5173`

### 3. Test APIs

Use Postman to test the Spring Boot REST APIs.

## Authentication

The application uses JWT authentication and Spring Security to protect APIs and control access based on user roles.

Passwords are securely hashed using BCrypt.

## Developer

Developed as part of the SETTribe LLP Intern Assessment.

**Project:** Employee Leave Management System
