import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('access_token');
  const body = await req.json();

  if (!token) return NextResponse.json({ error: 'Missing access_token' }, { status: 401 });

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });

  const calendar = google.calendar({ version: 'v3', auth });

  const event = {
    summary: 'Auto-Scheduled Meeting',
    description: body.description,
    start: { dateTime: body.start, timeZone: 'Asia/Kolkata' },
    end: { dateTime: body.end, timeZone: 'Asia/Kolkata' },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  });

  return NextResponse.json(response.data);
}
