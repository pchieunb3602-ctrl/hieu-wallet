# Hieu Wallet

App quản lý chi tiêu cá nhân cho Android, chạy hoàn toàn offline.

- Chi tiêu ghi bằng tệ (CNY), thu nhập ghi bằng VNĐ, tự nhập tỷ giá
- Ngân sách theo tháng cho từng danh mục, cảnh báo ở 80%
- Khoá vân tay, sao lưu ra file, xuất Excel (CSV)

## Phát triển
```
npm install
npm run dev      # xem trên trình duyệt (có dữ liệu mẫu)
npm test
npm run sync     # build web + chép vào dự án Android
```
GitHub Actions build file APK (chưa ký) mỗi lần push lên `main`.
