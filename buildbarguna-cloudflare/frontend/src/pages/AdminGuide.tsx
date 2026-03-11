import { useState } from 'react'
import { ChevronRight, Book, X } from 'lucide-react'

interface GuideSection {
  id: string
  title: string
  icon: string
  content: React.ReactNode
}

const adminGuideSections: GuideSection[] = [
  {
    id: 'intro',
    title: 'ভূমিকা',
    icon: '👨‍💼',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">অ্যাডমিন ভূমিকা</h2>
        <p className="text-gray-700">
          BuildBarguna প্ল্যাটফর্মে অ্যাডমিনের দায়িত্ব হলো প্ল্যাটফর্মের স্বাভাবিক কার্যক্রম পরিচালনা করা, ব্যবহারকারীদের অনুরোধ প্রক্রিয়া করা, এবং সিস্টেমের নিরাপত্তা নিশ্চিত করা।
        </p>
        
        <h3 className="text-xl font-semibold text-gray-800">অ্যাডমিনের ধরন</h3>
        <div className="space-y-3">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900">সুপার অ্যাডমিন</h4>
            <ul className="list-disc list-inside text-sm text-blue-800 mt-1">
              <li>সব অ্যাডমিন ফাংশন</li>
              <li>অ্যাডমিন ম্যানেজমেন্ট</li>
              <li>সিস্টেম সেটিংস</li>
            </ul>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-900">সিনিয়র অ্যাডমিন</h4>
            <ul className="list-disc list-inside text-sm text-purple-800 mt-1">
              <li>সব অনুমোদন কাজ</li>
              <li>রিপোর্ট এক্সেস</li>
              <li>ব্যবহারকারী ম্যানেজমেন্ট</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900">জুনিয়র অ্যাডমিন</h4>
            <ul className="list-disc list-inside text-sm text-gray-800 mt-1">
              <li>মৌলিক অনুমোদন</li>
              <li>ব্যবহারকারী সাপোর্ট</li>
              <li>সাধারণ কাজ</li>
            </ul>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">নিরাপত্তা</h3>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="font-semibold text-red-900">⚠️ গুরুত্বপূর্ণ:</p>
          <ul className="list-disc list-inside text-sm text-red-800 mt-2 space-y-1">
            <li>অ্যাডমিন পাসওয়ার্ড কখনো শেয়ার করবেন না</li>
            <li>নিয়মিত পাসওয়ার্ড পরিবর্তন করুন</li>
            <li>পাবলিক কম্পিউটারে লগইন করবেন না</li>
            <li>লগআউট বাটন ব্যবহার করে বের হন</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'dashboard',
    title: 'ড্যাশবোর্ড',
    icon: '📊',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">অ্যাডমিন ড্যাশবোর্ড</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">মূল মেট্রিক্স</h3>
        <ul className="grid md:grid-cols-2 gap-3">
          <li className="bg-blue-50 p-3 rounded-lg">
            <span className="text-sm text-blue-800">মোট ব্যবহারকারী</span>
          </li>
          <li className="bg-blue-50 p-3 rounded-lg">
            <span className="text-sm text-blue-800">সক্রিয় ব্যবহারকারী (৩০ দিন)</span>
          </li>
          <li className="bg-blue-50 p-3 rounded-lg">
            <span className="text-sm text-blue-800">নতুন ব্যবহারকারী (আজ)</span>
          </li>
          <li className="bg-blue-50 p-3 rounded-lg">
            <span className="text-sm text-blue-800">মোট প্রজেক্ট</span>
          </li>
          <li className="bg-blue-50 p-3 rounded-lg">
            <span className="text-sm text-blue-800">সক্রিয় প্রজেক্ট</span>
          </li>
          <li className="bg-blue-50 p-3 rounded-lg">
            <span className="text-sm text-blue-800">মোট বিনিয়োগ</span>
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">অনুমোদন প্রয়োজন</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>পেন্ডিং শেয়ার রিকোয়েস্ট</li>
          <li>পেন্ডিং উইথড্র রিকোয়েস্ট</li>
          <li>পেন্ডিং রিওয়ার্ড রিডিম্পশন</li>
          <li>পেন্ডিং পয়েন্ট উইথড্র</li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">দ্রুত অ্যাকশন</h3>
        <p className="text-gray-700">ড্যাশবোর্ড থেকে সরাসরি:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li>শেয়ার অনুমোদন</li>
          <li>উইথড্র অনুমোদন</li>
          <li>নতুন প্রজেক্ট তৈরি</li>
          <li>ব্যবহারকারী দেখুন</li>
          <li>রিপোর্ট ডাউনলোড</li>
        </ul>
      </div>
    )
  },
  {
    id: 'users',
    title: 'ব্যবহারকারী',
    icon: '👥',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">ব্যবহারকারী ব্যবস্থাপনা</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">ব্যবহারকারী লিস্ট</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: GET /api/admin/users
        </p>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">ব্যবহারকারী বিস্তারিত</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: GET /api/admin/users/:id
        </p>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">ব্যবহারকারী সক্রিয়/নিষ্ক্রিয়</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: PATCH /api/admin/users/:id/toggle
        </p>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">ব্যবহারকারী খোঁজা</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>নাম দিয়ে</li>
          <li>ইমেইল দিয়ে</li>
          <li>মোবাইল নম্বর দিয়ে</li>
          <li>রেফারেল কোড দিয়ে</li>
          <li>রেজিস্ট্রেশন তারিখ দিয়ে</li>
          <li>স্ট্যাটাস দিয়ে</li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">ব্যবহারকারী যাচাই</h3>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
          <p className="font-semibold text-yellow-900">⚠️ সন্দেহজনক প্যাটার্ন:</p>
          <ul className="list-disc list-inside text-sm text-yellow-800 mt-2 space-y-1">
            <li>একই IP থেকে একাধিক অ্যাকাউন্ট</li>
            <li>একই মোবাইল নম্বর ব্যবহার</li>
            <li>দ্রুত রেজিস্ট্রেশন (বট সন্দেহ)</li>
            <li>মিথ্যা তথ্য</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'projects',
    title: 'প্রজেক্ট',
    icon: '🏗️',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">প্রজেক্ট ব্যবস্থাপনা</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">নতুন প্রজেক্ট তৈরি</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: POST /api/admin/projects
        </p>
        <div className="bg-gray-100 p-4 rounded-lg text-sm">
          <p className="font-semibold">গুরুত্বপূর্ণ:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>total_capital = total_shares × share_price</li>
            <li>সব মূল্য পয়সায় দিতে হবে (৳১ = ১০০ পয়সা)</li>
            <li>status শুরুতে draft রাখুন</li>
          </ul>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">প্রজেক্ট আপডেট</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: PUT /api/admin/projects/:id
        </p>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">প্রজেক্ট স্ট্যাটাস</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: PATCH /api/admin/projects/:id/status
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 border-b font-semibold text-left">স্ট্যাটাস</th>
                <th className="px-4 py-2 border-b font-semibold text-left">অর্থ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2 border-b">draft</td>
                <td className="px-4 py-2 border-b">খসড়া, সাধারণ্যে দৃশ্যমান নয়</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b">active</td>
                <td className="px-4 py-2 border-b">সক্রিয়, শেয়ার কেনা যাবে</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b">closed</td>
                <td className="px-4 py-2 border-b">বন্ধ, নতুন শেয়ার কেনা যাবে না</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  },
  {
    id: 'shares',
    title: 'শেয়ার',
    icon: '📈',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">শেয়ার অনুমোদন</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">পেন্ডিং শেয়ার রিকোয়েস্ট</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: GET /api/admin/shares/pending
        </p>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">শেয়ার অনুমোদন</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: PATCH /api/admin/shares/:id/approve
        </p>

        <h4 className="text-lg font-medium text-gray-700">অনুমোদন প্রক্রিয়া</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>রিকোয়েস্ট যাচাই করুন</li>
          <li>পেমেন্ট ভেরিফাই করুন (bKash এ TxID দিয়ে সার্চ)</li>
          <li>উপলব্ধ শেয়ার চেক করুন</li>
          <li>অনুমোদন দিন</li>
        </ol>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">শেয়ার প্রত্যাখ্যান</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: PATCH /api/admin/shares/:id/reject
        </p>
        <p className="text-gray-700 text-sm">প্রত্যাখ্যানের কারণ: পেমেন্ট পাওয়া যায়নি, ভুল TxID, শেয়ার উপলব্ধ নেই, সন্দেহজনক কার্যকলাপ</p>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <p className="font-semibold text-green-900">✅ টিপস:</p>
          <ul className="list-disc list-inside text-sm text-green-800 mt-2 space-y-1">
            <li>দ্রুত অনুমোদন দিন (২৪ ঘণ্টার মধ্যে)</li>
            <li>পেমেন্ট সঠিকভাবে ভেরিফাই করুন</li>
            <li>উপলব্ধ শেয়ার চেক করুন</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'withdrawals',
    title: 'উইথড্র',
    icon: '💰',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">উইথড্র ব্যবস্থাপনা</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">পেন্ডিং উইথড্র রিকোয়েস্ট</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: GET /api/admin/withdrawals
        </p>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">উইথড্র সেটিংস</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: GET /api/admin/withdrawals/settings
        </p>
        <div className="bg-gray-100 p-4 rounded-lg text-sm space-y-1">
          <p>min_paisa: 10000 (৳১০০)</p>
          <p>max_paisa: 500000 (৳৫,০০০)</p>
          <p>cooldown_days: 7</p>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">উইথড্র অনুমোদন</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: PATCH /api/admin/withdrawals/:id/approve
        </p>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">উইথড্র সম্পন্ন করা</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: PATCH /api/admin/withdrawals/:id/complete
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>bKash এ পাঠান</li>
          <li>ট্রানজেকশন আইডি নিন</li>
          <li>সিস্টেমে মার্ক করুন</li>
        </ol>

        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="font-semibold text-red-900">⚠️ সতর্কতা:</p>
          <ul className="list-disc list-inside text-sm text-red-800 mt-2 space-y-1">
            <li>একাধিকবার একই TxID ব্যবহার করবেন না</li>
            <li>ভুল নম্বরে পাঠাবেন না</li>
            <li>ব্যালেন্স চেক না করে অনুমোদন দেবেন না</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'rewards',
    title: 'রিওয়ার্ড',
    icon: '🎁',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">পয়েন্ট এবং রিওয়ার্ড</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">পয়েন্ট সেটিংস</h3>
        <div className="bg-gray-100 p-4 rounded-lg text-sm space-y-1 font-mono">
          <p>MIN_WITHDRAWAL_POINTS: 100</p>
          <p>MAX_WITHDRAWALS_PER_MONTH: 4</p>
          <p>POINTS_TO_TAKA_DIVISOR: 10</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="font-semibold text-blue-900">পয়েন্ট রূপান্তর:</p>
          <ul className="list-disc list-inside text-sm text-blue-800 mt-1">
            <li>১০ পয়েন্ট = ৳১</li>
            <li>১০০ পয়েন্ট = ৳১০</li>
            <li>১০০০ পয়েন্ট = ৳১০০</li>
          </ul>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">রিওয়ার্ড ম্যানেজমেন্ট</h3>
        <p className="text-gray-700 text-sm">নতুন রিওয়ার্ড তৈরি করতে ডাটাবেসে INSERT করুন অথবা অ্যাডমিন প্যানেল থেকে আপডেট করুন।</p>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">রিওয়ার্ড রিডিম্পশন অনুমোদন</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>রিডিম্পশন যাচাই করুন</li>
          <li>রিওয়ার্ড পাঠান</li>
          <li>স্ট্যাটাস আপডেট করুন</li>
        </ol>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">পয়েন্ট উইথড্র অনুমোদন</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>পয়েন্ট কেটেছে কিনা চেক করুন</li>
          <li>bKash এ পাঠান (পয়েন্ট / ১০ = টাকা)</li>
          <li>সিস্টেমে মার্ক করুন</li>
        </ol>
      </div>
    )
  },
  {
    id: 'referrals',
    title: 'রেফারেল',
    icon: '👥',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">রেফারেল ব্যবস্থাপনা</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">রেফারেল সেটিংস</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: GET /api/admin/referrals/settings
        </p>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: PATCH /api/admin/referrals/settings
        </p>
        <div className="bg-gray-100 p-3 rounded-lg text-sm">
          <p>referral_bonus_paisa: 5000 (৳৫০)</p>
          <p className="text-red-600 mt-1">সর্বোচ্চ: ৳১,০০০ (১০০,০০০ পয়সা)</p>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">রেফারেল স্ট্যাটাস</h3>
        <p className="text-gray-700 font-mono text-sm bg-gray-100 p-2 rounded">
          API: GET /api/admin/referrals/stats
        </p>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">রেফারেল বোনাস যাচাই</h3>
        <p className="text-gray-700 text-sm">বোনাস অটো ক্রেডিট হয় যখন রেফারি প্রথম শেয়ার কেনে এবং শেয়ার অনুমোদিত হয়।</p>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">রেফারেল ফ্রড সনাক্তকরণ</h3>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
          <p className="font-semibold text-yellow-900">⚠️ সন্দেহজনক প্যাটার্ন:</p>
          <ul className="list-disc list-inside text-sm text-yellow-800 mt-2 space-y-1">
            <li>একই IP থেকে একাধিক অ্যাকাউন্ট</li>
            <li>একই মোবাইল নম্বর</li>
            <li>দ্রুত রেজিস্ট্রেশন</li>
            <li>মিথ্যা রেফারেল কোড</li>
            <li>বট অ্যাকাউন্ট</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'reports',
    title: 'রিপোর্ট',
    icon: '📑',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">রিপোর্ট এবং অ্যানালিটিক্স</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">ব্যবহারকারী রিপোর্ট</h3>
        <div className="bg-gray-100 p-3 rounded-lg font-mono text-xs">
          <p>-- আজকের নতুন ব্যবহারকারী</p>
          <p>SELECT COUNT(*) FROM users</p>
          <p>WHERE DATE(created_at) = DATE('now')</p>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">আর্থিক রিপোর্ট</h3>
        <div className="bg-gray-100 p-3 rounded-lg font-mono text-xs">
          <p>-- মোট বিনিয়োগ</p>
          <p>SELECT SUM(quantity * share_price)</p>
          <p>FROM user_shares us</p>
          <p>JOIN projects p ON p.id = us.project_id</p>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">টপ পয়েন্ট আর্নার</h3>
        <div className="bg-gray-100 p-3 rounded-lg font-mono text-xs">
          <p>SELECT u.name, up.lifetime_earned</p>
          <p>FROM user_points up</p>
          <p>JOIN users u ON u.id = up.user_id</p>
          <p>ORDER BY lifetime_earned DESC</p>
          <p>LIMIT 10</p>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">টপ রেফারার</h3>
        <div className="bg-gray-100 p-3 rounded-lg font-mono text-xs">
          <p>SELECT u.name, COUNT(u2.id) as referred_count</p>
          <p>FROM users u</p>
          <p>LEFT JOIN users u2 ON u2.referrer_user_id = u.id</p>
          <p>GROUP BY u.id</p>
          <p>ORDER BY referred_count DESC</p>
          <p>LIMIT 10</p>
        </div>
      </div>
    )
  },
  {
    id: 'troubleshooting',
    title: 'সমস্যা সমাধান',
    icon: '🔧',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">ট্রাবলশুটিং</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">শেয়ার অনুমোদন ব্যর্থ</h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="font-semibold text-blue-900">সমাধান:</p>
          <ol className="list-decimal list-inside text-sm text-blue-800 mt-2 space-y-1">
            <li>উপলব্ধ শেয়ার চেক করুন</li>
            <li>ব্যবহারকারীর ইতিমধ্যে শেয়ার আছে কিনা দেখুন</li>
            <li>ডুপ্লিকেট অনুমোদন চেক করুন</li>
            <li>ডাটাবেস লগ চেক করুন</li>
          </ol>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">উইথড্র আটকে গেলে</h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="font-semibold text-blue-900">সমাধান:</p>
          <ol className="list-decimal list-inside text-sm text-blue-800 mt-2 space-y-1">
            <li>ব্যবহারকারীর ব্যালেন্স চেক করুন</li>
            <li>পেন্ডিং উইথড্র আছে কিনা দেখুন</li>
            <li>কুলডাউন সময় চেক করুন</li>
            <li>ডাটাবেস লক চেক করুন</li>
          </ol>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">Cron Job ব্যর্থ</h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="font-semibold text-blue-900">সমাধান:</p>
          <ol className="list-decimal list-inside text-sm text-blue-800 mt-2 space-y-1">
            <li>Cron লগ চেক করুন</li>
            <li>ডাটাবেস কানেকশন চেক করুন</li>
            <li>ম্যানুয়ালি রান করুন</li>
            <li>সাপোর্টে যোগাযোগ করুন</li>
          </ol>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">যোগাযোগ</h3>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="font-semibold text-green-900">টেকনিক্যাল সাপোর্ট:</p>
          <ul className="list-disc list-inside text-sm text-green-800 mt-2 space-y-1">
            <li>ইমেইল: tech@buildbargunainitiative.org</li>
            <li>ফোন: +880 XXXXXXXXXX</li>
            <li>সময়: রবি-বৃহস্পতি, সকাল ১০টা - সন্ধ্যা ৬টা</li>
          </ul>
        </div>
      </div>
    )
  }
]

function AdminGuideComponent() {
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const currentSection = adminGuideSections.find(s => s.id === selectedSection)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header - Fixed */}
      <div className="bg-white shadow-md border-b border-blue-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <Book className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">অ্যাডমিন গাইড</h1>
            </div>
            
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-3 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <Book className="w-7 h-7 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-8 py-8 pb-24 lg:pb-8 pt-28 lg:pt-8">
        <div className="flex gap-8">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-28 pb-24">
              <div className="bg-white rounded-3xl shadow-lg border border-blue-100 overflow-hidden">
                <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h2 className="text-xl font-bold text-gray-900">সূচিপত্র</h2>
                </div>
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                  {adminGuideSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        setSelectedSection(section.id)
                        setShowMobileMenu(false)
                      }}
                      className={`w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-blue-50 transition-all border-l-4 ${
                        selectedSection === section.id
                          ? 'border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50'
                          : 'border-transparent'
                      }`}
                    >
                      <span className="text-3xl">{section.icon}</span>
                      <span className="text-base font-semibold text-gray-800">{section.title}</span>
                      {selectedSection === section.id && (
                        <ChevronRight className="w-5 h-5 ml-auto text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Info Card */}
              <div className="mt-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl">
                <h3 className="text-xl font-bold mb-3">💡 দ্রুত টিপস</h3>
                <p className="text-base opacity-95 leading-relaxed">
                  অ্যাডমিন পাসওয়ার্ড কখনো শেয়ার করবেন না
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Sidebar */}
          {showMobileMenu && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)}>
              <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h2 className="text-xl font-bold text-gray-900">সূচিপত্র</h2>
                  <button onClick={() => setShowMobileMenu(false)} className="p-3 hover:bg-blue-100 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-gray-700" />
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
                  {adminGuideSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        setSelectedSection(section.id)
                        setShowMobileMenu(false)
                      }}
                      className={`w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-blue-50 transition-all border-l-4 ${
                        selectedSection === section.id
                          ? 'border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50'
                          : 'border-transparent'
                      }`}
                    >
                      <span className="text-3xl">{section.icon}</span>
                      <span className="text-base font-semibold text-gray-800">{section.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {!currentSection ? (
              // Welcome Screen
              <div className="bg-white rounded-3xl shadow-xl border border-blue-100 p-10">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 shadow-xl">
                    <Book className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-3">অ্যাডমিন গাইড</h2>
                  <p className="text-xl text-gray-600">অ্যাডমিনিস্ট্রেশনের সম্পূর্ণ গাইড</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {adminGuideSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className="flex items-center gap-5 p-6 rounded-2xl border-2 border-blue-100 hover:shadow-xl hover:border-blue-300 transition-all text-left bg-gradient-to-br from-blue-50 to-indigo-50"
                    >
                      <span className="text-4xl">{section.icon}</span>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
                        <p className="text-base text-gray-600 mt-1">দেখতে ক্লিক করুন</p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Content View
              <div className="space-y-4">
                {/* Back button for mobile */}
                <button
                  onClick={() => setSelectedSection(null)}
                  className="lg:hidden flex items-center gap-3 text-lg text-gray-700 hover:text-blue-600 font-medium"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                  <span>ফিরে যান</span>
                </button>

                {/* Content */}
                <div className="bg-white rounded-3xl shadow-xl border border-blue-100 overflow-hidden">
                  <div className="p-8 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-4">
                      <span className="text-5xl">{currentSection.icon}</span>
                      <h2 className="text-3xl font-bold text-gray-900">{currentSection.title}</h2>
                    </div>
                  </div>
                  <div className="p-8 text-lg leading-relaxed">
                    {currentSection.content}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between gap-6">
                  {(() => {
                    const currentIndex = adminGuideSections.findIndex(s => s.id === currentSection.id)
                    const prevSection = adminGuideSections[currentIndex - 1]
                    const nextSection = adminGuideSections[currentIndex + 1]
                    
                    return (
                      <>
                        {prevSection && (
                          <button
                            onClick={() => setSelectedSection(prevSection.id)}
                            className="flex-1 bg-white border-2 border-blue-100 rounded-2xl px-6 py-5 hover:shadow-xl hover:border-blue-300 transition-all text-left"
                          >
                            <div className="text-sm text-gray-500 mb-2 font-medium">পূর্ববর্তী</div>
                            <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <ChevronRight className="w-5 h-5 rotate-180" />
                              {prevSection.title}
                            </div>
                          </button>
                        )}
                        {nextSection && (
                          <button
                            onClick={() => setSelectedSection(nextSection.id)}
                            className="flex-1 bg-white border-2 border-blue-100 rounded-2xl px-6 py-5 hover:shadow-xl hover:border-blue-300 transition-all text-right"
                          >
                            <div className="text-sm text-gray-500 mb-2 font-medium">পরবর্তী</div>
                            <div className="text-lg font-bold text-gray-900 flex items-center gap-2 justify-end">
                              {nextSection.title}
                              <ChevronRight className="w-5 h-5" />
                            </div>
                          </button>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminGuideComponent
