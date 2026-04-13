# Getting Started

## Requirements
- Docker installed on your machine.
- Docker Compose to orchestrate multi-container Docker applications.

## Infrastructure Setup with Docker-Compose
1. Clone the repository:
   ```bash
   git clone https://github.com/Suryavamsi53/sre-observability-platform.git
   cd sre-observability-platform
   ```
2. Create a `.env` file in the root of the repository to configure environment variables.
3. Start the infrastructure using Docker Compose:
   ```bash
   docker-compose up -d
   ```
   This will start all necessary services in the background.

## Starting Backend Services
1. After the infrastructure is up, run the following command to build and start the backend services:
   ```bash
   docker-compose build
   docker-compose up -d backend
   ```
   Make sure to replace `backend` with the actual name of your backend service defined in `docker-compose.yml` if different.

## Accessing the Admin Dashboard
- Once the backend is running, you can access the admin dashboard at:
   [http://localhost:PORT](http://localhost:PORT)
   Replace `PORT` with the specific port number configured in your `docker-compose.yml` for the admin dashboard service (default is often `8080`).

Happy Observing!