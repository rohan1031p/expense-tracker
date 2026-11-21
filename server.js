// A tiny local web server so the app can be opened with `npm start`.
// It only serves the app's own files and uses no extra packages.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = process.env.PORT || 3000;

// Only these files are served.
const FILES = {
  "/": { file: "index.html", type: "text/html" },
  "/index.html": { file: "index.html", type: "text/html" },
  "/style.css": { file: "style.css", type: "text/css" },
  "/expenses.js": { file: "expenses.js", type: "text/javascript" },
  "/app.js": { file: "app.js", type: "text/javascript" },
};

const server = http.createServer((request, response) => {
  const urlPath = request.url.split("?")[0];
  const entry = FILES[urlPath];

  if (!entry) {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
    return;
  }

  fs.readFile(path.join(__dirname, entry.file), (error, content) => {
    if (error) {
      response.writeHead(500, { "Content-Type": "text/plain" });
      response.end("Could not read file");
      return;
    }
    response.writeHead(200, { "Content-Type": entry.type + "; charset=utf-8" });
    response.end(content);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Expense Tracker running at http://localhost:" + PORT);
});
