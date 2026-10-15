export interface LearningPathCategory {
  id: string
  label: string
  prompt: string
  subcategories: string[]
}

export interface GeneratedStarterOption {
  id: string
  title: string
  description: string
  topic: string
}

export const LEARNING_PATHS: LearningPathCategory[] = [
  {
    id: 'programming',
    label: 'Programming and technology',
    prompt: 'What area do you want to improve?',
    subcategories: [
      'Frontend development', 'Backend development', 'Cloud and DevOps',
      'Data and databases', 'Cybersecurity', 'Mobile development', 'Technical interviews',
    ],
  },
  {
    id: 'languages',
    label: 'Languages',
    prompt: 'Which language do you want to practise?',
    subcategories: [
      'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese',
      'Mandarin Chinese', 'English', 'Another language',
    ],
  },
  {
    id: 'education',
    label: 'School or university',
    prompt: 'Which subject are you studying?',
    subcategories: [
      'Computer science', 'Mathematics', 'Biology', 'Chemistry', 'Physics',
      'History', 'Psychology', 'Economics', 'Another subject',
    ],
  },
  {
    id: 'career',
    label: 'Career and professional skills',
    prompt: 'What are you working towards?',
    subcategories: [
      'Job interviews', 'Leadership and management', 'Communication',
      'Project management', 'Sales and marketing', 'Finance and accounting',
      'Another professional skill',
    ],
  },
  {
    id: 'certifications',
    label: 'Professional certification',
    prompt: 'Which certification area interests you?',
    subcategories: [
      'AWS', 'Microsoft Azure', 'Google Cloud', 'Cybersecurity', 'Scrum and Agile',
      'Project management', 'Finance', 'Another certification',
    ],
  },
  {
    id: 'knowledge',
    label: 'General knowledge',
    prompt: 'What would you like to understand better?',
    subcategories: [
      'Science', 'History', 'Geography', 'Politics and society', 'Economics',
      'Art and culture', 'Health and wellbeing', 'Something else',
    ],
  },
  {
    id: 'custom',
    label: 'Something else',
    prompt: 'How would you describe it?',
    subcategories: ['My own topic'],
  },
]

export function buildGeneratedStarterOptions(
  category: string,
  subcategory: string,
  goal: string,
): GeneratedStarterOption[] {
  const focusedGoal = goal.trim()
  const area = subcategory === 'My own topic' ? focusedGoal : subcategory
  const context = focusedGoal || area

  return [
    {
      id: 'foundations',
      title: `${area} foundations`,
      description: 'Build a clear base with the most useful concepts and vocabulary.',
      topic: `${area} foundations${focusedGoal && focusedGoal !== area ? ` for this goal: ${focusedGoal}` : ''}`,
    },
    {
      id: 'practical',
      title: `Practical ${area}`,
      description: 'Focus on realistic examples, decisions and common mistakes.',
      topic: `Practical ${area} questions focused on: ${context}`,
    },
    {
      id: 'personal',
      title: 'My exact goal',
      description: `Create a starter set specifically for “${context}”.`,
      topic: `${category}: ${subcategory}. The learner's specific goal is: ${context}`,
    },
  ]
}
