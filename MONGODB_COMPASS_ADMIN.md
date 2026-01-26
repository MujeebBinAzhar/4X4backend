# MongoDB Compass - Create Admin User

## ✅ Verified Hash for Password "12345678"

The project uses `bcrypt.hashSync()` which generates a different hash each time, but all hashes work correctly.

---

## 📋 MongoDB Compass Insert Query

### Collection: `admins`

### Document to Insert:

```json
{
  "name": {
    "en": "Admin"
  },
  "email": "admin@gmail.com",
  "password": "$2a$10$zxDS3FM0KGkxuWD296JMA.1yoBE8LFVHIk.xu2C03k0QmyBO01ik.",
  "role": "Admin",
  "status": "Active",
  "createdAt": {
    "$date": "2024-01-15T00:00:00.000Z"
  },
  "updatedAt": {
    "$date": "2024-01-15T00:00:00.000Z"
  }
}
```

---

## 🔄 Update Existing Admin Password

If admin already exists, use UPDATE:

### Filter:
```json
{ "email": "admin@gmail.com" }
```

### Update:
```json
{
  "$set": {
    "password": "$2a$10$zxDS3FM0KGkxuWD296JMA.1yoBE8LFVHIk.xu2C03k0QmyBO01ik."
  }
}
```

---

## 🔑 Login Credentials

- **Email:** `admin@gmail.com`
- **Password:** `12345678`

---

## ✅ Verify Password Works

After inserting, test with:
```bash
curl -X POST http://localhost:5055/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"12345678"}'
```

---

## 💡 Note

bcrypt generates different hashes each time, but they all work. If you need a fresh hash, run:
```bash
cd backend
node script/script.js
```

