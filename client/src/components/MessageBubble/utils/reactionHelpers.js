export function getReactionUserId(user) {
  return String(user?._id || user?.id || user?.user || user || "");
}

export function normalizeReactions(reactions = []) {
  const byEmoji = new Map();
  const byUser = new Map();

  for (const reaction of Array.isArray(reactions) ? reactions : []) {
    const emoji = String(reaction?.emoji || "").trim();
    if (!emoji) continue;
    const current = byEmoji.get(emoji) || { emoji, users: [] };
    for (const user of Array.isArray(reaction.users) ? reaction.users : []) {
      const userId = getReactionUserId(user);
      if (!userId || byUser.has(userId)) continue;
      byUser.set(userId, emoji);
      current.users.push(user);
    }
    byEmoji.set(emoji, current);
  }

  return [...byEmoji.values()]
    .map((reaction) => ({
      ...reaction,
      count: reaction.users.length,
    }))
    .filter((reaction) => reaction.count > 0);
}

export function getMyReaction(reactions, userId) {
  const wanted = String(userId || "");
  if (!wanted) return "";
  return normalizeReactions(reactions).find((reaction) =>
    reaction.users.some((user) => getReactionUserId(user) === wanted),
  )?.emoji || "";
}

export function getReactionUsers(reaction) {
  return Array.isArray(reaction?.users) ? reaction.users : [];
}

export function applyReactionSelection(reactions, userId, emoji, user) {
  const normalized = normalizeReactions(reactions);
  const wantedUserId = String(userId || "");
  const current = getMyReaction(normalized, wantedUserId);
  const next = normalized.map((reaction) => ({
    ...reaction,
    users: reaction.users.filter((reactionUser) => getReactionUserId(reactionUser) !== wantedUserId),
  }));

  if (current !== emoji) {
    const target = next.find((reaction) => reaction.emoji === emoji);
    const reactionUser = user || { _id: userId };
    if (target) target.users = [...target.users, reactionUser];
    else next.push({ emoji, users: [reactionUser], count: 1 });
  }

  return next
    .map((reaction) => ({ ...reaction, count: reaction.users.length }))
    .filter((reaction) => reaction.count > 0);
}
