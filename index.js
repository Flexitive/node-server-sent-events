function sse(req, res, next) {
  req.socket.setKeepAlive(true);
  req.socket.setTimeout(0);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.status(200);

  // export a function to send server-side-events
  function send(string) {
    res.write(string);
    // support running within the compression middleware
    if (res.flush && string.match(/\n\n$/)) {
      res.flush();
    }
  }

  function event(event, data) {
    send('event: ' + event + '\n');
    send('data: ' + JSON.stringify(data) + '\n\n');
  }

  res.sse = {
    send: send,
    event: event,
    keepAlive: function keepAlive() {
      send(':keep-alive\n\n');
    },
    error: function error(message) {
      send('data: ' + JSON.stringify({ type: 'error', message: message }) + '\n\n');
    },
    set: function set(name, value) {
      event(name, { type: 'set', value: value });
    },
  };

  // write 2kB of padding (for IE) and a reconnection timeout
  // then use res.sse to send to the client
  res.write(':' + Array(2049).join(' ') + '\n');
  res.sse.send('retry: 2000\n\n');

  // keep the connection open by sending a comment
  var keepAliveTimer = setInterval(res.sse.keepAlive, 20000);

  // cleanup on close and finish
  function cleanup() {
    clearInterval(keepAliveTimer);
  }
  res.on('close', cleanup);
  res.on('finish', cleanup);

  next();
}

module.exports = sse;
