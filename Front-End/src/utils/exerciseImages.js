import { readPublicUrl } from '../config/runtimeConfig';

const IMAGE_BASE_URL = readPublicUrl('VITE_EXERCISE_IMAGE_BASE_URL', 'http://localhost:8000');

export function getExerciseImageBaseUrl() {
  return IMAGE_BASE_URL;
}

export function resolveExerciseImageUrl(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${IMAGE_BASE_URL}${url}`;
  return `${IMAGE_BASE_URL}/${url.replace(/^\.\//, '')}`;
}

export function exerciseImageFramesFromEntity(exercise) {
  const frames = [
    exercise?.image_url,
    exercise?.alt_image_url,
    exercise?.imageUrl,
    exercise?.altImageURL,
    exercise?.altImageUrl,
    exercise?.raw?.image_url,
    exercise?.raw?.alt_image_url,
    exercise?.exercise?.image_url,
    exercise?.exercise?.alt_image_url,
  ]
    .map(resolveExerciseImageUrl)
    .filter(Boolean);

  return [...new Set(frames)];
}
