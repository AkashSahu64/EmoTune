export function createClientMessageId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function sameId(left, right) {
  return left != null && right != null && String(left) === String(right);
}

function findMessageIndex(messages, incoming) {
  const serverIndex = incoming?._id
    ? messages.findIndex((message) => sameId(message?._id, incoming._id))
    : -1;
  if (serverIndex >= 0) return serverIndex;

  return incoming?.clientMessageId
    ? messages.findIndex((message) =>
        sameId(message?.clientMessageId, incoming.clientMessageId),
      )
    : -1;
}

function insertChronologically(messages, incoming) {
  const incomingTime = new Date(incoming?.createdAt || 0).getTime();
  if (!Number.isFinite(incomingTime) || messages.length === 0) {
    return [...messages, incoming];
  }

  const insertAt = messages.findIndex((message) => {
    const messageTime = new Date(message?.createdAt || 0).getTime();
    return Number.isFinite(messageTime) && messageTime > incomingTime;
  });

  if (insertAt < 0) return [...messages, incoming];
  return [...messages.slice(0, insertAt), incoming, ...messages.slice(insertAt)];
}

export function reconcileMessage(messages = [], incoming) {
  if (!incoming) return messages;

  const index = findMessageIndex(messages, incoming);
  if (index < 0) {
    return insertChronologically(messages, {
      ...incoming,
      isOptimistic: Boolean(incoming.isOptimistic),
      messageStatus:
        incoming.messageStatus || incoming.status ||
        (incoming.isOptimistic ? "sending" : "sent"),
    });
  }

  const current = messages[index];
  const merged = {
    ...current,
    ...incoming,
    _id: incoming._id || current._id,
    clientMessageId: incoming.clientMessageId || current.clientMessageId,
    isOptimistic: false,
    messageStatus: incoming.messageStatus || incoming.status || "sent",
  };

  return messages.map((message, messageIndex) =>
    messageIndex === index ? merged : message,
  );
}

export function markMessageFailed(messages = [], clientMessageId, errorMessage) {
  if (!clientMessageId) return messages;
  return messages.map((message) =>
    sameId(message?.clientMessageId, clientMessageId)
      ? {
          ...message,
          isOptimistic: false,
          messageStatus: "failed",
          status: "failed",
          error: errorMessage || "Failed to send message",
        }
      : message,
  );
}
