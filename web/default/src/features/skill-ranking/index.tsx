/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Minus,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { cn } from '@/lib/utils'
import { SearchBar } from '@/features/pricing/components/search-bar'

interface Skill {
  rank: number
  name: string
  description: string
  description_zh?: string
  category: string
  users: string
  source: string
  trend: 'up' | 'down' | 'stable'
  url?: string
}

interface SkillRankingData {
  update_time: string
  total: number
  categories: string[]
  skills: Skill[]
}

/** Fallback seed data used when the remote JSON is unavailable. */
const SEED_DATA: SkillRankingData = {
  update_time: new Date().toISOString(),
  total: 0,
  categories: [],
  skills: [],
}

export function SkillRanking() {
  const { t } = useTranslation()
  const [data, setData] = useState<SkillRankingData>(SEED_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    let cancelled = false
    fetch('/skills-ranking.json')
      .then((res) => {
        if (!res.ok) throw new Error('加载失败')
        return res.json()
      })
      .then((json: SkillRankingData) => {
        if (cancelled) return
        setData(json)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '加载失败')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(
    () => ['All', ...(data?.categories ?? [])],
    [data]
  )

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: data?.skills?.length ?? 0 }
    for (const skill of data?.skills ?? []) {
      counts[skill.category] = (counts[skill.category] ?? 0) + 1
    }
    return counts
  }, [data])

  const filteredSkills = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return (data?.skills ?? []).filter((skill) => {
      const matchesSearch =
        term === '' ||
        skill.name.toLowerCase().includes(term) ||
        skill.description.toLowerCase().includes(term)
      const matchesCategory =
        activeCategory === 'All' || skill.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [data, searchTerm, activeCategory])

  const getTrendIcon = (trend: Skill['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className='size-4 text-green-500' />
      case 'down':
        return <TrendingDown className='size-4 text-red-500' />
      default:
        return <Minus className='size-4 text-gray-400' />
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <PublicLayout showMainContainer={false}>
      <div className='relative'>
        {/* Gradient halo background, aligned with the pricing public page */}
        <div
          aria-hidden
          className='pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-20 dark:opacity-[0.10]'
          style={{
            background: [
              'radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.72 0.18 250 / 80%) 0%, transparent 70%)',
              'radial-gradient(ellipse 50% 40% at 80% 15%, oklch(0.65 0.15 200 / 60%) 0%, transparent 70%)',
              'radial-gradient(ellipse 40% 35% at 50% 70%, oklch(0.70 0.12 280 / 40%) 0%, transparent 70%)',
            ].join(', '),
            maskImage:
              'linear-gradient(to bottom, black 40%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 40%, transparent 100%)',
          }}
        />
        <PageTransition className='relative mx-auto w-full max-w-[1800px] px-3 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 xl:px-8'>
          {/* Hero */}
          <header className='mx-auto mb-5 max-w-3xl pt-5 text-center sm:mb-10 sm:pt-10'>
            <h1 className='text-[clamp(1.75rem,4.5vw,2.75rem)] font-bold tracking-tight'>
              {t('Skill Ranking')}
            </h1>
            <p className='text-muted-foreground/80 mt-2 text-sm sm:mt-3 sm:text-base'>
              {t(
                'Based on GitHub topic:agent-skills, top {{count}} repositories by stars',
                { count: data?.total ?? 0 }
              )}
            </p>
            <p className='text-muted-foreground/60 mx-auto mt-1.5 max-w-2xl text-xs sm:text-sm'>
              {t('Discover trending agent skills and AI tooling repos.')}
            </p>
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm('')}
              placeholder={t('Search models')}
              className='mx-auto mt-4 max-w-2xl sm:mt-6'
            />
          </header>

          <div className='grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]'>
            {/* Category sidebar (visible on xl+) */}
            <aside className='hover-scrollbar sticky top-4 hidden max-h-[calc(100dvh-2rem)] self-start overflow-y-auto rounded-xl border p-3 xl:block'>
              <h2 className='text-foreground mb-2 text-sm font-bold'>
                {t('Categories')}
              </h2>
              <ul className='space-y-0.5'>
                {categories.map((cat) => {
                  const active = activeCategory === cat
                  return (
                    <li key={cat}>
                      <button
                        type='button'
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                          active
                            ? 'bg-foreground/5 font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        )}
                      >
                        <span className='truncate'>{t(cat)}</span>
                        <span className='text-muted-foreground ml-2 text-xs tabular-nums'>
                          {categoryCounts[cat] ?? 0}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {data?.update_time && (
                <p className='text-muted-foreground/70 mt-3 border-t pt-3 text-xs'>
                  {t('Updated')}: {formatDate(data.update_time)}
                </p>
              )}
            </aside>

            {/* Main content */}
            <main className='min-w-0 space-y-3'>
              {/* Category filter for < xl (Tabs) */}
              <div className='xl:hidden'>
                <Tabs
                  value={activeCategory}
                  onValueChange={setActiveCategory}
                >
                  <TabsList className='flex-wrap h-auto gap-1 p-1'>
                    {categories.map((cat) => (
                      <TabsTrigger
                        key={cat}
                        value={cat}
                        className='text-xs px-3 py-1.5'
                      >
                        {t(cat)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {/* Toolbar */}
              <div className='flex items-center justify-between text-sm text-muted-foreground'>
                <span>
                  {t('Total')}: {filteredSkills.length}
                </span>
                {data?.update_time && (
                  <span className='hidden sm:inline'>
                    {t('Updated')}: {formatDate(data.update_time)}
                  </span>
                )}
              </div>

              {/* Loading skeleton */}
              {loading && (
                <div className='space-y-3'>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className='h-20 w-full rounded-xl' />
                  ))}
                </div>
              )}

              {/* Error state */}
              {error && (
                <Card className='border-dashed'>
                  <CardContent className='py-12 text-center'>
                    <p className='text-muted-foreground'>
                      {t('No results found')}: {error}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Ranking list */}
              {!loading && !error && (
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  {filteredSkills.map((skill) => {
                    const cardContent = (
                      <Card className='h-full transition-all duration-200 group-hover:shadow-md group-hover:border-primary/30'>
                        <CardContent className='p-3 sm:p-4'>
                          {/* Skill name */}
                          <h3 className='font-semibold text-foreground group-hover:text-primary transition-colors'>
                            {skill.name}
                          </h3>

                          {/* Category, official badge, trend, stars */}
                          <div className='mt-1 flex flex-wrap items-center gap-2'>
                            <Badge
                              variant='secondary'
                              className='text-xs font-normal'
                            >
                              {skill.category}
                            </Badge>
                            {skill.source === 'official' && (
                              <Badge className='text-xs font-normal bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0'>
                                {t('Official')}
                              </Badge>
                            )}
                            <div className='hidden sm:flex items-center'>
                              {getTrendIcon(skill.trend)}
                            </div>
                            <div className='ml-auto flex items-center gap-1 text-sm text-muted-foreground'>
                              <Star className='w-4 h-4' />
                              <span className='font-medium tabular-nums'>
                                {skill.users}
                              </span>
                              <span className='text-xs'>Star</span>
                            </div>
                          </div>

                          {/* Description: two lines max */}
                          <p className='text-sm text-muted-foreground mt-1.5 line-clamp-2'>
                            {skill.description_zh || skill.description}
                          </p>
                        </CardContent>
                      </Card>
                    )

                    if (!skill.url) {
                      return (
                        <div key={skill.rank} className='group'>
                          {cardContent}
                        </div>
                      )
                    }

                    return (
                      <a
                        key={skill.rank}
                        href={skill.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        aria-label={`查看原站 ${skill.name}`}
                        className='block group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
                      >
                        {cardContent}
                      </a>
                    )
                  })}

                  {filteredSkills.length === 0 && (
                    <Card className='border-dashed col-span-full'>
                      <CardContent className='py-12 text-center'>
                        <p className='text-muted-foreground'>
                          {t('No results found')}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </main>
          </div>
        </PageTransition>
      </div>
    </PublicLayout>
  )
}
