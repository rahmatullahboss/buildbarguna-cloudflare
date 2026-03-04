import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  BookOpen, ChevronDown, ChevronRight, Users, Wallet, 
  TrendingUp, Gift, ArrowRight, CheckCircle, HelpCircle,
  Smartphone, CreditCard, Calculator, BarChart3
} from 'lucide-react'

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
      content: (
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">বিল্ড বরগুনা কী?</h4>
            <p>বিল্ড বরগুনা একটি গ্রুপ ইনভেস্টমেন্ট প্ল্যাটফর্ম। এখানে বিভিন্ন রিয়েল এস্টেট প্রজেক্টে শেয়ার কিনে লাভ করা যায়।</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">কিভাবে রেজিস্ট্রেশন করবেন?</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>হোমপেজে "রেজিস্টার" বাটনে ক্লিক করুন</li>
              <li>আপনার নাম, ফোন নম্বর ও পাসওয়ার্ড দিন</li>
              <li>রেফারেল কোড থাকলে দিন (ঐচ্ছিক)</li>
              <li>ভেরিফিকেশনের জন্য OTP দিন</li>
              <li>রেজিস্ট্রেশন সম্পন্ন!</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">লগইন কিভাবে করবেন?</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>"লগইন" বাটনে ক্লিক করুন</li>
              <li>ফোন নম্বর ও পাসওয়ার্ড দিন</li>
              <li>আপনার অ্যাকাউন্টে প্রবেশ করবেন</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'investing',
      title: 'ইনভেস্ট করা',
      icon: Wallet,
      content: (
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">প্রজেক্ট কীভাবে দেখব?</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>মেনু থেকে "প্রজেক্টসমূহ" এ ক্লিক করুন</li>
              <li>সব সক্রিয় প্রজেক্ট দেখতে পাবেন</li>
              <li>প্রজেক্টে ক্লিক করলে বিস্তারিত দেখা যাবে</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">শেয়ার কিভাবে কিনবেন?</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>প্রজেক্ট পেজে "শেয়ার কিনুন" বাটনে ক্লিক করুন</li>
              <li>কতটি শেয়ার নিতে চান সেটি নির্বাচন করুন</li>
              <li>পেমেন্ট মেথড নির্বাচন করুন (bKash)</li>
              <li>TrxID দিন</li>
              <li>অর্ডার সাবমিট করুন</li>
              <li>অ্যাডমিন অনুমোদন দিলে শেয়ার আপনার হয়ে যাবে</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">পেমেন্ট কিভাবে করবেন?</h4>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
              <p className="text-sm"><strong>bKash করতে:</strong></p>
              <ol className="list-decimal list-inside text-sm space-y-1 mt-2 ml-2">
                <li>bKash অ্যাপে গিয়ে "Send Money" করুন</li>
                <li>কোম্পানির bKash নম্বরে টাকা পাঠান</li>
                <li>TrxID কপি করে রাখুন</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'earnings',
      title: 'মুনাফা',
      icon: TrendingUp,
      content: (
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">মুনাফা কিভাবে পাব?</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>আপনার প্রজেক্টে শেয়ার থাকলে</li>
              <li>প্রজেক্ট মুনাফা করলে</li>
              <li>অ্যাডমিন মুনাফা ডিস্ট্রিবিউট করলে</li>
              <li>আপনার অ্যাকাউন্টে জমা হবে</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">আমার মুনাফা কিভাবে দেখব?</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>মেনু থেকে "মুনাফা" এ ক্লিক করুন</li>
              <li>সব মাসের মুনাফার লিস্ট দেখতে পাবেন</li>
              <li>প্রতিটি প্রজেক্টের পাশে কত টাকা পেয়েছেন</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">পোর্টফোলিও</h4>
            <p>আপনার সামগ্রিক ইনভেস্টমেন্ট, মোট উপার্জন, ROI সব এক জায়গায় দেখতে "পোর্টফোলিও" পেজে যান।</p>
          </div>
        </div>
      )
    },
    {
      id: 'withdraw',
      title: 'উত্তোলন',
      icon: CreditCard,
      content: (
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">টাকা উত্তোলন কিভাবে করব?</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>মেনু থেকে "উত্তোলন" এ ক্লিক করুন</li>
              <li>কত টাকা উত্তোলন করতে চান সেটি দিন</li>
              <li>আপনার bKash নম্বর দিন</li>
              <li>"উত্তোলন অনুরোধ" করুন</li>
              <li>অ্যাডমিন অনুমোদন দিলে ২৪ ঘণ্টার মধ্যে bKash এ পাবেন</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">উত্তোলনের শর্ত</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ন্যূনতম: ১০০ টাকা</li>
              <li>সর্বোচ্চ: ৫,০০০ টাকা</li>
              <li>প্রতি ৭ দিনে একবার উত্তোলন করা যায়</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">উত্তোলন ইতিহাস</h4>
            <p>আগের সব উত্তোলনের স্ট্যাটাস "উত্তোলন" পেজে দেখতে পাবেন।</p>
          </div>
        </div>
      )
    },
    {
      id: 'referral',
      title: 'রেফারেল',
      icon: Gift,
      content: (
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">রেফারেল বোনাস কী?</h4>
            <p>আপনার রেফারেল লিংক দিয়ে কেউ রেজিস্টার করলে এবং প্রথম ইনভেস্টমেন্ট করলে আপনি ৫০ টাকা বোনাস পাবেন।</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">রেফারেল কিভাবে করবেন?</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>মেনু থেকে "রেফারেল" এ ক্লিক করুন</li>
              <li>আপনার রেফারেল কোড দেখতে পাবেন</li>
              <li>লিংক কপি করে শেয়ার করুন</li>
              <li>নতুন সদস্য রেজিস্টার করলে আপনি বোনাস পাবেন</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">রেফারেল ট্র্যাক করা</h4>
            <p>কতজন রেফার করেছেন, কারা বোনাস পেয়েছেন সব "রেফারেল" পেজে দেখা যাবে।</p>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-700 via-teal-600 to-emerald-600 rounded-3xl p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-2xl">
            <BookOpen size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold">বিল্ড বরগুনা গাইড</h1>
            <p className="text-white/80 text-sm">সহজ বাংলায় সব কিছু শিখুন</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/projects" className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">প্রজেক্ট দেখুন</p>
            <p className="text-xs text-gray-500">ইনভেস্টমেন্ট করুন</p>
          </div>
        </Link>
        <Link to="/earnings" className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl">
            <Wallet size={20} className="text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">মুনাফা দেখুন</p>
            <p className="text-xs text-gray-500">আপনার আয়</p>
          </div>
        </Link>
      </div>

      {/* Tutorial Sections */}
      <div className="space-y-2">
        {sections.map(section => (
          <div key={section.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-xl">
                  <section.icon size={20} className="text-primary-600" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">{section.title}</span>
              </div>
              {openSections.includes(section.id) ? (
                <ChevronDown size={20} className="text-gray-400" />
              ) : (
                <ChevronRight size={20} className="text-gray-400" />
              )}
            </button>
            
            {openSections.includes(section.id) && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Help Card */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <HelpCircle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 dark:text-amber-200">সাহায্য প্রয়োজন?</h4>
            <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
              কোনো সমস্যা হলে অ্যাডমিনের সাথে যোগাযোগ করুন। আমরা সাহায্য করব।
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
