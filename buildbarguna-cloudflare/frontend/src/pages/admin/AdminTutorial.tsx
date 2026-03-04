import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  BookOpen, ChevronDown, ChevronRight, Users, Wallet, 
  TrendingUp, Gift, Building2, CheckCircle, HelpCircle,
  BarChart3, Settings, PieChart, List, Plus, Edit, Trash2,
  Send, Eye, RefreshCw, DollarSign
} from 'lucide-react'

export default function AdminTutorial() {
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
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">অ্যাডমিন প্যানেল কী?</h4>
            <p>অ্যাডমিন প্যানেল থেকে পুরো প্ল্যাটফর্ম ম্যানেজ করা যায়। প্রজেক্ট, ইউজার, শেয়ার, মুনাফা সব এখানে।</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">অ্যাডমিন প্যানেলে কিভাবে যাবেন?</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>লগইন করুন</li>
              <li>সাইডবারে "অ্যাডমিন" সেকশনে যান</li>
              <li>ড্যাশবোর্ড, প্রজেক্ট, ইউজার ইত্যাদি ম্যানেজ করুন</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'projects',
      title: 'প্রজেক্ট ম্যানেজমেন্ট',
      icon: Building2,
      content: (
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">নতুন প্রজেক্ট কিভাবে তৈরি করবেন?</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>সাইডবারে "প্রজেক্ট ব্যবস্থাপনা" এ ক্লিক করুন</li>
              <li>"নতুন প্রজেক্ট" বাটনে ক্লিক করুন</li>
              <li>প্রজেক্টের নাম, বিবরণ, ছবি দিন</li>
              <li>মোট মূল্য ও শেয়ার সংখ্যা নির্ধারণ করুন</li>
              <li>শেয়ার প্রাইস সেট করুন</li>
              <li>সেভ করুন - প্রজেক্ট তৈরি!</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">প্রজেক্ট স্ট্যাটাস</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Draft:</strong> এখনো পাবলিক হয়নি</li>
              <li><strong>Active:</strong> ইনভেস্টমেন্ট খোলা</li>
              <li><strong>Closed:</strong> ইনভেস্টমেন্ট বন্ধ</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">প্রজেক্ট ফাইনান্স</h4>
            <p>প্রজেক্টে খরচ ও আয় ট্র্যাক করতে প্রজেক্টের পাশে "ফাইনান্স" বাটনে ক্লিক করুন।</p>
          </div>
        </div>
      )
    },
    {
      id: 'shares',
      title: 'শেয়ার অনুমোদন',
      icon: PieChart,
      content: (
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">শেয়ার অর্ডার অনুমোদন</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>"শেয়ার অনুমোদন" মেনুতে যান</li>
              <li>পেন্ডিং অর্ডারগুলো দেখবেন</li>
              <li>বিক্রেতার তথ্য যাচাই করুন</li>
              <li>পেমেন্ট ভেরিফাই করুন (bKash)</li>
              <li>"অনুমোদন" বাটনে ক্লিক করুন</li>
              <li>শেয়ার ইউজারের অ্যাকাউন্টে যোগ হবে</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">রিজেক্ট করা</h4>
            <p>ভুল পেমেন্ট হলে রিজেক্ট করে দিন। কারণ লিখে রাখুন।</p>
          </div>
        </div>
      )
    },
    {
      id: 'finance',
      title: 'ফাইনান্স ম্যানেজমেন্ট',
      icon: DollarSign,
      content: (
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">প্রজেক্টে খরচ/আয় যোগ করা</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>প্রজেক্টে গিয়ে "ফাইনান্স" এ ক্লিক করুন</li>
              <li>"নতুন ট্রানজেকশন" বাটনে ক্লিক করুন</li>
              <li>খরচ না আয় নির্বাচন করুন</li>
              <li>ক্যাটাগরি ও পরিমাণ দিন</li>
              <li>তারিখ ও বিবরণ দিন</li>
              <li>সেভ করুন</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">কোম্পানি খরচ</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>সাইডবারে "কোম্পানি খরচ" এ ক্লিক করুন</li>
              <li>"নতুন খরচ" বাটনে ক্লিক করুন</li>
              <li>খরচের পরিমাণ ও ক্যাটাগরি নির্বাচন করুন</li>
              <li>বরাদ্দ পদ্ধতি নির্বাচন করুন:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>প্রজেক্ট মূল্য অনুযায়ী - বড় প্রজেক্ট বেশি খরচ বহন করে</li>
                  <li>আয় অনুযায়ী - যে প্রজেক্ট বেশি আয় করে সে বেশি দেয়</li>
                  <li>সমান ভাগে - সব প্রজেক্টে সমান</li>
                </ul>
              </li>
              <li>সেভ করলে অটোমেটিক প্রজেক্টে ভাগ হয়ে যাবে</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">মুনাফা বিতরণ</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>প্রজেক্টে গিয়ে "প্রফিট পাঠান" এ ক্লিক করুন</li>
              <li>প্রিভিউ দেখুন:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>মোট আয় - সরাসরি খরচ - কোম্পানি খরচ = নেট প্রফিট</li>
                  <li>কোম্পানি শেয়ার (ডিফল্ট ৩০%)</li>
                  <li>শেয়ারহোল্ডার পুল (ডিফল্ট ৭০%)</li>
                </ul>
              </li>
              <li>কোম্পানি শেয়ার পরিবর্তন করতে পারেন</li>
              <li>"বিতরণ করুন" বাটনে ক্লিক করুন</li>
              <li>সব শেয়ারহোল্ডারের অ্যাকাউন্টে টাকা যোগ হবে</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'withdrawals',
      title: 'উত্তোলন অনুমোদন',
      icon: TrendingUp,
      content: (
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">উত্তোলন অনুমোদন করা</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>"উত্তোলন" মেনুতে যান</li>
              <li>পেন্ডিং রিকোয়েস্টগুলো দেখবেন</li>
              <li>ইউজারের ব্যালেন্স যাচাই করুন</li>
              <li>bKash পেমেন্ট করুন</li>
              <li>TrxID দিয়ে "সম্পন্ন" করুন</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">উত্তোলন সেটিংস</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ন্যূনতম উত্তোলন পরিমাণ</li>
              <li>সর্বোচ্চ উত্তোলন পরিমাণ</li>
              <li>কুলডাউন পিরিয়ড (কতদিন পর পর)</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'users',
      title: 'ইউজার ম্যানেজমেন্ট',
      icon: Users,
      content: (
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">ইউজার তালিকা</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>"মেম্বার তালিকা" মেনুতে যান</li>
              <li>সব রেজিস্টার্ড ইউজার দেখবেন</li>
              <li>প্রতিটি ইউজারের শেয়ার ও আয় দেখা যায়</li>
              <li>ইউজার ডিটেইলে ক্লিক করলে সব তথ্য</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">ইউজার ব্লক/আনব্লক</h4>
            <p>কোনো ইউজার সমস্যা করলে তাদের ব্লক করতে পারেন।</p>
          </div>
        </div>
      )
    },
    {
      id: 'settings',
      title: 'অন্যান্য সেটিংস',
      icon: Settings,
      content: (
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">টাস্ক ম্যানেজমেন্ট</h4>
            <p>ডেইলি টাস্ক তৈরি করে ইউজারদের অ্যাক্টিভ রাখুন। প্রতিটি টাস্কে ক্লিক করলে পয়েন্ট পায়।</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">রেফারেল সেটিংস</h4>
            <p>রেফারেল বোনাস পরিমাণ পরিবর্তন করতে পারেন।</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">উত্তোলন সেটিংস</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ন্যূনতম ও সর্বোচ্চ লিমিট</li>
              <li>কুলডাউন দিন</li>
              <li>রেফারেল বোনাস</li>
            </ul>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 rounded-3xl p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-2xl">
            <BookOpen size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold">অ্যাডমিন গাইড</h1>
            <p className="text-white/80 text-sm">প্ল্যাটফর্ম ম্যানেজ করুন সহজে</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/admin/projects" className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
            <Building2 size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">প্রজেক্ট</p>
            <p className="text-xs text-gray-500">তৈরি ও ম্যানেজ</p>
          </div>
        </Link>
        <Link to="/admin/company-expenses" className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-xl">
            <DollarSign size={20} className="text-rose-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">কোম্পানি খরচ</p>
            <p className="text-xs text-gray-500">খরচ বরাদ্দ</p>
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
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl">
                  <section.icon size={20} className="text-amber-600" />
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
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <HelpCircle size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-200">টিপস</h4>
            <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
              নিয়মিত ড্যাশবোর্ড চেক করুন। নতুন শেয়ার অর্ডার ও উত্তোলন রিকোয়েস্ট দ্রুত অনুমোদন করুন।
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
