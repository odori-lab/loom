'use client'

import { useState, useMemo } from 'react'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { generatePageContents, generateSinglePageHtml } from '@/lib/pdf/generator'

interface SelectPostsStepProps {
  posts: ThreadsPost[]
  profile: ThreadsProfile
  onGenerate: (posts: ThreadsPost[]) => void
  onBack: () => void
  loading: boolean
}

type SortOrder = 'newest' | 'oldest'

export function SelectPostsStep({
  posts,
  profile,
  onGenerate,
  onBack,
  loading
}: SelectPostsStepProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(posts.map(p => p.id))
  )
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentSpread, setCurrentSpread] = useState(0)

  const filteredAndSortedPosts = useMemo(() => {
    let result = [...posts]

    if (searchQuery) {
      result = result.filter(p =>
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    result.sort((a, b) => {
      const diff = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      return sortOrder === 'newest' ? diff : -diff
    })

    return result
  }, [posts, searchQuery, sortOrder])

  const selectedPosts = useMemo(() => {
    return posts
      .filter(p => selectedIds.has(p.id))
      .sort((a, b) => {
        const diff = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
        return sortOrder === 'newest' ? diff : -diff
      })
  }, [posts, selectedIds, sortOrder])

  const pages = useMemo(() => {
    if (selectedPosts.length === 0) return []
    return generatePageContents(selectedPosts, profile)
  }, [selectedPosts, profile])

  // Book-style spreads: Cover alone, then content pairs, then last page
  // Spread 0: [empty] + [cover]
  // Spread 1: [page1] + [page2]
  // ...
  // Last spread: [last content or empty] + [last page]
  const spreads = useMemo(() => {
    if (pages.length === 0) return []
    
    const result: { left: string | null; right: string | null; leftIdx: number; rightIdx: number }[] = []
    
    // Spread 0: Cover page (right side only)
    result.push({ left: null, right: pages[0], leftIdx: -1, rightIdx: 0 })
    
    // Content pages (pairs)
    const contentPages = pages.slice(1, -1) // Exclude cover and last
    const lastPage = pages[pages.length - 1]
    
    for (let i = 0; i < contentPages.length; i += 2) {
      const leftIdx = i + 1
      const rightIdx = i + 2
      result.push({
        left: contentPages[i],
        right: contentPages[i + 1] || null,
        leftIdx,
        rightIdx: contentPages[i + 1] ? rightIdx : -1
      })
    }
    
    // Last page handling - always on the left (like back cover)
    result.push({ 
      left: lastPage, 
      right: null, 
      leftIdx: pages.length - 1, 
      rightIdx: -1 
    })
    
    return result
  }, [pages])

  const totalSpreads = spreads.length

  const togglePost = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
    setCurrentSpread(0)
  }

  const toggleAll = () => {
    if (selectedIds.size === filteredAndSortedPosts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedPosts.map(p => p.id)))
    }
    setCurrentSpread(0)
  }

  const handleGenerate = () => {
    onGenerate(selectedPosts)
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const goToPrevSpread = () => {
    setCurrentSpread(prev => Math.max(0, prev - 1))
  }

  const goToNextSpread = () => {
    setCurrentSpread(prev => Math.min(totalSpreads - 1, prev + 1))
  }

  const currentSpreadData = spreads[currentSpread]

  return (
    <div className="flex h-full">
      {/* Left - PDF Preview (Main) */}
      <div className="flex-1 flex flex-col bg-gray-100">
        <div className="flex-1 p-6 flex items-center justify-center">
          {pages.length === 0 ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-gray-500">Select posts to preview</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {/* Prev button */}
              <button
                onClick={goToPrevSpread}
                disabled={currentSpread === 0}
                className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Two-page spread - A5 ratio (148:210) */}
              {/* Scale: 335px / 559px (148mm at 96dpi) ≈ 0.6 */}
              {currentSpreadData && (
                <div className="flex gap-0.5">
                  {/* Left page */}
                  {currentSpreadData.left ? (
                    <div 
                      className="overflow-hidden rounded-l-lg shadow-xl border-r border-gray-200"
                      style={{ width: '335px', height: '476px' }}
                    >
                      <iframe
                        srcDoc={generateSinglePageHtml(currentSpreadData.left)}
                        className="bg-white"
                        style={{ 
                          width: '559px',
                          height: '793px',
                          transform: 'scale(0.6)',
                          transformOrigin: 'top left',
                          border: 'none'
                        }}
                        title={`Page ${currentSpreadData.leftIdx + 1}`}
                      />
                    </div>
                  ) : (
                    <div
                      className="bg-gray-100 rounded-l-lg shadow-xl flex items-center justify-center border-r border-gray-200"
                      style={{ width: '335px', height: '476px' }}
                    />
                  )}
                  {/* Right page */}
                  {currentSpreadData.right ? (
                    <div 
                      className="overflow-hidden rounded-r-lg shadow-xl"
                      style={{ width: '335px', height: '476px' }}
                    >
                      <iframe
                        srcDoc={generateSinglePageHtml(currentSpreadData.right)}
                        className="bg-white"
                        style={{ 
                          width: '559px',
                          height: '793px',
                          transform: 'scale(0.6)',
                          transformOrigin: 'top left',
                          border: 'none'
                        }}
                        title={`Page ${currentSpreadData.rightIdx + 1}`}
                      />
                    </div>
                  ) : (
                    <div
                      className="bg-gray-100 rounded-r-lg shadow-xl flex items-center justify-center"
                      style={{ width: '335px', height: '476px' }}
                    />
                  )}
                </div>
              )}

              {/* Next button */}
              <button
                onClick={goToNextSpread}
                disabled={currentSpread >= totalSpreads - 1}
                className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-5 py-2.5 text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Back
          </button>
          <div className="flex items-center gap-4">
            {spreads.length > 0 && currentSpreadData && (
              <span className="text-sm text-gray-400">
                Spread {currentSpread + 1} / {spreads.length}
              </span>
            )}
            <span className="text-sm text-gray-500">
              {selectedIds.size} posts
            </span>
            <button
              onClick={handleGenerate}
              disabled={selectedIds.size === 0 || loading}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate PDF
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right - Post Selection (Sidebar) */}
      <div className="w-80 border-l border-gray-200 flex flex-col bg-white">
        {/* Profile + Controls */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center gap-3">
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt=""
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {profile.username[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{profile.displayName}</p>
              <p className="text-xs text-gray-500">@{profile.username}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-100 border-0 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="px-2 py-1.5 bg-gray-100 border-0 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
            >
              <option value="newest">New</option>
              <option value="oldest">Old</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={toggleAll}
              className="text-xs text-gray-500 hover:text-gray-900"
            >
              {selectedIds.size === filteredAndSortedPosts.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs text-gray-400">
              {filteredAndSortedPosts.length} posts
            </span>
          </div>
        </div>

        {/* Threads-style Post List */}
        <div className="flex-1 overflow-y-auto">
          {filteredAndSortedPosts.map(post => (
            <div
              key={post.id}
              onClick={() => togglePost(post.id)}
              className={`px-3 py-3 border-b border-gray-100 cursor-pointer transition-colors ${
                selectedIds.has(post.id)
                  ? 'bg-gray-50'
                  : 'hover:bg-gray-50/50'
              }`}
            >
              {/* Grid layout like actual Threads UI */}
              <div className="grid gap-x-3" style={{ gridTemplateColumns: '36px 1fr' }}>
                {/* Profile Image - spans all rows */}
                <div className="row-span-full pt-0.5">
                  {profile.profileImageUrl ? (
                    <img
                      src={profile.profileImageUrl}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {profile.username[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Header: Username + Time + Checkbox */}
                <div className="flex items-center gap-1.5 leading-[1.4]">
                  <span className="text-[13px] font-semibold text-gray-900">
                    {profile.username}
                  </span>
                  <span className="text-[13px] text-gray-400">
                    {formatDate(post.postedAt)}
                  </span>
                  <div className="flex-1" />
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    selectedIds.has(post.id)
                      ? 'bg-black border-black'
                      : 'border-gray-300'
                  }`}>
                    {selectedIds.has(post.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Post Content */}
                <div className="mt-0.5">
                  <p className="text-[13px] text-gray-900 leading-[1.4] line-clamp-3 whitespace-pre-line">
                    {post.content}
                  </p>
                </div>

                {/* Image Preview - col 2 */}
                {post.imageUrls.length > 0 && (
                  <div className="col-start-2 mt-2">
                    <div className="relative overflow-hidden rounded-xl" style={{ maxHeight: '120px' }}>
                      <img
                        src={post.imageUrls[0]}
                        alt=""
                        className="w-full h-auto object-cover rounded-xl"
                        style={{ maxHeight: '120px' }}
                      />
                      {post.imageUrls.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                          +{post.imageUrls.length - 1}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Engagement Stats - col 2 */}
                <div className="col-start-2 mt-2 flex items-center gap-3">
                  <div className="flex items-center gap-1 text-gray-400">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.25" viewBox="0 0 18 18">
                      <path d="M1.34375 7.53125L1.34375 7.54043C1.34374 8.04211 1.34372 8.76295 1.6611 9.65585C1.9795 10.5516 2.60026 11.5779 3.77681 12.7544C5.59273 14.5704 7.58105 16.0215 8.33387 16.5497C8.73525 16.8313 9.26573 16.8313 9.66705 16.5496C10.4197 16.0213 12.4074 14.5703 14.2232 12.7544C15.3997 11.5779 16.0205 10.5516 16.3389 9.65585C16.6563 8.76296 16.6563 8.04211 16.6562 7.54043V7.53125C16.6562 5.23466 15.0849 3.25 12.6562 3.25C11.5214 3.25 10.6433 3.78244 9.99228 4.45476C9.59009 4.87012 9.26356 5.3491 9 5.81533C8.73645 5.3491 8.40991 4.87012 8.00772 4.45476C7.35672 3.78244 6.47861 3.25 5.34375 3.25C2.9151 3.25 1.34375 5.23466 1.34375 7.53125Z" />
                    </svg>
                    {post.likeCount > 0 && <span className="text-[11px]">{post.likeCount}</span>}
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.25" viewBox="0 0 18 18">
                      <path d="M15.376 13.2177L16.2861 16.7955L12.7106 15.8848C12.6781 15.8848 12.6131 15.8848 12.5806 15.8848C11.3779 16.5678 9.94767 16.8931 8.41995 16.7955C4.94194 16.5353 2.08152 13.7381 1.72397 10.2578C1.2689 5.63919 5.13697 1.76863 9.75264 2.22399C13.2307 2.58177 16.0261 5.41151 16.2861 8.92429C16.4161 10.453 16.0586 11.8841 15.376 13.0876C15.376 13.1526 15.376 13.1852 15.376 13.2177Z" strokeLinejoin="round" />
                    </svg>
                    {post.replyCount > 0 && <span className="text-[11px]">{post.replyCount}</span>}
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <svg className="w-[18px] h-[18px]" fill="currentColor" stroke="none" viewBox="0 0 18 18">
                      <path d="M6.41256 1.23531C6.6349 0.971277 7.02918 0.937481 7.29321 1.15982L9.96509 3.40982C10.1022 3.52528 10.1831 3.69404 10.1873 3.87324C10.1915 4.05243 10.1186 4.2248 9.98706 4.34656L7.31518 6.81971C7.06186 7.05419 6.66643 7.03892 6.43196 6.7856C6.19748 6.53228 6.21275 6.13685 6.46607 5.90237L7.9672 4.51289H5.20312C3.68434 4.51289 2.45312 5.74411 2.45312 7.26289V9.51289V11.7629C2.45312 13.2817 3.68434 14.5129 5.20312 14.5129C5.5483 14.5129 5.82812 14.7927 5.82812 15.1379C5.82812 15.4831 5.5483 15.7629 5.20312 15.7629C2.99399 15.7629 1.20312 13.972 1.20312 11.7629V9.51289V7.26289C1.20312 5.05375 2.99399 3.26289 5.20312 3.26289H7.85002L6.48804 2.11596C6.22401 1.89362 6.19021 1.49934 6.41256 1.23531Z" />
                      <path d="M11.5874 17.7904C11.3651 18.0545 10.9708 18.0883 10.7068 17.8659L8.03491 15.6159C7.89781 15.5005 7.81687 15.3317 7.81267 15.1525C7.80847 14.9733 7.8814 14.801 8.01294 14.6792L10.6848 12.206C10.9381 11.9716 11.3336 11.9868 11.568 12.2402C11.8025 12.4935 11.7872 12.8889 11.5339 13.1234L10.0328 14.5129H12.7969C14.3157 14.5129 15.5469 13.2816 15.5469 11.7629V9.51286V7.26286C15.5469 5.74408 14.3157 4.51286 12.7969 4.51286C12.4517 4.51286 12.1719 4.23304 12.1719 3.88786C12.1719 3.54269 12.4517 3.26286 12.7969 3.26286C15.006 3.26286 16.7969 5.05373 16.7969 7.26286V9.51286V11.7629C16.7969 13.972 15.006 15.7629 12.7969 15.7629H10.15L11.512 16.9098C11.776 17.1321 11.8098 17.5264 11.5874 17.7904Z" />
                    </svg>
                    {post.repostCount > 0 && <span className="text-[11px]">{post.repostCount}</span>}
                  </div>
                  <div className="flex items-center text-gray-400">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.25" viewBox="0 0 18 18">
                      <path d="M15.6097 4.09082L6.65039 9.11104" strokeLinejoin="round" />
                      <path d="M7.79128 14.439C8.00463 15.3275 8.11131 15.7718 8.33426 15.932C8.52764 16.071 8.77617 16.1081 9.00173 16.0318C9.26179 15.9438 9.49373 15.5501 9.95761 14.7628L15.5444 5.2809C15.8883 4.69727 16.0603 4.40546 16.0365 4.16566C16.0159 3.95653 15.9071 3.76612 15.7374 3.64215C15.5428 3.5 15.2041 3.5 14.5267 3.5H3.71404C2.81451 3.5 2.36474 3.5 2.15744 3.67754C1.97758 3.83158 1.88253 4.06254 1.90186 4.29856C1.92415 4.57059 2.24363 4.88716 2.88259 5.52032L6.11593 8.7243C6.26394 8.87097 6.33795 8.94431 6.39784 9.02755C6.451 9.10144 6.4958 9.18101 6.53142 9.26479C6.57153 9.35916 6.59586 9.46047 6.64451 9.66309L7.79128 14.439Z" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
