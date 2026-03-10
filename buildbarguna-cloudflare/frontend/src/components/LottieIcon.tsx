import Lottie from 'lottie-react'
import checkmark from '/lottie/checkmark.json'
import warning from '/lottie/warning.json'
import rocket from '/lottie/rocket.json'
import halal from '/lottie/halal.json'
import gift from '/lottie/gift.json'
import money from '/lottie/money.json'
import phone from '/lottie/phone.json'
import lock from '/lottie/lock.json'
import email from '/lottie/email.json'
import user from '/lottie/user.json'

const animations: Record<string, object> = {
  checkmark,
  warning,
  rocket,
  halal,
  gift,
  money,
  phone,
  lock,
  email,
  user,
}

interface LottieIconProps {
  name: string
  className?: string
  loop?: boolean
  autoplay?: boolean
}

export default function LottieIcon({ name, className = '', loop = true, autoplay = true }: LottieIconProps) {
  const animation = animations[name]
  
  if (!animation) {
    console.warn(`Lottie animation "${name}" not found`)
    return null
  }
  
  return (
    <Lottie 
      animationData={animation} 
      className={className}
      loop={loop}
      autoplay={autoplay}
    />
  )
}
