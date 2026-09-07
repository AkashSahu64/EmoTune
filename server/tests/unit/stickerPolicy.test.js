const {
  ownerScope,
  isOwner,
  canViewSticker,
  canUpdateSticker,
  canDeleteSticker,
  canUseSticker,
  publicProjection,
} = require('../../policies/stickerPolicy');

const USER_A = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const USER_B = 'bbbbbbbbbbbbbbbbbbbbbbbb';

const sticker = (overrides = {}) => ({
  _id: 'sticker-1',
  user: USER_A,
  visibility: 'private',
  title: 'Mine',
  assetUrl: '/uploads/a.png',
  thumbnailUrl: '/uploads/a-thumb.png',
  editorState: { version: 1, objects: [] },
  ...overrides,
});

describe('sticker ownership policy', () => {
  it('always scopes queries by the authenticated user', () => {
    expect(ownerScope(USER_A, 'sticker-1')).toEqual({ _id: 'sticker-1', user: USER_A });
    expect(ownerScope(USER_A)).toEqual({ user: USER_A });
  });

  it('recognises the owner across object and string ids', () => {
    expect(isOwner(USER_A, sticker())).toBe(true);
    expect(isOwner(USER_A, sticker({ user: { _id: USER_A } }))).toBe(true);
    expect(isOwner(USER_B, sticker())).toBe(false);
    expect(isOwner(USER_A, null)).toBe(false);
  });

  it('keeps a private sticker invisible to everyone but its owner', () => {
    expect(canViewSticker(USER_A, sticker())).toBe(true);
    expect(canViewSticker(USER_B, sticker())).toBe(false);
    expect(canViewSticker(undefined, sticker())).toBe(false);
  });

  it('lets an authenticated viewer read an unlisted sticker', () => {
    const unlisted = sticker({ visibility: 'unlisted' });
    expect(canViewSticker(USER_B, unlisted)).toBe(true);
    expect(canViewSticker(null, unlisted)).toBe(false);
  });

  it('never lets a non-owner write, delete or favorite', () => {
    const unlisted = sticker({ visibility: 'unlisted' });
    [canUpdateSticker, canDeleteSticker].forEach((predicate) => {
      expect(predicate(USER_A, unlisted)).toBe(true);
      expect(predicate(USER_B, unlisted)).toBe(false);
      expect(predicate(USER_B, sticker())).toBe(false);
    });
  });

  it('allows using any sticker the viewer may see', () => {
    expect(canUseSticker(USER_B, sticker({ visibility: 'unlisted' }))).toBe(true);
    expect(canUseSticker(USER_B, sticker())).toBe(false);
  });

  it('never exposes the editable project to a non-owner', () => {
    const projected = publicProjection(sticker({ visibility: 'unlisted' }));
    expect(projected).toMatchObject({ title: 'Mine', assetUrl: '/uploads/a.png' });
    expect(projected).not.toHaveProperty('editorState');
    expect(projected).not.toHaveProperty('user');
    expect(publicProjection(null)).toBeNull();
  });
});
