// Isolated API fixture for browser QA; never contacts an AI provider.
import { createServer } from "node:http";
const diagram =
  '<mxfile><diagram id="qa" name="Page-1"><mxGraphModel dx="800" dy="600" grid="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Frontend theme QA" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dbeafe;strokeColor=#2563eb;fontColor=#172554;" vertex="1" parent="1"><mxGeometry x="120" y="100" width="200" height="80" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>';
createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Content-Type", "application/json");
  if (request.method === "OPTIONS") {
    response.end();
    return;
  }
  const send = (data) => response.end(JSON.stringify({ code: "0000", info: "QA fixture", data }));
  if (request.url.endsWith("/query-ai-agent-config-list")) {
    send([
      {
        agentID: "qa-agent",
        agentName: "Drawing assistant · QA",
        agentDesc: "Local browser fixture",
      },
    ]);
    return;
  }
  if (request.url.endsWith("/create_session")) {
    send({ sessionID: crypto.randomUUID() });
    return;
  }
  if (request.url.endsWith("/chat")) {
    let body = "";
    for await (const chunk of request) body += chunk;
    const { message = "" } = JSON.parse(body || "{}");
    if (message.includes("slow")) await new Promise((resolve) => setTimeout(resolve, 3000));
    if (message.includes("error")) {
      response.statusCode = 500;
      response.end("QA requested failure");
      return;
    }
    send({ content: message.includes("draw") ? diagram : "QA response: " + message });
    return;
  }
  response.statusCode = 404;
  response.end("{}");
}).listen(8099, "127.0.0.1", () => console.log("QA API fixture: http://127.0.0.1:8099/api/v1"));
