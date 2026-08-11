/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import type { Context } from '@neabyte/deserve'
import * as Services from '@app/server/services/index.ts'
import Utils from '@app/server/Utils.ts'

export async function GET(ctx: Context) {
  const code = Utils.queryString(ctx.get.query('code'))?.trim() ?? ''
  if (code === '') {
    return ctx.send.json({ error: 'Param code wajib diisi' }, { status: 400 })
  }
  const dateInt = Services.CronDate.todayDateInt()
  const result = await Services.Explain.forCode(code, dateInt)
  return ctx.send.json(result)
}
