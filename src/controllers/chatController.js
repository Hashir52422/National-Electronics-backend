const ApiError = require('../utils/ApiError');

// POST /api/v1/chat
// Proxies to ai-service and pipes its Server-Sent Events stream straight
// through to the client. Not wrapped in asyncHandler: once the SSE headers
// are flushed, the response can no longer become a JSON error, so failures
// after that point are swallowed (the connection just ends) rather than
// forwarded to the global error handler.
async function sendChatMessage(req, res, next) {
  console.log('[backend:chatController] POST /api/v1/chat hit, body =', JSON.stringify(req.body));

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    console.log('[backend:chatController] rejecting: messages array missing/empty');
    return next(new ApiError(400, 'messages array is required'));
  }

  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
  console.log(`[backend:chatController] forwarding to ${aiServiceUrl}/chat`);

  let upstream;
  try {
    upstream = await fetch(`${aiServiceUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, userId: req.user?._id }),
    });
    console.log(`[backend:chatController] ai-service responded, status=${upstream.status}, ok=${upstream.ok}, has body=${!!upstream.body}`);
  } catch (err) {
    console.error('[backend:chatController] fetch to ai-service THREW (unreachable):', err.message);
    return next(new ApiError(502, 'AI service is unreachable'));
  }

  if (!upstream.ok || !upstream.body) {
    console.error(`[backend:chatController] ai-service returned non-ok/no-body -- status=${upstream.status}`);
    return next(new ApiError(502, 'AI service returned an error'));
  }

  console.log('[backend:chatController] flushing SSE headers to client (status 200 committed now)');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  req.on('close', () => {
    console.log('[backend:chatController] client closed connection -- cancelling upstream reader');
    reader.cancel().catch(() => {});
  });

  let chunkCount = 0;
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log(`[backend:chatController] upstream stream done after ${chunkCount} chunk(s)`);
        break;
      }
      chunkCount++;
      const text = decoder.decode(value, { stream: true });
      console.log(`[backend:chatController] proxying chunk #${chunkCount} (${text.length} bytes):`, text);
      res.write(text);
    }
  } catch (err) {
    // Connection to ai-service likely broke mid-stream -- best effort, the
    // client just sees the stream end early.
    console.error(`[backend:chatController] error while reading upstream stream (after ${chunkCount} chunk(s)):`, err.message);
  } finally {
    console.log('[backend:chatController] res.end() -- connection closing');
    res.end();
  }
}

module.exports = { sendChatMessage };
