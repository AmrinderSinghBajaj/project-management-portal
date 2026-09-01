# Deployment Guidelines & Live Automation

## Server & Infrastructure Configuration
- **Live Frontend**: [https://pm.bajajsnooker.shop](https://pm.bajajsnooker.shop) (Hosted on Vercel with automatic GitHub CI/CD from `main` branch).
- **Live Backend**: [http://43.205.129.213:5001](http://43.205.129.213:5001) / proxied via Vercel `/api` rewrite (Running on AWS EC2 instance `43.205.129.213` on Port 5001 under PM2 name `pmp-backend`).
- **Untouched Live App**: `snooker-backend` runs on Port 5000 and must NEVER be stopped or modified.
- **SSH Key Location**: `D:\amii\snooker-key.pem`
- **SSH Command**: `ssh -i "D:\amii\snooker-key.pem" -o StrictHostKeyChecking=no ubuntu@43.205.129.213`
- **One-Command Deployment Script**: `.\deploy.ps1 -Message "your commit message"`

## Two Working Modes (User Directive)

### Mode 1: Local Development ("Make changes on local")
- Make code changes ONLY on local workspace (`d:\Project Management Portal`).
- Verify changes with local dev servers (`npm run dev`).
- Do NOT push to GitHub or deploy to AWS until the user explicitly says "push to live" or "deploy".

### Mode 2: Push to Live ("Push changes to live" or "Make changes directly on live")
- When the user asks to push or make changes on live, the agent MUST autonomously execute:
  1. Commit and push all changes to GitHub (`git push origin main`).
  2. Execute the remote EC2 update via SSH (`ssh -i "D:\amii\snooker-key.pem" ...` or run `.\deploy.ps1`).
  3. Verify that both Vercel frontend and AWS backend are responding with HTTP 200.
  4. Report back the deployment summary to the user.
