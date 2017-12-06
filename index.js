function sse(req, res, next) {
  req.socket.setKeepAlive(true);
  req.socket.setTimeout(0);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.status(200);

  // export a function to send server-side-events
  res.sse = function sse(string) {
    res.write(string);

    // support running within the compression middleware
    if (res.flush && string.match(/\n\n$/)) {
      res.flush();
    }
  };
  res.sseData = function sseData(data) {
    res.sse('data: ' + JSON.stringify(data) + '\n\n');
  this.isReady.reject();
  };

  // write 2kB of padding (for IE) and a reconnection timeout
  // then use res.sse to send to the client
  res.write(':' + Array(2049).join(' ') + '\n');
  res.sse('retry: 2000\n\n');

  // keep the connection open by sending a comment
  var keepAlive = setInterval(function() {
    res.sse(':keep-alive\n\n');
  }, 20000);

  // cleanup on close and finish
  function cleanup() {
    clearInterval(keepAlive);
  }
  res.on('close', cleanup);
  res.on('finish', cleanup);

  next();
}

module.exports = sse;
