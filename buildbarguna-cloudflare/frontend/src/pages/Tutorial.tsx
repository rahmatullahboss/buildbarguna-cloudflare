import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  BookOpen, ChevronDown, ChevronRight, Users, Wallet, 
  TrendingUp, Gift, ArrowRight, CheckCircle, HelpCircle,
  Smartphone, CreditCard, Calculator, BarChart3, Star, 
  FileText, Coins, Award
} from 'lucide-react'
import SEO from '../components/SEO'

export default function Tutorial() {
  const [openSections, setOpenSections] = useState<string[]>(['getting-started'])

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const sections = [
    {
      id: 'getting-started',
      title: 'শুরু করা',
      icon: BookOpen,
      color: 'bg-blue-100 text-blue-600',
      content: (
        <div className="space-y-5 text-gray-600">
          <div className="bg-blue-50 p-4 rounded-xl">
            <h4 className="font-semibold text-blue-900 mb-2">বিল্ড বরগুনা কী?</h4>
            <p className="text-sm">বিল্ড বরগুনা একটি গ্রুপ ইনভেস্টমেন্ট প্ল্যাটফর্ম। এখানে বিভিন্ন রিয়েল এস্টেট প্রজেক্টে শেয়ার কিনে লাভ করা যায়। প্রতিটি প্রজেক্ট থেকে মাসিক মুনাফা পাবেন।</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">রেজিস্ট্রেশন করার সম্পূর্ণ নিয়ম:</h4>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">১</span>
                <p className="text-sm">হোমপেজে "রেজিস্টার" বাটনে ক্লিক করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">২</span>
                <p className="text-sm">আপনার সঠিক নাম, ফোন নম্বর ও পাসওয়ার্ড দিন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৩</span>
                <p className="text-sm">রেফারেল কোড থাকলে দিন (ঐচ্ছিক)</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৪</span>
                <p className="text-sm">ভেরিফিকেশনের জন্য OTP দিন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">✓</span>
                <p className="text-sm font-medium text-green-700">রেজিস্ট্রেশন সম্পন্ন!</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-3">লগইন করার নিয়ম:</h4>
            <div className="bg-gray-50 p-3 rounded-xl space-y-2">
              <p className="text-sm">১. "লগইন" বাটনে ক্লিক করুন</p>
              <p className="text-sm">২. ফোন নম্বর ও পাসওয়ার্ড দিন</p>
              <p className="text-sm">৩. আপনার অ্যাকাউন্টে প্রবেশ করবেন</p>
            </div>
          </div>

          <div className="bg-amber-50 p-3 rounded-xl">
            <p className="text-sm text-amber-800"><strong>গুরুত্বপূর্ণ:</strong> পাসওয়ার্ড মনে রাখুন। পাসওয়ার্ড হারালে অ্যাডমিনের সাথে যোগাযোগ করতে হবে।</p>
          </div>
        </div>
      )
    },
    {
      id: 'investing',
      title: 'ইনভেস্ট করা',
      icon: Wallet,
      color: 'bg-green-100 text-green-600',
      content: (
        <div className="space-y-5 text-gray-600">
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">প্রজেক্ট কীভাবে দেখবেন:</h4>
            <div className="bg-green-50 p-3 rounded-xl space-y-2">
              <p className="text-sm">১. মেনু থেকে "প্রজেক্টসমূহ" এ ক্লিক করুন</p>
              <p className="text-sm">২. সব সক্রিয় প্রজেক্ট দেখতে পাবেন</p>
              <p className="text-sm">৩. প্রজেক্টে ক্লিক করলে বিস্তারিত তথ্য দেখা যাবে</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-3">শেয়ার কিভাবে কিনবেন:</h4>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">১</span>
                <p className="text-sm">প্রজেক্ট পেজে "শেয়ার কিনুন" বাটনে ক্লিক করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">২</span>
                <p className="text-sm">কতটি শেয়ার নিতে চান সেটি নির্বাচন করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৩</span>
                <p className="text-sm">পেমেন্ট মেথড নির্বাচন করুন (bKash)</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৪</span>
                <p className="text-sm">TrxID দিন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৫</span>
                <p className="text-sm">অর্ডার সাবমিট করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৬</span>
                <p className="text-sm">অ্যাডমিন অনুমোদন দিলে শেয়ার আপনার হয়ে যাবে</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl">
            <h4 className="font-semibold text-blue-900 mb-3">পেমেন্ট করার নিয়ম (bKash):</h4>
            <div className="space-y-2 text-sm">
              <p>১. bKash অ্যাপে গিয়ে "Send Money" করুন</p>
              <p>২. কোম্পানির bKash নম্বরে টাকা পাঠান</p>
              <p>৩. TrxID কপি করে রাখুন</p>
              <p>৪. অর্ডার ফর্মে TrxID দিন</p>
            </div>
            <div className="mt-3 p-2 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800"><strong>নোট:</strong> সঠিক TrxID না দিলে অর্ডার বাতিল হতে পারে।</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'earnings',
      title: 'মুনাফা',
      icon: TrendingUp,
      color: 'bg-emerald-100 text-emerald-600',
      content: (
        <div className="space-y-5 text-gray-600">
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">মুনাফা কিভাবে পাবেন:</h4>
            <div className="bg-emerald-50 p-3 rounded-xl space-y-2">
              <p className="text-sm">১. আপনার প্রজেক্টে শেয়ার থাকলে</p>
              <p className="text-sm">২. প্রজেক্ট মুনাফা করলে</p>
              <p className="text-sm">৩. অ্যাডমিন মুনাফা ডিস্ট্রিবিউট করলে</p>
              <p className="text-sm">৪. আপনার অ্যাকাউন্টে জমা হবে</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-3">আমার মুনাফা কিভাবে দেখব:</h4>
            <div className="space-y-2">
              <div className="flex gap-3">
                <span className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">১</span>
                <p className="text-sm">মেনু থেকে "মুনাফা" এ ক্লিক করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">২</span>
                <p className="text-sm">সব মাসের মুনাফার লিস্ট দেখতে পাবেন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৩</span>
                <p className="text-sm">প্রতিটি প্রজেক্টের পাশে কত টাকা পেয়েছেন</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-xl">
            <h4 className="font-semibold text-purple-900 mb-2">পোর্টফোলিও</h4>
            <p className="text-sm text-purple-800">আপনার সামগ্রিক ইনভেস্টমেন্ট, মোট উপার্জন, ROI সব এক জায়গায় দেখতে "পোর্টফোলিও" পেজে যান।</p>
          </div>

          <div className="bg-amber-50 p-3 rounded-xl">
            <p className="text-sm text-amber-800"><strong>সতর্কতা:</strong> মুনাফা নির্দিষ্ট প্রজেক্টের উপর নির্ভর করে। প্রতিটি মাসে মুনাফা হবে এমন কোনো গ্যারান্টি নেই।</p>
          </div>
        </div>
      )
    },
    {
      id: 'withdraw',
      title: 'উত্তোলন',
      icon: CreditCard,
      color: 'bg-red-100 text-red-600',
      content: (
        <div className="space-y-5 text-gray-600">
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">টাকা উত্তোলন কিভাবে করবেন:</h4>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">১</span>
                <p className="text-sm">মেনু থেকে "উত্তোলন" এ ক্লিক করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">২</span>
                <p className="text-sm">কত টাকা উত্তোলন করতে চান সেটি দিন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৩</span>
                <p className="text-sm">আপনার bKash নম্বর দিন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৪</span>
                <p className="text-sm">"উত্তোলন অনুরোধ" করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">✓</span>
                <p className="text-sm">অ্যাডমিন অনুমোদন দিলে ২৪ ঘণ্টার মধ্যে bKash এ পাবেন</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-xl">
            <h4 className="font-semibold text-red-900 mb-3">উত্তোলনের শর্ত:</h4>
            <ul className="space-y-2 text-sm text-red-800">
              <li className="flex items-center gap-2">
                <CheckCircle size={16} /> ন্যূনতম: ১০০ টাকা
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} /> সর্বোচ্চ: ৫,০০০ টাকা
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} /> প্রতি ৭ দিনে একবার উত্তোলন করা যায়
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-2">উত্তোলন ইতিহাস</h4>
            <p className="text-sm bg-gray-50 p-3 rounded-xl">আগের সব উত্তোলনের স্ট্যাটাস "উত্তোলন" পেজে দেখতে পাবেন।</p>
          </div>
        </div>
      )
    },
    {
      id: 'referral',
      title: 'রেফারেল',
      icon: Gift,
      color: 'bg-purple-100 text-purple-600',
      content: (
        <div className="space-y-5 text-gray-600">
          <div className="bg-purple-50 p-4 rounded-xl">
            <h4 className="font-semibold text-purple-900 mb-2">রেফারেল বোনাস কী?</h4>
            <p className="text-sm text-purple-800">আপনার রেফারেল লিংক দিয়ে কেউ রেজিস্টার করলে এবং প্রথম ইনভেস্টমেন্ট করলে আপনি ৫০ টাকা বোনাস পাবেন।</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-3">রেফারেল কিভাবে করবেন:</h4>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">১</span>
                <p className="text-sm">মেনু থেকে "রেফারেল" এ ক্লিক করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">২</span>
                <p className="text-sm">আপনার রেফারেল কোড দেখতে পাবেন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৩</span>
                <p className="text-sm">লিংক কপি করে শেয়ার করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">✓</span>
                <p className="text-sm">নতুন সদস্য রেজিস্টার করলে আপনি বোনাস পাবেন</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-2">রেফারেল ট্র্যাক করা</h4>
            <p className="text-sm bg-gray-50 p-3 rounded-xl">কতজন রেফার করেছেন, কারা বোনাস পেয়েছেন সব "রেফারেল" পেজে দেখা যাবে।</p>
          </div>
        </div>
      )
    },
    {
      id: 'tasks',
      title: 'টাস্ক ও পয়েন্ট',
      icon: Coins,
      color: 'bg-amber-100 text-amber-600',
      content: (
        <div className="space-y-5 text-gray-600">
          <div className="bg-amber-50 p-4 rounded-xl">
            <h4 className="font-semibold text-amber-900 mb-2">টাস্ক কী?</h4>
            <p className="text-sm text-amber-800">টাস্ক হলো বিভিন্ন সোশ্যাল মিডিয়া লিংকে ভিজিট করে পয়েন্ট কামানোর উপায়। প্রতিটি টাস্ক করে পয়েন্ট পাবেন।</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-3">টাস্ক কিভাবে করবেন:</h4>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">১</span>
                <p className="text-sm">মেনু থেকে "ডেইলি টাস্ক" এ ক্লিক করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">২</span>
                <p className="text-sm">যে টাস্ক করতে চান সেটিতে ক্লিক করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৩</span>
                <p className="text-sm">লিংকে গিয়ে প্রস্তাবিত কাজ করুন (লাইক, শেয়ার, ফলো)</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৪</span>
                <p className="text-sm">ফিরে এসে "সম্পন্ন" বাটনে ক্লিক করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">✓</span>
                <p className="text-sm">পয়েন্ট আপনার অ্যাকাউন্টে যোগ হবে</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl">
            <h4 className="font-semibold text-blue-900 mb-2">টাস্কের ধরন:</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• ডেইলি টাস্ক: প্রতিদিন করা যায়</li>
              <li>• ওয়ান টাইম টাস্ক: শুধু একবারই করা যায়</li>
              <li>• প্রতিটি টাস্কে ভিন্ন পয়েন্ট থাকে</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-2">পয়েন্ট দিয়ে কি করা যায়?</h4>
            <p className="text-sm bg-gray-50 p-3 rounded-xl">পয়েন্ট জমা করে "রিওয়ার্ডস" পেজ থেকে রিডিম করে টাকা বা উপহার নেওয়া যায়।</p>
          </div>
        </div>
      )
    },
    {
      id: 'rewards',
      title: 'রিওয়ার্ডস',
      icon: Award,
      color: 'bg-pink-100 text-pink-600',
      content: (
        <div className="space-y-5 text-gray-600">
          <div className="bg-pink-50 p-4 rounded-xl">
            <h4 className="font-semibold text-pink-900 mb-2">রিওয়ার্ডস কী?</h4>
            <p className="text-sm text-pink-800">টাস্ক করে যে পয়েন্ট সংগ্রহ করেন, সেই পয়েন্ট দিয়ে বিভিন্ন রিওয়ার্ড রিডিম করতে পারেন।</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-3">রিওয়ার্ড কিভাবে রিডিম করবেন:</h4>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="bg-pink-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">১</span>
                <p className="text-sm">মেনু থেকে "রিওয়ার্ডস" এ ক্লিক করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-pink-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">২</span>
                <p className="text-sm">যে রিওয়ার্ড নিতে চান সেটি নির্বাচন করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-pink-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৩</span>
                <p className="text-sm">"রিডিম" বাটনে ক্লিক করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">✓</span>
                <p className="text-sm">অপেক্ষা করুন, অ্যাডমিন অনুমোদন দেবে</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-xl">
            <h4 className="font-semibold text-amber-900 mb-2">রিওয়ার্ডের ধরন:</h4>
            <ul className="space-y-1 text-sm text-amber-800">
              <li>• ক্যাশ রিওয়ার্ড: bKash এ টাকা পাবেন</li>
              <li>• মোবাইল রিচার্জ</li>
              <li>• উপহার কার্ড</li>
              <li>• বিভিন্ন অফার</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-3 rounded-xl">
            <p className="text-sm text-blue-800"><strong>নোট:</strong> রিডিম করার পর অ্যাডমিন যাচাই করবে এবং অনুমোদন দিলে পয়েন্ট কাটা হবে।</p>
          </div>
        </div>
      )
    },
    {
      id: 'membership',
      title: 'মেম্বারশিপ',
      icon: FileText,
      color: 'bg-indigo-100 text-indigo-600',
      content: (
        <div className="space-y-5 text-gray-600">
          <div className="bg-indigo-50 p-4 rounded-xl">
            <h4 className="font-semibold text-indigo-900 mb-2">মেম্বারশিপ কী?</h4>
            <p className="text-sm text-indigo-800">বিল্ড বরগুনার একটি সরকারি সদস্য হতে চাইলে মেম্বারশিপ করতে হবে। মেম্বার হলে আপনি একটি সার্টিফিকেট পাবেন।</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-3">মেম্বারশিপ কিভাবে করবেন:</h4>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">১</span>
                <p className="text-sm">মেনু থেকে "মেম্বারশিপ" এ ক্লিক করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">২</span>
                <p className="text-sm">ফর্ম পূরণ করুন (নাম, ঠিকানা, ফোন ইত্যাদি)</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৩</span>
                <p className="text-sm">১০০ টাকা ফি পেমেন্ট করুন (bKash)</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৪</span>
                <p className="text-sm">TrxID দিন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৫</span>
                <p className="text-sm">ফর্ম সাবমিট করুন</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">৬</span>
                <p className="text-sm">অ্যাডমিন যাচাই করার পর সার্টিফিকেট ডাউনলোড করুন</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-xl">
            <h4 className="font-semibold text-green-900 mb-2">মেম্বারশিপ এর সুবিধা:</h4>
            <ul className="space-y-1 text-sm text-green-800">
              <li>✓ সরকারি সদস্য হিসেবে সার্টিফিকেট</li>
              <li>✓ সংগঠনের সব তথ্য পাবেন</li>
              <li>✓ সদস্য সংখ্যা দেখতে পাবেন</li>
            </ul>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-4">
      <SEO title="গাইড ও টিউটোরিয়াল" description="Build Barguna Initiative (BBI) - ইনভেস্টমেন্ট, মুনাফা উত্তোলন এবং অন্যান্য সকল ফিচার সম্পর্কে বিস্তারিত জানুন।" />
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 rounded-3xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white/30 p-3 rounded-2xl backdrop-blur-sm">
            <BookOpen size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold">বিল্ড বরগুনা গাইড</h1>
            <p className="text-white/90 text-sm">সহজ বাংলায় সব কিছু শিখুন</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/projects" className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="bg-blue-100 p-2 rounded-xl">
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">প্রজেক্ট দেখুন</p>
            <p className="text-xs text-gray-500">ইনভেস্টমেন্ট করুন</p>
          </div>
        </Link>
        <Link to="/earnings" className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="bg-green-100 p-2 rounded-xl">
            <Wallet size={20} className="text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">মুনাফা দেখুন</p>
            <p className="text-xs text-gray-500">আপনার আয়</p>
          </div>
        </Link>
      </div>

      {/* Tutorial Sections */}
      <div className="space-y-2">
        {sections.map(section => (
          <div key={section.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <button
              onClick={() => toggleSection(section.id)}
              aria-expanded={openSections.includes(section.id)}
              aria-label={`${section.title} সেকশন টগল করুন`}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`${section.color} p-2 rounded-xl`}>
                  <section.icon size={20} />
                </div>
                <span className="font-medium text-gray-900">{section.title}</span>
              </div>
              {openSections.includes(section.id) ? (
                <ChevronDown size={20} className="text-gray-400" />
              ) : (
                <ChevronRight size={20} className="text-gray-400" />
              )}
            </button>
            
            {openSections.includes(section.id) && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Help Card */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
        <div className="flex items-start gap-3">
          <div className="bg-amber-100 p-2 rounded-xl">
            <HelpCircle size={24} className="text-amber-600" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-900">সাহায্য প্রয়োজন?</h4>
            <p className="text-sm text-amber-800 mt-1">
              কোনো সমস্যা হলে অ্যাডমিনের সাথে যোগাযোগ করুন। আমরা সাহায্য করব।
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
