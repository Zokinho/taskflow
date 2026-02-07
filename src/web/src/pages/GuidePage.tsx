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
        A quick reference for Telegram bot commands, calendar setup, and general tips.
      </p>

      <Section title="Task Commands">
        <CommandTable
          commands={[
            { cmd: 'task [title]', desc: 'Create a new task (add time like "tomorrow 30m" for scheduling)' },
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
            { cmd: 'today', desc: "Show today's full schedule" },
            { cmd: 'tomorrow', desc: "Show tomorrow's schedule" },
            { cmd: 'week', desc: 'Overview of the upcoming week' },
            { cmd: 'free', desc: 'Find available time slots today' },
            { cmd: 'monday .. sunday', desc: 'Show schedule for a specific day' },
          ]}
        />
      </Section>

      <Section title="People Commands">
        <CommandTable
          commands={[
            { cmd: 'person add [name]', desc: 'Add a new contact' },
            { cmd: 'person [name]', desc: 'Look up a contact by name' },
            { cmd: 'contacted [name]', desc: 'Mark a person as recently contacted' },
            { cmd: 'birthdays', desc: 'List upcoming birthdays' },
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
            <h4 className="font-medium text-gray-800 mb-1">Syncing</h4>
            <p>
              After connecting, use the <span className="font-medium">Sync</span> button on any
              calendar card to pull the latest events. The first sync fetches 30 days
              back and 90 days forward. Subsequent syncs are incremental (only changes).
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
            <li><span className="font-medium">Birthday reminders</span> &mdash; 7 days before each contact's birthday</li>
            <li><span className="font-medium">Follow-up nudges</span> &mdash; when you haven't contacted someone within their follow-up window</li>
            <li><span className="font-medium">Morning briefing</span> &mdash; daily at 6:00 AM with your day's schedule</li>
            <li><span className="font-medium">Evening review</span> &mdash; daily at 8:00 PM with a summary</li>
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
    </div>
  );
}
