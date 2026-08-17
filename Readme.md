# Collaborative Text Editor

Một ứng dụng web thời gian thực (Real-time) cho phép nhiều người dùng cùng lúc chỉnh sửa văn bản với cơ chế giải quyết xung đột không trọng tài (Conflict-free Replicated Data Type - CRDT) dựa trên Yjs, hỗ trợ phân quyền ma trận (RBAC) và quản lý lịch sử phiên bản (Version Snapshots).

---

## 1. Mô hình Phân quyền (RBAC Matrix)

* **Public Document:**
  * Bất kỳ ai có đường link (kể cả Guest chưa đăng nhập) đều có thể truy cập.
  * Quyền mặc định do Owner cấu hình qua `publicRole`: `VIEWER` (Chỉ đọc) hoặc `EDITOR` (Chỉnh sửa).
* **Private Document:**
  * Chỉ `OWNER` và các `User` được mời đích danh qua bảng ma trận quyền `DocumentPermission` mới có thể truy cập.
  * Các bậc quyền: `OWNER` > `EDITOR` > `VIEWER`.
* **Cơ chế gác cửa Real-time:**
  * WebSocket Gateway kiểm tra quyền ngay từ tầng Handshake (Upgrade phase).
  * User mang quyền `VIEWER` bị backend chặn ở tầng Binary Protocol: Mọi payload gõ phím gửi lên đều bị drop, không thể làm biến dạng dữ liệu `Y.Doc`.

---

## 2. Kiến trúc Hệ thống

### 2.1. Backend Architecture (Modular Layered)

Toàn bộ Backend sử dụng kiến trúc phân lớp theo module nghiệp vụ, tích hợp kép cả **HTTP REST API Server** và **WebSocket CRDT Server** trên cùng một `http.Server` instance.

#### Luồng dữ liệu (Data Flow)

```text
HTTP Request   ──► Validate (Zod) ──► Auth / Permission Guard ──► Controller ──► Service / DB (Postgres)
WS Connection  ──► Handshake Auth ──► Check Access (RBAC)     ──► RoomManager (RAM Y.Doc) ◄──► CollabService (Sync/Awareness)
                                                                       │
                                                                 (Debounce 3s / Flush on Empty)
                                                                       ▼
                                                                PostgreSQL (BYTEA)
```

```Plaintext
backend/
├── prisma/
│   ├── schema.prisma               # Database Schema (User, Document, Permission, Snapshot)
│   └── migrations/                 # Lịch sử migration Postgres
├── scripts/
│   ├── test-collab-e2e.ts          # E2E Test CRDT Engine & 2-way Realtime Sync
│   ├── test-snapshots-e2e.ts       # E2E Test Snapshot Versioning & Live Restore
│   └── test-permissions-e2e.ts     # E2E Test User Search & RBAC Share Matrix
├── src/
│   ├── config/
│   │   ├── database.ts             # Prisma Client instance
│   │   └── env.ts                  # Env variables loader
│   ├── generated/prisma/           # Generated Prisma types & client
│   ├── shared/
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts        # authenticateJwt, optionalJwt
│   │   │   ├── permission.middleware.ts  # requireDocPermission (Owner/Explicit/Public)
│   │   │   └── validate.middleware.ts    # Zod parser gác cửa body, params, query
│   │   └── types/
│   │       └── express.d.ts              # Typing mở rộng Express.Request (req.user)
│   │
│   ├── modules/
│   │   ├── auth/                   # [Module 1] Xác thực (Register, Login, Me)
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.router.ts
│   │   │   ├── auth.schema.ts
│   │   │   └── auth.service.ts
│   │   │
│   │   ├── document/               # [Module 2] CRUD Metadata tài liệu
│   │   │   ├── document.controller.ts
│   │   │   ├── document.repository.ts
│   │   │   ├── document.router.ts
│   │   │   └── document.schema.ts
│   │   │
│   │   ├── user/                   # [Module 3] Tìm kiếm User cho Autocomplete Share
│   │   │   ├── user.controller.ts
│   │   │   ├── user.router.ts
│   │   │   ├── user.schema.ts
│   │   │   └── user.service.ts
│   │   │
│   │   ├── permission/             # [Module 4] Quản lý Ma trận Chia sẻ & Phân quyền
│   │   │   ├── permission.controller.ts
│   │   │   ├── permission.router.ts
│   │   │   ├── permission.schema.ts
│   │   │   └── permission.service.ts
│   │   │
│   │   ├── snapshot/               # [Module 5] Lịch sử phiên bản & Khôi phục
│   │   │   ├── snapshot.controller.ts
│   │   │   ├── snapshot.router.ts
│   │   │   ├── snapshot.schema.ts
│   │   │   └── snapshot.service.ts
│   │   │
│   │   └── collaboration/          # [Module 6] Real-time CRDT Engine (WebSocket + Yjs)
│   │       ├── collab.gateway.ts   # WS Server, Upgrade Handshake, Heartbeat 30s
│   │       ├── collab.schema.ts    # Handshake params validation
│   │       ├── collab.service.ts   # Yjs Binary Sync Protocol & Awareness Broadcast
│   │       ├── collab.types.ts     # WS Client, AuthenticatedUser typings
│   │       └── room.manager.ts     # In-memory Y.Doc cache, Debounce 3s & Auto Flush DB
│   │
│   └── index.ts                    # Entrypoint Express + HTTP + WS Server
├── docker-compose.yml              # Supabase Postgres, Studio, Redis
├── .env
├── package.json
└── tsconfig.json
```

### 2.2. Frontend Architecture (Feature-Based)

Dành cho phiên làm việc tiếp theo: Dựng giao diện React + Vite + TypeScript theo cấu trúc phân tách rõ ràng.
Sử dụng **Feature-Based Architecture** (Kiến trúc phân chia theo tính năng).

#### Cấu trúc lớp (Layers)

* **UI Layer:** Chứa các Component hiển thị (Tailwind CSS + [Shadcn UI](https://ui.shadcn.com/docs/installation/vite)).

* **State / Sync Layer:** Quản lý Yjs State, WebSocket Connection, và Zustand Store (lưu User Session, App Config).

* **Feature Modules:** Tách biệt rõ giữa `auth`, `dashboard` và `editor`.

```Plain text
frontend/
  ├── src/
  │   ├── components/
  │   │   ├── common/               # Modal cài đặt quyền, chia sẻ (DocSettingsModal)
  │   │   └── ui/                   # Shadcn base UI components (Button, Input, Card, Label)
  │   ├── features/
  │   │   ├── auth/                 # Form Login, Register & Auth hooks (TanStack Query)
  │   │   ├── dashboard/            # Dashboard danh sách tài liệu, inline rename, delete
  │   │   └── editor/               # TipTap Editor, CollabProvider, Toolbar, Header, Presence Avatars
  │   ├── lib/                      # Tailwind merge utils (cn)
  │   ├── routes/                   # AppRoutes (ProtectedRoute, PublicOnlyRoute)
  │   ├── services/                 # Axios instance cấu hình interceptors
  │   ├── stores/                   # Zustand store (Auth token)
  │   ├── App.tsx                   # Global Router
  │   ├── index.css                 # TipTap Typography overrides & theme definitions
  │   └── main.tsx                  # Entry point
  ├── package.json
  └── vite.config.ts
```

## 3. Hệ thống REST API & WebSocket Protocol

### 3.1. Auth API (/api/auth)

* `POST /api/auth/register` : Đăng ký tài khoản (body: `email, password, name?`).
* `POST /api/auth/login`    : Đăng nhập nhận JWT Token (body: `email, password`).
* `GET  /api/auth/me`       : Lấy thông tin user hiện tại (Header: `Bearer <token>`).

### 3.2. User API (/api/users)

* `GET  /api/users/search?q=...` : Tìm kiếm user phục vụ UI autocomplete khi share doc (Tự loại trừ chính mình).

### 3.3. Document API (/api/documents)

* `POST   /api/documents`              : Tạo tài liệu mới (body: title?).
* `GET    /api/documents/my-documents` : Lấy danh sách tài liệu do user sở hữu.
* `GET    /api/documents/:id`          : Lấy chi tiết metadata tài liệu (Quyền tối thiểu `VIEWER`).
* `PATCH  /api/documents/:id`          : Sửa `title, isPublic, publicRole` (Quyền `EDITOR`).
* `DELETE /api/documents/:id`          : Xóa tài liệu (Chỉ `OWNER`).

### 3.4. Permission API (/api/documents/:id/permissions)

* `GET    /api/documents/:id/permissions`         : Lấy ma trận phân quyền của tài liệu.
* `POST   /api/documents/:id/permissions`         : Cấp/Cập nhật quyền (body: `{ email | userId, role: "VIEWER" | "EDITOR" }`).
* `DELETE /api/documents/:id/permissions/:userId` : Thu hồi quyền truy cập (Chỉ `OWNER`).

### 3.5. Snapshot Version API (/api/documents/:id/snapshots)

* `POST   /api/documents/:id/snapshots`                      : Tạo snapshot lưu mốc phiên bản hiện tại.
* `GET    /api/documents/:id/snapshots`                     : Xem danh sách mốc thời gian snapshot.
* `GET    /api/documents/:id/snapshots/:snapshotId`          : Xem text preview của snapshot cũ.
* `POST   /api/documents/:id/snapshots/:snapshotId/restore`  : Khôi phục tài liệu về snapshot (Tự kích hoạt broadcast realtime).
* `DELETE /api/documents/:id/snapshots/:snapshotId`          : Xóa mốc snapshot (Chỉ `OWNER`).

### 3.6. Realtime WebSocket Gateway (/collab/:docId)

Endpoint: `ws://localhost:5000/collab/:docId?token=<JWT_TOKEN>` (Bỏ qua query token nếu là Guest).

Giao thức: Binary Protocol (`Uint8Array`) theo chuẩn `y-protocols`:

* Message Type `0`: Yjs Document Sync (Step 1, Step 2, Update).
* Message Type `1`: Yjs Awareness Protocol (Live Cursor, Selection range, User Name & Color).

## 4. Hạ tầng & Khởi chạy Local (Docker)

Hạ tầng chạy qua Docker Compose gồm PostgreSQL (Supabase), Supabase Studio UI và Redis 8 Alpine.

### Khởi động Database & Cache

```Bash
docker compose up -d
```

PostgreSQL: `localhost:5432` (User: `postgres`, Password: `postgrespassword`, DB: `collaborative_db`)

Supabase Studio UI: <http://localhost:54323>

Redis: `localhost:6379` (chưa dùng thằng này trong dự án, dự định dùng lưu Collab Room thay thế cho RAM của nodejs)

### Khởi động Backend Server

```Bash
npm install
npx prisma db push    # Đồng bộ schema vào Postgres
cd backend & npx prisma generate & cd ..
npm run dev           # Khởi chạy Express + WS Server trên cổng 5000
```

## Bọn Websocket, Yjs hoạt động theo kiểu Event Listner / Emmiter

* (Method) Websocket.send(message) sẽ tạo ra event 'message' của Websocket
* Thao tác edit sẽ tạo ra event 'update' của 'yjs' (class) Doc
* Tương tự với awareness (hiện diện con chuột trên màn hình edit).
