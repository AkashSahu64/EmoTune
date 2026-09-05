const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateStoryFile } = require('../../services/storyMediaService');

describe('Story media validation', () => {
  const tempFiles = [];
  const makeFile = (name, content) => {
    const filePath = path.join(os.tmpdir(), `emotune-${Date.now()}-${name}`);
    fs.writeFileSync(filePath, content);
    tempFiles.push(filePath);
    return { path: filePath, originalname: name, mimetype: 'image/png', size: content.length };
  };

  afterAll(() => tempFiles.forEach((filePath) => fs.existsSync(filePath) && fs.unlinkSync(filePath)));

  it('accepts a matching PNG signature', async () => {
    const file = makeFile('valid.png', Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]));
    await expect(validateStoryFile(file)).resolves.toMatchObject({ ok: true, category: 'image' });
  });

  it('rejects a mismatched file signature', async () => {
    const file = makeFile('fake.png', Buffer.from('not-a-png'));
    await expect(validateStoryFile(file)).resolves.toMatchObject({ ok: false, status: 415 });
  });

  it('rejects unsupported MIME types', async () => {
    const file = makeFile('script.exe', Buffer.from('MZ'));
    file.mimetype = 'application/octet-stream';
    await expect(validateStoryFile(file)).resolves.toMatchObject({ ok: false, status: 415 });
  });
});
