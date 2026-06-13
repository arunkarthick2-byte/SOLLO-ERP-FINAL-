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
        try {
            // ENTERPRISE FIX: Wrap the Google API in a shield to prevent ad-blockers from crashing the app!
            await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
            gapiInited = true;
            maybeEnableButtons();
        } catch (err) {
            console.error("Google API Blocked by Firewall/Ad-Blocker:", err);
            if (window.Utils) window.Utils.showToast("⚠️ Cloud Sync blocked by your network or ad-blocker!");
        }
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

const maybeEnableButtons = () => {
    if (gapiInited && gisInited) {
        const statusEl = document.getElementById('cloud-status-tab');
        if(statusEl) {
            statusEl.innerText = 'Google Drive Sync Ready';
            statusEl.style.color = 'var(--md-success)';
        }
    }
};

const Cloud = {
    authenticate: (callback) => {
        if (!gapiInited || !gisInited) {
            alert("Google Cloud Services are still loading. Please check your internet connection.");
            return;
        }
        if (gapi.client.getToken() === null) {
            // Prompt the user to log in
            tokenClient.callback = async (resp) => {
                // ENTERPRISE FIX: Gracefully handle aborted logins instead of throwing an unhandled exception that breaks the app!
                if (resp.error !== undefined) {
                    console.error("Google Auth Error:", resp.error);
                    alert("Google Drive login was cancelled or failed.");
                    return; 
                }
                callback();
            };
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            // Already logged in
            callback();
            // FIX: Removed Cloud.autoBackup() from here to prevent a massive Race Condition!
            // Running a manual backup and an auto-backup at the exact same millisecond causes Drive API crashes.
        }
    },

    autoBackup: async () => {
        // Halt if API isn't loaded
        if (!gapiInited || !gisInited) return;
        
        // ENTERPRISE FIX: COMPLETELY KILL THE SILENT TOKEN REQUEST!
        // Google Auth violently interrupts the screen to check accounts even when prompt is set to ''.
        // Auto-backup will now ONLY run if the user is already actively logged in!
        if (gapi.client.getToken() === null) {
            console.warn("Cloud Sync skipped: User not logged in this session.");
            return; 
        }
        
        const lastBackup = localStorage.getItem('sollo_last_backup');
        const now = Date.now();
        
        // 🚨 ENTERPRISE FIX: 3600000 ms = 1 Hour! 
        // Allows the App-Switch trigger to safely secure your active daily work without hitting Google API rate limits!
        if (!lastBackup || (now - parseInt(lastBackup)) > 3600000) {
            console.log("Triggering silent background auto-backup...");
            try {
                // FIX: Call the globally mapped export function directly
                const data = await window.exportDatabase(); 

                // ENTERPRISE FIX: Dynamically stream ALL database tables safely without missing any schemas!
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
                
                // ENTERPRISE FIX: Auto-Backup must also isolate by Firm ID to stop cross-company overwrites!
                const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : 'firm1';
                const backupFileName = `SOLLO_ERP_Backup_${activeFirmId}.json`;
                
                const metadata = { 'name': backupFileName, 'mimeType': 'application/json' };

                let response = await gapi.client.drive.files.list({
                    q: `name='${backupFileName}' and trashed=false`,
                    spaces: 'drive', fields: 'files(id)'
                });

                // STRICT ERP LOGIC: Hunt down and destroy Google Drive duplicates in the background to prevent version fragmentation!
                let fileId = null;
                if (response.result.files.length > 0) {
                    fileId = response.result.files[0].id;
                    // If Drive allowed ghost duplicates, nuke all of them except the primary one!
                    if (response.result.files.length > 1) {
                        for (let i = 1; i < response.result.files.length; i++) {
                            await gapi.client.drive.files.delete({ fileId: response.result.files[i].id });
                        }
                    }
                }
                
                // ENTERPRISE FIX: Applied the Safe-Split Upload to the Auto-Backup engine!
                let finalFileId = fileId;
                
                if (!finalFileId) {
                    const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: new Headers({ 
                            'Authorization': 'Bearer ' + gapi.client.getToken().access_token,
                            'Content-Type': 'application/json'
                        }),
                        body: JSON.stringify(metadata)
                    });
                    const metaData = await metaRes.json();
                    finalFileId = metaData.id;
                }

                let uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${finalFileId}?uploadType=media`, {
                    method: 'PATCH',
                    headers: new Headers({ 
                        'Authorization': 'Bearer ' + gapi.client.getToken().access_token,
                        'Content-Type': 'application/json'
                    }),
                    body: file
                });

                if (uploadRes.ok) {
                    localStorage.setItem('sollo_last_backup', now.toString());
                    if (window.Utils) window.Utils.showToast("☁️ Auto-Backup Completed in Background!");
                } else if (uploadRes.status === 401) {
                    console.warn("⚠️ Token expired. Attempting silent background renewal...");
                    
                    // 🚨 ENTERPRISE FIX: The Silent Token Renewer!
                    // If the 1-hour token expires, quietly ask Google for a new one without showing a popup!
                    tokenClient.callback = async (resp) => {
                        if (resp.error !== undefined) {
                            gapi.client.setToken(null);
                            if (window.Utils) window.Utils.showToast("⚠️ Cloud Sync Paused. Please manually Backup to reconnect.");
                        } else {
                            console.log("✅ Token renewed silently! Resuming background backup...");
                            window.Cloud.autoBackup(); // Instantly retry the backup with the new token!
                        }
                    };
                    
                    // prompt: '' skips the account selection screen and auto-renews if the user is already trusted!
                    tokenClient.requestAccessToken({ prompt: '' });
                }
            } catch (e) {
                console.error("Auto backup failed quietly", e);
            }
        }
    },

    backup: async () => {
        Cloud.authenticate(async () => {
            window.Utils.showToast("Preparing Backup...");
            try {
                // FIX: Call the globally mapped export function directly
                const data = await window.exportDatabase(); 

                // ENTERPRISE FIX: Dynamically stream ALL database tables safely without missing any schemas!
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
                
                // ENTERPRISE FIX: Isolate cloud backups by Firm ID to prevent cross-company overwrites!
                const activeFirmId = (window.app && window.app.state) ? window.app.state.firmId : 'firm1';
                const backupFileName = `SOLLO_ERP_Backup_${activeFirmId}.json`;
                
                const metadata = {
                    'name': backupFileName,
                    'mimeType': 'application/json'
                };

                // STRICT ERP LOGIC: Hunt down and destroy Google Drive duplicates to prevent version fragmentation!
                let response = await gapi.client.drive.files.list({
                    q: `name='${backupFileName}' and trashed=false`,
                    spaces: 'drive',
                    fields: 'files(id)'
                });

                let fileId = null;
                if (response.result.files.length > 0) {
                    fileId = response.result.files[0].id;
                    // If Drive allowed ghost duplicates, nuke all of them except the primary one!
                    if (response.result.files.length > 1) {
                        for (let i = 1; i < response.result.files.length; i++) {
                            await gapi.client.drive.files.delete({ fileId: response.result.files[i].id });
                        }
                    }
                }
                window.Utils.showToast("Uploading to Google Drive...");

                // ENTERPRISE FIX: Bypass the Google Drive API 'multipart' crash by splitting the upload!
                let finalFileId = fileId;
                
                if (!finalFileId) {
                    // Step 1: Create a perfectly named empty shell file first
                    const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: new Headers({ 
                            'Authorization': 'Bearer ' + gapi.client.getToken().access_token,
                            'Content-Type': 'application/json'
                        }),
                        body: JSON.stringify(metadata)
                    });
                    const metaData = await metaRes.json();
                    finalFileId = metaData.id;
                }

                // Step 2: Inject the raw JSON database directly into that file shell
                let uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${finalFileId}?uploadType=media`, {
                    method: 'PATCH',
                    headers: new Headers({ 
                        'Authorization': 'Bearer ' + gapi.client.getToken().access_token,
                        'Content-Type': 'application/json'
                    }),
                    body: file
                });

                if (uploadRes.ok) {
                    // NEW: Save the timestamp of this successful backup
                    localStorage.setItem('sollo_last_backup', Date.now().toString());
                    window.Utils.showToast("✅ Cloud Backup Successful!");
                } else {
                    if (uploadRes.status === 401) {
                        gapi.client.setToken(null); // Clear expired token to force re-auth
                        alert("Cloud session expired. Please click Backup again to re-authenticate.");
                        return;
                    }
                    throw new Error('Upload failed');
                }
            } catch (e) {
                console.error(e);
                alert("Cloud Backup Failed: " + (e.message || "Connection Error"));
            }
        });
    },

    restore: async () => {
        Cloud.authenticate(async () => {
            window.Utils.showToast("Searching Google Drive...");
            try {
                // 🚨 ENTERPRISE UPGRADE: "NEW PHONE" RECOVERY SHIELD
                // Instead of locking onto a specific Firm ID, this searches your entire Drive for ANY SOLLO backup
                // and automatically sorts them to grab the absolute newest one!
                let response = await gapi.client.drive.files.list({
                    q: `name contains 'SOLLO_ERP_Backup_' and mimeType='application/json' and trashed=false`,
                    spaces: 'drive',
                    orderBy: 'modifiedTime desc', // Forces the newest backup to be file [0]
                    fields: 'files(id, name, modifiedTime)'
                });

                if (response.result.files.length === 0) {
                    alert("No backup found on your Google Drive. Please create a backup first.");
                    return;
                }

                // Automatically selects the most recent backup found on the Drive
                const fileId = response.result.files[0].id;
                const foundName = response.result.files[0].name;
                const modDate = new Date(response.result.files[0].modifiedTime).toLocaleString();

                if (!confirm(`Found backup: ${foundName}\nDate: ${modDate}\n\nDo you want to restore this? WARNING: This will overwrite your current data on this device!`)) {
                    return;
                }

                window.Utils.showToast("Downloading Backup...");

                let fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                    headers: new Headers({ 'Authorization': 'Bearer ' + gapi.client.getToken().access_token }),
                });

                if (fileRes.ok) {
                    let jsonData = await fileRes.json();
                    window.Utils.showToast("Installing Data...");
                    
                    // FIX: Call the globally mapped import function directly
                    await window.importDatabase(jsonData); 
                    
                    window.Utils.showToast("✅ Restore Successful! Reloading...");
                    setTimeout(() => location.reload(), 1500);
                } else {
                    // FIX: Catch expired tokens during Restore to prevent silent failures
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
const executeBackgroundBackup = async () => {
    if (!window.Cloud || typeof window.Cloud.autoBackup !== 'function') return;
    
    // 🚨 ENTERPRISE UPGRADE: BACKGROUND SYNC API
    // If offline, register a sync event so the Service Worker remembers to do it later!
    if (!navigator.onLine) {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(reg => {
                reg.sync.register('sollo-auto-backup');
                console.log("☁️ Offline: Background Sync registered for Drive Backup.");
            });
        }
        return;
    }

    // 🚨 ENTERPRISE FIX: The Multi-Thread Sync Shield!
    // Physically locks the engine so it cannot fire multiple simultaneous uploads if the internet flickers!
    if (window.isCloudSyncing) return;
    window.isCloudSyncing = true; 

    try {
        const firms = await window.getAllRecords('firms');
        if (firms && firms.length > 0) {
            if (typeof gapi !== 'undefined' && gapi.client && gapi.client.getToken() !== null) {
                await window.Cloud.autoBackup();
            }
        }
    } catch (err) { 
        console.warn("Database not ready for auto-backup yet."); 
    } finally {
        // Safely unlock the engine immediately when the process finishes!
        window.isCloudSyncing = false; 
    }
};

// 1. Initial boot backup (Runs 15 seconds after app opens)
setTimeout(executeBackgroundBackup, 15000);

// 2. ENTERPRISE FIX: The "App Switch" Trigger!
// Backgrounding an app kills active fetch streams! We MUST defer the backup until the exact millisecond the user RETURNS to the app!
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // App is back in focus and network is active. Safe to run background checks!
        setTimeout(executeBackgroundBackup, 2000); // 2-second buffer to let the UI render first
    }
});

// 3. (REMOVED) The "Offline Recovery" Trigger was causing a Race Condition! 
// It is now strictly handled by the safe 2-second debouncer in app.js.

