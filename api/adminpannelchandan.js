import fs from 'fs';
import path from 'path';

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
    const url = req.url || '';
    let adminMode = null;

    if (url.includes('adminchandan')) {
        adminMode = 'SUPER';
    } else if (url.includes('adminbhaiid')) {
        adminMode = 'RESTRICTED';
    }

    if (!adminMode) {
        res.setHeader('Content-Type', 'text/html');
        return res.status(403).send(`
            <h1 style="color:red; text-align:center; margin-top:50px;">403 ACCESS DENIED</h1>
            <p style="text-align:center;">You are not authorized to view this page.</p>
        `);
    }

    let html = '';
    
    try {
        html = fs.readFileSync(path.join(process.cwd(), 'admin.html'), 'utf8');
    } catch (e1) {
        try {
            html = fs.readFileSync(path.join(process.cwd(), 'Admin.html'), 'utf8');
        } catch (e2) {
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(`
                <h1 style="color:red; text-align:center; margin-top:50px;">ERROR: Admin File Missing!</h1>
                <p style="text-align:center;">Please ensure <b>admin.html</b> is uploaded.</p>
            `);
        }
    }
    
    const configScript = `
        const firebaseConfig = ${JSON.stringify(firebaseConfig)};
        window.ADMIN_MODE = '${adminMode}';
    `;
    html = html.replace('/* INJECT_FIREBASE_CONFIG */', configScript);
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
