# Mini Issue Tracker

A full-stack issue tracking application built with Flask and React, deployed on a VPS with production-ready configuration.

---

## Purpose

This project was built to demonstrate:

- Full-stack development (React + Flask)
- REST API design
- Database modeling with SQLAlchemy
- Authentication implementation
- VPS deployment with Nginx + Gunicorn
- SSL automation using Let's Encrypt
- Linux service management via systemd

---

## Features

- User authentication (hashed password)
- Token-based API protection
- Issue CRUD operations
- Status filtering (open / done)
- Search by title
- Priority management
- Production deployment with HTTPS

---

## Tech Stack

### Backend
- Python
- Flask
- SQLAlchemy
- SQLite
- Gunicorn

### Frontend
- React (Vite)
- Fetch API

### Infrastructure
- Nginx (reverse proxy)
- systemd (service management)
- Let's Encrypt (SSL)
- Cron (automatic renewal)

---

## Architecture

React Frontend  
↓ REST API (JSON)  
Flask Backend  
↓  
SQLite Database  

---

## Security Design

- Passwords stored using werkzeug.security hash
- Token-based endpoint protection
- .env excluded from repository
- Database file excluded from version control
- SSL auto-renewal via cron

---

## Local Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Production Environment

Deployed on a VPS using:

- Gunicorn (WSGI server)
- Nginx (reverse proxy)
- HTTPS via Let's Encrypt
- Auto-renewal tested with certbot renew --dry-run

---

## Live Demo

https://os3-288-33706.vs.sakura.ne.jp/

Demo account:  
username: demo  
password: demo123

---

## Author

Kazuyoshi Okada
