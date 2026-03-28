const https = require("https");

function proxyRequest(targetPath, authHeader) {
  return new Promise(function(resolve, reject) {
    var opts = {
      hostname: "api.productboard.com",
      port: 443,
      path: targetPath,
      method: "GET",
      headers: {
        "Authorization": authHeader || "",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Version": "1"
      }
    };
    var req = https.request(opts, function(res) {
      var body = "";
      res.on("data", function(chunk) { body += chunk; });
      res.on("end", function() { resolve({ statusCode: res.statusCode, body: body }); });
    });
    req.on("error", function(e) { reject(e); });
    req.setTimeout(30000, function() { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}

exports.handler = async function(event) {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type"
      },
      body: ""
    };
  }

  // Get the path after /pb/
  var path = "/" + (event.path.replace("/.netlify/functions/proxy/", "").replace("/pb/", ""));

  try {
    var result = await proxyRequest(path, event.headers.authorization || event.headers.Authorization || "");
    return {
      statusCode: result.statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Authorization, Content-Type"
      },
      body: result.body
    };
  } catch(err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Proxy error", message: err.message })
    };
  }
};
