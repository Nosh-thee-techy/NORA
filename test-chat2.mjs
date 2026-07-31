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
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (let i = 0; i < 5; i++) {
    const {done, value} = await reader.read();
    if (done) break;
    console.log("Chunk:", decoder.decode(value));
  }
}
run().catch(console.error);
