// ==========================================
// SOLLO ERP - GOOGLE DRIVE CLOUD SYNC
// ==========================================

const CLIENT_ID = '965559909950-a9g92ipjvdof9s38r4g4c9avkj86lphf.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// 1. Initialize Google API Client
window.gapiLoaded = () => {
    gapi.load('client', async () => {
        await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
        gapiInited = true;
        maybeEnableButtons();
    });
};

// 2. Initialize Google Identity Services
window.gisLoaded = () => {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Defined dynamically at request time
    });
    gisInited = true;
    maybeEnableButtons();
};

// --- NEW CLOUD BADGE HELPER ---
window.updateSyncBadge = (state, textOverride) => {
    const indicator = document.getElementById('cloud-sync-indicator');
    const icon = document.getElementById('cloud-sync-icon');
    const text = document.getElementById('cloud-sync-text');
    
    if (!indicator || !icon || !text) return;

    if (state === 'syncing') {
        indicator.style.background = '#e3f2fd';
        indicator.style.color = '#0061a4';
        icon.innerText = 'sync';
        text.innerText = textOverride || 'Syncing...';
    } else if (state === 'success') {
        indicator.style.background = '#e8f5e9';
        indicator.style.color = '#146c2e';
        icon.innerText = 'cloud_done';
        text.innerText = textOverride || 'Synced just now';
        
        // Revert back to ready after 5 seconds so it doesn't stay green forever
        setTimeout(() => window.updateSyncBadge('ready', 'Cloud Ready'), 5000);
    } else if (state === 'error') {
        indicator.style.background = '#fff0f2';
        indicator.style.color = '#ba1a1a';
        icon.innerText = 'cloud_off';
        text.innerText = textOverride || 'Sync Failed';
    } else {
        // Standby / Ready Mode
        indicator.style.background = 'var(--md-surface-variant)';
        indicator.style.color = 'var(--md-text-muted)';
        icon.innerText = 'cloud_queue';
        text.innerText = textOverride || 'Cloud Ready';
    }
};

const maybeEnableButtons = () => {
    if (gapiInited && gisInited) {
        const statusEl = document.getElementById('cloud-status-tab');
        if(statusEl) {
            statusEl.innerText = 'Google Drive Sync Ready';
            statusEl.style.color = 'var(--md-success)';
        }
        window.updateSyncBadge('ready', 'Cloud Ready');
    }
};

const Cloud = {
    authenticate: (callback) => {
        if (!gapiInited || !gisInited) {
            alert("Google Cloud Services are still loading. Please check your internet connection.");
            return;
        }
        if (gapi.client.getToken() === null) {
            tokenClient.callback = async (resp) => {
                if (resp.error !== undefined) throw (resp);
                callback();
            };
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            callback();
        }
    },

    autoBackup: async () => {
        if (!gapiInited || !gisInited || gapi.client.getToken() === null) return;
        
        const lastBackup = localStorage.getItem('sollo_last_backup');
        const now = Date.now();
        
        if (!lastBackup || (now - parseInt(lastBackup)) > 86400000) {
            console.log("Triggering silent background auto-backup...");
            if (window.updateSyncBadge) window.updateSyncBadge('syncing', 'Auto-Syncing...');
            
            try {
                const data = await window.exportDatabase(); 

                const blobParts = ['{'];
                const keys = Object.keys(data);
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    blobParts.push(`"${key}":[`);
                    const arr = data[key] || [];
                    for (let j = 0; j < arr.length; j++) {
                        blobParts.push(JSON.stringify(arr[j]));
                        if (j < arr.length - 1) blobParts.push(',');
                    }
                    blobParts.push(']');
                    if (i < keys.length - 1) blobParts.push(',');
                }
                blobParts.push('}');

                const file = new Blob(blobParts, { type: 'application/json' });
                const metadata = { 'name': 'SOLLO_ERP_Backup.json', 'mimeType': 'application/json' };

                let response = await gapi.client.drive.files.list({
                    q: "name='SOLLO_ERP_Backup.json' and trashed=false",
                    spaces: 'drive', fields: 'files(id)'
                });

                let fileId = response.result.files.length > 0 ? response.result.files[0].id : null;
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', file);

                const url = fileId ? 
                    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart` : 
                    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
                
                let uploadRes = await fetch(url, {
                    method: fileId ? 'PATCH' : 'POST',
                    headers: new Headers({ 'Authorization': 'Bearer ' + gapi.client.getToken().access_token }),
                    body: form,
                });

                if (uploadRes.ok) {
                    localStorage.setItem('sollo_last_backup', now.toString());
                    if (window.Utils) window.Utils.showToast("☁️ Auto-Backup Completed in Background!");
                    if (window.updateSyncBadge) window.updateSyncBadge('success', 'Synced just now');
                } else if (uploadRes.status === 401) {
                    gapi.client.setToken(null);
                    if (window.Utils) window.Utils.showToast("⚠️ Cloud Auto-Sync Paused (Session Expired). Please open Data Management to reconnect.");
                    if (window.updateSyncBadge) window.updateSyncBadge('error', 'Session Expired');
                }
            } catch (e) {
                console.error("Auto backup failed quietly", e);
                if (window.updateSyncBadge) window.updateSyncBadge('error', 'Sync Failed');
            }
        }
    },

    backup: async () => {
        Cloud.authenticate(async () => {
            window.Utils.showToast("Preparing Backup...");
            if (window.updateSyncBadge) window.updateSyncBadge('syncing', 'Manual Sync...');
            
            try {
                const data = await window.exportDatabase(); 

                const blobParts = ['{'];
                const keys = Object.keys(data);
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    blobParts.push(`"${key}":[`);
                    const arr = data[key] || [];
                    for (let j = 0; j < arr.length; j++) {
                        blobParts.push(JSON.stringify(arr[j]));
                        if (j < arr.length - 1) blobParts.push(',');
                    }
                    blobParts.push(']');
                    if (i < keys.length - 1) blobParts.push(',');
                }
                blobParts.push('}');

                const file = new Blob(blobParts, { type: 'application/json' });
                const metadata = {
                    'name': 'SOLLO_ERP_Backup.json',
                    'mimeType': 'application/json'
                };

                let response = await gapi.client.drive.files.list({
                    q: "name='SOLLO_ERP_Backup.json' and trashed=false",
                    spaces: 'drive',
                    fields: 'files(id, name)'
                });

                let fileId = response.result.files.length > 0 ? response.result.files[0].id : null;
                window.Utils.showToast("Uploading to Google Drive...");

                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', file);

                const url = fileId ? 
                    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart` : 
                    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
                const method = fileId ? 'PATCH' : 'POST';

                let uploadRes = await fetch(url, {
                    method: method,
                    headers: new Headers({ 'Authorization': 'Bearer ' + gapi.client.getToken().access_token }),
                    body: form,
                });

                if (uploadRes.ok) {
                    localStorage.setItem('sollo_last_backup', Date.now().toString());
                    window.Utils.showToast("✅ Cloud Backup Successful!");
                    if (window.updateSyncBadge) window.updateSyncBadge('success', 'Synced just now');
                } else {
                    if (uploadRes.status === 401) {
                        gapi.client.setToken(null); 
                        if (window.updateSyncBadge) window.updateSyncBadge('error', 'Auth Error');
                        alert("Cloud session expired. Please click Backup again to re-authenticate.");
                        return;
                    }
                    throw new Error('Upload failed');
                }
            } catch (e) {
                console.error(e);
                if (window.updateSyncBadge) window.updateSyncBadge('error', 'Sync Failed');
                alert("Cloud Backup Failed: " + (e.message || "Connection Error"));
            }
        });
    },

    restore: async () => {
        Cloud.authenticate(async () => {
            window.Utils.showToast("Searching Google Drive...");
            try {
                let response = await gapi.client.drive.files.list({
                    q: "name='SOLLO_ERP_Backup.json' and trashed=false",
                    spaces: 'drive',
                    fields: 'files(id, name, modifiedTime)'
                });

                if (response.result.files.length === 0) {
                    alert("No backup found on your Google Drive. Please create a backup first.");
                    return;
                }

                const fileId = response.result.files[0].id;
                const modDate = new Date(response.result.files[0].modifiedTime).toLocaleString();

                if (!confirm(`Found backup from: ${modDate}\n\nDo you want to restore this? WARNING: This will overwrite your current data on this device!`)) {
                    return;
                }

                window.Utils.showToast("Downloading Backup...");

                let fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                    headers: new Headers({ 'Authorization': 'Bearer ' + gapi.client.getToken().access_token }),
                });

                if (fileRes.ok) {
                    let jsonData = await fileRes.json();
                    window.Utils.showToast("Installing Data...");
                    
                    await window.importDatabase(jsonData); 
                    
                    window.Utils.showToast("✅ Restore Successful! Reloading...");
                    setTimeout(() => location.reload(), 1500);
                } else {
                    if (fileRes.status === 401) {
                        gapi.client.setToken(null);
                        alert("Cloud session expired. Please click Restore again to re-authenticate.");
                        return;
                    }
                    throw new Error('Download failed');
                }
            } catch (e) {
                console.error(e);
                alert("Cloud Restore Failed: " + (e.message || "Connection Error"));
            }
        });
    }
};

window.Cloud = Cloud;

// ==========================================
// ENTERPRISE UPGRADE: SILENT BACKGROUND SYNC
// ==========================================
// Exactly 15 seconds after the app opens, it checks if 24 hours have passed since the last backup.
// If yes, it quietly zips the database and sends it to Google Drive without interrupting the user.
setTimeout(() => {
    if (window.Cloud && typeof window.Cloud.autoBackup === 'function') {
        window.Cloud.autoBackup();
    }
}, 15000);

