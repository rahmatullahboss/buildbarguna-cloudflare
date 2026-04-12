import { Shield, Info, Gift, AlertTriangle } from 'lucide-react'

type DisclaimerVariant = 'halal' | 'referral' | 'withdrawal' | 'investment-risk'

interface DisclaimerProps {
  variant: DisclaimerVariant
  compact?: boolean
}

const disclaimers: Record<DisclaimerVariant, {
  icon: React.ReactNode
  title: string
  points: string[]
  color: string
  borderColor: string
  iconColor: string
}> = {
  halal: {
    icon: <Shield size={18} />,
    title: '✅ শরিয়াহ-সম্মত বিনিয়োগ নোট',
    color: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    points: [
      'এই প্ল্যাটফর্ম শেয়ার-ভিত্তিক profit-sharing model অনুসরণ করে।',
      'নির্দিষ্ট বা গ্যারান্টিযুক্ত মুনাফা দেওয়া হয় না।',
      'বিতরণ শেয়ার অনুপাতে হয় এবং প্রকল্পভিত্তিক screening ও governance review প্রযোজ্য।',
      'শরিয়াহ approval ছাড়া কোনো প্রজেক্টকে “সম্পূর্ণ হালাল” হিসেবে উপস্থাপন করা উচিত নয়।',
    ]
  },
  referral: {
    icon: <Gift size={18} />,
    title: '🎁 রেফারেল বোনাস সম্পর্কিত',
    color: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    points: [
      'রেফারেল বোনাস সম্পূর্ণভাবে কোম্পানির মার্কেটিং বাজেট থেকে প্রদান করা হয়।',
      'রেফারেল বোনাসের কারণে আপনার বা অন্য কোনো বিনিয়োগকারীর শেয়ার মূল্য বা মুনাফা থেকে কোনো অর্থ কাটা হয় না।',
      'বোনাস তখনই পাবেন যখন আপনার রেফার করা ব্যক্তি প্রথমবার শেয়ার কিনবেন এবং অ্যাডমিন অনুমোদন করবেন।',
      'রেফারেল বোনাস উত্তোলনযোগ্য এবং আপনার মূল ব্যালেন্সে যোগ হয়।',
    ]
  },
  withdrawal: {
    icon: <Info size={18} />,
    title: 'ℹ️ উত্তোলন সম্পর্কিত',
    color: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
    points: [
      'শুধুমাত্র অর্জিত মুনাফা উত্তোলন করা যাবে — বিনিয়োগকৃত মূলধন প্রজেক্ট চলাকালীন উত্তোলন করা যাবে না।',
      'উত্তোলনের অনুরোধ অ্যাডমিন যাচাই করে ৩-৭ কার্যদিবসের মধ্যে bKash-এ পাঠানো হয়।',
      'ন্যূনতম উত্তোলন ৳১০০ এবং সর্বোচ্চ একটি অনুরোধ এক সাথে থাকতে পারে।',
    ]
  },
  'investment-risk': {
    icon: <AlertTriangle size={18} />,
    title: '⚠️ বিনিয়োগ ঝুঁকি সতর্কতা',
    color: 'bg-orange-50',
    borderColor: 'border-orange-200',
    iconColor: 'text-orange-600',
    points: [
      'বিনিয়োগে সবসময় ঝুঁকি আছে। অতীতের মুনাফা ভবিষ্যতের গ্যারান্টি নয়।',
      'শুধুমাত্র সেই অর্থ বিনিয়োগ করুন যা আপনি দীর্ঘমেয়াদে আটকে রাখতে পারবেন।',
      'প্রজেক্টের ব্যবসায়িক পরিস্থিতির উপর ভিত্তি করে মুনাফার হার মাসে মাসে পরিবর্তন হতে পারে।',
    ]
  }
}

export default function Disclaimer({ variant, compact = false }: DisclaimerProps) {
  const d = disclaimers[variant]

  if (compact) {
    return (
      <div className={`rounded-lg border ${d.borderColor} ${d.color} px-3 py-2 flex items-start gap-2`}>
        <span className={`${d.iconColor} mt-0.5 flex-shrink-0`}>{d.icon}</span>
        <p className="text-xs text-gray-600 leading-relaxed">{d.points[0]}</p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border ${d.borderColor} ${d.color} p-4`}>
      <p className={`font-semibold text-sm ${d.iconColor} mb-2 flex items-center gap-2`}>
        <span className="flex-shrink-0">{d.icon}</span>
        {d.title}
      </p>
      <ul className="space-y-1.5">
        {d.points.map((point, i) => (
          <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
            <span className={`${d.iconColor} flex-shrink-0 mt-0.5`}>•</span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  )
}
