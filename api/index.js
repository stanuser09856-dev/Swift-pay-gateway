import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, query, orderByChild, equalTo, update } from "firebase/database";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAiFL9osnzeDSzMmLw0yIiELSqHAblenr0",
  authDomain: "gateway-4.firebaseapp.com",
  databaseURL: "https://gateway-4-default-rtdb.firebaseio.com",
  projectId: "gateway-4",
  storageBucket: "gateway-4.firebasestorage.app",
  messagingSenderId: "493956359329",
  appId: "1:493956359329:web:b41ee86e4154fbfa297ce0"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Bot Configuration ---
const BOT_TOKEN = "8440520277:AAG-DcrzOHZ2jFtvMofUdgxK2ATPFvdwkwM";

async function sendTelegramMsg(chatId, text) {
    try {
        if (!chatId) return false;
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text })
        });
        return true;
    } catch (e) { 
        return false; 
    }
}

// --- Helper Functions ---
const get10DigitNumber = (num) => {
    const cleaned = String(num || "").replace(/\D/g, "");
    return cleaned.slice(-10);
};

const getUserIP = (req) => {
    let ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    return ip.split(',')[0].trim().replace(/\./g, '_');
};

// --- Main API Handler ---
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { key, paytm, amount, number } = req.query;
        const userIP = getUserIP(req);
        
        let rawKey = String(key || "").trim();
        const withdrawAmount = parseFloat(amount);
        
        let safeKey = rawKey;
        if (rawKey.includes("http") && rawKey.includes("key=")) {
            const urlMatch = rawKey.match(/key=(SP-[a-zA-Z0-9]+)/i);
            if (urlMatch) safeKey = urlMatch[1].toUpperCase();
        } else {
            const cleanMatch = rawKey.match(/(SP-[a-zA-Z0-9]{6,15})/i);
            if (cleanMatch) safeKey = cleanMatch[1].toUpperCase();
        }

        if (!safeKey) return res.status(400).json({ status: "error", message: "Missing API Key!" });
        if (/[.#$\[\]\/]/.test(safeKey)) return res.status(401).json({ status: "error", message: "Invalid API Key format!" });

        const usersRef = ref(db, "users");
        const adminSnap = await get(query(usersRef, orderByChild("apiKey"), equalTo(safeKey)));
        
        if (!adminSnap.exists()) {
            return res.status(401).json({ status: "error", message: "Invalid API Key! Old key is expired or incorrect." });
        }

        let adminPhoneRaw = null, adminData = {};
        adminSnap.forEach((child) => { 
            adminPhoneRaw = child.key; 
            adminData = child.val() || {}; 
        });

        // --- 🛡️ GATEKEEPER & AUTO-BAN LOGIC ---
        if (!adminData.isWhitelisted) {
            
            const ipSnap = await get(ref(db, `banned_ips/${userIP}`));
            if (ipSnap.exists()) {
                return res.status(403).json({ status: "error", message: "Under Maintenance" });
            }

            if (adminData.isBanned && adminData.banReason === 'balance_limit') {
                return res.status(403).json({ status: "error", message: "Under Maintenance" });
            }

            if (parseFloat(adminData.balance) >= 1500) {
                 await update(ref(db), {
                    [`users/${adminPhoneRaw}/isBanned`]: true,
                    [`users/${adminPhoneRaw}/banReason`]: 'balance_limit',
                    [`banned_ips/${adminData.ipAddress || userIP}`]: true
                });
                return res.status(403).json({ status: "error", message: "Under Maintenance" });
            }
        }
        // --- END GATEKEEPER ---

        const adminPhone = get10DigitNumber(adminPhoneRaw);
        const targetNumber = get10DigitNumber(paytm || number);

        if (!adminPhone || adminPhone.length !== 10) return res.status(401).json({ status: "error", message: "Admin phone number is invalid!" });
        if (!targetNumber || targetNumber.length !== 10) return res.status(400).json({ status: "error", message: "Target phone number is invalid!" });
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) return res.status(400).json({ status: "error", message: "Invalid amount provided!" });

        // --- Strict Self-Transfer Ban ---
        if (adminPhone === targetNumber) {
            return res.status(400).json({ status: "error", message: "API Owner cannot send payment to their own number (Self-transfer not allowed)!" });
        }

        const currentAdminBal = parseFloat(adminData.balance) || 0;
        if (currentAdminBal < withdrawAmount) {
            return res.status(400).json({ status: "error", message: "Insufficient Balance in API Owner's wallet!" });
        }

        const receiverSnap = await get(ref(db, `users/${targetNumber}`));
        if (!receiverSnap.exists()) {
            return res.status(404).json({ status: "error", message: "Receiver mobile number is not registered in Swift Pay wallet!" });
        }
        let receiverData = receiverSnap.val() || {};
        const currentReceiverBal = parseFloat(receiverData.balance) || 0;

        const exactDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const txnId = "TXN" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

        const updates = {};
        
        updates[`users/${adminPhoneRaw}/balance`] = currentAdminBal - withdrawAmount;
        updates[`users/${targetNumber}/balance`] = currentReceiverBal + withdrawAmount;

        updates[`transactions/${txnId}`] = { 
            id: txnId, 
            type: "out", 
            title: "Swift Pay API", 
            amount: withdrawAmount, 
            status: "Success", 
            date: exactDate, 
            timestamp: Date.now(), 
            icon: "fa-bolt", 
            color: "blue", 
            name: receiverData.name || targetNumber, 
            number: targetNumber,
            senderName: adminData.name || adminPhone,
            senderId: adminPhone, 
            receiverId: targetNumber,
            isApi: true
        };

        await update(ref(db), updates);

        const rName = receiverData.name || targetNumber;
        const aName = adminData.name || adminPhone;
        
        if (adminData.tgUserId) {
            sendTelegramMsg(adminData.tgUserId, `🚀 Swift Pay: API Payment Sent!\nTo: ${rName}\nAmount: ₹${withdrawAmount}\nTxn ID: ${txnId}`);
        }
        if (receiverData.tgUserId) {
            sendTelegramMsg(receiverData.tgUserId, `💰 Swift Pay: API Payment Received!\nFrom: ${aName}\nAmount: ₹${withdrawAmount}\nTxn ID: ${txnId}`);
        }

        return res.status(200).json({ 
            status: "success", 
            message: `Payment successful to ${targetNumber}`,
            data: { transaction_id: txnId, amount: withdrawAmount, receiver: targetNumber, sender: adminPhone }
        });

    } catch (error) { 
        return res.status(500).json({ status: "error", message: "Server Error: " + (error.message || "Unknown error") }); 
    }
}
