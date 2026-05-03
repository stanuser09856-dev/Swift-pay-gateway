import fs from 'fs';
import path from 'path';

// Firebase config ab sirf backend ke andar safe rahega
const firebaseConfig = {
  apiKey: "AIzaSyAiFL9osnzeDSzMmLw0yIiELSqHAblenr0",
  authDomain: "gateway-4.firebaseapp.com",
  databaseURL: "https://gateway-4-default-rtdb.firebaseio.com",
  projectId: "gateway-4",
  storageBucket: "gateway-4.firebasestorage.app",
  messagingSenderId: "493956359329",
  appId: "1:493956359329:web:b41ee86e4154fbfa297ce0"
};

export default function handler(req, res) {
    let html = '';
    
    try {
        // Vercel Linux par case-sensitive hota hai, pehle small 'admin.html' check karega
        html = fs.readFileSync(path.join(process.cwd(), 'admin.html'), 'utf8');
    } catch (e1) {
        try {
            // Agar small nahi mila, toh capital 'Admin.html' check karega
            html = fs.readFileSync(path.join(process.cwd(), 'Admin.html'), 'utf8');
        } catch (e2) {
            return res.status(500).json({ error: "File not found! Ensure 'admin.html' is uploaded to the root folder of your project." });
        }
    }
    
    // Config Inject karna
    const configScript = `const firebaseConfig = ${JSON.stringify(firebaseConfig)};`;
    html = html.replace('/* INJECT_FIREBASE_CONFIG */', configScript);
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
