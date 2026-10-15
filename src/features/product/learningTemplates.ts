export interface StarterTemplate {
  id: string
  title: string
  category: string
  description: string
  topic: string
  cards: Array<{ question: string; answer: string }>
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'react', title: 'React essentials', category: 'Programming', topic: 'React essentials',
    description: 'Components, state, effects and common rendering mistakes.',
    cards: [
      ['What causes a React component to render?', 'Its state changes, its parent renders, or a consumed context value changes.'],
      ['Why should state updates use the previous-value callback when based on current state?', 'React may batch updates, so the callback receives the latest queued state instead of a stale closure.'],
      ['What is an effect for?', 'Synchronising a component with an external system such as a subscription, timer or network resource.'],
      ['When should a value not be stored in state?', 'When it can be derived from current props or other state during rendering.'],
      ['Why do list items need stable keys?', 'Keys let React preserve item identity across insertion, removal and reordering.'],
      ['What does useMemo guarantee?', 'It is a performance optimisation for reusing a calculation; code must remain correct if React recomputes it.'],
      ['What is a stale closure?', 'A function retains values from the render in which it was created, even after newer renders occur.'],
      ['Why return cleanup from an effect?', 'To undo the previous subscription or resource before rerun and when the component unmounts.'],
      ['What is controlled form input?', 'An input whose displayed value comes from React state and changes through an event handler.'],
      ['When is component composition preferable to configuration props?', 'When callers need to supply varied UI or behaviour cleanly through children or slots.'],
    ].map(([question, answer]) => ({ question, answer })),
  },
  {
    id: 'http', title: 'HTTP and networking', category: 'Programming', topic: 'HTTP fundamentals',
    description: 'Practical web concepts for frontend, backend and interviews.',
    cards: [
      ['What does HTTP 429 mean?', 'The client has sent too many requests and should wait, often using Retry-After and backoff.'],
      ['What is the difference between HTTP 401 and 403?', '401 means authentication is missing or invalid; 403 means the identity is known but lacks permission.'],
      ['Why are GET requests expected to be idempotent?', 'Repeating them should not change server state, which makes retries and caching safer.'],
      ['What does a DNS resolver do?', 'It translates a hostname into an IP address, often using cached recursive lookups.'],
      ['What does TLS protect?', 'It encrypts traffic in transit and authenticates the server through certificates.'],
      ['What is a CORS preflight?', 'An OPTIONS request that checks whether a cross-origin request with certain methods or headers is allowed.'],
      ['What is a cache validator?', 'Metadata such as an ETag or Last-Modified value used to ask whether cached content is still current.'],
      ['What does HTTP 503 communicate?', 'The service is temporarily unavailable and the client may retry later.'],
      ['Why use exponential backoff?', 'It spaces repeated retries to reduce load and avoid making an outage worse.'],
      ['What is the purpose of a Content-Type header?', 'It tells the recipient how to interpret the representation in the message body.'],
    ].map(([question, answer]) => ({ question, answer })),
  },
  {
    id: 'spanish', title: 'Everyday Spanish', category: 'Languages', topic: 'Everyday Spanish',
    description: 'High-frequency phrases for simple conversations.',
    cards: [
      ['How do you say “How are you?” informally?', '¿Cómo estás?'],
      ['What does “Tengo que irme” mean?', 'I have to leave.'],
      ['How do you ask where something is?', '¿Dónde está…?'],
      ['What is the difference between ser and estar?', 'Ser usually describes identity or lasting traits; estar usually describes state or location.'],
      ['How do you say “I would like” politely?', 'Me gustaría.'],
      ['What does “¿Cuánto cuesta?” mean?', 'How much does it cost?'],
      ['How do you say “I do not understand”?', 'No entiendo.'],
      ['What is the informal singular word for “you”?', 'Tú.'],
      ['How do you ask someone to repeat something?', '¿Puedes repetirlo, por favor?'],
      ['What does “hasta luego” mean?', 'See you later.'],
    ].map(([question, answer]) => ({ question, answer })),
  },
  {
    id: 'french', title: 'French for everyday life', category: 'Languages', topic: 'Everyday French',
    description: 'Useful phrases for introductions, travel and everyday conversation.',
    cards: [
      ['How do you greet someone politely in French?', 'Bonjour means hello or good morning. Bonsoir is used in the evening.'],
      ['How do you say “please” formally?', 'S’il vous plaît. With a friend or child, use s’il te plaît.'],
      ['What does “Je voudrais un café” mean?', 'I would like a coffee. Je voudrais is a polite way to ask for something.'],
      ['How do you say “I do not understand”?', 'Je ne comprends pas.'],
      ['How do you ask someone to repeat something?', 'Pouvez-vous répéter, s’il vous plaît ?'],
      ['What does “Où est la gare ?” mean?', 'Where is the train station?'],
      ['How do you say your name?', 'Je m’appelle… followed by your name.'],
      ['What is the difference between tu and vous?', 'Tu is informal and singular. Vous is plural or a polite way to address one person.'],
      ['How do you ask the price?', 'Combien ça coûte ? means “How much does it cost?”'],
      ['What does “À bientôt” mean?', 'See you soon.'],
    ].map(([question, answer]) => ({ question, answer })),
  },
  {
    id: 'german', title: 'German for everyday life', category: 'Languages', topic: 'Everyday German',
    description: 'A short introduction to practical German phrases.',
    cards: [
      ['How do you say “good morning” in German?', 'Guten Morgen.'],
      ['What does “Danke schön” mean?', 'Thank you very much.'],
      ['How do you say “please” or “you are welcome”?', 'Bitte can mean either; the meaning depends on the context.'],
      ['How do you introduce yourself by name?', 'Ich heiße… followed by your name.'],
      ['What does “Ich verstehe nicht” mean?', 'I do not understand.'],
      ['How do you politely ask someone to repeat something?', 'Können Sie das bitte wiederholen?'],
      ['What does “Wo ist der Bahnhof?” mean?', 'Where is the train station?'],
      ['How do you ask the price?', 'Wie viel kostet das? means “How much does that cost?”'],
      ['What is the difference between du and Sie?', 'Du is informal and singular. Sie with a capital S is the formal way to address someone.'],
      ['How do you say “I would like a coffee”?', 'Ich hätte gern einen Kaffee.'],
    ].map(([question, answer]) => ({ question, answer })),
  },
  {
    id: 'science', title: 'Everyday science', category: 'General knowledge', topic: 'Everyday science',
    description: 'Ten questions about the science behind familiar things.',
    cards: [
      ['Why does ice float on liquid water?', 'Water expands as it freezes, making ice less dense than liquid water.'],
      ['What causes the seasons on Earth?', 'Earth’s tilted axis changes the angle and duration of sunlight through the year.'],
      ['Why does metal usually feel colder than wood at the same room temperature?', 'Metal conducts heat away from your skin faster.'],
      ['What is the role of chlorophyll in plants?', 'It absorbs light energy used in photosynthesis.'],
      ['Why does a seat belt help during sudden braking?', 'It applies a force that slows your body with the car instead of letting it keep moving forward.'],
      ['What is the difference between weather and climate?', 'Weather describes short-term atmospheric conditions; climate describes long-term patterns.'],
      ['What does a vaccine help the immune system do?', 'Recognise a pathogen so it can mount a response on later exposure.'],
      ['Why does water boil at a lower temperature at high altitude?', 'Atmospheric pressure is lower, so water’s vapour pressure reaches it at a lower temperature.'],
      ['What is the difference between mass and weight?', 'Mass measures the amount of matter; weight is the gravitational force on it.'],
      ['What is an ecosystem?', 'A community of organisms and the physical environment with which they interact.'],
    ].map(([question, answer]) => ({ question, answer })),
  },
  {
    id: 'interviews', title: 'Software interview foundations', category: 'Interview preparation', topic: 'Software interviews',
    description: 'Concise prompts for common engineering discussions.',
    cards: [
      ['What is the time complexity of binary search?', 'O(log n), because each comparison halves the remaining sorted search space.'],
      ['When would you choose a queue?', 'When work should be processed in first-in, first-out order or decoupled asynchronously.'],
      ['What makes an API operation idempotent?', 'Repeating the same request has the same intended state effect as making it once.'],
      ['What is a database index trade-off?', 'It speeds reads for indexed access patterns but adds storage and write maintenance cost.'],
      ['Why paginate a large result set?', 'To bound response time, memory, bandwidth and client rendering work.'],
      ['What is eventual consistency?', 'Replicas may temporarily disagree but converge when updates finish propagating.'],
      ['What is a race condition?', 'Correctness depends on unpredictable timing between concurrent operations.'],
      ['Why use a transaction?', 'To make related database changes succeed or fail as one consistent unit.'],
      ['What is horizontal scaling?', 'Adding more machines or instances to distribute load.'],
      ['What should a useful engineering trade-off answer include?', 'The goal, constraints, alternatives, expected failure modes and why the choice fits them.'],
    ].map(([question, answer]) => ({ question, answer })),
  },
]

export function findStarterTemplate(category: string, topic: string) {
  const normalized = topic.toLocaleLowerCase()
  return STARTER_TEMPLATES.find(template => normalized.includes(template.id) ||
    normalized.includes(template.title.toLocaleLowerCase().split(' ')[0])) ??
    STARTER_TEMPLATES.find(template => template.category === category) ?? STARTER_TEMPLATES[0]
}

export function findRelevantStarterTemplates(_category: string, topic: string) {
  const stopWords = new Set(['and', 'for', 'from', 'learn', 'the', 'want', 'with'])
  const words = topic.toLocaleLowerCase().split(/\W+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
  return STARTER_TEMPLATES.filter(template => {
    const searchable = new Set(
      `${template.id} ${template.title} ${template.topic}`.toLocaleLowerCase().split(/\W+/),
    )
    return words.some(word => searchable.has(word))
  }).slice(0, 2)
}
