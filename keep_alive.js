const http = require('http');
http.createServer(function (req, res) {
    res.write("Notify Dealtoday");
    res.end();
}).listen(8080);