import { describe, it, expect } from 'vitest'
import {
  isSafeHttpUrl,
  isSafeUrl,
  isApprovedManager,
  generateMessCode,
} from '../utils'
import { generateSafeFileName } from '../fileValidator'
import { sanitizeAppError } from '../errorHandler'
import {
  expenseSchema,
  fixedCostSchema,
  createMessSchema,
  profileUpdateSchema,
  validateForm,
} from '../validation/schemas'

describe('Security Hardening Helpers', () => {
  describe('URL & XSS Validation', () => {
    it('allows https and http URLs in isSafeHttpUrl', () => {
      expect(isSafeHttpUrl('https://aaszanlxspgouomjpruz.supabase.co/storage/v1/object/public/receipts/a.jpg')).toBe(true)
      expect(isSafeHttpUrl('http://localhost:5173/test.png')).toBe(true)
    })

    it('rejects javascript:, data:, vbscript:, blob:, and protocol-relative URLs', () => {
      const malicious = [
        'javascript:alert(1)',
        '  JaVaScRiPt:alert(document.domain)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'blob:https://www.nexmess.shop/uuid',
        '//evil.com/phish',
        '/dashboard',
        '',
      ]
      for (const uri of malicious) {
        expect(isSafeHttpUrl(uri)).toBe(false)
      }
      expect(isSafeUrl('//evil.com/phish')).toBe(false)
      expect(isSafeUrl('blob:https://www.nexmess.shop/uuid')).toBe(false)
      expect(isSafeUrl('javascript:alert(1)')).toBe(false)
      expect(isSafeUrl('/dashboard')).toBe(true)
    })
  })

  describe('Role Checks & Generators', () => {
    it('isApprovedManager requires status === approved AND role === manager', () => {
      const members = [
        { user_id: 'u-left-mgr', role: 'manager', status: 'left' },
        { user_id: 'u-pending-mgr', role: 'manager', status: 'pending' },
        { user_id: 'u-approved-mem', role: 'member', status: 'approved' },
        { user_id: 'u-approved-mgr', role: 'manager', status: 'approved' },
      ]
      expect(isApprovedManager(members, 'u-left-mgr')).toBe(false)
      expect(isApprovedManager(members, 'u-pending-mgr')).toBe(false)
      expect(isApprovedManager(members, 'u-approved-mem')).toBe(false)
      expect(isApprovedManager(members, 'u-approved-mgr')).toBe(true)
      expect(isApprovedManager(members, null)).toBe(false)
    })

    it('generates valid NEX-prefixed codes and sanitized filenames', () => {
      const code = generateMessCode()
      expect(code).toMatch(/^NEX-[A-Z0-9]{6}$/)
      const fname = generateSafeFileName('../receipt!', 'jpg')
      expect(fname).toMatch(/^receipt-\d+-[a-zA-Z0-9]+\.jpg$/)
    })
  })

  describe('Error Sanitization & Schema Parity', () => {
    it('strips raw PostgreSQL / Supabase internal messages', () => {
      const fallback = 'Operation failed'
      expect(
        sanitizeAppError(
          { code: '42501', message: 'new row violates row-level security policy for table "expenses"' },
          fallback
        )
      ).toBe('You do not have permission to perform this action.')

      expect(
        sanitizeAppError(
          { message: 'PostgREST pgrst schema cache relation "secret_tbl" invalid' },
          fallback
        )
      ).toBe(fallback)
    })

    it('accepts utilities expense category and birth_certificate verification doc type', () => {
      const expRes = validateForm(expenseSchema, {
        amount: 450,
        category: 'utilities',
        description: 'Electricity bill',
      })
      expect(expRes.success).toBe(true)

      const profRes = validateForm(profileUpdateSchema, {
        username: 'Test Member',
        verificationDocType: 'birth_certificate',
        verificationDocNo: '199912345678',
      })
      expect(profRes.success).toBe(true)
    })

    it('accepts all fixed cost categories including electricity, water, and waste while rejecting invalid ones', () => {
      for (const category of ['rent', 'utilities', 'electricity', 'water', 'gas', 'internet', 'maid', 'waste', 'other']) {
        expect(validateForm(fixedCostSchema, { category, amount: 500, label: 'April' }).success).toBe(
          true
        )
      }
      expect(validateForm(fixedCostSchema, { category: 'bazaar', amount: 500 }).success).toBe(false)
      expect(validateForm(fixedCostSchema, { category: 'waste', amount: -10 }).success).toBe(false)
    })

    it('accepts optional mess location on createMessSchema while rejecting 1-char values', () => {
      expect(validateForm(createMessSchema, { name: 'Sunrise Mess' }).success).toBe(true)
      expect(
        validateForm(createMessSchema, { name: 'Sunrise Mess', location: 'Dhanmondi, Dhaka' }).success
      ).toBe(true)
      expect(
        validateForm(createMessSchema, { name: 'Sunrise Mess', location: 'A' }).success
      ).toBe(false)
    })
  })
})
