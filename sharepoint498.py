# -*- coding: utf-8 -*-
"""Sharepoint498.ipynb

Automatically generated by Colab.

Original file is located at
    https://colab.research.google.com/drive/1ydacEHZL5sFO2YkXIjhQW4qWB7CeSerp
"""

# 🚀 Install required libraries silently
!pip install -q msal requests

# 📦 Imports
import os
import requests
from msal import PublicClientApplication
from google.colab import files

# ✅ Step 1: Upload the PDF from your computer
print("📁 Please choose your PDF file to upload to SharePoint...")
uploaded = files.upload()  # File picker appears

if not uploaded:
    raise Exception("❌ No file uploaded.")

file_path = list(uploaded.keys())[0]
print(f"📄 File received: {file_path}")

# === 🔐 Azure App Registration Details ===
client_id = "42d4bf53-30f7-4522-ba5e-83a5dff792d6"
tenant_id = "2b30530b-69b6-4457-b818-481cb53d42ae"
authority = f"https://login.microsoftonline.com/{tenant_id}"
scopes = ["Files.ReadWrite.All", "Sites.ReadWrite.All"]

# === 📂 SharePoint Destination ===
sharepoint_site_hostname = "luky.sharepoint.com"
site_path = "/sites/CS498T1"

# 🧾 Ask user for folder name (or use default)
custom_folder = input("📁 Enter the SharePoint folder name (or press Enter to use 'Canvas_class'): ").strip()
folder_name = custom_folder if custom_folder else "Canvas_class"
sharepoint_folder = f"Shared Documents/{folder_name}"

# ✅ Step 2: Authenticate using MSAL Device Code Flow
print("🔐 Authenticating with Microsoft (Duo-compatible login)...")
app = PublicClientApplication(client_id=client_id, authority=authority)
result = None

accounts = app.get_accounts()
if accounts:
    result = app.acquire_token_silent(scopes=scopes, account=accounts[0])

if not result:
    flow = app.initiate_device_flow(scopes=scopes)
    if "user_code" not in flow:
        raise Exception("⚠️ Device flow failed.")
    print(f"🔑 Visit: {flow['verification_uri']}")
    print(f"🔑 Enter code: {flow['user_code']}")
    result = app.acquire_token_by_device_flow(flow)

if "access_token" not in result:
    raise Exception(f"❌ Authentication failed.\n{result.get('error_description')}")

access_token = result["access_token"]
headers = {"Authorization": f"Bearer {access_token}"}

# ✅ Step 3: Get SharePoint Site and Drive IDs
site_url = f"https://graph.microsoft.com/v1.0/sites/{sharepoint_site_hostname}:{site_path}"
site_resp = requests.get(site_url, headers=headers)
site_id = site_resp.json()["id"]
print("📄 Site ID:", site_id)

drive_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive"
drive_id = requests.get(drive_url, headers=headers).json()["id"]
print("📁 Drive ID:", drive_id)

# ✅ Step 4: Create folder (if it doesn't exist)
create_folder_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children"
folder_payload = {
    "name": folder_name,
    "folder": {},
    "@microsoft.graph.conflictBehavior": "replace"
}
folder_resp = requests.post(create_folder_url, headers=headers, json=folder_payload)
if folder_resp.status_code in [200, 201]:
    print(f"📂 Folder '{folder_name}' is ready.")
else:
    print(f"⚠️ Folder may already exist (Status: {folder_resp.status_code})")

# ✅ Step 5: Upload PDF to SharePoint
file_name = os.path.basename(file_path)
upload_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{sharepoint_folder}/{file_name}:/content"

print(f"⏫ Uploading '{file_name}' to SharePoint folder '{sharepoint_folder}'...")

with open(file_path, "rb") as f:
    upload_resp = requests.put(upload_url, headers=headers, data=f)

# ✅ Step 6: Confirm Result
if upload_resp.status_code in [200, 201]:
    print(f"✅ Success! File '{file_name}' uploaded to SharePoint folder '{folder_name}' in site CS498T1.")
else:
    print(f"❌ Upload failed: {upload_resp.status_code}")
    print(upload_resp.text)

