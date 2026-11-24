// Runs before every test file.
// "test" mode turns off the rate limiters.
process.env.NODE_ENV = 'test';
// An empty key means the AI service never calls real Gemini in tests; it uses the rule-based fallback.
process.env.GEMINI_API_KEY = '';