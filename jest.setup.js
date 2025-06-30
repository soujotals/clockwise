import '@testing-library/jest-dom'

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock date-fns locale
jest.mock('date-fns/locale', () => ({
  ptBR: {},
}))

// Mock notifications
global.Notification = jest.fn()
global.Notification.permission = 'granted'