import { useState } from 'react'
import { ChevronRight, Book, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface GuideSection {
  id: string
  title: string
  icon: string
  content: string
}

interface GuideContentProps {
  title: string
  sections: GuideSection[]
  isUserGuide: boolean
}

export function GuideContent({ title, sections, isUserGuide }: GuideContentProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const currentSection = sections.find(s => s.id === selectedSection)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Book className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            </div>
            
            {/* Mobile menu button */}
            <button
              aria-label={showMobileMenu ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন'}
              aria-expanded={showMobileMenu}
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Book className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                  <h2 className="font-semibold text-gray-900">সূচিপত্র</h2>
                </div>
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        setSelectedSection(section.id)
                        setShowMobileMenu(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-l-4 ${
                        selectedSection === section.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-transparent'
                      }`}
                    >
                      <span className="text-xl">{section.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{section.title}</span>
                      {selectedSection === section.id && (
                        <ChevronRight className="w-4 h-4 ml-auto text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Info Card */}
              <div className="mt-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-4 text-white">
                <h3 className="font-semibold mb-2">💡 দ্রুত টিপস</h3>
                <p className="text-sm opacity-90">
                  {isUserGuide 
                    ? 'যেকোনো সমস্যায় support@buildbargunainitiative.org এ যোগাযোগ করুন'
                    : 'অ্যাডমিন পাসওয়ার্ড কখনো শেয়ার করবেন না'}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Sidebar */}
          {showMobileMenu && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)}>
              <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">সূচিপত্র</h2>
                  <button aria-label="মেনু বন্ধ করুন" onClick={() => setShowMobileMenu(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        setSelectedSection(section.id)
                        setShowMobileMenu(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-l-4 ${
                        selectedSection === section.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-transparent'
                      }`}
                    >
                      <span className="text-xl">{section.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{section.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {!currentSection ? (
              // Welcome Screen
              <div className="bg-white rounded-2xl shadow-sm border p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                    <Book className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
                  <p className="text-gray-600">
                    {isUserGuide 
                      ? 'প্ল্যাটফর্ম ব্যবহারের সম্পূর্ণ গাইড' 
                      : 'অ্যাডমিনিস্ট্রেশনের সম্পূর্ণ গাইড'}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className="flex items-center gap-4 p-4 rounded-xl border hover:shadow-md transition-all hover:border-blue-300 text-left"
                    >
                      <span className="text-3xl">{section.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{section.title}</h3>
                        <p className="text-sm text-gray-500">দেখতে ক্লিক করুন</p>
                      </div>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Content View
              <div className="space-y-4">
                {/* Back button for mobile */}
                <button
                  onClick={() => setSelectedSection(null)}
                  className="lg:hidden flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span>ফিরে যান</span>
                </button>

                {/* Content */}
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{currentSection.icon}</span>
                      <h2 className="text-2xl font-bold text-gray-900">{currentSection.title}</h2>
                    </div>
                  </div>
                  <div className="p-6 prose prose-blue max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-3 mt-6" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-medium mb-2 mt-4" {...props} />,
                        p: ({node, ...props}) => <p className="mb-4 text-gray-700" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                        li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                        code: ({node, inline, ...props}: any) => 
                          inline ? (
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-pink-600" {...props} />
                          ) : (
                            <code className="block p-4 bg-gray-900 rounded-lg text-green-400 font-mono text-sm overflow-x-auto" {...props} />
                          ),
                        blockquote: ({node, ...props}) => (
                          <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 rounded-r" {...props} />
                        ),
                        table: ({node, ...props}) => (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full border rounded-lg" {...props} />
                          </div>
                        ),
                        th: ({node, ...props}) => (
                          <th className="px-4 py-2 bg-gray-50 border-b font-semibold text-left" {...props} />
                        ),
                        td: ({node, ...props}) => (
                          <td className="px-4 py-2 border-b text-gray-700" {...props} />
                        ),
                      }}
                    >
                      {currentSection.content}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between gap-4">
                  {(() => {
                    const currentIndex = sections.findIndex(s => s.id === currentSection.id)
                    const prevSection = sections[currentIndex - 1]
                    const nextSection = sections[currentIndex + 1]
                    
                    return (
                      <>
                        {prevSection && (
                          <button
                            onClick={() => setSelectedSection(prevSection.id)}
                            className="flex-1 bg-white border rounded-xl px-4 py-3 hover:shadow-md transition-all text-left"
                          >
                            <div className="text-xs text-gray-500 mb-1">পূর্ববর্তী</div>
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              <ChevronRight className="w-4 h-4 rotate-180" />
                              {prevSection.title}
                            </div>
                          </button>
                        )}
                        {nextSection && (
                          <button
                            onClick={() => setSelectedSection(nextSection.id)}
                            className="flex-1 bg-white border rounded-xl px-4 py-3 hover:shadow-md transition-all text-right"
                          >
                            <div className="text-xs text-gray-500 mb-1">পরবর্তী</div>
                            <div className="font-medium text-gray-900 flex items-center gap-2 justify-end">
                              {nextSection.title}
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </button>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
