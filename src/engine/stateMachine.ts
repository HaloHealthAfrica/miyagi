import { prisma } from '@/lib/prisma'
import { PositionState } from '@/types/decision'

export class PositionStateMachine {
  private symbol: string
  private currentState: PositionState = 'FLAT'

  constructor(symbol: string) {
    this.symbol = symbol
  }

  async initialize(): Promise<void> {
    // Load current position state from database
    const openPositions = await prisma.position.findMany({
      where: {
        symbol: this.symbol,
        status: 'OPEN',
      },
    })

    if (openPositions.length === 0) {
      this.currentState = 'FLAT'
      return
    }

    // Determine state from open positions
    const longPositions = openPositions.filter((p) => p.direction === 'LONG')
    const shortPositions = openPositions.filter((p) => p.direction === 'SHORT')

    if (longPositions.length > 0 && shortPositions.length === 0) {
      this.currentState = 'LONG'
    } else if (shortPositions.length > 0 && longPositions.length === 0) {
      this.currentState = 'SHORT'
    } else {
      // Mixed positions - could be FLAT net or handle differently
      this.currentState = 'FLAT'
    }
  }

  getState(): PositionState {
    return this.currentState
  }

  canOpenLong(): boolean {
    return this.currentState === 'FLAT'
  }

  canOpenShort(): boolean {
    return this.currentState === 'FLAT'
  }

  canAddLong(): boolean {
    return this.currentState === 'LONG'
  }

  canAddShort(): boolean {
    return this.currentState === 'SHORT'
  }

  async transitionToLong(): Promise<void> {
    if (!this.canOpenLong()) {
      throw new Error(`Cannot transition to LONG from ${this.currentState}`)
    }
    this.currentState = 'LONG'
  }

  async transitionToShort(): Promise<void> {
    if (!this.canOpenShort()) {
      throw new Error(`Cannot transition to SHORT from ${this.currentState}`)
    }
    this.currentState = 'SHORT'
  }

  async transitionToFlat(): Promise<void> {
    this.currentState = 'FLAT'
  }
}

