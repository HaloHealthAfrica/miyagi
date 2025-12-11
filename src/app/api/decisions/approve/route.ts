import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Two-man rule approvals for execution.
 *
 * Auth: set OPS_TOKEN and call with `Authorization: Bearer <OPS_TOKEN>`
 * Identity: pass `x-approver-id: alice` header (must be stable)
 */
export async function POST(request: NextRequest) {
  const opsToken = process.env.OPS_TOKEN
  if (opsToken) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${opsToken}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const approverId = request.headers.get('x-approver-id') || request.headers.get('x-approver')
  if (!approverId) {
    return NextResponse.json({ error: 'Missing x-approver-id header' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const decisionId = body.decisionId
    if (!decisionId) return NextResponse.json({ error: 'decisionId required' }, { status: 400 })

    // Optional allowlist
    const allowlist = (process.env.EXECUTION_APPROVER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean)
    if (allowlist.length > 0 && !allowlist.includes(approverId)) {
      return NextResponse.json({ error: 'Approver not allowed' }, { status: 403 })
    }

    await prisma.decisionApproval.create({
      data: { decisionId, approverId },
    })

    const approvals = await prisma.decisionApproval.findMany({
      where: { decisionId },
      orderBy: { createdAt: 'asc' },
    })

    const threshold = Number(process.env.EXECUTION_APPROVAL_THRESHOLD || 2)

    return NextResponse.json({
      success: true,
      decisionId,
      approvals: approvals.map((a) => ({ approverId: a.approverId, createdAt: a.createdAt })),
      threshold,
      approved: approvals.length >= threshold,
    })
  } catch (error: any) {
    // Unique violation = already approved by this approver
    if (error?.code === 'P2002') {
      return NextResponse.json({ success: true, duplicate: true }, { status: 200 })
    }
    console.error('approve error:', error)
    return NextResponse.json({ error: error.message || 'Failed to approve decision' }, { status: 500 })
  }
}


