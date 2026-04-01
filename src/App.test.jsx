import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders title and keeps generate button disabled before uploading image', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '拼豆图生成器' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '生成图案' })).toBeDisabled()
  })

  it('shows custom width and height inputs when custom size is selected', () => {
    render(<App />)

    const sizeSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(sizeSelect, { target: { value: 'custom' } })

    expect(screen.getByPlaceholderText('宽')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('高')).toBeInTheDocument()
  })
})
