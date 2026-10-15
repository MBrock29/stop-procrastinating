import { describe, expect, it } from 'vitest'
import { buildGeneratedStarterOptions, LEARNING_PATHS } from './learningPaths'
import { findRelevantStarterTemplates } from './learningTemplates'

describe('personalized starter options', () => {
  it('offers useful category-specific subcategories', () => {
    expect(LEARNING_PATHS.find(item => item.id === 'languages')?.subcategories)
      .toEqual(expect.arrayContaining(['French', 'Spanish', 'German']))
    expect(LEARNING_PATHS.find(item => item.id === 'programming')?.subcategories)
      .toEqual(expect.arrayContaining(['Frontend development', 'Backend development', 'Cloud and DevOps']))
  })

  it('builds starter choices around the learner’s own goal', () => {
    const options = buildGeneratedStarterOptions(
      'Languages',
      'French',
      'Conversation for a trip to Paris',
    )
    expect(options).toHaveLength(3)
    expect(options.map(option => option.title)).toEqual([
      'French foundations',
      'Practical French',
      'My exact goal',
    ])
    expect(options[2].topic).toContain('Conversation for a trip to Paris')
  })

  it('does not recommend an unrelated curated template', () => {
    expect(findRelevantStarterTemplates('Languages', 'French for travel and conversation'))
      .toMatchObject([{ id: 'french' }])
    expect(findRelevantStarterTemplates('Languages', 'Japanese vocabulary')).toEqual([])
    expect(findRelevantStarterTemplates('Programming and technology', 'React hooks'))
      .toMatchObject([{ id: 'react' }])
  })
})
