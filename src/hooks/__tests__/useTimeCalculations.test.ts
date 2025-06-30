import { renderHook } from '@testing-library/react'
import { useTimeCalculations } from '../useTimeCalculations'
import { TimeEntry } from '@/services/time-entry.service'
import { Workdays } from '@/services/settings.service'

// Mock data
const mockTimeEntries: TimeEntry[] = [
  {
    id: '1',
    startTime: '2024-01-15T09:00:00.000Z',
    endTime: '2024-01-15T12:00:00.000Z',
  },
  {
    id: '2', 
    startTime: '2024-01-15T13:00:00.000Z',
    endTime: '2024-01-15T17:00:00.000Z',
  },
]

const mockWorkdays: Workdays = {
  sun: false,
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  sat: false,
}

const mockSettings = {
  weeklyHours: 40,
  workdays: mockWorkdays,
  timeBankAdjustment: 0,
  is24hFormat: true,
  enableReminders: true,
  workStartTime: '09:00',
  breakDuration: 60,
}

describe('useTimeCalculations', () => {
  const now = new Date('2024-01-15T15:30:00.000Z')
  const workHoursPerDay = 8

  it('should calculate daily hours correctly for completed entries', () => {
    const { result } = renderHook(() => 
      useTimeCalculations(mockTimeEntries, now, workHoursPerDay, mockWorkdays, mockSettings)
    )

    // 3 hours (morning) + 4 hours (afternoon) = 7 hours = 25200000 ms
    expect(result.current.dailyHours).toBe(25200000)
  })

  it('should calculate progress correctly', () => {
    const { result } = renderHook(() => 
      useTimeCalculations(mockTimeEntries, now, workHoursPerDay, mockWorkdays, mockSettings)
    )

    // 7 hours of 8 hours = 87.5%
    expect(result.current.progress).toBe(87.5)
  })

  it('should format duration correctly', () => {
    const { result } = renderHook(() => 
      useTimeCalculations([], now, workHoursPerDay, mockWorkdays, mockSettings)
    )

    expect(result.current.formatDuration(3600000)).toBe('01h00m') // 1 hour
    expect(result.current.formatDuration(5400000)).toBe('01h30m') // 1.5 hours
    expect(result.current.formatDuration(0)).toBe('00h00m')
    expect(result.current.formatDuration(-1000)).toBe('00h00m') // Negative becomes 0
  })

  it('should detect workday status correctly for finished day', () => {
    const { result } = renderHook(() => 
      useTimeCalculations(mockTimeEntries, now, workHoursPerDay, mockWorkdays, mockSettings)
    )

    expect(result.current.workdayStatus).toBe('FINISHED')
    expect(result.current.currentEntry).toBeNull()
  })

  it('should detect workday status correctly for active work session', () => {
    const activeEntries: TimeEntry[] = [
      {
        id: '1',
        startTime: '2024-01-15T09:00:00.000Z',
        // No endTime - still working
      },
    ]

    const { result } = renderHook(() => 
      useTimeCalculations(activeEntries, now, workHoursPerDay, mockWorkdays, mockSettings)
    )

    expect(result.current.workdayStatus).toBe('WORKING_BEFORE_BREAK')
    expect(result.current.currentEntry).toEqual(activeEntries[0])
  })

  it('should detect on break status correctly', () => {
    const breakEntries: TimeEntry[] = [
      {
        id: '1',
        startTime: '2024-01-15T09:00:00.000Z',
        endTime: '2024-01-15T12:00:00.000Z', // Finished first session
      },
    ]

    const { result } = renderHook(() => 
      useTimeCalculations(breakEntries, now, workHoursPerDay, mockWorkdays, mockSettings)
    )

    expect(result.current.workdayStatus).toBe('ON_BREAK')
  })

  it('should calculate time bank correctly', () => {
    // Mock entries spanning multiple days
    const multiDayEntries: TimeEntry[] = [
      // Day 1: worked 8 hours (target)
      {
        id: '1',
        startTime: '2024-01-14T09:00:00.000Z',
        endTime: '2024-01-14T17:00:00.000Z',
      },
      // Day 2: worked 7 hours (1 hour under)
      {
        id: '2',
        startTime: '2024-01-15T09:00:00.000Z',
        endTime: '2024-01-15T16:00:00.000Z',
      },
    ]

    const { result } = renderHook(() => 
      useTimeCalculations(multiDayEntries, now, workHoursPerDay, mockWorkdays, mockSettings)
    )

    // Should show deficit of 1 hour
    expect(result.current.timeBank).toBe('-01h00m')
  })

  it('should handle empty time entries', () => {
    const { result } = renderHook(() => 
      useTimeCalculations([], now, workHoursPerDay, mockWorkdays, mockSettings)
    )

    expect(result.current.workdayStatus).toBe('NOT_STARTED')
    expect(result.current.dailyHours).toBe(0)
    expect(result.current.progress).toBe(0)
    expect(result.current.timeBank).toBe('+00h00m')
    expect(result.current.lastEvent.label).toBe('Nenhum registro hoje')
  })

  it('should calculate predicted end time correctly', () => {
    const workingEntries: TimeEntry[] = [
      {
        id: '1',
        startTime: '2024-01-15T09:00:00.000Z',
        endTime: '2024-01-15T12:00:00.000Z',
      },
      {
        id: '2',
        startTime: '2024-01-15T13:00:00.000Z',
        // Currently working - no endTime
      },
    ]

    const { result } = renderHook(() => 
      useTimeCalculations(workingEntries, now, workHoursPerDay, mockWorkdays, mockSettings)
    )

    expect(result.current.workdayStatus).toBe('WORKING_AFTER_BREAK')
    expect(result.current.predictedEndTime).toBeInstanceOf(Date)
    
    // Should predict end time based on 8 hours work + 1 hour break from 9:00 start
    const expectedEndTime = new Date('2024-01-15T18:00:00.000Z')
    expect(result.current.predictedEndTime?.getTime()).toBe(expectedEndTime.getTime())
  })
})