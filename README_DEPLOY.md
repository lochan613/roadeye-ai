Azure App Service deployment instructions — RoadEye

Overview
--------
This repository is a Python (Flask) web application. The repository already contains a Procfile, runtime.txt, and requirements.txt so it can run on a hosted Python platform.

This document explains how to create an Azure Web App and configure GitHub Actions to deploy on push using a publish profile.

Steps
-----
1. Create an Azure subscription (if you don't have one)
   - If you need a free trial: https://azure.microsoft.com/free

2. Create a Resource Group (choose a region close to your users)
   - Azure Portal > Resource groups > Add

3. Create an App Service Plan (Linux)
   - Azure Portal > App Service plans > Add
   - Choose OS: Linux
   - Choose size: B1/B2 is fine for small apps

4. Create a Web App (Linux)
   - Azure Portal > Web Apps > Add
   - Publish: Code
   - Runtime stack: Python 3.11 (or match runtime.txt)
   - OS: Linux
   - App Service Plan: choose the one created earlier
   - After creation, open the Web App's "Configuration" > "General settings" and set Startup Command to: 
     gunicorn --bind=0.0.0.0 --workers=4 app:app
     (This matches the Procfile: `web: gunicorn app:app`)

5. Get the Publish Profile
   - Azure Portal > Your Web App > "Get publish profile" (download)
   - Open the downloaded XML file and copy its full contents.

6. Add GitHub repository secrets
   - On GitHub: your repo > Settings > Secrets and variables > Actions > New repository secret
   - Add two secrets:
     - AZURE_WEBAPP_NAME: the name of the Web App you created (e.g. my-roadeye-app)
     - AZURE_WEBAPP_PUBLISH_PROFILE: the full XML contents of the publish profile file

7. Trigger a deployment
   - Push to branch main (or master). The workflow .github/workflows/azure-webapps-deploy.yml runs on push to main/master and will:
     - set up Python 3.11
     - install dependencies
     - run tests (if any)
     - zip the repository and deploy using the publish profile

Notes & alternatives
--------------------
- Instead of a publish profile, it is recommended for production to use a Service Principal and `azure/login` action for more secure, reusable automation. If you want that, say so and this file can be updated to use a service principal flow.
- If you prefer containerized deployment, a Dockerfile can be added and the workflow changed to build an image and push to Azure Container Registry, then deploy to Web App for Containers or AKS.
- The workflow excludes some files from the deployment zip: .git, .github, __pycache__, and the local SQLite DB (RoadEye.db). If you need the database on the server, use a managed database or include appropriate migration steps.

Troubleshooting
---------------
- If the app fails with import errors, confirm requirements.txt is complete and runtime.txt Python version matches the App Service runtime.
- Check GitHub Actions logs for the Build and Deploy job to see installation or deployment errors.
- Use the Web App's Log Stream in the Azure Portal to view runtime logs.
