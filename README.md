# X Gallery — PWA

Ứng dụng Progressive Web App lưu & xem ảnh/video từ X (Twitter).

## Tính năng

- Dán link bài viết X / Twitter → lấy ảnh & video
- **Share Target**: Share từ app X → mở X Gallery (Android Chrome / installed PWA)
- Gallery offline (IndexedDB), filter ảnh/video, zoom ảnh, transform
- Player video: play/pause, seek, ±10s, mute, tốc độ, fullscreen
- Service Worker **không chặn** stream video (tránh bug không phát được video)

## Deploy lên GitHub Pages

1. Tạo repo mới trên GitHub (ví dụ `x-gallery`)
2. Upload toàn bộ nội dung thư mục này lên **root** repo (hoặc branch `gh-pages`)
3. Settings → Pages → Source: Deploy from branch → chọn branch `main` / `gh-pages`, folder `/ (root)`
4. Đợi ~1 phút, mở `https://<user>.github.io/<repo>/`

### Lệnh nhanh (local)

```bash
git init
git add .
git commit -m "X Gallery PWA"
git branch -M main
git remote add origin https://github.com/<USER>/<REPO>.git
git push -u origin main
```

Bật GitHub Pages như trên.

## Cài đặt trên điện thoại

1. Mở URL GitHub Pages bằng **Chrome** (Android) hoặc Safari (iOS)
2. Android: menu ⋮ → **Cài đặt ứng dụng** / Add to Home screen  
   iOS: Share → **Add to Home Screen**
3. Sau khi cài, Share từ app X → chọn **X Gallery** (Android)

## Nhận link

| Cách | Hoạt động |
|------|-----------|
| Dán link vào ô input | ✅ |
| Paste khi không focus input | ✅ tự nhận URL X |
| Share từ app X (Android PWA) | ✅ Share Target (`?url=` / `?text=`) |
| Mở `/?url=https://x.com/...` | ✅ |

## Video không phát? (nguyên nhân chính)

CDN `video.twimg.com` **chặn** request có header `Referer` từ domain lạ (vd. `*.github.io`).

**Đã fix trong app:**
- `<meta name="referrer" content="no-referrer">`
- `referrerpolicy="no-referrer"` trên mọi `<video>` / `<img>`
- SW **không** chặn stream media / Range request

**Sau khi push bản mới bắt buộc:**
1. Gỡ PWA / shortcut cũ
2. Chrome → xóa dữ liệu site `*.github.io` (hoặc Clear browsing data cho site đó)
3. Mở lại URL Pages → Cài đặt ứng dụng lại

Nếu vẫn 403 trên `video.twimg.com` trong Network tab → báo lại.

## Cấu trúc

```
├── index.html
├── manifest.webmanifest   # PWA + share_target
├── sw.js                  # cache shell only
├── _headers               # Referrer-Policy (Cloudflare Pages)
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── maskable-192.png
│   ├── maskable-512.png
│   └── apple-touch-icon.png
└── .nojekyll
```
