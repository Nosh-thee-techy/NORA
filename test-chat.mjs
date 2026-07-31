async function run() {
  const res = await fetch("http://localhost:8080/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemma4:e4b",
      messages: [{role: "user", content: "hello"}],
      stream: true
    })
  });
  console.log("Status:", res.status, res.headers);
  const text = await res.text();
  console.log("Body:", text);
}
run().catch(console.error);
