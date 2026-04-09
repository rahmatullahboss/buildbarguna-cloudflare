import { useState, useEffect, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { X, ChevronRight, ChevronLeft, Briefcase, Shield, Gift, ArrowDownCircle } from 'lucide-react'

const ONBOARDING_KEY = 'bb_onboarding_done'

interface OnboardingStep {
  icon: ReactNode
  title: ReactNode
  body: string
  highlight: string
  action: { label: string; to: string } | null
}

const steps: OnboardingStep[] = [
  {
    icon: <Shield size={40} className="text-emerald-500" />,
    title: (
      <>
        বিল্ড বরগুনায় স্বাগতম!{' '}
        <img src="/bbi logo.jpg" alt="BBI" className="inline h-5 w-5" />
      </>
    ),
    body: 'এটি একটি সম্পূর্ণ হালাল বিনিয়োগ প্ল্যাটফর্ম। আপনি বরগুনার বিভিন্ন প্রজেক্টে শেয়ার কিনে মুনাফা উপার্জন করতে পারবেন।',
    highlight: '✅ সুদমুক্ত | ✅ মুশারাকা নীতি | ✅ প্রজেক্টের লাভ-লোকসান ভাগাভাগি',
    action: null
  },
  {
    icon: <Briefcase size={40} className="text-primary-500" />,
    title: '১ম ধাপ: প্রজেক্ট বেছে নিন',
    body: 'প্রজেক্টসমূহ পেজে গিয়ে চলমান প্রজেক্টগুলো দেখুন। প্রতিটি প্রজেক্টে শেয়ার মূল্য, মোট মূলধন ও বাকি শেয়ার দেখতে পাবেন।',
    highlight: 'প্রতিটি শেয়ার = প্রজেক্টের একটি অংশ',
    action: { label: 'প্রজেক্ট দেখুন', to: '/projects' }
  },
  {
    icon: <div className="text-4xl">📱</div>,
    title: '২য় ধাপ: bKash করুন',
    body: 'পছন্দের প্রজেক্টে শেয়ার কিনতে নির্দিষ্ট পরিমাণ bKash করুন। bKash এর Transaction ID (TxID) সংরক্ষণ করুন — সেটা লাগবে।',
    highlight: 'TxID: bKash এর SMS থেকে পাবেন — যেমন: 8N4K2M9X1P',
    action: null
  },
  {
    icon: <div className="text-4xl">✅</div>,
    title: '৩য় ধাপ: অনুমোদনের অপেক্ষা',
    body: 'TxID দিয়ে অনুরোধ জমা দিলে অ্যাডমিন যাচাই করবেন। অনুমোদনের পরে শেয়ার আপনার পোর্টফোলিওতে যোগ হবে এবং মাসিক মুনাফা শুরু হবে।',
    highlight: 'সাধারণত ১-২ কার্যদিবসের মধ্যে অনুমোদন হয়',
    action: { label: 'আমার বিনিয়োগ', to: '/my-investments' }
  },
  {
    icon: <ArrowDownCircle size={40} className="text-purple-500" />,
    title: '৪র্থ ধাপ: মুনাফা উত্তোলন',
    body: 'প্রতি মাসে মুনাফা আপনার ব্যালেন্সে জমা হবে। যখন ইচ্ছা উত্তোলন করতে পারবেন — সরাসরি bKash এ পাঠানো হবে।',
    highlight: 'ন্যূনতম উত্তোলন ৳১০০',
    action: { label: 'উত্তোলন পেজ', to: '/withdraw' }
  },
  {
    icon: <Gift size={40} className="text-amber-500" />,
    title: 'বোনাস: রেফারেল প্রোগ্রাম 🎁',
    body: 'বন্ধুকে আপনার রেফারেল কোড দিন। তারা প্রথম বিনিয়োগ করলে আপনি বোনাস পাবেন — সম্পূর্ণ বিনামূল্যে, কোম্পানির মার্কেটিং বাজেট থেকে।',
    highlight: 'আপনার শেয়ার বা মুনাফা থেকে কিছু কাটা হয় না',
    action: { label: 'রেফারেল দেখুন', to: '/referrals' }
  }
]

export function useOnboarding() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY)
    if (!done) setShow(true)
  }, [])

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setShow(false)
  }

  return { show, dismiss }
}

interface OnboardingProps {
  onDismiss: () => void
}

export default function Onboarding({ onDismiss }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const current = steps[step]
  const isLast = step === steps.length - 1

  function finish() {
    localStorage.setItem(ONBOARDING_KEY, '1')
    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Gradient progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-teal-500 transition-all duration-500"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Close + step counter */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{step + 1} / {steps.length}</span>
            <button
              onClick={finish}
              aria-label="গাইড বন্ধ করুন"
              title="গাইড বন্ধ করুন"
              className="text-gray-300 hover:text-gray-500 transition-colors p-1 hover:bg-gray-100 rounded-xl focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-gray-400"
            >
              <X size={20} />
            </button>
          </div>

          {/* Icon with gradient bg */}
          <div className="flex justify-center py-2">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-50 to-teal-50 border-2 border-primary-100 rounded-3xl flex items-center justify-center shadow-sm">
              {current.icon}
            </div>
          </div>

          {/* Text */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-gray-900">{current.title}</h2>
            <p className="text-gray-500 text-sm leading-relaxed">{current.body}</p>
            {current.highlight && (
              <div className="bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-100 rounded-2xl px-4 py-3 text-xs text-primary-800 font-semibold">
                {current.highlight}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="btn-secondary flex items-center gap-1 px-3"
                aria-label="আগের ধাপ"
              >
                <ChevronLeft size={16} /> আগে
              </button>
            )}

            {current.action ? (
              <div className="flex-1 flex gap-2">
                <button
                  onClick={() => isLast ? finish() : setStep(s => s + 1)}
                  className="btn-secondary flex-1 flex items-center justify-center gap-1 text-sm"
                >
                  {isLast ? 'শেষ করুন' : 'পরে দেখব'} {!isLast && <ChevronRight size={16} />}
                </button>
                <Link
                  to={current.action.to}
                  onClick={finish}
                  className="btn-primary flex-1 flex items-center justify-center gap-1 text-center text-sm"
                >
                  {current.action.label} <ChevronRight size={16} />
                </Link>
              </div>
            ) : (
              <button
                onClick={() => isLast ? finish() : setStep(s => s + 1)}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
                aria-label={isLast ? 'শুরু করুন' : 'পরের ধাপ'}
              >
                {isLast ? '🚀 শুরু করুন!' : 'পরের ধাপ'} {!isLast && <ChevronRight size={18} />}
              </button>
            )}
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 pt-1">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`ধাপ ${i + 1}`}
                title={`ধাপ ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                  i === step ? 'bg-primary-500 w-6' : 'w-2 bg-gray-200 hover:bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
