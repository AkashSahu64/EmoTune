const {
  validateEditorState,
  stickerCreateSchema,
  stickerUpdateSchema,
  normalizeTags,
  normalizeObjectAssetIds,
  isSafeAssetUrl,
  EDITOR_LIMITS,
} = require('../../utils/stickerValidators');

const baseState = (objects) => ({
  version: 1,
  canvas: { width: 512, height: 512 },
  objects,
});

const textObject = (overrides = {}) => ({
  id: 'text-1', type: 'text', x: 10, y: 10, width: 100, height: 40, text: 'hello', ...overrides,
});

describe('sticker editor state validation', () => {
  it('accepts a minimal project and applies defaults', () => {
    const result = validateEditorState(baseState([textObject()]));
    expect(result.ok).toBe(true);
    expect(result.value.fps).toBe(30);
    expect(result.value.objects[0].opacity).toBe(1);
    expect(result.value.effects.outline.enabled).toBe(false);
  });

  it('treats a missing editor state as absent rather than invalid', () => {
    expect(validateEditorState(null)).toEqual({ ok: true, value: null });
    expect(validateEditorState(undefined)).toEqual({ ok: true, value: null });
  });

  it('parses a JSON string payload', () => {
    const result = validateEditorState(JSON.stringify(baseState([textObject()])));
    expect(result.ok).toBe(true);
    expect(result.value.objects).toHaveLength(1);
  });

  it('rejects malformed JSON', () => {
    expect(validateEditorState('{ not json')).toMatchObject({ ok: false, status: 422 });
  });

  it('rejects an unknown editor version', () => {
    expect(validateEditorState(baseState([textObject()])).ok).toBe(true);
    expect(validateEditorState({ ...baseState([textObject()]), version: 99 })).toMatchObject({ ok: false, status: 422 });
  });

  it('rejects oversized payloads before parsing them', () => {
    const huge = `{"padding":"${'x'.repeat(EDITOR_LIMITS.maxJsonBytes + 10)}"}`;
    expect(validateEditorState(huge)).toMatchObject({ ok: false, status: 413 });
  });

  it('rejects oversized object payloads', () => {
    const state = baseState([textObject({ name: 'a' })]);
    state.padding = 'x'.repeat(EDITOR_LIMITS.maxJsonBytes + 10);
    expect(validateEditorState(state)).toMatchObject({ ok: false, status: 413 });
  });

  it('rejects more objects than the limit allows', () => {
    const objects = Array.from({ length: EDITOR_LIMITS.maxObjects + 1 }, (_, index) => textObject({ id: `t-${index}` }));
    expect(validateEditorState(baseState(objects))).toMatchObject({ ok: false, status: 422 });
  });

  it('rejects unknown object types and unknown keys', () => {
    expect(validateEditorState(baseState([textObject({ type: 'iframe' })]))).toMatchObject({ ok: false, status: 422 });
    expect(validateEditorState(baseState([textObject({ onclick: 'alert(1)' })]))).toMatchObject({ ok: false, status: 422 });
  });

  it('rejects unsafe image sources', () => {
    const unsafe = ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'blob:http://localhost/x', 'file:///etc/passwd'];
    unsafe.forEach((src) => {
      const state = baseState([{ id: 'img', type: 'image', x: 0, y: 0, width: 10, height: 10, src }]);
      expect(validateEditorState(state)).toMatchObject({ ok: false, status: 422 });
    });
  });

  it('accepts http(s) and app-relative image sources', () => {
    ['https://res.cloudinary.com/demo/a.png', '/uploads/a.png'].forEach((src) => {
      const state = baseState([{ id: 'img', type: 'image', x: 0, y: 0, width: 10, height: 10, src }]);
      expect(validateEditorState(state).ok).toBe(true);
    });
  });

  it('rejects nested groups so recursion stays bounded', () => {
    const state = baseState([{
      id: 'g1', type: 'group', x: 0, y: 0, width: 10, height: 10,
      children: [{ id: 'g2', type: 'group', x: 0, y: 0, width: 10, height: 10, children: [] }],
    }]);
    expect(validateEditorState(state)).toMatchObject({ ok: false, status: 422 });
  });

  it('rejects duplicate object ids', () => {
    const state = baseState([textObject({ id: 'same' }), textObject({ id: 'same' })]);
    expect(validateEditorState(state)).toMatchObject({ ok: false, status: 422, error: expect.stringContaining('duplicate') });
  });

  it('requires the keys each object type needs to render', () => {
    const missingText = baseState([{ id: 't', type: 'text', x: 0, y: 0, width: 1, height: 1 }]);
    expect(validateEditorState(missingText)).toMatchObject({ ok: false, status: 422, error: expect.stringContaining('missing text') });
    const missingPoints = baseState([{ id: 'd', type: 'drawing', x: 0, y: 0, width: 1, height: 1 }]);
    expect(validateEditorState(missingPoints)).toMatchObject({ ok: false, error: expect.stringContaining('missing points') });
  });

  it('bounds canvas size, drawing points and keyframes', () => {
    expect(validateEditorState({ ...baseState([textObject()]), canvas: { width: 4096, height: 512 } })).toMatchObject({ ok: false, status: 422 });
    const points = Array.from({ length: EDITOR_LIMITS.maxDrawingPoints + 1 }, () => [1, 1]);
    expect(validateEditorState(baseState([{ id: 'd', type: 'drawing', x: 0, y: 0, width: 1, height: 1, points }]))).toMatchObject({ ok: false });
    const keyframes = Array.from({ length: EDITOR_LIMITS.maxKeyframes + 1 }, (_, index) => ({ time: index }));
    expect(validateEditorState(baseState([textObject({ animation: { keyframes } })]))).toMatchObject({ ok: false });
  });

  it('bounds text length', () => {
    expect(validateEditorState(baseState([textObject({ text: 'x'.repeat(EDITOR_LIMITS.maxTextLength + 1) })]))).toMatchObject({ ok: false });
  });
});

describe('sticker request schemas', () => {
  it('never accepts client-supplied ownership or timestamps', () => {
    const { error } = stickerCreateSchema.validate({ title: 'a', user: 'attacker', createdAt: '2020-01-01' });
    expect(error).toBeDefined();
    const stripped = stickerCreateSchema.validate(
      { title: 'a', user: 'attacker', createdAt: '2020-01-01' },
      { stripUnknown: true },
    );
    expect(stripped.error).toBeUndefined();
    expect(stripped.value.user).toBeUndefined();
    expect(stripped.value.createdAt).toBeUndefined();
  });

  it('never accepts client-supplied asset urls, dimensions or mime types', () => {
    const stripped = stickerCreateSchema.validate(
      { assetUrl: 'https://evil.example/x.png', width: 99999, mimeType: 'text/html', fileSize: 1 },
      { stripUnknown: true },
    );
    expect(stripped.value).not.toHaveProperty('assetUrl');
    expect(stripped.value).not.toHaveProperty('width');
    expect(stripped.value).not.toHaveProperty('mimeType');
  });

  it('applies safe defaults', () => {
    const { value } = stickerCreateSchema.validate({});
    expect(value).toMatchObject({ title: 'Untitled Sticker', visibility: 'private', assetType: 'static', source: 'studio', duration: 0 });
  });

  it('rejects unsupported visibility and asset types', () => {
    expect(stickerCreateSchema.validate({ visibility: 'public' }).error).toBeDefined();
    expect(stickerCreateSchema.validate({ assetType: 'lottie' }).error).toBeDefined();
  });

  it('requires at least one field on update', () => {
    expect(stickerUpdateSchema.validate({}).error).toBeDefined();
    expect(stickerUpdateSchema.validate({ title: 'new' }).error).toBeUndefined();
  });

  it('normalizes tags and object asset ids', () => {
    expect(normalizeTags(' a , b , a ,,')).toEqual(['a', 'b']);
    expect(normalizeTags(Array.from({ length: 30 }, (_, i) => `t${i}`))).toHaveLength(EDITOR_LIMITS.maxTags);
    expect(normalizeObjectAssetIds('x, y,, z')).toEqual(['x', 'y', 'z']);
  });

  it('exposes a strict asset url guard', () => {
    expect(isSafeAssetUrl('/uploads/a.png')).toBe(true);
    expect(isSafeAssetUrl('https://cdn.example/a.png')).toBe(true);
    expect(isSafeAssetUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeAssetUrl(`https://cdn.example/${'a'.repeat(3000)}.png`)).toBe(false);
  });
});
