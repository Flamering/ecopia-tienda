const REPO_OWNER = 'Flamering';
const REPO_NAME = 'fish-media';
const BRANCH = 'main';

export const MEDIA_BASE_URL = `https://media.githubusercontent.com/media/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/`;

const IMAGE_PROXY = 'https://images.weserv.nl/';

export const getMediaUrl = (filename) => {
  if (!filename) return '';
  return `${MEDIA_BASE_URL}${filename}`;
};

export const getImageUrl = (filename, { w = 400, q = 75 } = {}) => {
  if (!filename) return '';
  const raw = `${MEDIA_BASE_URL}${filename}`;
  return `${IMAGE_PROXY}?url=${encodeURIComponent(raw)}&w=${w}&output=webp&q=${q}`;
};

export const parseImageList = (str) => {
  if (!str || typeof str !== 'string') return [];
  return str.split(',').map((s) => s.trim()).filter(Boolean);
};
