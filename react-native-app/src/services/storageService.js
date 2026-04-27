// Service de stockage ORIZON (Supabase Storage).
// Bucket attendu: 'property-images' (public read, voir db/storage.sql).
//
// API:
//   pickImages({ multi=true, max=10 }) -> [{ uri, mime, name }]
//   uploadImage(uri, { folder, mime }) -> { ok, url } (mock data:uri si pas de Supabase)
//   uploadImages(uris, { folder }) -> { ok, urls }
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase, isSupabaseConfigured } from './supabase';

const BUCKET = 'property-images';
const MAX_WIDTH = 1600;
const THUMB_WIDTH = 400;
const QUALITY = 0.7;
const THUMB_QUALITY = 0.6;

// Compresse + redimensionne une image. Retourne { uri, mime }.
async function compressImage(uri, { width = MAX_WIDTH, quality = QUALITY } = {}) {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
    return { uri: result.uri, mime: 'image/jpeg' };
  } catch {
    return { uri, mime: 'image/jpeg' };
  }
}

export async function pickImages({ multi = true, max = 10 } = {}) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { ok: false, error: 'Permission refusee' };
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: multi,
    selectionLimit: multi ? max : 1,
    quality: 0.8,
  });
  if (res.canceled) return { ok: false, canceled: true };
  return {
    ok: true,
    assets: (res.assets || []).map((a) => ({
      uri: a.uri,
      mime: a.mimeType || 'image/jpeg',
      name: a.fileName || `photo-${Date.now()}.jpg`,
    })),
  };
}

function extFromMime(mime) {
  if (!mime) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

async function readAsBase64(uri) {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

// Decode base64 -> Uint8Array sans dependance externe.
function base64ToBytes(b64) {
  // global.atob est dispo via react-native-url-polyfill / RN runtime
  const bin = global.atob ? global.atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function uploadImage(uri, { folder = 'misc', mime = 'image/jpeg', compress = true, generateThumb = false } = {}) {
  // Compression cote client avant upload pour reduire la bande passante.
  let finalUri = uri;
  let finalMime = mime;
  if (compress) {
    const c = await compressImage(uri);
    finalUri = c.uri;
    finalMime = c.mime;
  }

  if (!isSupabaseConfigured) {
    // Mode mock: on garde l'URI locale comme "url".
    return { ok: true, url: finalUri, thumbUrl: finalUri, mock: true };
  }
  try {
    const b64 = await readAsBase64(finalUri);
    const bytes = base64ToBytes(b64);
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${folder}/${stamp}.${extFromMime(finalMime)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: finalMime,
      upsert: false,
    });
    if (error) return { ok: false, error: error.message };
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    let thumbUrl = pub.publicUrl;
    if (generateThumb) {
      const thumb = await compressImage(uri, { width: THUMB_WIDTH, quality: THUMB_QUALITY });
      const tb64 = await readAsBase64(thumb.uri);
      const tbytes = base64ToBytes(tb64);
      const tpath = `${folder}/${stamp}-thumb.jpg`;
      const { error: terr } = await supabase.storage.from(BUCKET).upload(tpath, tbytes, {
        contentType: 'image/jpeg', upsert: false,
      });
      if (!terr) {
        const { data: tpub } = supabase.storage.from(BUCKET).getPublicUrl(tpath);
        thumbUrl = tpub.publicUrl;
      }
    }
    return { ok: true, url: pub.publicUrl, thumbUrl, path };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

export async function uploadImages(assets, { folder = 'misc', generateThumb = false, propertyId = null } = {}) {
  const urls = [];
  const thumbs = [];
  for (const a of assets) {
    const r = await uploadImage(a.uri, { folder, mime: a.mime, generateThumb });
    if (!r.ok) return { ok: false, error: r.error, urls, thumbs };
    urls.push(r.url);
    thumbs.push(r.thumbUrl || r.url);
    // Soumet a la queue de moderation (non bloquant).
    if (folder !== 'avatars') {
      try {
        const { submitPhotoForReview } = require('./moderationService');
        submitPhotoForReview({ propertyId, url: r.url }).catch(() => {});
      } catch {}
    }
  }
  return { ok: true, urls, thumbs };
}

export async function deleteImageByUrl(url) {
  if (!isSupabaseConfigured || !url) return { ok: true, mock: true };
  // Extrait le path apres /object/public/<bucket>/
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return { ok: false, error: 'URL invalide' };
  const path = url.slice(idx + marker.length);
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
