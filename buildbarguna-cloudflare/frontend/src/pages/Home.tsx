import { Link } from 'react-router-dom'
import { TrendingUp, Users, Shield, CheckCircle, ArrowRight, Star, Download, Bell, BarChart2, Zap, Lock, BookOpen } from 'lucide-react'
import { isLoggedIn } from '../lib/auth'

// Direct R2 public URL — permanent link, no redirect needed
const APK_URL = 'https://pub-ab7b08208848418f9562358e8b65ad06.r2.dev/builds/android/buildbarguna-latest-debug.apk'

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
            <img src="/bbi logo.jpg" alt="BBI Logo" className="h-8 w-8 object-contain" />
            <span className="font-bold text-xl text-gray-900">বিল্ড বরগুনা</span>
          </div>
          <div className="flex items-center gap-3">
            {loggedIn ? (
              <Link to="/" className="btn-primary py-2 px-5 text-sm">ড্যাশবোর্ড →</Link>
            ) : (
              <>
                <Link to="/tutorial" className="btn-secondary py-2 px-4 text-sm flex items-center gap-1">
                  <BookOpen size={16} /> গাইড
                </Link>
                <Link to="/login" className="btn-secondary py-2 px-4 text-sm">লগইন</Link>
                <Link to="/register" className="btn-primary py-2 px-4 text-sm">যোগ দিন</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-900 via-primary-700 to-primary-600 text-white relative overflow-hidden">
        {/* Animated bg circles */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-white/5 rounded-full float-slow" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-white/5 rounded-full" style={{animation: 'floatSlow 8s ease-in-out infinite reverse'}} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-8 slide-up">
            <Star size={14} className="text-yellow-400" />
            <span>বরগুনার সেরা গ্রুপ ইনভেস্টমেন্ট প্ল্যাটফর্ম</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-6 slide-up stagger-1">
            একসাথে বিনিয়োগ করুন,
            <br />
            <span className="text-yellow-400">একসাথে লাভ করুন</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed slide-up stagger-2">
            বিল্ড বরগুনা হলো একটি গ্রুপ ইনভেস্টমেন্ট প্ল্যাটফর্ম যেখানে আপনি ছোট বিনিয়োগে বড় ব্যবসার শেয়ারহোল্ডার হতে পারেন এবং মাসিক মুনাফা উপভোগ করতে পারেন।
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center slide-up stagger-3">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-gray-900 font-bold py-3.5 px-8 rounded-2xl transition-all duration-200 text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              এখনই শুরু করুন <ArrowRight size={20} />
            </Link>
            <Link to="/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/30 text-white font-semibold py-3.5 px-8 rounded-2xl transition-all duration-200 text-lg backdrop-blur-sm">
              লগইন করুন
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-6 mt-16 max-w-lg mx-auto slide-up stagger-4">
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
        <div className="h-16 bg-white relative z-10" style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }} />
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="bg-primary-100 text-primary-700 text-sm font-semibold px-4 py-1.5 rounded-full inline-block mb-4">কেন আমরা?</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">কেন বিল্ড বরগুনা?</h2>
            <p className="text-gray-500 max-w-xl mx-auto">আমাদের প্ল্যাটফর্মে বিনিয়োগ করা সহজ, নিরাপদ এবং লাভজনক।</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(f => (
              <div key={f.title} className="card hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-center group">
                <div className={`${f.color} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <f.icon size={28} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Halal trust section */}
      <section className="py-16 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="text-5xl mb-4">☪️</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">সম্পূর্ণ হালাল বিনিয়োগ</h2>
          <p className="text-gray-600 mb-6 max-w-xl mx-auto">আমাদের বিনিয়োগ পদ্ধতি ইসলামিক মুশারাকা নীতি মেনে চলে। কোনো সুদ নেই, কোনো হারাম উপার্জন নেই।</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['✅ সুদমুক্ত', '✅ মুশারাকা নীতি', '✅ লাভ-লোকসান ভাগাভাগি', '✅ সম্পূর্ণ স্বচ্ছ'].map(badge => (
              <span key={badge} className="bg-white border border-emerald-200 text-emerald-800 text-sm font-semibold px-4 py-2 rounded-full shadow-sm">{badge}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="bg-primary-100 text-primary-700 text-sm font-semibold px-4 py-1.5 rounded-full inline-block mb-4">সহজ প্রক্রিয়া</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">কীভাবে কাজ করে?</h2>
            <p className="text-gray-500">মাত্র ৪টি সহজ ধাপে বিনিয়োগ শুরু করুন</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.num} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary-200 to-primary-100 z-0" style={{ width: 'calc(100% - 4rem)', left: '4rem' }} />
                )}
                <div className="card text-center relative z-10 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-600 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                    <span className="text-white font-bold text-xl">{i + 1}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="py-16 bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-gray-900 to-slate-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl p-8 sm:p-12">
            {/* Green glow effects */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary-500/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
              {/* Phone mockup */}
              <div className="shrink-0">
                <div className="w-36 h-64 bg-gray-800 rounded-3xl border-2 border-gray-700 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-6 bg-gray-700 rounded-t-3xl flex items-center justify-center">
                    <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
                  </div>
                  <div className="mt-4 w-full px-3 space-y-2">
                    <div className="h-8 bg-primary-600/40 rounded-xl flex items-center px-2 gap-1.5">
                      <div className="w-3 h-3 bg-primary-400 rounded-full" />
                      <div className="h-1.5 bg-primary-400/60 rounded flex-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {['bg-green-500/30', 'bg-blue-500/30', 'bg-purple-500/30', 'bg-orange-500/30'].map((c, i) => (
                        <div key={i} className={`h-12 ${c} rounded-xl flex items-center justify-center`}>
                          <div className="w-4 h-4 bg-white/20 rounded-lg" />
                        </div>
                      ))}
                    </div>
                    <div className="h-16 bg-gray-700/50 rounded-xl" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-800 border-t border-gray-700 flex items-center justify-around px-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-4 h-4 rounded-full ${i === 0 ? 'bg-primary-500' : 'bg-gray-600'}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-primary-500/20 border border-primary-500/30 text-primary-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  <Download size={12} /> Android App
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  📱 আমাদের Android App<br />ডাউনলোড করুন
                </h2>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  সবসময় আপনার বিনিয়োগ নজর রাখুন — যেকোনো জায়গা থেকে। Native app অভিজ্ঞতা উপভোগ করুন।
                </p>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-7">
                  {[
                    { icon: Bell, label: 'নোটিফিকেশন' },
                    { icon: BarChart2, label: 'রিয়েল-টাইম ডেটা' },
                    { icon: Zap, label: 'দ্রুত লোড' },
                  ].map(({ icon: Icon, label }) => (
                    <span key={label} className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium px-3 py-1.5 rounded-full">
                      <Icon size={11} className="text-primary-400" /> {label}
                    </span>
                  ))}
                </div>

                {/* Download button */}
                <a
                  href={APK_URL}
                  download="buildbarguna.apk"
                  className="inline-flex items-center justify-center gap-3 w-full sm:w-auto bg-gradient-to-r from-primary-600 to-teal-600 hover:from-primary-500 hover:to-teal-500 active:scale-95 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-primary-500/25 hover:-translate-y-0.5 text-base"
                >
                  <Download size={20} />
                  Android APK ডাউনলোড করুন
                </a>
                <p className="text-gray-600 text-xs mt-3">v1.0.0 • ~25MB • Android 7.0+</p>

                {/* Security note */}
                <div className="flex items-center gap-2 mt-4 justify-center lg:justify-start">
                  <Lock size={12} className="text-primary-400 shrink-0" />
                  <p className="text-gray-500 text-xs">সরাসরি আমাদের সার্ভার থেকে ডাউনলোড — সম্পূর্ণ নিরাপদ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-primary-800 via-primary-700 to-teal-600 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="text-5xl mb-6">🚀</div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">আজই শুরু করুন</h2>
          <p className="text-white/80 mb-8 text-lg">বরগুনার শত শত উদ্যোক্তার সাথে যোগ দিন এবং আপনার বিনিয়োগ শুরু করুন।</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-4 px-10 rounded-2xl text-lg transition-all duration-200 shadow-xl hover:shadow-yellow-400/20 hover:-translate-y-0.5">
              বিনামূল্যে অ্যাকাউন্ট খুলুন <ArrowRight size={20} />
            </Link>
            <Link to="/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold py-4 px-8 rounded-2xl text-lg transition-all duration-200">
              লগইন করুন
            </Link>
          </div>
          <p className="text-white/50 text-sm mt-5">রেজিস্ট্রেশন সম্পূর্ণ বিনামূল্যে • কোনো লুকানো চার্জ নেই</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-teal-500 rounded-xl flex items-center justify-center">
              <img src="/bbi logo.jpg" alt="BBI Logo" className="h-6 w-6 object-contain" />
            </div>
            <span className="font-bold text-white text-xl">বিল্ড বরগুনা</span>
          </div>
          <p className="text-sm mb-6 text-gray-500">বরগুনার মানুষের জন্য, বরগুনার উন্নয়নে</p>
          <div className="flex justify-center gap-6 text-sm mb-6">
            <Link to="/login" className="hover:text-white transition-colors">লগইন</Link>
            <Link to="/register" className="hover:text-white transition-colors">রেজিস্ট্রেশন</Link>
            <Link to="/projects" className="hover:text-white transition-colors">প্রজেক্টসমূহ</Link>
          </div>
          <div className="border-t border-gray-800 pt-6">
            <p className="text-xs text-gray-600">© ২০২৬ বিল্ড বরগুনা। সর্বস্বত্ব সংরক্ষিত। | সম্পূর্ণ হালাল বিনিয়োগ প্ল্যাটফর্ম</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
