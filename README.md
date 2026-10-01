# Chung Sức Liên Quân - Quản lý đơn dịch vụ

Website quản lý đơn dịch vụ Chung Sức Liên Quân được xây dựng với Next.js, TypeScript, Firebase Firestore và Firebase Authentication.

## Tính năng

### Khách hàng
- Không cần đăng ký/đăng nhập
- Tạo đơn hàng nhanh chóng
- Theo dõi trạng thái đơn hàng theo thời gian thực
- Thanh toán đơn hàng (sẽ tích hợp SePay webhook trong tương lai)
- Fake thanh toán cho môi trường development

### Nhân viên
- Đăng nhập bằng Firebase Authentication
- Xem đơn hàng đang chờ xử lý
- Nhận đơn hàng (với transaction để tránh trùng lặp)
- Cập nhật trạng thái đơn hàng (đang làm, hoàn thành, báo lỗi)
- Xem lịch sử đơn hàng của mình
- Lọc đơn hàng theo ngày, trạng thái, loại dịch vụ
- Bulk action (hoàn thành nhiều đơn cùng lúc)

### Admin
- Dashboard quản lý toàn bộ đơn hàng
- Xem và lọc đơn hàng theo nhiều tiêu chí
- Thống kê số lượng đơn hàng theo loại dịch vụ
- Lọc thống kê theo ngày và nhân viên
- Xử lý các đơn hàng bị lỗi
- Quản lý nhân viên

## Cấu trúc dự án

```
sk-chung-suc/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Trang chủ (tạo đơn)
│   │   ├── track/             # Theo dõi đơn hàng
│   │   ├── login/             # Đăng nhập
│   │   ├── dashboard/         # Employee dashboard
│   │   ├── admin/             # Admin dashboard
│   │   └── api/               # API routes
│   ├── config/                # Cấu hình và constants
│   │   └── constants.ts       # Service types, statuses
│   ├── lib/                   # Firebase và business logic
│   │   ├── firebase.ts        # Firebase initialization
│   │   ├── orders.ts          # Order operations
│   │   └── employees.ts       # Employee operations
│   └── types/                 # TypeScript types
│       └── database.ts        # Database models
├── scripts/
│   └── seed.ts                # Seed script cho fake data
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Firestore indexes
└── ENV_EXAMPLE.txt           # Environment variables example
```

## Cài đặt

### 1. Clone dự án

```bash
cd /Users/nam1029/Documents/Developer/Web/Frontend/sk-chung-suc
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Thiết lập Firebase

1. Tạo project mới tại [Firebase Console](https://console.firebase.google.com/)
2. Bật Authentication:
   - Chọn "Email/Password" sign-in method
   - Bật "Email/Password"
3. Bật Firestore Database:
   - Tạo Firestore database
   - Chọn chế độ "Test mode" (sẽ cập nhật security rules sau)
4. Lấy Firebase config và thêm vào file `.env.local`:

```bash
cp ENV_EXAMPLE.txt .env.local
```

Sau đó chỉnh sửa `.env.local` với thông tin Firebase của bạn:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Deploy Firestore Security Rules

**Để seed data:**
Copy nội dung file `firestore.rules` (hiện tại cho phép all read/write) vào Firebase Console -> Firestore -> Rules

**Sau khi seed xong:**
Copy nội dung file `firestore.rules.production` vào Firebase Console -> Firestore -> Rules để enable security rules

Hoặc sử dụng Firebase CLI:
```bash
firebase login
firebase deploy --only firestore:rules
```

### 5. Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

Hoặc copy nội dung file `firestore.indexes.json` vào Firebase Console -> Firestore -> Indexes

### 6. Seed fake data (optional)

```bash
npm run seed
```

Script này sẽ tạo:
- 4 employees (3 employees + 1 admin)
- 20 orders trải qua 3 ngày (27/09, 28/09, 29/09)
- Đủ 4 loại dịch vụ và các trạng thái khác nhau

### 7. Tạo users trong Firebase Authentication

Sau khi chạy seed script, bạn cần tạo các users tương ứng trong Firebase Authentication:

- **Employee A**: emp_a@example.com (mật khẩu tùy chọn)
- **Employee B**: emp_b@example.com (mật khẩu tùy chọn)
- **Employee C**: emp_c@example.com (mật khẩu tùy chọn)
- **Admin**: admin@example.com (mật khẩu tùy chọn)

Lưu ý: Email của Firebase Authentication phải khớp với email trong collection `employees`.

## Chạy dự án

### Development mode

```bash
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`

### Production build

```bash
npm run build
npm start
```

## Sử dụng

### Khách hàng

1. **Tạo đơn hàng**:
   - Truy cập trang chủ
   - Chọn loại dịch vụ (Full 3 Rương, Rương SS, Rương S++, Rương S+)
   - Nhập mã sự kiện
   - Nhấn "Tạo đơn"
   - Được chuyển đến trang theo dõi đơn hàng

2. **Theo dõi đơn hàng**:
   - Sử dụng tracking token được cung cấp sau khi tạo đơn
   - Hoặc truy cập từ trang chủ "Theo dõi đơn hàng của bạn"
   - Xem trạng thái theo thời gian thực (real-time listener)

3. **Thanh toán** (Development only):
   - Trong môi trường development, nút "Fake Thanh toán" sẽ hiển thị
   - Nhấn nút để giả lập thanh toán thành công

### Nhân viên

1. **Đăng nhập**:
   - Truy cập `/login`
   - Nhập email và mật khẩu
   - Được chuyển đến Employee Dashboard

2. **Nhận đơn hàng**:
   - Xem tab "Đơn chờ xử lý"
   - Nhấn "Nhận đơn" để lấy đơn
   - Đơn sẽ được gán cho bạn và chuyển sang trạng thái "Đang làm"

3. **Xử lý đơn hàng**:
   - Xem tab "Đơn của tôi"
   - Nhấn "Hoàn thành" khi xong
   - Nhấn "Báo lỗi" nếu có vấn đề
   - Nhấn "Làm lại" để reset đơn bị lỗi

4. **Bulk action**:
   - Chọn nhiều đơn hàng bằng checkbox
   - Nhấn "Hoàn thành X đơn" để hoàn thành cùng lúc

5. **Lọc đơn hàng**:
   - Lọc theo ngày, trạng thái, loại dịch vụ
   - Kết quả được cập nhật theo thời gian thực

### Admin

1. **Đăng nhập**:
   - Sử dụng tài khoản admin
   - Được chuyển đến Admin Dashboard

2. **Thống kê**:
   - Chọn ngày và nhân viên (hoặc "Tất cả")
   - Nhấn "Xem thống kê"
   - Xem số lượng đơn theo từng loại dịch vụ
   - Chỉ tính các đơn đã thanh toán và không bị cancelled

3. **Quản lý đơn hàng**:
   - Xem tất cả đơn hàng với phân trang
   - Lọc theo ngày, nhân viên, trạng thái, loại dịch vụ
   - Reset đơn bị lỗi
   - Hủy đơn đang chờ

4. **Quản lý nhân viên**:
   - Xem danh sách nhân viên
   - Admin có toàn quyền truy cập

## Database Schema

### employees

```typescript
{
  id: string
  name: string
  email: string
  role: "admin" | "employee"
  active: boolean
  createdAt: Timestamp
}
```

### orders

```typescript
{
  id: string
  eventCode: string
  serviceType: "FULL_3_RUONG" | "RUONG_SS" | "RUONG_S_PLUS_PLUS" | "RUONG_S_PLUS"
  amount: number
  paymentStatus: "unpaid" | "paid"
  status: "pending" | "processing" | "completed" | "error" | "cancelled"
  employeeId: string | null
  employeeName: string | null
  businessDate: string
  trackingToken: string
  errorMessage: string | null
  paymentTransactionId: string | null
  paymentContent: string | null
  createdAt: Timestamp
  paidAt: Timestamp | null
  assignedAt: Timestamp | null
  completedAt: Timestamp | null
}
```

## Loại dịch vụ

- **FULL_3_RUONG**: Làm Full 3 Rương - 99.000đ
- **RUONG_SS**: Rương SS - 60.000đ
- **RUONG_S_PLUS_PLUS**: Rương S++ - 30.000đ
- **RUONG_S_PLUS**: Rương S+ - 15.000đ

## Security

- Firebase Security Rules đảm bảo:
  - Khách hàng không thể sửa order
  - Employee chỉ xem/xử lý order được phép
  - Employee không thể tự đổi employeeId
  - Admin có toàn quyền
  - Các thao tác claim order dùng transaction để tránh race condition
  - Payment transaction được kiểm tra để tránh trùng lặp

## Tích hợp SePay Webhook (Future)

Kiến trúc đã sẵn sàng để tích hợp SePay webhook:

1. Tạo API endpoint `/api/payment/webhook`
2. Xác thực webhook từ SePay
3. Cập nhật payment status và paidAt
4. Kiểm tra paymentTransactionId để tránh trùng lặp

## Lưu ý

- Project sử dụng Next.js 16 với App Router
- Tailwind CSS cho styling
- Firebase v12
- TypeScript cho type safety
- Responsive design (mobile-first cho customer/employee, desktop cho admin)

## Troubleshooting

### Firebase Authentication không hoạt động
- Kiểm tra Firebase config trong `.env.local`
- Đảm bảo Authentication đã được bật trong Firebase Console
- Kiểm tra email có khớp với collection `employees`

### Firestore queries lỗi
- Deploy Firestore indexes từ file `firestore.indexes.json`
- Kiểm tra Firestore Security Rules

### Seed script không chạy
- Đảm bảo Firebase config đúng
- Kiểm tra quyền truy cập Firestore
- Xem console log để biết lỗi cụ thể

## License

Private project for Chung Sức Liên Quân service management.
