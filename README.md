# Backend Engineer Assessment — README

This README is your **single source of truth** to run, understand, and verify the project. It follows the submission instructions exactly and adds a few practical tips learned during setup.

---

## 3.1. Setup & Execution

### Prerequisites
- **Node.js**: v20.x (project builds on Node 20; other recent LTS may work but is not guaranteed)
- **Docker** & **Docker Compose v2**: `docker compose` CLI available
- **Git**: any recent version  
- *(Optional, for local non-Docker dev)* **MongoDB** and **Redis** installed locally

### One-Command Local Run (via Docker)
From the project root:
```bash
docker compose up -d --build

First run only (initialize single-node replica set for MongoDB transactions):

```bash
docker compose exec mongo mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"snappy-mongo:27017"}]})'