param (
    [string]$Message = "chore: update live application"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  1-COMMAND LIVE DEPLOYMENT IN PROGRESS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Push to GitHub (Triggers Vercel Frontend Auto-Deploy)
Write-Host "`n[1/2] Committing and Pushing to GitHub..." -ForegroundColor Yellow
git add .
$changes = git status --porcelain
if ($changes) {
    git commit -m "$Message"
    Write-Host "Changes committed successfully." -ForegroundColor Green
} else {
    Write-Host "No new local changes to commit." -ForegroundColor Cyan
}

git push origin main
Write-Host "GitHub push complete. Vercel is auto-deploying frontend to https://pm.bajajsnooker.shop" -ForegroundColor Green

# 2. SSH into AWS EC2 and Update Backend
Write-Host "`n[2/2] Updating Backend on AWS EC2 (Port 5001)..." -ForegroundColor Yellow
$sshKey = "D:\amii\snooker-key.pem"
$ec2Host = "ubuntu@43.205.129.213"
$remoteCmd = "cd /home/ubuntu/project-management-portal && git pull origin main && cd backend && npm install --silent && pm2 restart pmp-backend && pm2 save"

ssh -i "$sshKey" -o StrictHostKeyChecking=no "$ec2Host" "$remoteCmd"

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "  LIVE DEPLOYMENT COMPLETE SUCCESSFULLY!" -ForegroundColor Green
Write-Host "  Portal: https://pm.bajajsnooker.shop" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
