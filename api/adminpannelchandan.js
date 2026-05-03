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
    let html = '';
    
    try {
        // Pehle small 'admin.html' try karega
        html = fs.readFileSync(path.join(process.cwd(), 'admin.html'), 'utf8');
    } catch (e1) {
        try {
            // Agar nahi mili toh capital 'Admin.html' try karega
            html = fs.readFileSync(path.join(process.cwd(), 'Admin.html'), 'utf8');
        } catch (e2) {
            // Agar dono nahi mili toh Vercel par 404 aane ke bajaye ye error show hoga
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(`
                <h1 style="color:red; text-align:center; margin-top:50px;">ERROR: Admin File Missing!</h1>
                <p style="text-align:center;">Vercel route is working perfectly, but <b>admin.html</b> file is not found in the root directory.</p>
                <p style="text-align:center;">Please ensure <b>admin.html</b> is uploaded right next to your <b>index.html</b></p>
            `);
        }
    }
    
    // Config Inject karna
    const configScript = `const firebaseConfig = ${JSON.stringify(firebaseConfig)};`;
    html = html.replace('/* INJECT_FIREBASE_CONFIG */', configScript);
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
