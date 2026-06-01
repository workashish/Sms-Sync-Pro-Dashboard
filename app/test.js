const fetch = require('node-fetch');

async function run() {
    try {
        const response = await fetch('http://localhost:3000/api/webhooks/incoming', {
            method: 'POST',
            body: JSON.stringify({ sender: "123", body: "Hello testsing", type: "message", time: "10:00" }),
            headers: {'Content-Type': 'application/json'}
        });
        const res = await response.json();
        console.log("Status:", response.status, "Body:", res);
    } catch (e) {
        console.error(e);
    }
}
run();
