import { Resend } from 'resend'

/**
 * Email service using Resend
 * Handles password reset and other transactional emails
 */

export interface PasswordResetEmailData {
  to: string
  name: string
  resetLink: string
  expiryMinutes: number
}

export interface PasswordResetConfirmationData {
  to: string
  name: string
}

export interface WelcomeEmailData {
  to: string
  name: string
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
  const resend = new Resend(process.env.RESEND_API_KEY || '')

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'BuildBarguna <noreply@buildbarguna.com>',
      to: [data.to],
      subject: 'পাসওয়ার্ড রিসেট লিঙ্ক',
      html: getPasswordResetHtml(data),
      text: getPasswordResetText(data)
    })

    console.log(`Password reset email sent to ${data.to}`)
    return true
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    return false
  }
}

/**
 * Send password reset confirmation email
 */
export async function sendPasswordResetConfirmation(data: PasswordResetConfirmationData): Promise<boolean> {
  const resend = new Resend(process.env.RESEND_API_KEY || '')

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'BuildBarguna <noreply@buildbarguna.com>',
      to: [data.to],
      subject: 'পাসওয়ার্ড সফলভাবে রিসেট হয়েছে',
      html: getPasswordResetConfirmationHtml(data),
      text: getPasswordResetConfirmationText(data)
    })

    console.log(`Password reset confirmation sent to ${data.to}`)
    return true
  } catch (error) {
    console.error('Failed to send password reset confirmation:', error)
    return false
  }
}

/**
 * Send welcome email after registration
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  const resend = new Resend(process.env.RESEND_API_KEY || '')

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'BuildBarguna <noreply@buildbarguna.com>',
      to: [data.to],
      subject: 'বিল্ড বরগুনায় স্বাগতম!',
      html: getWelcomeHtml(data),
      text: getWelcomeText(data)
    })

    console.log(`Welcome email sent to ${data.to}`)
    return true
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    return false
  }
}

/**
 * HTML template for password reset email
 */
function getPasswordResetHtml(data: PasswordResetEmailData): string {
  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>পাসওয়ার্ড রিসেট লিঙ্ক</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #0d9488 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">বিল্ড বরগুনা</h1>
              <p style="margin: 8px 0 0 0; color: #e0f2f1; font-size: 14px;">হালাল গ্রুপ ইনভেস্টমেন্ট প্ল্যাটফর্ম</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 24px;">আসসালামু আলাইকুম ${data.name}!</h2>
              
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                আমরা আপনার পাসওয়ার্ড রিসেট করার একটি অনুরোধ পেয়েছি। চিন্তা করবেন না, আমরা আপনাকে সাহায্য করার জন্য এখানে আছি।
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                নিচের বাটনে ক্লিক করে আপনার পাসওয়ার্ড রিসেট করুন:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 auto 24px auto; border-collapse: collapse;">
                <tr>
                  <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #1e3a5f 0%, #0d9488 100%);">
                    <a href="${data.resetLink}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px;">
                      🔐 পাসওয়ার্ড রিসেট করুন
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                অথবা নিচের লিঙ্কটি কপি করে আপনার ব্রাউজারে পেস্ট করুন:
              </p>
              
              <p style="margin: 0 0 24px 0;">
                <a href="${data.resetLink}" target="_blank" style="color: #0d9488; font-size: 14px; word-break: break-all;">${data.resetLink}</a>
              </p>
              
              <!-- Warning Box -->
              <table role="presentation" style="width: 100%; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: bold;">
                      ⏰ গুরুত্বপূর্ণ তথ্য
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.6;">
                      <li>এই লিঙ্কটি মাত্র <strong>${data.expiryMinutes} মিনিটের</strong> জন্য বৈধ</li>
                      <li>এই লিঙ্কটি <strong>একবারই</strong> ব্যবহার করা যাবে</li>
                      <li>লিঙ্কটি মেয়াদোত্তীর্ণ হলে নতুন করে অনুরোধ করুন</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>আপনি কি পাসওয়ার্ড রিসেটের অনুরোধ করেননি?</strong><br>
                তাহলে এই ইমেইলটি উপেক্ষা করুন। আপনার অ্যাকাউন্ট নিরাপদ আছে।
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
                বিল্ড বরগুনা - হালাল বিনিয়োগের বিশ্বস্ত সঙ্গী
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                এই ইমেইলটি স্বয়ংক্রিয়ভাবে পাঠানো হয়েছে। দয়া করে এটির উত্তর দেবেন না।
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

/**
 * Plain text template for password reset email
 */
function getPasswordResetText(data: PasswordResetEmailData): string {
  return `
আসসালামু আলাইকুম ${data.name},

আমরা আপনার পাসওয়ার্ড রিসেট করার একটি অনুরোধ পেয়েছি।

পাসওয়ার্ড রিসেট করতে নিচের লিঙ্কে ক্লিক করুন:
${data.resetLink}

⏰ গুরুত্বপূর্ণ তথ্য:
- এই লিঙ্কটি মাত্র ${data.expiryMinutes} মিনিটের জন্য বৈধ
- এই লিঙ্কটি একবারই ব্যবহার করা যাবে
- লিঙ্কটি মেয়াদোত্তীর্ণ হলে নতুন করে অনুরোধ করুন

আপনি কি পাসওয়ার্ড রিসেটের অনুরোধ করেননি? তাহলে এই ইমেইলটি উপেক্ষা করুন।

বিল্ড বরগুনা
হালাল বিনিয়োগের বিশ্বস্ত সঙ্গী
  `
}

/**
 * HTML template for password reset confirmation
 */
function getPasswordResetConfirmationHtml(data: PasswordResetConfirmationData): string {
  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>পাসওয়ার্ড রিসেট সফল</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">পাসওয়ার্ড রিসেট সফল!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 24px;">আসসালামু আলাইকুম ${data.name}!</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                আপনার পাসওয়ার্ড সফলভাবে রিসেট হয়েছে। এখন আপনি আপনার নতুন পাসওয়ার্ড ব্যবহার করে লগইন করতে পারবেন।
              </p>
              
              <!-- Security Tips -->
              <table role="presentation" style="width: 100%; background-color: #f0fdf4; border-left: 4px solid #059669; border-radius: 8px; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 12px 0; color: #166534; font-size: 14px; font-weight: bold;">
                      🔒 নিরাপত্তা টিপস
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #14532d; font-size: 14px; line-height: 1.6;">
                      <li>শক্তিশালী পাসওয়ার্ড ব্যবহার করুন (কমপক্ষে ৮ অক্ষর)</li>
                      <li>বড় হাতের, ছোট হাতের অক্ষর, সংখ্যা এবং বিশেষ চিহ্ন ব্যবহার করুন</li>
                      <li>একই পাসওয়ার্ড একাধিক অ্যাকাউন্টে ব্যবহার করবেন না</li>
                      <li>নিয়মিত পাসওয়ার্ড পরিবর্তন করুন</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>আপনি কি এই পরিবর্তনটি করেননি?</strong><br>
                দয়া করে দ্রুত আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
                বিল্ড বরগুনা - হালাল বিনিয়োগের বিশ্বস্ত সঙ্গী
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                এই ইমেইলটি স্বয়ংক্রিয়ভাবে পাঠানো হয়েছে।
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

/**
 * Plain text template for password reset confirmation
 */
function getPasswordResetConfirmationText(data: PasswordResetConfirmationData): string {
  return `
আসসালামু আলাইকুম ${data.name},

আপনার পাসওয়ার্ড সফলভাবে রিসেট হয়েছে!

এখন আপনি আপনার নতুন পাসওয়ার্ড ব্যবহার করে লগইন করতে পারবেন।

🔒 নিরাপত্তা টিপস:
- শক্তিশালী পাসওয়ার্ড ব্যবহার করুন (কমপক্ষে ৮ অক্ষর)
- বড় হাতের, ছোট হাতের অক্ষর, সংখ্যা এবং বিশেষ চিহ্ন ব্যবহার করুন
- একই পাসওয়ার্ড একাধিক অ্যাকাউন্টে ব্যবহার করবেন না
- নিয়মিত পাসওয়ার্ড পরিবর্তন করুন

আপনি কি এই পরিবর্তনটি করেননি? দয়া করে দ্রুত আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।

বিল্ড বরগুনা
হালাল বিনিয়োগের বিশ্বস্ত সঙ্গী
  `
}

/**
 * HTML template for welcome email
 */
function getWelcomeHtml(data: WelcomeEmailData): string {
  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>স্বাগতম</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #0d9488 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">স্বাগতম!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 24px;">আসসালামু আলাইকুম ${data.name}!</h2>
              
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                বিল্ড বরগুনায় যোগ দেওয়ার জন্য ধন্যবাদ! আমরা আপনাকে আমাদের পরিবারের একজন হিসেবে পেয়ে গর্বিত।
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                এখন আপনি আমাদের প্ল্যাটফর্মে হালাল বিনিয়োগ শুরু করতে পারেন এবং মুশারাকা নীতিতে লাভবান হতে পারেন।
              </p>
              
              <!-- Get Started Button -->
              <table role="presentation" style="margin: 0 auto 24px auto; border-collapse: collapse;">
                <tr>
                  <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #1e3a5f 0%, #0d9488 100%);">
                    <a href="https://buildbarguna.com/dashboard" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px;">
                      🚀 ড্যাশবোর্ডে যান
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
                বিল্ড বরগুনা - হালাল বিনিয়োগের বিশ্বস্ত সঙ্গী
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                কোনো প্রশ্ন থাকলে আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

/**
 * Plain text template for welcome email
 */
function getWelcomeText(data: WelcomeEmailData): string {
  return `
আসসালামু আলাইকুম ${data.name},

বিল্ড বরগুনায় যোগ দেওয়ার জন্য ধন্যবাদ! আমরা আপনাকে আমাদের পরিবারের একজন হিসেবে পেয়ে গর্বিত।

এখন আপনি আমাদের প্ল্যাটফর্মে হালাল বিনিয়োগ শুরু করতে পারেন এবং মুশারাকা নীতিতে লাভবান হতে পারেন।

ড্যাশবোর্ডে যান: https://buildbarguna.com/dashboard

বিল্ড বরগুনা
হালাল বিনিয়োগের বিশ্বস্ত সঙ্গী
  `
}
