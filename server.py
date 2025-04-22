from flask import Flask, request, jsonify
import os, requests
from msal import PublicClientApplication

app = Flask(__name__)

@app.route('/upload-to-sharepoint', methods=['POST'])
def upload_to_sharepoint():
    file = request.files['file']
    folder_name = request.form.get('folder_name', 'Canvas_class')
    os.makedirs('temp', exist_ok=True)
    file_path = os.path.join('temp', file.filename)
    file.save(file_path)

    # MSAL authentication
    client_id = "42d4bf53-30f7-4522-ba5e-83a5dff792d6"
    tenant_id = "2b30530b-69b6-4457-b818-481cb53d42ae"
    authority = f"https://login.microsoftonline.com/{tenant_id}"
    scopes = ["Files.ReadWrite.All", "Sites.ReadWrite.All"]
    app_msal = PublicClientApplication(client_id=client_id, authority=authority)
    result = app_msal.acquire_token_interactive(scopes=scopes)

    if "access_token" not in result:
        return jsonify({"error": "Authentication failed"}), 401

    access_token = result["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Site and Drive
    site_url = "https://graph.microsoft.com/v1.0/sites/luky.sharepoint.com:/sites/CS498T1"
    site_id = requests.get(site_url, headers=headers).json()["id"]
    drive_id = requests.get(f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive", headers=headers).json()["id"]

    # Create folder
    folder_payload = {
        "name": folder_name,
        "folder": {},
        "@microsoft.graph.conflictBehavior": "replace"
    }
    requests.post(
        f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children",
        headers=headers,
        json=folder_payload
    )

    # Upload file
    upload_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/Shared Documents/{folder_name}/{file.filename}:/content"
    with open(file_path, "rb") as f:
        upload_resp = requests.put(upload_url, headers=headers, data=f)

    os.remove(file_path)

    if upload_resp.status_code in [200, 201]:
        return jsonify({"message": "✅ File uploaded!"})
    return jsonify({"error": upload_resp.text}), upload_resp.status_code

if __name__ == '__main__':
    app.run(port=5000, debug=True)

