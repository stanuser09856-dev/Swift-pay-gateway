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
    try {
        const filePath = path.join(process.cwd(), 'Admin.html');
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Frontend ki file se placeholder dhoondh kar actual config inject kar rahe hain
        const configScript = `const firebaseConfig = ${JSON.stringify(firebaseConfig)};`;
        html = html.replace('/* INJECT_FIREBASE_CONFIG */', configScript);
        
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        res.status(500).json({ error: "Admin Panel file not found. Ensure Admin.html is in the project root." });
    }
}
