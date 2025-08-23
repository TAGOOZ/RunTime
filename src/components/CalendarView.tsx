import React from 'react';
import { formatTime } from '../lib/utils';

interface CalendarDay {
  date: string;
  sessions: number;
  runTime: number;
  walkTime: number;
}

interface CalendarViewProps {
  days: CalendarDay[];
  onDayClick?: (date: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ days, onDayClick }) => {
  // Build a map for quick lookup
  const dayMap = Object.fromEntries(days.map(day => [day.date, day]));

  // Get current month and year
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Find first day of month and how many days in month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  // Build calendar grid
  const calendar: (CalendarDay | null)[] = [];
  for (let i = 0; i < startWeekday; i++) calendar.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(year, month, d).toLocaleDateString();
    calendar.push(dayMap[dateStr] || { date: dateStr, sessions: 0, runTime: 0, walkTime: 0 });
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-7 gap-2 text-center text-gray-400 mb-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {calendar.map((day, idx) => day ? (
          <div
            key={day.date}
            className={`rounded-lg p-2 cursor-pointer ${day.sessions > 0 ? 'bg-yellow-400 text-black font-bold' : 'bg-gray-700 text-gray-300'}`}
            onClick={() => onDayClick?.(day.date)}
          >
            <div className="text-lg">{new Date(day.date).getDate()}</div>
            <div className="text-xs mt-1">
              {day.sessions > 0 ? (
                <>
                  {day.sessions}x<br/>
                  Run: {formatTime(day.runTime)}<br/>
                  Walk: {formatTime(day.walkTime)}
                </>
              ) : (
                <span className="italic text-gray-400">rest</span>
              )}
            </div>
          </div>
        ) : <div key={idx}></div>)}
      </div>
    </div>
  );
};
