import { useMutation } from '@tanstack/react-query';
import { getCertificateDownload } from '@/services/certificateService';
import { downloadFile } from '@/shared/utils/helpers';

const OBJECT_URL_LIFETIME_MS = 60 * 1000;

/**
 * data: URLs (mock mode) are turned into a blob: URL first — some browsers refuse to download
 * large data: URLs. Signed http(s) URLs from the real API are used as they are.
 */
async function toDownloadHref(url) {
  if (typeof url !== 'string' || !url.startsWith('data:')) return url;
  if (typeof fetch !== 'function' || typeof URL?.createObjectURL !== 'function') return url;
  try {
    const blob = await (await fetch(url)).blob();
    const objectUrl = URL.createObjectURL(blob);
    setTimeout(() => URL.revokeObjectURL(objectUrl), OBJECT_URL_LIFETIME_MS);
    return objectUrl;
  } catch {
    return url;
  }
}

/**
 * Downloads a certificate PDF (GP12): GET /certificates/:id/download -> { url, expiresAt }
 * (short-lived signed URL, owner only), then saves it as "<certificateNo>.pdf".
 * Usage: download.mutate(certificate, { onSuccess, onError })
 */
export function useCertificateDownload() {
  return useMutation({
    mutationFn: async (certificate) => {
      const result = await getCertificateDownload(certificate._id);
      if (!result?.url) {
        throw new Error("We couldn't prepare the download. Please try again.");
      }
      const href = await toDownloadHref(result.url);
      downloadFile(href, `${certificate.certificateNo || 'certificate'}.pdf`);
      return result;
    },
  });
}

export default useCertificateDownload;
