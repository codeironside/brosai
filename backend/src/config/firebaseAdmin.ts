import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

const serviceAccountPath = path.resolve(process.cwd(), 'ajeoba-web-storage-firebase-adminsdk-fbsvc-90adc7dc3d.json');

if (!admin.apps.length) {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'ajeoba-web-storage',
      storageBucket: 'ajeoba-web-storage.firebasestorage.app',
    });
    console.log('✅ Firebase Admin initialized with service account certificate.');
  } else {
    admin.initializeApp({
      projectId: 'ajeoba-web-storage',
      storageBucket: 'ajeoba-web-storage.firebasestorage.app',
    });
    console.log('⚠️ Service account JSON not found, initialized with default Firebase config.');
  }
}

export const adminAuth = admin.auth();
export const adminMessaging = admin.messaging();
export default admin;
