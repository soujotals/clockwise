import { render, screen, fireEvent } from '@testing-library/react'
import { TimeCard } from '../TimeCard'

const mockFormatDuration = (ms: number) => {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  return `${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}m`
}

describe('TimeCard', () => {
  const defaultProps = {
    now: new Date('2024-01-15T15:30:00Z'),
    workdayStatus: 'NOT_STARTED' as const,
    elapsedTime: 0,
    is24hFormat: true,
    onMainButtonClick: jest.fn(),
    formatDuration: mockFormatDuration,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders current time correctly in 24h format', () => {
    render(<TimeCard {...defaultProps} />)
    
    expect(screen.getByText(/15:30:00/)).toBeInTheDocument()
  })

  it('renders current time correctly in 12h format', () => {
    render(<TimeCard {...defaultProps} is24hFormat={false} />)
    
    expect(screen.getByText(/03:30:00 PM/i)).toBeInTheDocument()
  })

  it('shows correct button text for NOT_STARTED status', () => {
    render(<TimeCard {...defaultProps} workdayStatus="NOT_STARTED" />)
    
    expect(screen.getByText('Registrar')).toBeInTheDocument()
    expect(screen.getByText('Entrada')).toBeInTheDocument()
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('shows correct button text for WORKING_BEFORE_BREAK status', () => {
    render(<TimeCard {...defaultProps} workdayStatus="WORKING_BEFORE_BREAK" />)
    
    expect(screen.getByText('Sair para')).toBeInTheDocument()
    expect(screen.getByText('Intervalo')).toBeInTheDocument()
  })

  it('shows correct button text for ON_BREAK status', () => {
    render(<TimeCard {...defaultProps} workdayStatus="ON_BREAK" />)
    
    expect(screen.getByText('Retornar do')).toBeInTheDocument()
    expect(screen.getByText('Intervalo')).toBeInTheDocument()
  })

  it('shows correct button text for WORKING_AFTER_BREAK status', () => {
    render(<TimeCard {...defaultProps} workdayStatus="WORKING_AFTER_BREAK" />)
    
    expect(screen.getByText('Registrar')).toBeInTheDocument()
    expect(screen.getByText('Saída')).toBeInTheDocument()
  })

  it('shows correct button text for FINISHED status and disables button', () => {
    render(<TimeCard {...defaultProps} workdayStatus="FINISHED" />)
    
    expect(screen.getByText('Expediente')).toBeInTheDocument()
    expect(screen.getByText('Encerrado')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('displays elapsed time when working', () => {
    const elapsedTime = 3600000 // 1 hour in milliseconds
    
    render(
      <TimeCard 
        {...defaultProps} 
        workdayStatus="WORKING_BEFORE_BREAK" 
        elapsedTime={elapsedTime}
      />
    )
    
    expect(screen.getByText('01h00m')).toBeInTheDocument()
  })

  it('does not display elapsed time when not working', () => {
    render(<TimeCard {...defaultProps} workdayStatus="NOT_STARTED" />)
    
    expect(screen.queryByText(/h\d{2}m/)).not.toBeInTheDocument()
  })

  it('calls onMainButtonClick when button is clicked', () => {
    const mockClick = jest.fn()
    
    render(<TimeCard {...defaultProps} onMainButtonClick={mockClick} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onMainButtonClick when button is disabled', () => {
    const mockClick = jest.fn()
    
    render(
      <TimeCard 
        {...defaultProps} 
        workdayStatus="FINISHED" 
        onMainButtonClick={mockClick} 
      />
    )
    
    fireEvent.click(screen.getByRole('button'))
    expect(mockClick).not.toHaveBeenCalled()
  })
})