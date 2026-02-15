import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { BookStructure } from '@/types/book'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      )
    }

    const { posts, profile } = (await request.json()) as {
      posts: ThreadsPost[]
      profile: ThreadsProfile
    }

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { error: 'Posts array is required and must not be empty' },
        { status: 400 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const postData = posts.map((post) => ({
      id: post.id,
      content: post.content,
      date: post.postedAt,
      likeCount: post.likeCount,
      hasImages: post.imageUrls.length > 0,
    }))

    const prompt = `당신은 SNS 포스트를 책으로 엮는 전문 문학 편집자입니다.

아래는 "${profile.displayName}" (@${profile.username}) 님의 Threads 포스트 목록입니다.

프로필 소개: ${profile.bio || '(없음)'}

포스트 목록:
${JSON.stringify(postData, null, 2)}

위 포스트들을 분석하여 주제/테마별로 3~7개의 챕터로 구성하고, 각 챕터 안에서 2~5개의 소챕터로 세분화해주세요.

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이 순수 JSON만):
{
  "title": "작가의 목소리와 글의 특성을 반영한 책 제목",
  "preface": "이 포스트 모음집을 소개하는 서문 (2~3 문단, 문학 편집자의 시선으로 작성)",
  "chapters": [
    {
      "id": "챕터-슬러그-영문",
      "title": "챕터 제목",
      "description": "이 챕터에 대한 한 줄 설명",
      "subChapters": [
        {
          "id": "소챕터-슬러그-영문",
          "title": "소챕터 제목",
          "postIds": ["포스트id1", "포스트id2"]
        }
      ]
    }
  ],
  "imageCaptions": [
    { "postId": "포스트id", "caption": "이 포스트의 이미지에 대한 설명 캡션" }
  ]
}

규칙:
- 모든 포스트는 반드시 하나의 소챕터에 포함되어야 합니다. 누락된 포스트가 없어야 합니다.
- 각 챕터는 2~5개의 소챕터를 가져야 합니다.
- 챕터 id와 소챕터 id는 영문 소문자 슬러그 형식 (예: "daily-thoughts", "morning-routines")
- 서문(preface)은 마치 문학 편집자가 이 글 모음집을 독자에게 소개하듯 격조 있게 작성해주세요.
- 포스트의 내용과 주제를 깊이 분석하여 의미 있는 그룹핑을 해주세요.
- 이미지가 있는 포스트(hasImages: true)에 대해, 포스트 내용을 바탕으로 하나의 캡션을 생성해주세요. 이미지가 여러 장이더라도 포스트당 캡션은 하나만 작성합니다. 캡션은 한 줄로 간결하게 작성해주세요.
- 반드시 유효한 JSON만 반환해주세요.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim()
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }

    let bookStructure: BookStructure
    try {
      bookStructure = JSON.parse(jsonText)
    } catch {
      console.error('[ORGANIZE_BOOK] Failed to parse Gemini response:', text)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    // Validate all post IDs are accounted for
    const allPostIds = new Set(posts.map((p) => p.id))
    const assignedPostIds = new Set(
      bookStructure.chapters.flatMap((ch) =>
        ch.subChapters.flatMap((sub) => sub.postIds)
      )
    )

    const missingPostIds = [...allPostIds].filter(
      (id) => !assignedPostIds.has(id)
    )

    if (missingPostIds.length > 0) {
      bookStructure.chapters.push({
        id: 'uncategorized',
        title: '그 외 이야기',
        description: '분류되지 않은 포스트 모음',
        subChapters: [
          {
            id: 'uncategorized-posts',
            title: '미분류 포스트',
            postIds: missingPostIds,
          },
        ],
      })
    }

    return NextResponse.json(bookStructure)
  } catch (error: any) {
    console.error('[ORGANIZE_BOOK_ERROR]', error)
    return NextResponse.json(
      { error: error.message || 'Failed to organize book' },
      { status: 500 }
    )
  }
}
