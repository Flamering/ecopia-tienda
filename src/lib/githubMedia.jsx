const REPO_OWNER = 'Flamering';
const REPO_NAME = 'fish-media';
const BRANCH = 'main';
const BASE_URL = `https://media.githubusercontent.com/media/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/`;

export const getMediaUrl = (filename) => {
  if (!filename) return '';
  return `${BASE_URL}${filename}`;
};

export const getImageUrl = (filename) => {
  if (!filename) return '';
  return `${BASE_URL}${filename}`;
};

export const getVideoUrl = (filename) => {
  if (!filename) return '';
  return `${BASE_URL}${filename}`;
};

export const getVideoPosterUrl = (videoFilename) => {
  if (!videoFilename) return '';
  const nameWithoutExt = videoFilename.replace(/\.[^/.]+$/, '');
  return `${BASE_URL}${nameWithoutExt}.webp`;
};

export const parseMultipleUrls = (urlString) => {
  if (!urlString || typeof urlString !== 'string') return [];
  const urls = urlString.split(',').map(url => url.trim()).filter(Boolean);
  return urls;
};

export const formatMediaUrl = (input) => {
  if (!input) return '';
  if (input.startsWith(BASE_URL)) return input;
  return `${BASE_URL}${input}`;
};

export const isGithubMediaUrl = (url) => {
  if (!url) return false;
  return url.includes(`media.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}`);
};

export const MediaRenderer = ({ filename, type = 'image', alt = '', className = '', onError }) => {
  if (!filename) return null;
  
  const url = getMediaUrl(filename);
  
  if (type === 'video') {
    const posterUrl = getVideoPosterUrl(filename);
    return (
      <video width="100%" height="auto" controls poster={posterUrl}>
        <source src={url} type="video/mp4" />
        Tu navegador no soporta el elemento de video.
      </video>
    );
  }
  
  return (
    <img 
      src={url} 
      alt={alt} 
      loading="lazy"
      className={className}
      onError={(e) => { 
        if (onError) onError(e);
        e.target.style.display = 'none'; 
      }}
    />
  );
};
