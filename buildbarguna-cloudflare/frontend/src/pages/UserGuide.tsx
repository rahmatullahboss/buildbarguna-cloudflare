import { useState } from 'react'
import { ChevronRight, Book, X } from 'lucide-react'

interface GuideSection {
  id: string
  title: string
  icon: string
  content: React.ReactNode
}

// User Guide Data (Bengali)
const userGuideSections: GuideSection[] = [
  {
    id: 'intro',
    title: 'ভূমিকা',
    icon: '📖',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">BuildBarguna কী?</h2>
        <p className="text-gray-700">
          BuildBarguna একটি গ্রুপ ইনভেস্টমেন্ট প্ল্যাটফর্ম যেখানে ব্যবহারকারীরা বিভিন্ন প্রজেক্টে শেয়ার কিনে বিনিয়োগ করতে পারে এবং মাসিক লভ্যাংশ উপার্জন করতে পারে।
        </p>
        
        <h3 className="text-xl font-semibold text-gray-800 mt-6">মূল বৈশিষ্ট্যসমূহ</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>শেয়ার বিনিয়োগ:</strong> বিভিন্ন প্রজেক্টে শেয়ার কিনে মালিকানা অর্জন</li>
          <li><strong>মাসিক লভ্যাংশ:</strong> প্রজেক্টের মুনাফা থেকে নিয়মিত আয়</li>
          <li><strong>টাস্ক সিস্টেম:</strong> সামাজিক মিডিয়া টাস্ক করে পয়েন্ট উপার্জন</li>
          <li><strong>রিওয়ার্ড শপ:</strong> পয়েন্ট দিয়ে বিভিন্ন পুরস্কার নেওয়া</li>
          <li><strong>উইথড্র সিস্টেম:</strong> bKash এর মাধ্যমে টাকা উত্তোলন</li>
          <li><strong>রেফারেল প্রোগ্রাম:</strong> বন্ধুদের রেফার করে বোনাস অর্জন</li>
          <li><strong>Google লগইন:</strong> এক ক্লিকেই লগইন সুবিধা</li>
        </ul>
      </div>
    )
  },
  {
    id: 'registration',
    title: 'রেজিস্ট্রেশন ও লগইন',
    icon: '👤',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">নতুন অ্যাকাউন্ট তৈরি</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">ইমেইল/মোবাইল দিয়ে রেজিস্ট্রেশন</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>রেজিস্ট্রেশন পেজে যান</li>
          <li>তথ্য পূরণ করুন:
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
              <li>নাম: আপনার পূর্ণ নাম (ন্যূনতম ২ অক্ষর)</li>
              <li>ইমেইল: সঠিক ইমেইল ঠিকানা</li>
              <li>মোবাইল নম্বর: 01XXXXXXXXX ফরম্যাটে (ঐচ্ছিক)</li>
              <li>পাসওয়ার্ড: ন্যূনতম ৬ অক্ষর</li>
              <li>রেফারেল কোড: যদি কারো রেফারেন্সে আসেন (ঐচ্ছিক)</li>
            </ul>
          </li>
          <li>রেজিস্ট্রেশন সম্পন্ন করুন</li>
        </ol>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">Google দিয়ে রেজিস্ট্রেশন</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>"Google দিয়ে লগইন করুন" বাটনে ক্লিক করুন</li>
          <li>আপনার Google অ্যাকাউন্ট সিলেক্ট করুন</li>
          <li>মোবাইল নম্বর দিন (বাংলাদেশি ফরম্যাট)</li>
          <li>প্রোফাইল সম্পন্ন করুন</li>
        </ol>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">লগইন পদ্ধতি</h3>
        <p className="text-gray-700"><strong>ইমেইল/মোবাইল দিয়ে:</strong></p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
          <li>লগইন পেজে যান</li>
          <li>ইমেইল অথবা মোবাইল নম্বর দিন</li>
          <li>পাসওয়ার্ড দিন</li>
          <li>"লগইন করুন" বাটনে ক্লিক করুন</li>
        </ol>

        <p className="text-gray-700 mt-2"><strong>Google দিয়ে:</strong></p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
          <li>"Google দিয়ে লগইন করুন" বাটনে ক্লিক করুন</li>
          <li>আপনার Google অ্যাকাউন্ট সিলেক্ট করুন</li>
        </ol>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">পাসওয়ার্ড রিসেট</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>লগইন পেজে "পাসওয়ার্ড ভুলে গেছেন?" এ ক্লিক করুন</li>
          <li>রেজিস্টার্ড ইমেইল দিন</li>
          <li>ইমেইল চেক করুন (পাসওয়ার্ড রিসেট লিঙ্ক পাবেন)</li>
          <li>লিঙ্কে ক্লিক করে নতুন পাসওয়ার্ড দিন</li>
        </ol>
      </div>
    )
  },
  {
    id: 'investment',
    title: 'বিনিয়োগ',
    icon: '💰',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">প্রজেক্টে বিনিয়োগ</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">প্রজেক্ট ব্রাউজ করা</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>মেনু থেকে "প্রজেক্টস" এ ক্লিক করুন</li>
          <li>প্রজেক্ট লিস্ট দেখুন</li>
          <li>যেকোনো প্রজেক্টে ক্লিক করে বিস্তারিত দেখুন</li>
        </ol>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">শেয়ার কেনার নিয়ম</h3>
        
        <h4 className="text-lg font-medium text-gray-700">ধাপ ১: শেয়ার সিলেক্ট করা</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
          <li>প্রজেক্ট সিলেক্ট করুন</li>
          <li>শেয়ার সংখ্যা দিন (ন্যূনতম ১, সর্বোচ্চ ১০,০০০)</li>
          <li>মোট মূল্য দেখুন</li>
        </ol>

        <h4 className="text-lg font-medium text-gray-700 mt-3">ধাপ ২: পেমেন্ট মেথড</h4>
        <p className="text-gray-700 ml-4"><strong>bKash পেমেন্ট:</strong></p>
        <ul className="list-disc list-inside space-y-1 text-gray-700 ml-8">
          <li>bKash সিলেক্ট করুন</li>
          <li>bKash ট্রানজেকশন আইডি (TxID) দিন</li>
          <li>ফরম্যাট: ৮-১২ অক্ষর (বড় হাতে)</li>
          <li>উদাহরণ: 8K7H9M2L</li>
        </ul>

        <p className="text-gray-700 mt-2 ml-4"><strong>ম্যানুয়াল পেমেন্ট:</strong></p>
        <ul className="list-disc list-inside space-y-1 text-gray-700 ml-8">
          <li>ম্যানুয়াল সিলেক্ট করুন</li>
          <li>অ্যাডমিন আপনার সাথে যোগাযোগ করবে</li>
        </ul>

        <h4 className="text-lg font-medium text-gray-700 mt-3">ধাপ ৩: অনুরোধ জমা</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
          <li>সব তথ্য যাচাই করুন</li>
          <li>"শেয়ার কিনুন" বাটনে ক্লিক করুন</li>
          <li>সফল হলে অনুরোধ ID পাবেন</li>
        </ol>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">শেয়ার স্ট্যাটাস</h3>
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
                <td className="px-4 py-2 border-b">অপেক্ষমাণ</td>
                <td className="px-4 py-2 border-b">অ্যাডমিন অনুমোদনের জন্য অপেক্ষা</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b">অনুমোদিত</td>
                <td className="px-4 py-2 border-b">শেয়ার আপনার পোর্টফোলিওতে যুক্ত</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b">প্রত্যাখ্যাত</td>
                <td className="px-4 py-2 border-b">অনুরোধ বাতিল হয়েছে</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">শেয়ার সার্টিফিকেট</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>আমার শেয়ার &gt; শেয়ার রিকোয়েস্টে যান</li>
          <li>অনুমোদিত শেয়ার খুঁজুন</li>
          <li>"সার্টিফিকেট ডাউনলোড" বাটনে ক্লিক করুন</li>
          <li>PDF ফাইল ডাউনলোড হবে</li>
        </ol>
      </div>
    )
  },
  {
    id: 'portfolio',
    title: 'পোর্টফোলিও',
    icon: '📊',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">পোর্টফোলিও ওভারভিউ</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">সামগ্রিক সারাংশ</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>মোট বিনিয়োগকৃত অর্থ</li>
          <li>মোট উপার্জন</li>
          <li>ROI (রিটার্ন অন ইনভেস্টমেন্ট)</li>
          <li>বার্ষিক ROI</li>
          <li>সক্রিয় প্রজেক্ট সংখ্যা</li>
          <li>কনসেন্ট্রেশন রিস্ক</li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">লভ্যাংশ গণনা</h3>
        <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
          <p>মাসিক লভ্যাংশ = (আপনার শেয়ার × প্রজেক্টের মোট মূলধন × লভ্যাংশের হার) / (মোট শেয়ার × ১০,০০০)</p>
          <p className="mt-2">উদাহরণ:</p>
          <p>আপনার শেয়ার: ১০০টি</p>
          <p>প্রজেক্টের মোট মূলধন: ৳১০,০০,০০০</p>
          <p>লভ্যাংশের হার: ১%</p>
          <p>মোট শেয়ার: ১০,০০০টি</p>
          <p className="mt-2 font-semibold">লভ্যাংশ = ৳১,০০০</p>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">লভ্যাংশ বিতরণ</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>প্রতি মাসের ১ তারিখে স্বয়ংক্রিয়ভাবে বিতরণ</li>
          <li>সরাসরি আপনার অ্যাকাউন্টে জমা হয়</li>
          <li>কোনো ম্যানুয়াল অনুরোধের প্রয়োজন নেই</li>
        </ul>
      </div>
    )
  },
  {
    id: 'tasks',
    title: 'টাস্ক ও পয়েন্ট',
    icon: '🎯',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">টাস্ক এবং পয়েন্ট সিস্টেম</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">টাস্ক প্রকারভেদ</h3>
        
        <h4 className="text-lg font-medium text-gray-700">দৈনিক টাস্ক</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li>দিনে একাধিকবার করা যায়</li>
          <li>নির্দিষ্ট সীমা (daily limit)</li>
          <li>কোলডাউন সময় আছে</li>
          <li>প্রতিবার পয়েন্ট পাওয়া যায়</li>
        </ul>
        <p className="text-gray-700 ml-4 mt-2"><strong>উদাহরণ:</strong> Facebook এ পোস্ট শেয়ার করা (৫ পয়েন্ট), YouTube ভিডিও দেখা (৩ পয়েন্ট)</p>

        <h4 className="text-lg font-medium text-gray-700 mt-3">এককালীন টাস্ক</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li>শুধু একবার করা যায়</li>
          <li>কোনো সীমা নেই</li>
          <li>বেশি পয়েন্ট পাওয়া যায়</li>
        </ul>
        <p className="text-gray-700 ml-4 mt-2"><strong>উদাহরণ:</strong> প্রোফাইল সম্পূর্ণ করা (৫০ পয়েন্ট), অ্যাপ ডাউনলোড করা (১০০ পয়েন্ট)</p>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">টাস্ক সম্পন্ন করার নিয়ম</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>টাস্ক পেজে যান</li>
          <li>"Start" বাটনে ক্লিক করুন</li>
          <li>URL এ ক্লিক করে টাস্ক পেজে যান</li>
          <li>নির্দেশনা অনুসরণ করুন</li>
          <li>ফিরে এসে "Complete" বাটনে ক্লিক করুন</li>
          <li>কোলডাউন সময় শেষ হতে হবে</li>
        </ol>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">পয়েন্ট সিস্টেম</h3>
        <h4 className="text-lg font-medium text-gray-700">পয়েন্ট অর্জনের উপায়</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li>টাস্ক সম্পন্ন করে</li>
          <li>রেফারেল বোনাস থেকে</li>
          <li>প্রমোশনাল ইভেন্টে</li>
          <li>বিশেষ অফারে</li>
        </ul>

        <h4 className="text-lg font-medium text-gray-700 mt-3">পয়েন্ট রূপান্তর</h4>
        <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
          <p>১০ পয়েন্ট = ৳১</p>
          <p>১০০ পয়েন্ট = ৳১০</p>
          <p>১০০০ পয়েন্ট = ৳১০০</p>
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
        <h2 className="text-2xl font-bold text-gray-900">রিওয়ার্ড সিস্টেম</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">রিওয়ার্ড ক্যাটালগ</h3>
        <h4 className="text-lg font-medium text-gray-700">রিওয়ার্ড প্রকারভেদ</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li>গিফট কার্ড (পাঠানো, ডারাজ, শাপলা)</li>
          <li>মোবাইল রিচার্জ (গ্রামীণফোন, রবি, বাংলালিংক)</li>
          <li>ক্যাশব্যাক (সরাসরি ব্যালেন্সে)</li>
          <li>মার্চেন্ডাইজ (টি-শার্ট, মগ, ব্যাগ)</li>
          <li>বিশেষ অফার (ঈদ, পূজা, নবাব্দ)</li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">রিওয়ার্ড রিডিম করার নিয়ম</h3>
        <h4 className="text-lg font-medium text-gray-700">ধাপ ১: রিওয়ার্ড সিলেক্ট</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
          <li>রিওয়ার্ডস পেজে যান</li>
          <li>সব রিওয়ার্ড দেখুন</li>
          <li>যে রিওয়ার্ড নিতে চান তা সিলেক্ট করুন</li>
        </ol>

        <h4 className="text-lg font-medium text-gray-700 mt-3">ধাপ ২: রিডিম করা</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
          <li>"রিডিম করুন" বাটনে ক্লিক করুন</li>
          <li>নিশ্চিত করুন: খরচ হবে XXX পয়েন্ট, অবশিষ্ট থাকবে YYY পয়েন্ট</li>
          <li>রিডিম সম্পন্ন করুন</li>
        </ol>

        <h4 className="text-lg font-medium text-gray-700 mt-3">ধাপ ৩: রিওয়ার্ড গ্রহণ</h4>
        <p className="text-gray-700 ml-4"><strong>রিওয়ার্ড পদ্ধতি:</strong></p>
        <ul className="list-disc list-inside space-y-1 text-gray-700 ml-8">
          <li>গিফট কার্ড: ইমেইল/SMS এ কোড</li>
          <li>মোবাইল রিচার্জ: সরাসরি নম্বরে</li>
          <li>ক্যাশব্যাক: ব্যালেন্সে জমা</li>
          <li>মার্চেন্ডাইজ: কুরিয়ারে ডেলিভারি</li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">রিডিম্পশন সীমা</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li>ঘণ্টায় সর্বোচ্চ ৫টি রিওয়ার্ড</li>
          <li>কিছু রিওয়ার্ড সীমিত সংখ্যক</li>
          <li>পর্যাপ্ত পয়েন্ট প্রয়োজন</li>
        </ul>
      </div>
    )
  },
  {
    id: 'withdraw',
    title: 'উইথড্র',
    icon: '💸',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">উইথড্র সিস্টেম</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">উপলব্ধ ব্যালেন্স</h3>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="font-semibold">উপলব্ধ ব্যালেন্স = মোট উপার্জন - সম্পন্ন উইথড্র - পেন্ডিং উইথড্র</p>
          <p className="mt-2 text-sm">মোট উপার্জন: প্রজেক্ট লভ্যাংশ + রেফারেল বোনাস</p>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">উইথড্র রিকোয়েস্ট</h3>
        <h4 className="text-lg font-medium text-gray-700">শর্তাবলী</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li>ন্যূনতম উইথড্র: ৳১০০</li>
          <li>সর্বোচ্চ উইথড্র: ৳৫,০০০ (প্রতি অনুরোধ)</li>
          <li>কুলডাউন: ৭ দিন (একটি উইথড্রের পর)</li>
          <li>সর্বোচ্চ সংখ্যা: মাসে ৪টি</li>
        </ul>

        <h4 className="text-lg font-medium text-gray-700 mt-3">ধাপ ১: পরিমাণ নির্ধারণ</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
          <li>উইথড্র &gt; রিকোয়েস্টে যান</li>
          <li>পরিমাণ দিন: ন্যূনতম ৳১০০, সর্বোচ্চ ৳৫,০০০</li>
        </ol>

        <h4 className="text-lg font-medium text-gray-700 mt-3">ধাপ ২: bKash নম্বর</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
          <li>bKash নম্বর দিন: ফরম্যাট 01XXXXXXXXX</li>
          <li>নম্বর যাচাই করুন</li>
        </ol>

        <h4 className="text-lg font-medium text-gray-700 mt-3">ধাপ ৩: রিকোয়েস্ট জমা</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
          <li>সব তথ্য যাচাই করুন</li>
          <li>"উইথড্র রিকোয়েস্ট করুন" এ ক্লিক করুন</li>
          <li>সফল হলে রিকোয়েস্ট ID পাবেন</li>
        </ol>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">উইথড্র স্ট্যাটাস</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 border-b font-semibold text-left">স্ট্যাটাস</th>
                <th className="px-4 py-2 border-b font-semibold text-left">অর্থ</th>
                <th className="px-4 py-2 border-b font-semibold text-left">সময়সীমা</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2 border-b">অপেক্ষমাণ</td>
                <td className="px-4 py-2 border-b">অ্যাডমিন অনুমোদনের জন্য অপেক্ষা</td>
                <td className="px-4 py-2 border-b">১-৩ কর্মদিবস</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b">অনুমোদিত</td>
                <td className="px-4 py-2 border-b">অনুমোদিত, bKash পাঠানো হবে</td>
                <td className="px-4 py-2 border-b">২৪ ঘণ্টা</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b">সম্পন্ন</td>
                <td className="px-4 py-2 border-b">bKash এ পাঠানো হয়েছে</td>
                <td className="px-4 py-2 border-b">-</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b">প্রত্যাখ্যাত</td>
                <td className="px-4 py-2 border-b">বাতিল হয়েছে, ব্যালেন্স ফেরত</td>
                <td className="px-4 py-2 border-b">২৪ ঘণ্টা</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  },
  {
    id: 'referral',
    title: 'রেফারেল',
    icon: '👥',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">রেফারেল প্রোগ্রাম</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">বোনাস কাঠামো</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>প্রথম বিনিয়োগে: ৳২০</li>
          <li>রেফারি যখন প্রথম শেয়ার কিনবে</li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">রেফারেল কোড পাওয়া</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>রেফারেল &gt; আমার কোডে যান</li>
          <li>আপনার রেফারেল কোড দেখুন</li>
          <li>শেয়ার লিঙ্ক কপি করুন</li>
        </ol>
        <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm break-all">
          https://buildbargunainitiative.org/register?ref=ABC123
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">রেফারেল শেয়ার করা</h3>
        <h4 className="text-lg font-medium text-gray-700">শেয়ার করার উপায়</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li>সরাসরি লিঙ্ক পাঠান</li>
          <li>সামাজিক মিডিয়ায় শেয়ার করুন</li>
          <li>ইমেইলে পাঠান</li>
          <li>QR কোড ব্যবহার করুন</li>
        </ul>

        <h4 className="text-lg font-medium text-gray-700 mt-3">শেয়ার টিপস</h4>
        <p className="text-gray-700 ml-4"><strong>✅ ভালো উপায়:</strong></p>
        <ul className="list-disc list-inside space-y-1 text-gray-700 ml-8">
          <li>বন্ধু ও পরিচিতদের সাথে শেয়ার করুন</li>
          <li>প্ল্যাটফর্মের সুবিধা জানান</li>
          <li>সঠিক তথ্য দিন</li>
          <li>নিজের অভিজ্ঞতা শেয়ার করুন</li>
        </ul>
        <p className="text-gray-700 ml-4 mt-2"><strong>❌ এড়িয়ে চলুন:</strong></p>
        <ul className="list-disc list-inside space-y-1 text-gray-700 ml-8">
          <li>স্প্যাম করবেন না</li>
          <li>মিথ্যা তথ্য দেবেন না</li>
          <li>জোর করবেন না</li>
          <li>একাধিক অ্যাকাউন্ট তৈরি করবেন না</li>
        </ul>
      </div>
    )
  },
  {
    id: 'security',
    title: 'নিরাপত্তা',
    icon: '🔒',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">নিরাপত্তা এবং গোপনীয়তা</h2>
        
        <h3 className="text-xl font-semibold text-gray-800">অ্যাকাউন্ট নিরাপত্তা</h3>
        <h4 className="text-lg font-medium text-gray-700">নিরাপত্তা বৈশিষ্ট্য</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li>পাসওয়ার্ড এনক্রিপশন (PBKDF2)</li>
          <li>JWT টোকেন (৭ দিন মেয়াদ)</li>
          <li>রেট লিমিটিং (লগইন, ট্রানজেকশন)</li>
          <li>টোকেন ব্ল্যাকলিস্টিং (লগআউট)</li>
          <li>সন্দেহজনক কার্যকলাপ সনাক্তকরণ</li>
        </ul>

        <h4 className="text-lg font-medium text-gray-700 mt-3">নিরাপত্তা টিপস</h4>
        <p className="text-gray-700 ml-4"><strong>✅ করণীয়:</strong></p>
        <ul className="list-disc list-inside space-y-1 text-gray-700 ml-8">
          <li>শক্তিশালী পাসওয়ার্ড ব্যবহার করুন</li>
          <li>নিয়মিত পাসওয়ার্ড পরিবর্তন করুন</li>
          <li>লগআউট বাটন ব্যবহার করুন</li>
          <li>Google লগইন ব্যবহার করুন</li>
          <li>সন্দেহজনক কার্যকলাপ রিপোর্ট করুন</li>
        </ul>
        <p className="text-gray-700 ml-4 mt-2"><strong>❌ বর্জনীয়:</strong></p>
        <ul className="list-disc list-inside space-y-1 text-gray-700 ml-8">
          <li>পাসওয়ার্ড শেয়ার করবেন না</li>
          <li>পাবলিক Wi-Fi এ লগইন করবেন না</li>
          <li>সন্দেহজনক লিঙ্কে ক্লিক করবেন না</li>
          <li>একাধিক অ্যাকাউন্ট তৈরি করবেন না</li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">ডেটা গোপনীয়তা</h3>
        <h4 className="text-lg font-medium text-gray-700">সংরক্ষিত তথ্য</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li>নাম, ইমেইল, মোবাইল নম্বর</li>
          <li>রেফারেল কোড</li>
          <li>লেনদেন ইতিহাস</li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-800 mt-4">ডেটা এক্সপোর্ট</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>প্রোফাইল &gt; ডেটা এক্সপোর্টে যান</li>
          <li>এক্সপোর্ট টাইপ সিলেক্ট করুন</li>
          <li>রিকোয়েস্ট জমা দিন</li>
          <li>২-৫ মিনিটের মধ্যে প্রস্তুত হবে</li>
        </ol>
      </div>
    )
  },
  {
    id: 'faq',
    title: 'প্রায়শই জিজ্ঞাসিত',
    icon: '❓',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">প্রায়শই জিজ্ঞাসিত প্রশ্ন (FAQ)</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">ন্যূনতম বিনিয়োগ কত?</h3>
            <p className="text-gray-700">প্রজেক্টভেদে ভিন্ন, সাধারণত ৳১০০ থেকে শুরু।</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900">লভ্যাংশ কখন পাওয়া যায়?</h3>
            <p className="text-gray-700">প্রতি মাসের ১ তারিখে স্বয়ংক্রিয়ভাবে।</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900">উইথড্র করতে কত সময় লাগে?</h3>
            <p className="text-gray-700">১-৩ কর্মদিবস।</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900">রেফারেল বোনাস কত?</h3>
            <p className="text-gray-700">৳২০।</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900">পয়েন্টের মেয়াদ কত?</h3>
            <p className="text-gray-700">কোনো মেয়াদ নেই, তবে দীর্ঘমেয়াদী নিষ্ক্রিয়তায় বাতিল হতে পারে।</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900">একাধিক অ্যাকাউন্ট খোলা যাবে?</h3>
            <p className="text-gray-700">না, একজন ব্যবহারকারী শুধু একটি অ্যাকাউন্ট রাখতে পারবেন।</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900">অ্যাকাউন্ট ডিলিট করা যাবে?</h3>
            <p className="text-gray-700">হ্যাঁ, সাপোর্টে যোগাযোগ করুন।</p>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mt-8">যোগাযোগ</h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-gray-700">
            যেকোনো প্রয়োজনে অ্যাপের <strong>হেল্পলাইন</strong> সেকশন চেক করুন অথবা অ্যাডমিনদের সাথে যোগাযোগ করুন।
          </p>
          <p className="text-gray-600 text-sm mt-2">
            <strong>ইমেইল:</strong> support@buildbargunainitiative.org
          </p>
          <p className="text-gray-600 text-sm">
            <strong>সময়:</strong> রবি-বৃহস্পতি, সকাল ১০টা - সন্ধ্যা ৬টা
          </p>
        </div>
      </div>
    )
  }
]

function UserGuideComponent() {
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const currentSection = userGuideSections.find(s => s.id === selectedSection)

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
              <h1 className="text-3xl font-bold text-gray-900">ব্যবহারকারী গাইড</h1>
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
                  {userGuideSections.map((section) => (
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
                  যেকোনো সমস্যায় support@buildbargunainitiative.org এ যোগাযোগ করুন
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
                  <button onClick={() => setShowMobileMenu(false)} aria-label="মেনু বন্ধ করুন" className="p-3 hover:bg-blue-100 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-gray-700" />
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
                  {userGuideSections.map((section) => (
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
                  <h2 className="text-4xl font-bold text-gray-900 mb-3">ব্যবহারকারী গাইড</h2>
                  <p className="text-xl text-gray-600">প্ল্যাটফর্ম ব্যবহারের সম্পূর্ণ গাইড</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {userGuideSections.map((section) => (
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
                    const currentIndex = userGuideSections.findIndex(s => s.id === currentSection.id)
                    const prevSection = userGuideSections[currentIndex - 1]
                    const nextSection = userGuideSections[currentIndex + 1]
                    
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

export default UserGuideComponent
