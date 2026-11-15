import Link from "next/link";
import HomeNav from "@/components/home/HomeNav";
import AuthLinkForwarder from "@/components/home/AuthLinkForwarder";

export default function Home() {
  return (
    <div className="lp">
      <AuthLinkForwarder />
      <HomeNav />

      <main>
        <section className="lp-hero">
          <div className="lp-container lp-hero-grid">
            <div>
              <p className="lp-eyebrow">AI-assisted task &amp; schedule manager</p>
              <h1>Plan your day once. <span className="lp-grad">Let Skiddio fix it when it slips.</span></h1>
              <p className="lp-lead">
                Skiddio keeps your tasks and calendar in one place, and automatically moves overdue tasks into your
                next free slot, so one missed deadline doesn&apos;t wreck the rest of your day.
              </p>
              <div className="lp-cta-row">
                <Link href="/dashboard" className="lp-btn lp-btn-primary">Open Skiddio</Link>
                <a href="#how" className="lp-btn lp-btn-ghost">See how it works</a>
              </div>
              <p className="lp-note">Runs in your browser. Works on phone and desktop.</p>
            </div>

            <div className="card lp-preview" aria-hidden="true">
              <div className="lp-preview-top">
                <strong>Today&apos;s Tasks</strong>
                <span className="lp-chip">Rescheduler</span>
              </div>
              <ul className="task-list">
                <li className="task-item">
                  <div>
                    <strong className="lp-done">Read Chapter 5</strong>
                    <div className="task-meta">09:00 - 10:00</div>
                  </div>
                  <input type="checkbox" checked readOnly disabled />
                </li>
                <li className="task-item">
                  <div>
                    <strong>Group project call</strong>
                    <div className="task-meta">11:00 - 12:00</div>
                  </div>
                  <input type="checkbox" readOnly disabled />
                </li>
                <li className="task-item rescheduled">
                  <div>
                    <strong>Submit lab report</strong>
                    <div className="task-meta">14:15 - 15:15 | <em>Auto-shifted to first available slot at 14:15</em></div>
                  </div>
                  <input type="checkbox" readOnly disabled />
                </li>
              </ul>
              <div className="ai-notice-box">
                <strong>Suggestion:</strong>
                <p>Auto-rescheduled 1 overdue task(s) into available slots.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="results" className="lp-section lp-section-alt">
          <div className="lp-container">
            <h2 className="lp-h2">Built from what students told us</h2>
            <p className="lp-sub">Before writing any code, we asked 15 students how they plan their time.</p>
            <dl className="lp-stats">
              <div className="lp-stat"><dt>73%</dt><dd>manage 4 or more hours of class or work every single day</dd></div>
              <div className="lp-stat"><dt>67%</dt><dd>say switching apps or schedule clashes is their biggest frustration</dd></div>
              <div className="lp-stat"><dt>60%</dt><dd>rated AI-suggested time slots a perfect 5 out of 5</dd></div>
              <div className="lp-stat"><dt>100%</dt><dd>would try Skiddio (67% definitely, 33% maybe)</dd></div>
            </dl>
            <p className="lp-footnote">Source: Skiddio pre-development survey, 15 student respondents.</p>
          </div>
        </section>

        <section id="features" className="lp-section">
          <div className="lp-container">
            <h2 className="lp-h2">Everything in one place</h2>
            <p className="lp-sub">Less app-switching, less manual re-planning.</p>
            <div className="lp-features">
              <article className="card lp-feature">
                <span className="lp-icon" aria-hidden="true">📋</span>
                <h3>Checklist first</h3>
                <p>A simple to-do list is the default view, because it&apos;s what most students told us they want. Add a task with a date, start and end time and you&apos;re done.</p>
              </article>
              <article className="card lp-feature">
                <span className="lp-icon" aria-hidden="true">✨</span>
                <h3>One-tap Rescheduler</h3>
                <p>When the day slips, press Rescheduler. Skiddio finds overdue tasks and moves each one into the next free slot that fits, keeping a buffer between tasks.</p>
              </article>
              <article className="card lp-feature">
                <span className="lp-icon" aria-hidden="true">📅</span>
                <h3>Drag-and-drop calendar</h3>
                <p>See your plan by month, week or day. Drag a schedule to a new time, and if it lands on another one, choose whether to swap them or replace the old one.</p>
              </article>
              <article className="card lp-feature">
                <span className="lp-icon" aria-hidden="true">📝</span>
                <h3>Notes with drawing</h3>
                <p>Keep notes next to your schedule: pick a background colour, write, or sketch right on the canvas. Everything is saved to your account, with dark mode and a phone-friendly layout built in.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="how" className="lp-section lp-section-alt">
          <div className="lp-container">
            <h2 className="lp-h2">How it works</h2>
            <p className="lp-sub">Three steps to a calmer day.</p>
            <ol className="lp-steps">
              <li className="card lp-step">
                <span className="lp-step-num" aria-hidden="true">1</span>
                <h3>Create your account</h3>
                <p>Sign up with your email, then set your working hours and the buffer you want between tasks.</p>
              </li>
              <li className="card lp-step">
                <span className="lp-step-num" aria-hidden="true">2</span>
                <h3>Add your tasks</h3>
                <p>Give each task a date, start and end time. It appears in your checklist and on your calendar straight away.</p>
              </li>
              <li className="card lp-step">
                <span className="lp-step-num" aria-hidden="true">3</span>
                <h3>Fix slips in one tap</h3>
                <p>Press Rescheduler and moved tasks are highlighted with their new time, or drag things around the calendar yourself.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-banner">
              <h2>Ready for a calmer schedule?</h2>
              <p>Add your first task and see Skiddio rebuild your day in seconds.</p>
              <Link href="/dashboard" className="lp-btn lp-btn-light">Open Skiddio</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <span><strong>Skiddio</strong> · AI-assisted task &amp; schedule manager</span>
          <nav aria-label="Footer">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <Link href="/dashboard">Open app</Link>
          </nav>
          <span>© {new Date().getFullYear()} Skiddio</span>
        </div>
      </footer>
    </div>
  );
}
