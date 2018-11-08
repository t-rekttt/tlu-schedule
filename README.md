# tlu-schedule
Demo web mình viết sử dụng các hàm từ https://github.com/t-rekttt/tinchi-api để hiển thị lịch học của trường Đại học Thủy Lợi. 
Ngoài ra còn có chức năng lưu TKB (cần database) và nhập vào chatbot tại https://m.me/506273246543095

## Cách sử dụng
1. Cài đặt
```
git clone https://github.com/t-rekttt/tlu-schedule.git
cd tlu-schedule
npm install
```
2. Tạo file .env chứa URI của mongodb database. Nội dung của file như sau:
```
DB_URI=<YOUR_MONGODB_URI>
```
Thay *<YOUR_MONGODB_URI>* thành URI mongodb database của bạn
3. `node backend/index.js`
