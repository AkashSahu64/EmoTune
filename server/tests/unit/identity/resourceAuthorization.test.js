jest.mock('../../../models/Chat', () => ({ findOne: jest.fn() }));
jest.mock('../../../models/Message', () => ({ findById: jest.fn() }));
jest.mock('../../../models/Decision', () => ({ findById: jest.fn() }));
jest.mock('../../../models/TruthClaim', () => ({ findById: jest.fn() }));
jest.mock('../../../models/MemoryEmbedding', () => ({ findById: jest.fn() }));

const Chat = require('../../../models/Chat');
const { requireChatMember } = require('../../../identity/middleware/resourceAuthorization');

describe('resource authorization', () => {
  it('rejects a user who is not a chat member', async () => {
    Chat.findOne.mockResolvedValueOnce(null);
    const req = { params: { chatId: 'chat-1' }, userId: 'user-1' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await requireChatMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes the authorized chat to downstream handlers', async () => {
    const chat = { _id: 'chat-1' };
    Chat.findOne.mockResolvedValueOnce(chat);
    const req = { params: { chatId: 'chat-1' }, userId: 'user-1' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await requireChatMember(req, res, next);

    expect(req.authorizedChat).toBe(chat);
    expect(next).toHaveBeenCalled();
  });
});
