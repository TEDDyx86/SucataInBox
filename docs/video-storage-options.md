# Public video storage and delivery for a Vercel Next.js site

**Research checked: 2026-10-06.** Findings below use first-party provider documentation. Where a provider does not publish a numeric quota or behavior, it is marked undocumented rather than assumed unlimited.

## Short recommendation

- **Raw MP4 + low-cost public hosting:** Cloudflare R2 Standard is the clearest fit. It is object storage, has a 10 GB-month free tier, charges no egress for direct R2 delivery, and can expose objects on a custom domain; use a custom domain for production. The browser's native `<video>` can request byte ranges from an MP4 object when the origin supports it; R2 documents object delivery, but its cited public-bucket page does not explicitly promise range support. Verify `206 Partial Content` in the deployed setup before relying on seeking.
- **Managed adaptive playback:** Cloudflare Stream directly accepts MP4 and serves HLS/DASH manifests with transcoding. Pricing is per stored video duration and delivered viewing minutes; no free Stream tier is listed on its pricing page.
- **Backblaze B2:** potentially useful as low-cost object storage if pairing with a CDN. Current official pricing offers first 10 GB free and free egress up to 3x average monthly storage (with some named CDN/compute partner arrangements offering unlimited free egress). It is less turnkey than R2 for a Cloudflare-fronted public bucket.
- **Google Drive and OneDrive:** fine as backup and for manually shared/embedded human viewing, but not dependable public CDN origins. Their documented sharing/playback experiences are consumer file-sharing, not a public video delivery contract. Drive explicitly documents viewer playback limits; neither provider's cited public material promises stable direct MP4 URLs, byte-range semantics, HLS, or a public media CDN SLA.
- **Vercel filesystem:** do not treat deployed app/function filesystem as persistent uploaded-media storage. Functions have a read-only filesystem and only writable `/tmp` scratch space (up to 500 MB).

## Comparison

| Option | Public playback model | Published pricing/free usage | Practical fit |
|---|---|---|---|
| **Cloudflare R2 Standard** | Public bucket objects via custom domain, or development-only `r2.dev`; serve raw MP4 URL. Public access is opt-in. Custom domain can use Cloudflare Cache. | $0.015/GB-month; $4.50/million Class A and $0.36/million Class B; monthly free tier: 10 GB-month storage, 1M Class A, 10M Class B; Internet egress free. [R2 pricing](https://developers.cloudflare.com/r2/pricing/) | Best low-cost raw-file fit, especially when within free storage and modest read-request counts. `r2.dev` is rate-limited and explicitly non-production; production custom domain is recommended. No HLS/transcoding implied by object storage. |
| **Cloudflare Stream** | Managed video service; built-in player or unique HLS/DASH manifest per video. Compatible with HLS/DASH players. | Storage capacity sold in $5/month increments per 1,000 minutes; delivery $1 per 1,000 minutes delivered. Ingress and encoding free; bandwidth included. [Stream pricing](https://developers.cloudflare.com/stream/pricing/) | Best when adaptive HLS/DASH, encoding, and video-specific playback matter more than lowest cost for a few simple MP4s. Uploads support MP4 and other formats under 30 GB. [Upload docs](https://developers.cloudflare.com/stream/uploading-videos/) |
| **Backblaze B2** | S3-compatible object storage; public object URLs can be used with an attached CDN. Backblaze describes CDN/compute delivery partnerships. | Starts at $6.95/TB/month; first 10 GB free; 3x average monthly stored amount free egress, then $0.01/GB for ordinary destinations. Free egress is unlimited through named partners including Cloudflare and Fastly, subject to the partner delivery path. [B2 pricing](https://www.backblaze.com/cloud-storage/pricing) | Good storage alternative, especially with a supported CDN path. Compare exact CDN integration, request cost, and setup before choosing over R2. Raw objects, not managed HLS transcoding. |
| **Google Drive** | Drive's official product is to store/play videos in Drive and share a file link. Links are view/share flows, not documented CDN or direct-asset endpoints. | Uses the account's Drive storage allotment; video can be up to 5 TB only if that much storage is purchased/available. The official help page documents a playback limit for viewers who aren't signed in, but does not quantify it. [Store & play video](https://support.google.com/drive/answer/2423694?hl=en) | Keep as backup or share/embed occasional clips where Drive's own viewer is acceptable. Not a reliable site `<video src>` or public CDN backend: no official stable direct-URL/range/HLS guarantee found. |
| **OneDrive** | Official sharing creates view/download links, including “Anyone” links where enabled. Microsoft states files are private until shared, and a moved file can make its sharing link stop working. [Sharing docs](https://support.microsoft.com/en-us/office/share-onedrive-files-and-folders-9fcc2f7d-de0c-4cec-93b0-a82024800c07) | Depends on the user's OneDrive/Microsoft storage quota and plan; cited sharing documentation publishes no public streaming/CDN quota. | Useful for backup and ad hoc sharing, not a stable public video origin. Do not treat a shared link as a permanent direct MP4 URL or assume range/HLS behavior. |

## Details and caveats

### R2 and raw MP4

R2's Standard storage includes the first 10 GB-month and stated operation allowances each month, with zero direct egress fees. `GetObject` is a Class B operation, so high playback request volume can exceed the 10M/month free read allowance even though bandwidth remains free. R2's public-bucket docs distinguish production custom domains from `r2.dev`: the latter is rate-limited and intended for development; custom domains allow Cloudflare Cache. [Pricing](https://developers.cloudflare.com/r2/pricing/) · [Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)

For a simple site, upload MP4 objects and put their public custom-domain URLs in a native `<video controls>` element. The cited R2 docs establish public object delivery but do not explicitly document HTTP range behavior; test seeking and confirm a partial-content response in your actual deployment. R2 does not by itself transcode MP4s into adaptive bitrate HLS.

### Stream and HLS

Stream accepts MP4 files (up to 30 GB) and encodes them. It supports Stream Player or HLS/DASH manifests for compatible players; its docs say manifests are dynamic and should be fetched directly from Stream rather than cached/proxied/stored. Delivery is measured by video-segment/MP4-part requests and rounded to segment duration (four seconds for uploaded videos), so autoplay/preload/buffering and actual audience watch time affect spend. [Upload docs](https://developers.cloudflare.com/stream/uploading-videos/) · [Own-player/HLS docs](https://developers.cloudflare.com/stream/viewing-videos/using-own-player/) · [Pricing](https://developers.cloudflare.com/stream/pricing/)

### Drive and OneDrive as public sources

Drive officially supports playing uploaded videos in Drive, copying a share link, and playback up to 1920×1080; it also warns of “Playback limits” for viewers who aren't signed in. Its sharing/playback docs do not publish a numeric anonymous-view threshold, so none is assumed here. This supports occasional file sharing, not a guaranteed public hosting/CDN workload. [Drive video help](https://support.google.com/drive/answer/2423694?hl=en)

OneDrive “Anyone” links can permit viewing without signing in, subject to account/org settings; Microsoft documents links as sharing links and says they stop working if a file/folder is moved. The cited Microsoft documentation does not establish a stable direct-media URL, range support, HLS manifests, or a public streaming quota. It is reasonable as a backup and manual share surface, not as production CDN origin. [OneDrive sharing help](https://support.microsoft.com/en-us/office/share-onedrive-files-and-folders-9fcc2f7d-de0c-4cec-93b0-a82024800c07)

### Vercel deployment storage

Vercel Functions have a read-only filesystem and writable `/tmp` scratch space up to 500 MB. Runtime writes are therefore not durable, shared media storage for a deployed site. Keep uploaded clips in external object/video storage and persist only references/metadata in the app. [Vercel runtimes: filesystem support](https://vercel.com/docs/functions/runtimes#file-system-support)

## Official sources

- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 public buckets: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Cloudflare Stream pricing: https://developers.cloudflare.com/stream/pricing/
- Cloudflare Stream upload formats: https://developers.cloudflare.com/stream/uploading-videos/
- Cloudflare Stream HLS/DASH player docs: https://developers.cloudflare.com/stream/viewing-videos/using-own-player/
- Backblaze B2 pricing: https://www.backblaze.com/cloud-storage/pricing
- Google Drive video playback and limits: https://support.google.com/drive/answer/2423694?hl=en
- Microsoft OneDrive sharing: https://support.microsoft.com/en-us/office/share-onedrive-files-and-folders-9fcc2f7d-de0c-4cec-93b0-a82024800c07
- Vercel function filesystem: https://vercel.com/docs/functions/runtimes#file-system-support
