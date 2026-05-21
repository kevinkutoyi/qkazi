/**
 * Backwards-compatible re-export. The actual implementation lives in
 * `./storage.ts` and picks a backend (local filesystem or S3-compatible
 * cloud storage) based on env. Existing callers can keep importing
 * `saveImage` from here without changes.
 */
export { saveImage, type SaveResult as UploadResult } from "./storage";
