async function run() {
    try {
        const response = await fetch('http://localhost:3000/api/webhooks/incoming', {
            method: 'POST',
            body: JSON.stringify({ sender: "123", body: "Hello" }),
            headers: {'Content-Type': 'application/json'}
        });
        const res = await response.json();
        console.log(res);
    } catch (e) {
        console.error(e);
    }
}
run();
