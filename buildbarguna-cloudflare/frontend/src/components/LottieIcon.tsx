import Lottie from 'lottie-react'
import checkmark from '../assets/lottie/checkmark.json'
import warning from '../assets/lottie/warning.json'
import rocket from '../assets/lottie/rocket.json'
import halal from '../assets/lottie/halal.json'
import gift from '../assets/lottie/gift.json'
import money from '../assets/lottie/money.json'
import phone from '../assets/lottie/phone.json'
import lock from '../assets/lottie/lock.json'
import email from '../assets/lottie/email.json'
import user from '../assets/lottie/user.json'

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
