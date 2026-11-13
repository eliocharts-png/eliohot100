
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (
      typeof id !== 'string' ||
      !/^(hot100|albums|artists)-[\w/-]+$/.test(id)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 },
      );
    }

    const scriptUrl = process.env.ARTICLE_TIMESTAMP_SCRIPT_URL;
    const secret = process.env.ARTICLE_TIMESTAMP_SECRET;

    if (!scriptUrl || !secret) {
      return NextResponse.json(
        { success: false, error: 'Timestamp configuration is missing' },
        { status: 500 },
      );
    }

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'getOrCreate',
        id,
        secret,
      }),
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Apps Script returned HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.timestamp) {
      throw new Error(result.error || 'Unable to retrieve timestamp');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Article timestamp API error:', error);

    return NextResponse.json(
      { success: false, error: 'Unable to retrieve article timestamp' },
      { status: 500 },
    );
  }
}
