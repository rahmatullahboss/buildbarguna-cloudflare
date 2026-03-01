import { Link } from 'react-router-dom'
import { TrendingUp, Users, Shield, CheckCircle, ArrowRight, Star } from 'lucide-react'
import { isLoggedIn } from '../lib/auth'

const features = [
  {
    icon: TrendingUp,
    title: 'শেয়ার বিনিয়োগ',
    desc: 'আমাদের লাইভ ব্যবসায়িক প্রজেক্টগুলোতে শেয়ার কিনুন এবং মাসিক মুনাফা উপভোগ করুন।',
    color: 'bg-blue-100 text-blue-600'
  },
  {
    icon: Users,
    title: 'গ্রুপ ইনভেস্টমেন্ট',
    desc: 'একসাথে বিনিয়োগ করুন, একসাথে লাভ ভাগ করুন। ছোট বিনিয়োগেও বড় ব্যবসার অংশীদার হন।',
    color: 'bg-green-100 text-green-600'
  },
  {
    icon: Shield,
    title: 'নিরাপদ ও স্বচ্ছ',
    desc: 'প্রতিটি লেনদেন রেকর্ড করা হয়। আপনার বিনিয়োগ ও মুনাফার পূর্ণ হিসাব দেখুন।',
    color: 'bg-purple-100 text-purple-600'
  },
  {
    icon: CheckCircle,
    title: 'মাসিক মুনাফা',
    desc: 'প্রতি মাসে আপনার শেয়ার অনুযায়ী মুনাফা সরাসরি আপনার অ্যাকাউন্টে যোগ হয়।',
    color: 'bg-orange-100 text-orange-600'
  }
]

const steps = [
  { num: '০১', title: 'রেজিস্ট্রেশন করুন', desc: 'নাম, মোবাইল নম্বর দিয়ে বিনামূল্যে অ্যাকাউন্ট খুলুন' },
  { num: '০২', title: 'প্রজেক্ট বেছে নিন', desc: 'আমাদের লাইভ ব্যবসায়িক প্রজেক্টগুলো দেখুন এবং পছন্দমতো বেছে নিন' },
  { num: '০৩', title: 'bKash করুন', desc: 'শেয়ারের টাকা bKash করুন এবং TxID জমা দিন' },
  { num: '০৪', title: 'মুনাফা পান', desc: 'প্রতি মাসে আপনার শেয়ার অনুযায়ী মুনাফা পান' }
]

const stats = [
  { value: '৳০', label: 'মাসিক খরচ', sub: 'সম্পূর্ণ বিনামূল্যে' },
  { value: '১০০%', label: 'স্বচ্ছতা', sub: 'সব লেনদেন দৃশ্যমান' },
  { value: '২৪/৭', label: 'অ্যাক্সেস', sub: 'যেকোনো সময় দেখুন' },
]

export default function Home() {
  const loggedIn = isLoggedIn()

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏗️</span>
            <span className="font-bold text-xl text-gray-900">বিল্ড বরগুনা</span>
          </div>
          <div className="flex items-center gap-3">
            {loggedIn ? (
              <Link to="/" className="btn-primary py-2 px-5 text-sm">ড্যাশবোর্ড →</Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary py-2 px-4 text-sm">লগইন</Link>
                <Link to="/register" className="btn-primary py-2 px-4 text-sm">যোগ দিন</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-900 via-primary-700 to-primary-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-8">
            <Star size={14} className="text-yellow-400" />
            <span>বরগুনার সেরা গ্রুপ ইনভেস্টমেন্ট প্ল্যাটফর্ম</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-6">
            একসাথে বিনিয়োগ করুন,
            <br />
            <span className="text-yellow-400">একসাথে লাভ করুন</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            বিল্ড বরগুনা হলো একটি গ্রুপ ইনভেস্টমেন্ট প্ল্যাটফর্ম যেখানে আপনি ছোট বিনিয়োগে বড় ব্যবসার শেয়ারহোল্ডার হতে পারেন এবং মাসিক মুনাফা উপভোগ করতে পারেন।
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3.5 px-8 rounded-xl transition-all duration-200 text-lg shadow-lg hover:shadow-xl">
              এখনই শুরু করুন <ArrowRight size={20} />
            </Link>
            <Link to="/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold py-3.5 px-8 rounded-xl transition-all duration-200 text-lg backdrop-blur-sm">
              লগইন করুন
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-6 mt-16 max-w-lg mx-auto">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{s.value}</p>
                <p className="text-sm font-medium mt-1">{s.label}</p>
                <p className="text-xs text-white/60 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave */}
        <div className="h-16 bg-white" style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }} />
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">কেন বিল্ড বরগুনা?</h2>
            <p className="text-gray-500 max-w-xl mx-auto">আমাদের প্ল্যাটফর্মে বিনিয়োগ করা সহজ, নিরাপদ এবং লাভজনক।</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(f => (
              <div key={f.title} className="card hover:shadow-md transition-shadow text-center">
                <div className={`${f.color} w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <f.icon size={26} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">কীভাবে কাজ করে?</h2>
            <p className="text-gray-500">মাত্র ৪টি সহজ ধাপে বিনিয়োগ শুরু করুন</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.num} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-primary-100 z-0" style={{ width: 'calc(100% - 4rem)', left: '4rem' }} />
                )}
                <div className="card text-center relative z-10">
                  <div className="text-3xl font-bold text-primary-100 mb-3">{s.num}</div>
                  <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-sm">{i + 1}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary-700 to-primary-600 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">আজই শুরু করুন</h2>
          <p className="text-white/80 mb-8 text-lg">বরগুনার শত শত উদ্যোক্তার সাথে যোগ দিন এবং আপনার বিনিয়োগ শুরু করুন।</p>
          <Link to="/register"
            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-4 px-10 rounded-xl text-lg transition-all duration-200 shadow-lg">
            বিনামূল্যে অ্যাকাউন্ট খুলুন <ArrowRight size={20} />
          </Link>
          <p className="text-white/60 text-sm mt-4">রেজিস্ট্রেশন সম্পূর্ণ বিনামূল্যে • কোনো লুকানো চার্জ নেই</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl">🏗️</span>
            <span className="font-bold text-white text-lg">বিল্ড বরগুনা</span>
          </div>
          <p className="text-sm mb-4">বরগুনার মানুষের জন্য, বরগুনার উন্নয়নে</p>
          <div className="flex justify-center gap-6 text-sm mb-6">
            <Link to="/login" className="hover:text-white transition-colors">লগইন</Link>
            <Link to="/register" className="hover:text-white transition-colors">রেজিস্ট্রেশন</Link>
            <Link to="/projects" className="hover:text-white transition-colors">প্রজেক্টসমূহ</Link>
          </div>
          <p className="text-xs text-gray-600">© ২০২৬ বিল্ড বরগুনা। সর্বস্বত্ব সংরক্ষিত।</p>
        </div>
      </footer>
    </div>
  )
}
