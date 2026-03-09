'use client'

import Link from 'next/link'

interface DashboardCardProps {
  title: string
  description: string
  href: string
  icon?: React.ReactNode
  comingSoon?: boolean
}

export default function DashboardCard({ title, description, href, icon, comingSoon }: DashboardCardProps) {
  const content = (
    <div className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${
      comingSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
    }`}>
      <div className="flex items-start space-x-4">
        {icon && <div className="flex-shrink-0 text-blue-600">{icon}</div>}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
          {comingSoon && (
            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
              Coming Soon
            </span>
          )}
        </div>
      </div>
    </div>
  )

  if (comingSoon) {
    return content
  }

  return <Link href={href}>{content}</Link>
}




