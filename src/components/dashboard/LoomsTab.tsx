'use client'

import { useState, useMemo } from 'react'
import { useDashboard } from './DashboardContext'
import { SpinnerSvg } from '@/components/ui/Spinner'
import { TrashIcon, PlusIcon, BookOpenIcon, SearchIcon, DownloadIcon } from '@/components/ui/Icons'
import { useI18n } from '@/lib/i18n/context'
import { Json } from '@/types/database'

type SortOrder = 'newest' | 'oldest'

interface CoverDataShape {
  name?: string
  username?: string
  bio?: string
  profileImageUrl?: string
  followerCount?: number
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function parseCoverData(raw: Json | null): CoverDataShape | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as unknown as CoverDataShape
}

function proxyImageUrl(url: string): string {
  return `/api/proxy-image?url=${encodeURIComponent(url)}`
}

function getBookTitle(title: string | null, coverData: CoverDataShape | null, displayName: string | null, username: string): string {
  if (title) return title
  if (coverData?.name) return coverData.name
  if (displayName) return displayName
  return `@${username}`
}

export function LoomsTab() {
  const { looms, selectedLoom, deletingId, selectLoom, deleteLoom, setActiveTab, openPreviewModal } = useDashboard()
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const filteredLooms = useMemo(() => {
    let result = [...looms]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(l =>
        (l.thread_display_name || '').toLowerCase().includes(q) ||
        l.thread_username.toLowerCase().includes(q)
      )
    }
    return result.toSorted((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return sortOrder === 'newest' ? diff : -diff
    })
  }, [looms, searchQuery, sortOrder])

  const handleDownload = async (e: React.MouseEvent, loomId: string) => {
    e.stopPropagation()
    setDownloadingId(loomId)
    try {
      const res = await fetch(`/api/looms/${loomId}`)
      const data = await res.json()
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank')
      }
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setDownloadingId(null)
    }
  }

  if (looms.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-16 px-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-sm" style={{ animation: 'dashboard-float 3s ease-in-out infinite' }}>
            <BookOpenIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('dashboard.empty.title')}</h3>
          <p className="text-gray-500 mb-8 max-w-sm">
            {t('dashboard.empty.description')}
          </p>
          <button
            onClick={() => setActiveTab('create')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 hover:scale-105 transition-all shadow-lg shadow-gray-900/20 active:scale-[0.96]"
          >
            <PlusIcon className="w-5 h-5" />
            {t('dashboard.empty.cta')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Controls */}
      <div className="h-12 px-6 flex gap-3 items-center justify-end">
        <p className="text-xs text-gray-400">{looms.length} {looms.length === 1 ? t('dashboard.loom') : t('dashboard.looms_count')}</p>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="px-2 py-1 bg-gray-100 border-0 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 h-7"
        >
          <option value="newest">{t('dashboard.newest')}</option>
          <option value="oldest">{t('dashboard.oldest')}</option>
        </select>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder={t('dashboard.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1 bg-gray-100 border-0 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 w-40 h-7"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-[repeat(auto-fill,180px)] gap-4 justify-center">
          {filteredLooms.map((loom, index) => {
            const coverData = parseCoverData(loom.cover_data)
            const profileImg = coverData?.profileImageUrl
            const title = getBookTitle(loom.title, coverData, loom.thread_display_name, loom.thread_username)
            const displayName = loom.thread_display_name || coverData?.name || `@${loom.thread_username}`

            return (
              <div
                key={loom.id}
                onClick={() => selectLoom(loom)}
                onDoubleClick={() => openPreviewModal()}
                style={{ animationDelay: `${index * 40}ms`, contentVisibility: 'auto' }}
                className={`w-[180px] group cursor-pointer rounded-xl border transition-all overflow-hidden [animation:dashboard-card-enter_0.3s_ease-out_both] active:scale-[0.97] ${
                  selectedLoom?.id === loom.id
                    ? 'border-gray-900 shadow-md'
                    : 'border-[#e0e0e0] hover:border-gray-400 hover:shadow-sm'
                }`}
              >
                {/* Book cover area */}
                <div className="relative bg-[#fafafa] px-4 pt-5 pb-3 flex flex-col items-center">
                  {/* Action buttons - visible on hover */}
                  <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={(e) => handleDownload(e, loom.id)}
                      disabled={downloadingId === loom.id}
                      className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-gray-400 hover:text-gray-900 hover:bg-white transition-all disabled:opacity-50 active:scale-[0.96] shadow-sm"
                      title="Download"
                    >
                      {downloadingId === loom.id ? (
                        <SpinnerSvg />
                      ) : (
                        <DownloadIcon className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteLoom(loom.id)
                      }}
                      disabled={deletingId === loom.id}
                      className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-gray-400 hover:text-red-500 hover:bg-white transition-all disabled:opacity-50 active:scale-[0.96] shadow-sm"
                      title="Delete"
                    >
                      {deletingId === loom.id ? (
                        <SpinnerSvg />
                      ) : (
                        <TrashIcon className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Mini book cover */}
                  <div className="w-[100px] h-[130px] rounded-sm bg-white border border-[#e0e0e0] shadow-[2px_2px_8px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center px-3 relative overflow-hidden">
                    {/* Spine accent */}
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gray-900" />
                    {/* Title */}
                    <p className="text-[11px] font-semibold text-gray-900 text-center leading-tight line-clamp-3 mt-1">
                      {title}
                    </p>
                    {/* Divider */}
                    <div className="w-6 h-px bg-[#e0e0e0] my-2" />
                    {/* Username on cover */}
                    <p className="text-[9px] text-[#999999] text-center">
                      @{loom.thread_username}
                    </p>
                  </div>

                  {/* Post count badge */}
                  <div className="mt-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 bg-white border border-[#e0e0e0] rounded-full text-[10px] text-[#737373] font-medium">
                      {loom.post_count} {loom.post_count === 1 ? 'post' : 'posts'}
                    </span>
                  </div>
                </div>

                {/* Profile & metadata */}
                <div className="px-3 py-2.5 bg-white border-t border-[#f0f0f0]">
                  <div className="flex items-center gap-2">
                    {/* Avatar */}
                    {profileImg ? (
                      <img
                        src={proxyImageUrl(profileImg)}
                        alt={displayName}
                        className="w-7 h-7 rounded-full border border-[#e0e0e0] object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full border border-[#e0e0e0] bg-[#f5f5f5] flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-medium text-[#999999]">
                          {(displayName[0] || '?').toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Name & username */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-[#999999] truncate leading-tight">
                        @{loom.thread_username}
                      </p>
                    </div>
                  </div>
                  {/* Date */}
                  <p className="text-[10px] text-[#999999] mt-1.5">
                    {formatDate(loom.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
