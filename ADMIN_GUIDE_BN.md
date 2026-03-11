# BuildBarguna অ্যাডমিন গাইড
## সম্পূর্ণ অ্যাডমিনিস্ট্রেটর ম্যানুয়াল

**সংস্করণ:** 1.0  
**আপডেট:** মার্চ ২০২৬  
**গোপনীয়তা স্তর:** অ্যাডমিন শুধুমাত্র

---

## সূচিপত্র

1. [ভূমিকা](#ভূমিকা)
2. [অ্যাডমিন ড্যাশবোর্ড](#অ্যাডমিন-ড্যাশবোর্ড)
3. [ব্যবহারকারী ব্যবস্থাপনা](#ব্যবহারকারী-ব্যবস্থাপনা)
4. [প্রজেক্ট ব্যবস্থাপনা](#প্রজেক্ট-ব্যবস্থাপনা)
5. [শেয়ার অনুমোদন](#শেয়ার-অনুমোদন)
6. [লভ্যাংশ ব্যবস্থাপনা](#লভ্যাংশ-ব্যবস্থাপনা)
7. [উইথড্র অনুমোদন](#উইথড্র-অনুমোদন)
8. [পয়েন্ট এবং রিওয়ার্ড](#পয়েন্ট-এবং-রিওয়ার্ড)
9. [রেফারেল ব্যবস্থাপনা](#রেফারেল-ব্যবস্থাপনা)
10. [টাস্ক ব্যবস্থাপনা](#টাস্ক-ব্যবস্থাপনা)
11. [নোটিফিকেশন ব্যবস্থাপনা](#নোটিফিকেশন-ব্যবস্থাপনা)
12. [রিপোর্ট এবং অ্যানালিটিক্স](#রিপোর্ট-এবং-অ্যানালিটিক্স)
13. [সিস্টেম সেটিংস](#সিস্টেম-সেটিংস)
14. [নিরাপত্তা এবং কমপ্লায়েন্স](#নিরাপত্তা-এবং-কমপ্লায়েন্স)
15. [ট্রাবলশুটিং](#ট্রাবলশুটিং)

---

## ভূমিকা

### অ্যাডমিন ভূমিকা

BuildBarguna প্ল্যাটফর্মে অ্যাডমিনের দায়িত্ব হলো প্ল্যাটফর্মের স্বাভাবিক কার্যক্রম পরিচালনা করা, ব্যবহারকারীদের অনুরোধ প্রক্রিয়া করা, এবং সিস্টেমের নিরাপত্তা নিশ্চিত করা।

### অ্যাডমিনের ধরন

```
অ্যাডমিন ভূমিকা:
├─ সুপার অ্যাডমিন (Super Admin)
│  ├─ সব অ্যাডমিন ফাংশন
│  ├─ অ্যাডমিন ম্যানেজমেন্ট
│  └─ সিস্টেম সেটিংস
│
├─ সিনিয়র অ্যাডমিন (Senior Admin)
│  ├─ সব অনুমোদন কাজ
│  ├─ রিপোর্ট এক্সেস
│  └─ ব্যবহারকারী ম্যানেজমেন্ট
│
└─ জুনিয়র অ্যাডমিন (Junior Admin)
   ├─ মৌলিক অনুমোদন
   ├─ ব্যবহারকারী সাপোর্ট
   └─ সাধারণ কাজ
```

### অ্যাডমিন এক্সেস

#### লগইন

1. **অ্যাডমিন পোর্টালে যান:**
   ```
   URL: https://buildbargunainitiative.org/admin
   ```

2. **অ্যাডমিন ক্রেডেনশিয়াল ব্যবহার করুন:**
   ```
   ├─ ইমেইল/মোবাইল
   └─ পাসওয়ার্ড
   ```

3. **ড্যাশবোর্ডে প্রবেশ:**
   - সফল লগইনের পর অ্যাডমিন ড্যাশবোর্ডে যাবেন

#### নিরাপত্তা

⚠️ **গুরুত্বপূর্ণ:**
- অ্যাডমিন পাসওয়ার্ড কখনো শেয়ার করবেন না
- নিয়মিত পাসওয়ার্ড পরিবর্তন করুন
- পাবলিক কম্পিউটারে লগইন করবেন না
- লগআউট বাটন ব্যবহার করে বের হন
- সন্দেহজনক কার্যকলাপ রিপোর্ট করুন

---

## অ্যাডমিন ড্যাশবোর্ড

### ড্যাশবোর্ড ওভারভিউ

অ্যাডমিন ড্যাশবোর্ডে আপনি প্ল্যাটফর্মের সামগ্রিক চিত্র দেখতে পাবেন:

#### মূল মেট্রিক্স

```
├─ মোট ব্যবহারকারী
├─ সক্রিয় ব্যবহারকারী (৩০ দিন)
├─ নতুন ব্যবহারকারী (আজ)
├─ মোট প্রজেক্ট
├─ সক্রিয় প্রজেক্ট
└─ মোট বিনিয়োগ
```

#### অনুমোদন প্রয়োজন

```
├─ পেন্ডিং শেয়ার রিকোয়েস্ট
├─ পেন্ডিং উইথড্র রিকোয়েস্ট
├─ পেন্ডিং রিওয়ার্ড রিডিম্পশন
└─ পেন্ডিং পয়েন্ট উইথড্র
```

#### আর্থিক সারাংশ

```
├─ মোট বিনিয়োগিত অর্থ
├─ মোট উপার্জিত লভ্যাংশ
├─ মোট উইথড্র
├─ পেন্ডিং উইথড্র
└─ কোম্পানি শেয়ার
```

#### কার্যকলাপ

```
├─ সাম্প্রতিক লেনদেন
├─ সাম্প্রতিক রেজিস্ট্রেশন
├─ টপ ইনভেস্টর
└─ টপ পয়েন্ট আর্নার
```

### দ্রুত অ্যাকশন

ড্যাশবোর্ড থেকে সরাসরি অ্যাকশন নেওয়া যায়:

```
├─ শেয়ার অনুমোদন
├─ উইথড্র অনুমোদন
├─ নতুন প্রজেক্ট তৈরি
├─ ব্যবহারকারী দেখুন
└─ রিপোর্ট ডাউনলোড
```

---

## ব্যবহারকারী ব্যবস্থাপনা

### ব্যবহারকারী লিস্ট দেখা

#### API: `GET /api/admin/users`

```
Query Parameters:
├─ page: পেজ নম্বর (ডিফল্ট: 1)
├─ limit: প্রতি পেজে সংখ্যা (ডিফল্ট: 20)
└─ offset: অফসেট (অটো ক্যালকুলেটেড)
```

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "name": "ব্যবহারকারীর নাম",
        "phone": "01XXXXXXXXX",
        "email": "user@example.com",
        "role": "member",
        "referral_code": "ABC123",
        "referred_by": "XYZ789",
        "is_active": 1,
        "created_at": "2026-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1000,
      "totalPages": 50
    }
  }
}
```

### ব্যবহারকারী বিস্তারিত

#### API: `GET /api/admin/users/:id`

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "ব্যবহারকারীর নাম",
    "phone": "01XXXXXXXXX",
    "email": "user@example.com",
    "role": "member",
    "is_active": 1,
    "shares": [
      {
        "project_id": 1,
        "project_title": "প্রজেক্টের নাম",
        "quantity": 100,
        "share_price": 10000
      }
    ],
    "total_earnings_paisa": 50000
  }
}
```

### ব্যবহারকারী সক্রিয়/নিষ্ক্রিয় করা

#### API: `PATCH /api/admin/users/:id/toggle`

**ব্যবহার:**
- ব্যবহারকারী অ্যাকাউন্ট সাময়িকভাবে বন্ধ করতে
- সন্দেহজনক কার্যকলাপের ক্ষেত্রে
- ব্যবহারকারীর অনুরোধে

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "message": "অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে"
  }
}
```

### ব্যবহারকারী খোঁজা

#### ফিল্টার অপশন

```
├─ নাম দিয়ে
├─ ইমেইল দিয়ে
├─ মোবাইল নম্বর দিয়ে
├─ রেফারেল কোড দিয়ে
├─ রেজিস্ট্রেশন তারিখ দিয়ে
└─ স্ট্যাটাস দিয়ে (সক্রিয়/নিষ্ক্রিয়)
```

### ব্যবহারকারী যাচাই

#### যাচাই করার বিষয়

```
নতুন ব্যবহারকারী:
├─ ইমেইল ভেরিফিকেশন
├─ মোবাইল ভেরিফিকেশন
├─ রেফারেল কোড ভ্যালিডেশন
└─ সন্দেহজনক প্যাটার্ন চেক
```

**সন্দেহজনক প্যাটার্ন:**
```
⚠️ একই IP থেকে একাধিক অ্যাকাউন্ট
⚠️ একই মোবাইল নম্বর ব্যবহার
⚠️ দ্রুত রেজিস্ট্রেশন (বট সন্দেহ)
⚠️ মিথ্যা তথ্য
```

---

## প্রজেক্ট ব্যবস্থাপনা

### নতুন প্রজেক্ট তৈরি

#### API: `POST /api/admin/projects`

**রিপন্স:**
```json
{
  "title": "প্রজেক্টের নাম",
  "description": "বিস্তারিত বর্ণনা",
  "image_url": "https://example.com/image.jpg",
  "total_capital": 10000000,  // পয়সায় (৳১,০০,০০০)
  "total_shares": 10000,       // মোট শেয়ার সংখ্যা
  "share_price": 10000,        // পয়সায় (৳১০০ প্রতি শেয়ার)
  "status": "draft"            // draft/active/closed
}
```

**গুরুত্বপূর্ণ:**
- `total_capital` = `total_shares` × `share_price`
- সব মূল্য **পয়সায়** দিতে হবে (৳১ = ১০০ পয়সা)
- `status` শুরুতে `draft` রাখুন

### প্রজেক্ট আপডেট

#### API: `PUT /api/admin/projects/:id`

**আপডেটযোগ্য ফিল্ড:**
```json
{
  "title": "নতুন নাম",
  "description": "নতুন বর্ণনা",
  "image_url": "নতুন URL",
  "total_capital": 15000000,
  "total_shares": 15000,
  "share_price": 10000,
  "status": "active"
}
```

⚠️ **সতর্কতা:**
- শেয়ার বিক্রি শুরু হলে `total_shares` কমানো যাবে না
- `status` পরিবর্তন সতর্কতার সাথে করুন

### প্রজেক্ট স্ট্যাটাস

#### API: `PATCH /api/admin/projects/:id/status`

**স্ট্যাটাস:**
```
├─ draft: খসড়া, সাধারণ্যে দৃশ্যমান নয়
├─ active: সক্রিয়, শেয়ার কেনা যাবে
└─ closed: বন্ধ, নতুন শেয়ার কেনা যাবে না
```

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "message": "প্রজেক্ট স্ট্যাটাস আপডেট হয়েছে"
  }
}
```

### প্রজেক্ট লিস্ট

#### API: `GET /api/admin/projects`

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "title": "প্রজেক্টের নাম",
        "total_capital": 10000000,
        "total_shares": 10000,
        "share_price": 10000,
        "status": "active",
        "sold_shares": 5000,
        "available_shares": 5000,
        "created_at": "2026-01-01T00:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### প্রজেক্ট পর্যবেক্ষণ

#### পর্যবেক্ষণের বিষয়

```
├─ শেয়ার বিক্রির অগ্রগতি
├─ বিনিয়োগকারী সংখ্যা
├─ লভ্যাংশের হার
├─ মোট আয়
└─ বিনিয়োগকারী সন্তুষ্টি
```

---

## শেয়ার অনুমোদন

### পেন্ডিং শেয়ার রিকোয়েস্ট

#### API: `GET /api/admin/shares/pending`

**Query Parameters:**
```
├─ page: পেজ নম্বর
├─ limit: প্রতি পেজে সংখ্যা
├─ status: pending/approved/rejected (ডিফল্ট: pending)
└─ offset: অফসেট
```

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 100,
        "user_id": 5,
        "user_name": "ব্যবহারকারীর নাম",
        "user_phone": "01XXXXXXXXX",
        "project_id": 2,
        "project_title": "প্রজেক্টের নাম",
        "quantity": 100,
        "total_amount": 1000000,  // পয়সায় (৳১০,০০০)
        "bkash_txid": "8K7H9M2L",
        "payment_method": "bkash",
        "status": "pending",
        "created_at": "2026-03-01T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### শেয়ার অনুমোদন

#### API: `PATCH /api/admin/shares/:id/approve`

**প্রক্রিয়া:**
1. **রিকোয়েস্ট যাচাই করুন:**
   ```
   ├─ ব্যবহারকারীর তথ্য
   ├─ প্রজেক্টের তথ্য
   ├─ শেয়ার সংখ্যা
   ├─ পেমেন্ট TxID
   └─ উপলব্ধ শেয়ার আছে কিনা
   ```

2. **পেমেন্ট ভেরিফাই করুন:**
   ```
   ├─ bKash অ্যাপ/ওয়েবসাইটে যান
   ├─ TxID দিয়ে সার্চ করুন
   ├─ ট্রানজেকশন নিশ্চিত করুন
   └─ পরিমাণ মিলিয়ে দেখুন
   ```

3. **অনুমোদন দিন:**
   ```
   PATCH /api/admin/shares/100/approve
   ```

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "message": "শেয়ার অনুমোদন করা হয়েছে এবং পোর্টফোলিওতে যোগ হয়েছে"
  }
}
```

### শেয়ার প্রত্যাখ্যান

#### API: `PATCH /api/admin/shares/:id/reject`

**বডি:**
```json
{
  "admin_note": "প্রত্যাখ্যানের কারণ (ঐচ্ছিক)"
}
```

**প্রত্যাখ্যানের কারণ:**
```
├─ পেমেন্ট পাওয়া যায়নি
├─ ভুল TxID
├─ শেয়ার উপলব্ধ নেই
├─ সন্দেহজনক কার্যকলাপ
└─ অন্য কোনো কারণ
```

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "message": "শেয়ার প্রত্যাখ্যান করা হয়েছে"
  }
}
```

### অনুমোদন টিপস

✅ **ভালো অনুশীলন:**
- দ্রুত অনুমোদন দিন (২৪ ঘণ্টার মধ্যে)
- পেমেন্ট সঠিকভাবে ভেরিফাই করুন
- উপলব্ধ শেয়ার চেক করুন
- রেফারেল বোনাস অটো ক্রেডিট হয়

⚠️ **সতর্কতা:**
- একাধিক অ্যাডমিন একই রিকোয়েস্ট অনুমোদন করতে পারে না
- শেয়ার সংখ্যা অতিক্রম করা যাবে না
- ভুল তথ্য দিয়ে অনুমোদন দেবেন না

---

## লভ্যাংশ ব্যবস্থাপনা

### লভ্যাংশ হার নির্ধারণ

#### মাসিক লভ্যাংশের হার

লভ্যাংশের হার প্রতি মাসে অ্যাডমিন নির্ধারণ করে:

```
লভ্যাংশের হার:
├─ বেসিস পয়েন্টে (1% = 100 bps)
├─ প্রজেক্টভেদে ভিন্ন হতে পারে
├─ মাসভেদে পরিবর্তিত হতে পারে
└─ প্রজেক্টের আয়ের উপর ভিত্তি করে
```

### লভ্যাংশ বিতরণ (স্বয়ংক্রিয়)

#### Cron Job

লভ্যাংশ বিতরণ স্বয়ংক্রিয়ভাবে হয়:

```
সময়সূচী:
├─ প্রতি মাসের ১ তারিখ
├─ সময়: রাত ১২টায় (বাংলাদেশ সময়)
└─ স্বয়ংক্রিয় Cron Job
```

**Cron Job কোড:**
```typescript
// src/cron/earnings.ts
await distributeMonthlyEarnings(env)
```

**গণনা পদ্ধতি:**
```typescript
লভ্যাংশ = (শেয়ার × মোট মূলধন × হার) / (মোট শেয়ার × ১০,০০০)
```

### লভ্যাংশ পর্যবেক্ষণ

#### Cron Execution Status

```
API: GET /api/health/migrations

রিপন্স:
{
  "success": true,
  "data": {
    "last_cron_execution": {
      "timestamp": "2026-03-01T00:00:00Z",
      "duration_ms": 5000,
      "success": true,
      "tasks": [
        {
          "task": "earnings_distribution",
          "status": "fulfilled"
        },
        {
          "task": "token_blacklist_cleanup",
          "status": "fulfilled"
        }
      ]
    }
  }
}
```

### লভ্যাংশ যাচাই

#### যাচাই করার বিষয়

```
├─ সঠিক হারে বিতরণ হয়েছে
├─ সব শেয়ারহোল্ডার পেয়েছে
├─ ডুপ্লিকেট এন্ট্রি নেই
└─ মোট পরিমাণ সঠিক
```

---

## উইথড্র অনুমোদন

### পেন্ডিং উইথড্র রিকোয়েস্ট

#### API: `GET /api/admin/withdrawals`

**Query Parameters:**
```
├─ page: পেজ নম্বর
├─ limit: প্রতি পেজে সংখ্যা
├─ status: pending/approved/completed/rejected/all
└─ offset: অফসেট
```

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 50,
        "user_id": 5,
        "user_name": "ব্যবহারকারীর নাম",
        "user_phone": "01XXXXXXXXX",
        "amount_paisa": 10000,  // ৳১০০
        "bkash_number": "01XXXXXXXXX",
        "status": "pending",
        "requested_at": "2026-03-01T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### উইথড্র সেটিংস

#### বর্তমান সেটিংস দেখা

API: `GET /api/admin/withdrawals/settings`

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "min_paisa": 10000,      // ৳১০০
    "max_paisa": 500000,     // ৳৫,০০০
    "cooldown_days": 7,
    "referral_bonus_paisa": 5000  // ৳৫০
  }
}
```

#### সেটিংস আপডেট

API: `PATCH /api/admin/withdrawals/settings`

**বডি:**
```json
{
  "min_paisa": 10000,
  "max_paisa": 500000,
  "cooldown_days": 7
}
```

⚠️ **সীমাবদ্ধতা:**
```
min_paisa: সর্বনিম্ন ৳১০০
max_paisa: সর্বোচ্চ ৳১০,০০০
cooldown_days: ১-৩৬৫ দিন
```

### উইথড্র অনুমোদন

#### API: `PATCH /api/admin/withdrawals/:id/approve`

**প্রক্রিয়া:**

1. **রিকোয়েস্ট যাচাই করুন:**
   ```
   ├─ ব্যবহারকারীর ব্যালেন্স
   ├─ উইথড্রের পরিমাণ
   ├─ পেন্ডিং উইথড্র আছে কিনা
   └─ কুলডাউন সময় শেষ কিনা
   ```

2. **ব্যালেন্স চেক করুন:**
   ```
   উপলব্ধ ব্যালেন্স = মোট উপার্জন - সম্পন্ন উইথড্র - পেন্ডিং উইথড্র
   ```

3. **অনুমোদন দিন:**
   ```
   PATCH /api/admin/withdrawals/50/approve
   ```

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "message": "উত্তোলন অনুরোধ অনুমোদন করা হয়েছে। এখন bKash এ পাঠান।"
  }
}
```

### উইথড্র সম্পন্ন করা

#### API: `PATCH /api/admin/withdrawals/:id/complete`

**বডি:**
```json
{
  "bkash_txid": "8K7H9M2L"  // ৮-১২ অক্ষর, বড় হাতে
}
```

**প্রক্রিয়া:**

1. **bKash এ পাঠান:**
   ```
   ├─ bKash সেন্ড মানি ব্যবহার করুন
   ├─ ব্যবহারকারীর নম্বরে পাঠান
   ├─ ট্রানজেকশন আইডি নিন
   └─ পরিমাণ যাচাই করুন
   ```

2. **সিস্টেমে মার্ক করুন:**
   ```
   PATCH /api/admin/withdrawals/50/complete
   ```

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "message": "bKash TxID 8K7H9M2L দিয়ে উত্তোলন সম্পন্ন হয়েছে।"
  }
}
```

### উইথড্র প্রত্যাখ্যান

#### API: `PATCH /api/admin/withdrawals/:id/reject`

**বডি:**
```json
{
  "admin_note": "প্রত্যাখ্যানের কারণ"
}
```

**প্রত্যাখ্যানের কারণ:**
```
├─ পর্যাপ্ত ব্যালেন্স নেই
├─ ভুল bKash নম্বর
├─ সন্দেহজনক কার্যকলাপ
├─ কুলডাউন সময় শেষ হয়নি
└─ অন্য কোনো কারণ
```

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "message": "উত্তোলন অনুরোধ প্রত্যাখ্যান করা হয়েছে।"
  }
}
```

⚠️ **গুরুত্বপূর্ণ:**
- প্রত্যাখ্যানের পর ব্যালেন্স স্বয়ংক্রিয়ভাবে ফেরত যায়
- ব্যবহারকারী আবার রিকোয়েস্ট করতে পারবে

### উইথড্র টিপস

✅ **ভালো অনুশীলন:**
- দ্রুত অনুমোদন দিন (২৪ ঘণ্টা)
- bKash ট্রানজেকশন নিশ্চিত করুন
- TxID সঠিকভাবে এন্টার করুন
- প্রত্যাখ্যানের কারণ উল্লেখ করুন

⚠️ **সতর্কতা:**
- একাধিকবার একই TxID ব্যবহার করবেন না
- ভুল নম্বরে পাঠাবেন না
- ব্যালেন্স চেক না করে অনুমোদন দেবেন না

---

## পয়েন্ট এবং রিওয়ার্ড

### পয়েন্ট সিস্টেম ওভারভিউ

```
পয়েন্ট অর্জনের উপায়:
├─ টাস্ক সম্পন্ন করে
├─ রেফারেল বোনাস থেকে
├─ প্রমোশনাল ইভেন্টে
└─ বিশেষ অফারে

পয়েন্ট ব্যবহার:
├─ রিওয়ার্ড রিডিম্পশন
├─ পয়েন্ট উইথড্র (টাকা)
└─ ভবিষ্যতে: প্রিমিয়াম ফিচার
```

### পয়েন্ট সেটিংস

#### বর্তমান সেটিংস

```typescript
POINTS_SYSTEM = {
  MIN_WITHDRAWAL_POINTS: 100,     // ন্যূনতম ১০০ পয়েন্ট
  MAX_WITHDRAWALS_PER_MONTH: 4,   // মাসে ৪ বার
  POINTS_TO_TAKA_DIVISOR: 10      // ১০ পয়েন্ট = ৳১
}
```

#### পয়েন্ট রূপান্তর

```
১০ পয়েন্ট = ৳১
১০০ পয়েন্ট = ৳১০
১০০০ পয়েন্ট = ৳১০০
```

### রিওয়ার্ড ম্যানেজমেন্ট

#### নতুন রিওয়ার্ড তৈরি

```sql
INSERT INTO rewards (
  name, description, points_required,
  quantity, image_url, is_active
) VALUES (
  'গিফট কার্ড ৳৫০০',
  'পাঠানো গিফট কার্ড',
  5000,  -- ৫০০০ পয়েন্ট
  100,   -- ১০০টি উপলব্ধ
  'https://example.com/gift-card.jpg',
  1      -- সক্রিয়
)
```

#### রিওয়ার্ড আপডেট

```sql
UPDATE rewards
SET quantity = quantity + 50,
    updated_at = datetime('now')
WHERE id = 1
```

#### রিওয়ার্ড নিষ্ক্রিয় করা

```sql
UPDATE rewards
SET is_active = 0,
    updated_at = datetime('now')
WHERE id = 1
```

### রিওয়ার্ড রিডিম্পশন অনুমোদন

#### পেন্ডিং রিডিম্পশন দেখা

```sql
SELECT rr.*, r.name as reward_name, u.name as user_name, u.phone
FROM reward_redemptions rr
JOIN rewards r ON r.id = rr.reward_id
JOIN users u ON u.id = rr.user_id
WHERE rr.status = 'pending'
ORDER BY rr.redeemed_at DESC
```

#### অনুমোদন প্রক্রিয়া

1. **রিডিম্পশন যাচাই করুন:**
   ```
   ├─ ব্যবহারকারীর তথ্য
   ├─ রিওয়ার্ডের তথ্য
   ├─ পয়েন্ট কেটেছে কিনা
   └─ স্টক আছে কিনা
   ```

2. **রিওয়ার্ড পাঠান:**
   ```
   ├─ গিফট কার্ড: ইমেইল/SMS এ কোড
   ├─ মোবাইল রিচার্জ: সরাসরি নম্বরে
   ├─ ক্যাশব্যাক: ব্যালেন্সে জমা
   └─ মার্চেন্ডাইজ: কুরিয়ারে ডেলিভারি
   ```

3. **স্ট্যাটাস আপডেট:**
   ```sql
   UPDATE reward_redemptions
   SET status = 'fulfilled',
       fulfilled_at = datetime('now'),
       updated_at = datetime('now')
   WHERE id = 100
   ```

### পয়েন্ট উইথড্র অনুমোদন

#### পেন্ডিং উইথড্র দেখা

```sql
SELECT pw.*, u.name as user_name, u.phone
FROM point_withdrawals pw
JOIN users u ON u.id = pw.user_id
WHERE pw.status = 'pending'
ORDER BY pw.requested_at DESC
```

#### অনুমোদন প্রক্রিয়া

1. **যাচাই করুন:**
   ```
   ├─ পয়েন্ট কেটেছে কিনা
   ├─ পরিমাণ সঠিক কিনা
   ├─ bKash নম্বর সঠিক কিনা
   └─ মাসিক সীমা অতিক্রম হয়নি
   ```

2. **bKash এ পাঠান:**
   ```
   ├─ পয়েন্ট / ১০ = টাকা
   ├─ bKash সেন্ড মানি
   └─ ট্রানজেকশন আইডি নিন
   ```

3. **স্ট্যাটাস আপডেট:**
   ```sql
   UPDATE point_withdrawals
   SET status = 'completed',
       bkash_txid = '8K7H9M2L',
       completed_at = datetime('now')
   WHERE id = 50
   ```

### পয়েন্ট টিপস

✅ **ভালো অনুশীলন:**
- নতুন রিওয়ার্ড নিয়মিত যোগ করুন
- পয়েন্ট ট্রানজেকশন মনিটর করুন
- সন্দেহজনক কার্যকলাপ চেক করুন
- রিওয়ার্ড স্টক আপডেট রাখুন

⚠️ **সতর্কতা:**
- ডুপ্লিকেট ট্রানজেকশন চেক করুন
- পয়েন্ট কারসাজি সনাক্ত করুন
- একাধিক অ্যাকাউন্ট ফ্রড চেক করুন

---

## রেফারেল ব্যবস্থাপনা

### রেফারেল সেটিংস

#### বর্তমান সেটিংস দেখা

API: `GET /api/admin/referrals/settings`

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "referral_bonus_paisa": 5000  // ৳৫০
  }
}
```

#### সেটিংস আপডেট

API: `PATCH /api/admin/referrals/settings`

**বডি:**
```json
{
  "referral_bonus_paisa": 5000  // সর্বোচ্চ ১০০,০০০ (৳১,০০০)
}
```

⚠️ **সীমাবদ্ধতা:**
```
সর্বোচ্চ বোনাস: ৳১,০০০ (১০০,০০০ পয়সা)
ন্যূনতম বোনাস: ৳০
```

### রেফারেল স্ট্যাটাস

#### গ্লোবাল স্ট্যাটাস

API: `GET /api/admin/referrals/stats`

**রিপন্স:**
```json
{
  "success": true,
  "data": {
    "total_bonuses_issued": 500,
    "total_bonus_paid_paisa": 2500000,  // ৳২৫,০০০
    "top_referrers": [
      {
        "name": "টপ রেফারার",
        "phone": "01XXXXXXXXX",
        "referral_code": "ABC123",
        "bonuses_count": 50,
        "total_earned_paisa": 250000,
        "referred_count": 50
      }
    ]
  }
}
```

### রেফারেল বোনাস যাচাই

#### বোনাস অটো ক্রেডিট

```
বোনাস ক্রেডিট হয় যখন:
├─ রেফারি প্রথম শেয়ার কেনে
├─ শেয়ার অনুমোদিত হয়
└─ স্বয়ংক্রিয়ভাবে বোনাস জমা হয়
```

#### বোনাস লগ চেক

```sql
SELECT rb.*, u.name as referrer_name, u2.name as referred_name
FROM referral_bonuses rb
JOIN users u ON u.id = rb.referrer_user_id
JOIN users u2 ON u2.id = rb.referred_user_id
ORDER BY rb.created_at DESC
LIMIT 100
```

### রেফারেল ফ্রড সনাক্তকরণ

#### সন্দেহজনক প্যাটার্ন

```
⚠️ একই IP থেকে একাধিক অ্যাকাউন্ট
⚠️ একই মোবাইল নম্বর
⚠️ দ্রুত রেজিস্ট্রেশন
⚠️ মিথ্যা রেফারেল কোড
⚠️ বট অ্যাকাউন্ট
```

#### ফ্রড প্রতিরোধ

```sql
-- একই IP থেকে একাধিক অ্যাকাউন্ট খোঁজা
SELECT phone, email, created_at, COUNT(*) as count
FROM users
GROUP BY phone, email
HAVING COUNT(*) > 1
```

### রেফারেল টিপস

✅ **ভালো অনুশীলন:**
- টপ রেফারারদের পুরস্কার দিন
- রেফারেল ইভেন্ট আয়োজন করুন
- বোনাস রেট সামঞ্জস্য করুন
- ফ্রড মনিটর করুন

---

## টাস্ক ব্যবস্থাপনা

### টাস্ক প্রকারভেদ

```
টাস্ক টাইপ:
├─ দৈনিক টাস্ক (daily_tasks)
│  ├─ দিনে একাধিকবার
│  ├─ কোলডাউন সময়
│  └─ দৈনিক সীমা
│
└─ এককালীন টাস্ক
   ├─ শুধু একবার
   ├─ বেশি পয়েন্ট
   └─ কোনো সীমা নেই
```

### নতুন টাস্ক তৈরি

#### API: `POST /api/admin/tasks` (ভবিষ্যতে)

**বডি:**
```json
{
  "title": "Facebook এ পোস্ট শেয়ার করুন",
  "destination_url": "https://facebook.com/buildbarguna",
  "platform": "facebook",
  "points": 5,
  "cooldown_seconds": 30,
  "daily_limit": 20,
  "is_one_time": false,
  "is_active": true
}
```

### টাস্ক আপডেট

#### টাস্ক নিষ্ক্রিয় করা

```sql
UPDATE daily_tasks
SET is_active = 0,
    updated_at = datetime('now')
WHERE id = 10
```

#### টাস্ক এডিট করা

```sql
UPDATE daily_tasks
SET points = 10,
    cooldown_seconds = 60,
    daily_limit = 15,
    updated_at = datetime('now')
WHERE id = 10
```

### টাস্ক কমপ্লিশন মনিটর

#### সন্দেহজনক কমপ্লিশন

```sql
-- খুব দ্রুত সম্পন্ন (৫ সেকেন্ডের কম)
SELECT tc.*, u.name
FROM task_completions tc
JOIN users u ON u.id = tc.user_id
WHERE tc.completion_time_seconds < 5
  AND tc.is_flagged = 1
ORDER BY tc.completed_at DESC
LIMIT 100
```

#### টপ পারফর্মার

```sql
SELECT u.name, COUNT(tc.id) as tasks_completed,
       SUM(tc.points_earned) as total_points
FROM task_completions tc
JOIN users u ON u.id = tc.user_id
WHERE tc.task_date = date('now')
GROUP BY u.id
ORDER BY tasks_completed DESC
LIMIT 10
```

### টাস্ক টিপস

✅ **ভালো অনুশীলন:**
- নতুন টাস্ক নিয়মিত যোগ করুন
- পয়েন্ট রেট সামঞ্জস্য করুন
- ফ্রড মনিটর করুন
- ইউজার ফিডব্যাক নিন

---

## নোটিফিকেশন ব্যবস্থাপনা

### নোটিফিকেশন প্রকার

```
নোটিফিকেশন টাইপ:
├─ transaction: লেনদেন সম্পর্কিত
├─ system: সিস্টেম আপডেট
├─ promotional: প্রমোশনাল অফার
├─ referral: রেফারেল আপডেট
├─ task: টাস্ক সম্পর্কিত
└─ withdrawal: উইথড্র স্ট্যাটাস
```

### নোটিফিকেশন পাঠানো

#### একক ব্যবহারকারীকে

```sql
INSERT INTO notifications (
  user_id, type, title, message,
  is_read, reference_type, reference_id
) VALUES (
  5,  -- user_id
  'system',
  'সিস্টেম আপডেট',
  'আগামীকাল রক্ষণাবেক্ষণের জন্য সিস্টেম বন্ধ থাকবে',
  0,
  'maintenance',
  NULL
)
```

#### সব ব্যবহারকারীকে

```sql
INSERT INTO notifications (
  user_id, type, title, message, is_read
)
SELECT id, 'system', 'সিস্টেম আপডেট',
       'আগামীকাল রক্ষণাবেক্ষণের জন্য সিস্টেম বন্ধ থাকবে',
       0
FROM users
WHERE is_active = 1
```

#### শুধু অ্যাডমিনদের

```sql
INSERT INTO notifications (
  user_id, type, title, message, is_read
)
SELECT id, 'new_withdrawal',
       'নতুন পয়েন্ট উইথড্র রিকোয়েস্ট',
       '01XXXXXXXXX - 500 পয়েন্ট',
       0
FROM users
WHERE role = 'admin' AND is_active = 1
LIMIT 5
```

### নোটিফিকেশন ম্যানেজমেন্ট

#### পড়া নোটিফিকেশন

```sql
SELECT * FROM notifications
WHERE user_id = 5 AND is_read = 1
ORDER BY created_at DESC
LIMIT 50
```

#### অপঠিত নোটিফিকেশন

```sql
SELECT COUNT(*) as unread_count
FROM notifications
WHERE user_id = 5 AND is_read = 0
```

#### নোটিফিকেশন ডিলিট

```sql
DELETE FROM notifications
WHERE user_id = 5 AND is_read = 1
  AND created_at < datetime('now', '-30 days')
```

---

## রিপোর্ট এবং অ্যানালিটিক্স

### ব্যবহারকারী রিপোর্ট

#### নতুন ব্যবহারকারী

```sql
-- আজকের নতুন ব্যবহারকারী
SELECT COUNT(*) as new_users
FROM users
WHERE DATE(created_at) = DATE('now')
```

```sql
-- এই মাসের নতুন ব্যবহারকারী
SELECT COUNT(*) as new_users
FROM users
WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
```

#### সক্রিয় ব্যবহারকারী

```sql
-- গত ৩০ দিনে সক্রিয়
SELECT COUNT(DISTINCT user_id) as active_users
FROM task_completions
WHERE completed_at >= datetime('now', '-30 days')
```

### আর্থিক রিপোর্ট

#### মোট বিনিয়োগ

```sql
SELECT SUM(quantity * share_price) as total_investment
FROM user_shares us
JOIN projects p ON p.id = us.project_id
```

#### মোট লভ্যাংশ

```sql
SELECT SUM(amount) as total_earnings
FROM earnings
```

#### মোট উইথড্র

```sql
SELECT SUM(amount_paisa) as total_withdrawn
FROM withdrawals
WHERE status = 'completed'
```

### টাস্ক রিপোর্ট

#### টাস্ক কমপ্লিশন

```sql
-- আজকের কমপ্লিশন
SELECT dt.title, COUNT(tc.id) as completions,
       SUM(tc.points_earned) as total_points
FROM task_completions tc
JOIN daily_tasks dt ON dt.id = tc.task_id
WHERE tc.task_date = DATE('now')
GROUP BY dt.id
```

#### টপ পয়েন্ট আর্নার

```sql
SELECT u.name, up.lifetime_earned,
       up.available_points
FROM user_points up
JOIN users u ON u.id = up.user_id
WHERE u.is_active = 1
ORDER BY lifetime_earned DESC
LIMIT 10
```

### রেফারেল রিপোর্ট

#### টপ রেফারার

```sql
SELECT u.name, u.referral_code,
       COUNT(u2.id) as referred_count,
       COALESCE(SUM(rb.amount_paisa), 0) as total_earned
FROM users u
LEFT JOIN users u2 ON u2.referrer_user_id = u.id
LEFT JOIN referral_bonuses rb ON rb.referrer_user_id = u.id
GROUP BY u.id
ORDER BY referred_count DESC
LIMIT 10
```

### রিপোর্ট এক্সপোর্ট

#### CSV এক্সপোর্ট

```sql
.headers on
.mode csv
.output report.csv
SELECT * FROM users WHERE is_active = 1;
.output stdout
```

#### PDF রিপোর্ট

ভবিষ্যতে PDF রিপোর্ট ফিচার যোগ করা হবে।

---

## সিস্টেম সেটিংস

### ডাটাবেস ম্যানেজমেন্ট

#### মাইগ্রেশন স্ট্যাটাস

```
API: GET /api/health/migrations
```

#### মাইগ্রেশন রান

```bash
# লোকাল
npm run db:migrate:local

# রিমোট
npm run db:migrate:remote
```

### KV স্টোর ম্যানেজমেন্ট

#### KV কী দেখা

```bash
wrangler kv:key list --namespace-id=<ID>
```

#### KV কী ডিলিট

```bash
wrangler kv:key delete --namespace-id=<ID> <KEY>
```

### Cron Job মনিটর

#### শেষ এক্সিকিউশন

```
API: GET /api/health/migrations

রিপন্স:
{
  "last_cron_execution": {
    "timestamp": "2026-03-01T00:00:00Z",
    "duration_ms": 5000,
    "success": true
  }
}
```

#### ম্যানুয়াল ট্রিগার

```bash
wrangler cron --name buildbarguna-worker
```

### লগ মনিটর

#### Worker Logs

```bash
wrangler tail buildbarguna-worker
```

#### এরর লগ

```bash
wrangler tail buildbarguna-worker --status error
```

---

## নিরাপত্তা এবং কমপ্লায়েন্স

### অ্যাডমিন নিরাপত্তা

#### অ্যাক্সেস কন্ট্রোল

```
অ্যাডমিন অ্যাক্সেস:
├─ সুপার অ্যাডমিন: সব ফাংশন
├─ সিনিয়র অ্যাডমিন: অনুমোদন + রিপোর্ট
└─ জুনিয়র অ্যাডমিন: শুধু অনুমোদন
```

#### অডিট লগ

```sql
-- সব অ্যাডমিন অ্যাকশন লগ করা হয়
INSERT INTO audit_logs (
  admin_user_id, action, details,
  ip_address, created_at
) VALUES (
  1,
  'approve_withdrawal',
  '{"withdrawal_id": 50, "amount": 10000}',
  '123.45.67.89',
  datetime('now')
)
```

### ডেটা প্রাইভেসি

#### ডেটা এক্সপোর্ট

```
ব্যবহারকারী ডেটা:
├─ ব্যক্তিগত তথ্য
├─ লেনদেন ইতিহাস
├─ বিনিয়োগ তথ্য
└─ পয়েন্ট ইতিহাস
```

#### ডেটা ডিলিশন

```sql
-- ব্যবহারকারী ডিলিট (সফট ডিলিট)
UPDATE users
SET is_active = 0,
    phone = NULL,
    email = NULL
WHERE id = 5
```

### কমপ্লায়েন্স

#### বাংলাদেশি আইন

```
অনুসরণীয় আইন:
├─ কোম্পানি আইন ১৯৯৪
├─ সিকিউরিটিজ আইন
├─ ICT আইন ২০০৬
└─ অর্থপাচার প্রতিরোধ আইন
```

#### AML কমপ্লায়েন্স

```
AML চেকলিস্ট:
├─ ব্যবহারকারী ভেরিফিকেশন (KYC)
├─ বড় লেনদেন মনিটর
├─ সন্দেহজনক কার্যকলাপ রিপোর্ট
└─ লেনদেন লগ সংরক্ষণ
```

---

## ট্রাবলশুটিং

### সাধারণ সমস্যা

#### শেয়ার অনুমোদন ব্যর্থ

**সমস্যা:** শেয়ার অনুমোদন দেওয়া যাচ্ছে না

**সমাধান:**
1. উপলব্ধ শেয়ার চেক করুন
2. ব্যবহারকারীর ইতিমধ্যে শেয়ার আছে কিনা দেখুন
3. ডুপ্লিকেট অনুমোদন চেক করুন
4. ডাটাবেস লগ চেক করুন

#### উইথড্র আটকে গেলে

**সমস্যা:** উইথড্র অনুমোদন দেওয়া যাচ্ছে না

**সমাধান:**
1. ব্যবহারকারীর ব্যালেন্স চেক করুন
2. পেন্ডিং উইথড্র আছে কিনা দেখুন
3. কুলডাউন সময় চেক করুন
4. ডাটাবেস লক চেক করুন

#### Cron Job ব্যর্থ

**সমস্যা:** লভ্যাংশ বিতরণ হচ্ছে না

**সমাধান:**
1. Cron লগ চেক করুন
2. ডাটাবেস কানেকশন চেক করুন
3. ম্যানুয়ালি রান করুন
4. সাপোর্টে যোগাযোগ করুন

### ডাটাবেস ইস্যু

#### কুয়েরি স্লো

**সমাধান:**
1. ইনডেক্স চেক করুন
2. কুয়েরি অপ্টিমাইজ করুন
3. ডাটাবেস ভ্যাকুয়াম করুন
4. লোড কমান

#### ডেডলক

**সমাধান:**
1. ট্রানজেকশন রোলব্যাক করুন
2. কুয়েরি সিকোয়েন্স পরিবর্তন করুন
3. টাইমআউট বাড়ান
4. লক মনিটর করুন

### যোগাযোগ

#### টেকনিক্যাল সাপোর্ট

```
ইমেইল: tech@buildbargunainitiative.org
ফোন: +880 XXXXXXXXXX
সময়: রবি-বৃহস্পতি, সকাল ১০টা - সন্ধ্যা ৬টা
```

#### ইমার্জেন্সি

```
ইমার্জেন্সি যোগাযোগ:
├─ সুপার অ্যাডমিন
├─ টেক লিড
└─ সিস্টেম অ্যাডমিন
```

---

## পরিশিষ্ট

### API রেফারেন্স

#### অ্যাডমিন এন্ডপয়েন্ট

```
ব্যবহারকারী:
├─ GET /api/admin/users
├─ GET /api/admin/users/:id
└─ PATCH /api/admin/users/:id/toggle

প্রজেক্ট:
├─ GET /api/admin/projects
├─ POST /api/admin/projects
├─ PUT /api/admin/projects/:id
└─ PATCH /api/admin/projects/:id/status

শেয়ার:
├─ GET /api/admin/shares/pending
├─ PATCH /api/admin/shares/:id/approve
└─ PATCH /api/admin/shares/:id/reject

উইথড্র:
├─ GET /api/admin/withdrawals
├─ PATCH /api/admin/withdrawals/:id/approve
├─ PATCH /api/admin/withdrawals/:id/complete
└─ PATCH /api/admin/withdrawals/:id/reject

রেফারেল:
├─ GET /api/admin/referrals/settings
├─ PATCH /api/admin/referrals/settings
└─ GET /api/admin/referrals/stats
```

### ডাটাবেস স্কিমা

#### মূল টেবিল

```
users: ব্যবহারকারী তথ্য
projects: প্রজেক্ট তথ্য
share_purchases: শেয়ার ক্রয়
user_shares: ব্যবহারকারী শেয়ার
earnings: লভ্যাংশ
withdrawals: উইথড্র রিকোয়েস্ট
referral_bonuses: রেফারেল বোনাস
daily_tasks: দৈনিক টাস্ক
task_completions: টাস্ক সম্পন্ন
user_points: পয়েন্ট ব্যালেন্স
rewards: রিওয়ার্ড
reward_redemptions: রিওয়ার্ড রিডিম্পশন
notifications: নোটিফিকেশন
```

### গুরুত্বপূর্ণ লিঙ্ক

```
অ্যাডমিন প্যানেল: https://buildbargunainitiative.org/admin
ডকুমেন্টেশন: https://buildbargunainitiative.org/docs
সাপোর্ট: https://buildbargunainitiative.org/support
```

---

**শেষ আপডেট:** মার্চ ২০২৬  
**পরবর্তী আপডেট:** জুন ২০২৬  
**অনুমোদন:** সুপার অ্যাডমিন

---

*এই গাইডটি শুধু অ্যাডমিনের জন্য। দয়া করে গোপনীয় রাখুন।*
