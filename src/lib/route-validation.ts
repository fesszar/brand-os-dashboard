const SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+$/;
const SLOT_PATTERN = /^\d{4}-\d{2}-\d{2}-\d{4}$/;
const FILE_PATTERN = /^[a-zA-Z0-9._ -]+$/;

/**
 * Decodes a route segment from URL-encoded form.
 */
export function decodeSegment(value: string) {
  return decodeURIComponent(value);
}

/**
 * Validates a brand id used as a directory segment.
 */
export function isValidBrandId(value: string) {
  return SEGMENT_PATTERN.test(value);
}

/**
 * Validates a draft/script slot directory name.
 */
export function isValidSlotDir(value: string) {
  return SLOT_PATTERN.test(value);
}

/**
 * Validates upload file names for non-traversal path access.
 */
export function isValidFileName(value: string) {
  return FILE_PATTERN.test(value) && !value.includes("..") && !value.includes("/") && !value.includes("\\");
}
