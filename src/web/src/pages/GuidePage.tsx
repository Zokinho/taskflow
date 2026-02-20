import { Card } from '@/components/ui/Card';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-primary-700 mb-3">{title}</h2>
      <Card>{children}</Card>
    </section>
  );
}

function CommandTable({ commands }: { commands: { cmd: string; desc: string }[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {commands.map((c) => (
          <tr key={c.cmd} className="border-b border-gray-50 last:border-0">
            <td className="py-1.5 pr-4 font-mono text-primary-600 whitespace-nowrap">{c.cmd}</td>
            <td className="py-1.5 text-gray-600">{c.desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function GuidePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-sm text-gray-500">
        A quick reference for the dashboard, Telegram bot commands, calendar setup, and general tips.
      </p>

      <Section title="Dashboard">
        <div className="text-sm text-gray-600 space-y-3">
          <div>
            <h4 className="font-medium text-gray-800 mb-1">Calendar Widget</h4>
            <p>
              The calendar shows your events from all connected calendars alongside
              your <span className="font-medium">tasks</span>. Tasks appear in the
              <span className="text-indigo-600 font-medium"> indigo sticky row</span> at
              the top of each day (week/day views), separate from timed events below.
              Completed tasks show with strikethrough and reduced opacity.
            </p>
            <p className="mt-1">
              <span className="font-medium">Hover</span> over a task in the calendar to reveal
              inline action icons: <span className="font-medium">checkmark</span> (mark done),
              <span className="font-medium"> arrow</span> (defer to tomorrow),
              and <span className="font-medium">X</span> (delete). Click a task to open a
              detail modal with full editing options.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-1">Upcoming Tasks</h4>
            <p>
              The Upcoming Tasks section shows your next 5 tasks by due date. Each
              task has inline action buttons to <span className="font-medium">complete</span>,
              <span className="font-medium"> defer to tomorrow</span>, or
              <span className="font-medium"> delete</span> it directly without opening
              the Tasks page.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-1">Auto-Defer</h4>
            <p>
              Overdue scheduled tasks are automatically deferred to the next day by a
              nightly background job (runs at 00:15). This keeps your calendar current
              without manual intervention. The auto-defer respects each user's timezone.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Task Commands">
        <CommandTable
          commands={[
            { cmd: 'task [title]', desc: 'Create a new task (add time like "tomorrow 30m" for scheduling)' },
            { cmd: 'tasks', desc: 'List all open tasks' },
            { cmd: 'done [id]', desc: 'Mark a task as completed' },
            { cmd: 'defer [id] [when]', desc: 'Reschedule a task (e.g. "defer 3 friday")' },
            { cmd: 'delete [id]', desc: 'Remove a task permanently' },
            { cmd: 'note [id] [text]', desc: 'Add a note to a task' },
          ]}
        />
      </Section>

      <Section title="Schedule Commands">
        <CommandTable
          commands={[
            { cmd: 'today', desc: "Show today's full schedule (events + tasks)" },
            { cmd: 'tomorrow', desc: "Show tomorrow's schedule" },
            { cmd: 'week', desc: 'Overview of the upcoming week' },
            { cmd: 'free', desc: 'Find available time slots today (8:00\u201318:00)' },
            { cmd: 'monday .. sunday', desc: 'Show schedule for a specific day' },
          ]}
        />
        <p className="text-xs text-gray-400 mt-2">
          All schedule commands use your configured timezone.
        </p>
      </Section>

      <Section title="People Commands">
        <CommandTable
          commands={[
            { cmd: 'person add [name]', desc: 'Add a new contact' },
            { cmd: 'person [name]', desc: 'Look up a contact by name' },
            { cmd: 'contacted [name]', desc: 'Mark a person as recently contacted' },
            { cmd: 'birthdays', desc: 'List upcoming birthdays (next 30 days)' },
            { cmd: 'followups', desc: 'People due for a follow-up' },
          ]}
        />
      </Section>

      <Section title="Kids Commands">
        <CommandTable
          commands={[
            { cmd: 'kids', desc: "All kids' appointments this week" },
            { cmd: 'kid add [name]', desc: 'Add a kid to track appointments for' },
            { cmd: '[kidname] today', desc: "Show a specific kid's schedule for today" },
            { cmd: '[kidname] tomorrow', desc: "Show a specific kid's schedule for tomorrow" },
            { cmd: '[kidname] week', desc: "Show a specific kid's weekly schedule" },
          ]}
        />
      </Section>

      <Section title="Voice Messages">
        <p className="text-sm text-gray-600">
          Send any voice message to the Telegram bot and it will be transcribed using
          OpenAI Whisper, then parsed as a regular command. Just speak naturally &mdash;
          for example, say <span className="font-mono text-primary-600">"task buy groceries tomorrow"</span> and
          it will create the task for you.
        </p>
      </Section>

      <Section title="Connecting Calendars">
        <div className="text-sm text-gray-600 space-y-3">
          <div>
            <h4 className="font-medium text-gray-800 mb-1">Google Calendar</h4>
            <p>
              Go to <span className="font-medium">Calendars</span> and click
              <span className="font-medium"> Connect Google</span>. You'll be redirected to Google to
              grant read-only access. After authorizing, the initial sync runs automatically.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-1">Microsoft / Exchange</h4>
            <p>
              Click <span className="font-medium">Connect Microsoft</span> on the Calendars page.
              This works for both personal Microsoft accounts and
              Exchange Online (Office 365) accounts. Events sync via Microsoft Graph.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-1">Proton Calendar</h4>
            <p>
              Proton Calendar doesn't offer an API, so TaskFlow syncs via ICS feed (read-only).
              To set it up:
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1 mt-1">
              <li>In Proton Calendar, go to <span className="font-medium">Settings &rarr; Calendars</span>.</li>
              <li>Select the calendar you want to share and click <span className="font-medium">Share via link</span>.</li>
              <li>Create a link and copy the <span className="font-medium">ICS URL</span> (ends in <span className="font-mono text-primary-600">.ics</span>).</li>
              <li>In TaskFlow, click <span className="font-medium">Add Calendar</span>, select <span className="font-medium">Proton ICS</span>, and paste the URL.</li>
              <li>Hit <span className="font-medium">Sync</span> to pull events. Re-sync anytime to get updates.</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-1">Auto-Sync</h4>
            <p>
              All connected calendars sync automatically every <span className="font-medium">15 minutes</span> via
              a background job. You can also manually sync anytime using the
              <span className="font-medium"> Sync</span> button on any calendar card. The first sync
              fetches 30 days back and 90 days forward. Subsequent syncs are incremental
              (only changes since last sync).
            </p>
          </div>
        </div>
      </Section>

      <Section title="Telegram Linking">
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            To receive reminders (birthday alerts, follow-up nudges, morning briefings)
            via Telegram, link your account:
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li>Go to <span className="font-medium">Reminders</span> and click <span className="font-medium">Get Link Code</span>.</li>
            <li>Open the Telegram bot and send <span className="font-mono text-primary-600">/start [code]</span>.</li>
            <li>Your account is now linked and reminders will be delivered automatically.</li>
          </ol>
        </div>
      </Section>

      <Section title="Reminders">
        <div className="text-sm text-gray-600 space-y-2">
          <p>TaskFlow generates reminders automatically via background cron jobs:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><span className="font-medium">Birthday reminders</span> &mdash; 7 days before each contact's or kid's birthday</li>
            <li><span className="font-medium">Follow-up nudges</span> &mdash; when you haven't contacted someone within their follow-up window</li>
            <li><span className="font-medium">Morning briefing</span> &mdash; daily at 6:00 AM with your day's events, tasks, and birthdays</li>
            <li><span className="font-medium">Evening review</span> &mdash; daily at 8:00 PM with completed tasks, pending items, and tomorrow's preview</li>
          </ul>
          <p>
            Reminders are delivered every 5 minutes to linked Telegram accounts. You can also view
            and dismiss them from the Reminders page.
          </p>
        </div>
      </Section>

      <Section title="Kids Auto-Tagging">
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            When you add a kid, you can set <span className="font-medium">keywords</span> (e.g. their name,
            school name, activity names). During calendar sync, any event whose title
            contains one of these keywords will be automatically tagged to that kid.
          </p>
          <p>
            View a kid's tagged events from the <span className="font-medium">Kids</span> page by expanding
            their card.
          </p>
        </div>
      </Section>

      <Section title="Timezone">
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            All schedules, reminders, and auto-defer use your configured
            <span className="font-medium"> timezone</span> (set in your user profile). Each user
            can have a different timezone &mdash; the bot and all background jobs respect
            individual settings.
          </p>
          <p>
            Default timezone is UTC. You can update it from the web app or by setting
            the <span className="font-mono text-primary-600">timezone</span> field in your account
            preferences (e.g. <span className="font-mono text-primary-600">Europe/Amsterdam</span>).
          </p>
        </div>
      </Section>
    </div>
  );
}
