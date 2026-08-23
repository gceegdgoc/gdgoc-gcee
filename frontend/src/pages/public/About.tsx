import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Code2,
  Coffee,
  Compass,
  Cpu,
  Eye,
  GitBranch,
  Globe,
  GraduationCap,
  HeartHandshake,
  Layers,
  Lightbulb,
  Microscope,
  PenTool,
  Rocket,
  ShieldCheck,
  Smartphone,
  Target,
  Terminal,
  Users,
  Cloud,
  Sparkles,
  Trophy,
  Handshake,
  Lightbulb as Bulb,
} from 'lucide-react';
import { Reveal } from '../../components/ui/Reveal';
import { SectionHeading } from '../../components/ui/SectionHeading';

const values = [
  { icon: HeartHandshake, title: 'Community First', desc: 'We grow together — no one is left behind.' },
  { icon: Sparkles, title: 'Curiosity & Learning', desc: 'We stay curious and keep learning every day.' },
  { icon: Handshake, title: 'Open Collaboration', desc: 'We share knowledge, code and ideas openly.' },
  { icon: ShieldCheck, title: 'Integrity', desc: 'We build ethically and credit everyone fairly.' },
];

const activities = [
  { icon: GraduationCap, title: 'Workshops', desc: 'Structured hands-on workshops on modern technologies and tools.' },
  { icon: Trophy, title: 'Hackathons', desc: 'High-energy build sprints where ideas become working prototypes.' },
  { icon: Microscope, title: 'Technical Talks', desc: 'Sessions by faculty, alumni and industry developers on trending topics.' },
  { icon: PenTool, title: 'Coding Sessions', desc: 'Practice-focused sessions to sharpen problem-solving and DSA skills.' },
  { icon: Layers, title: 'Project Building', desc: 'Collaborative projects that turn concepts into portfolio-ready work.' },
  { icon: GitBranch, title: 'Open Source', desc: 'Contributions to open source with guidance on Git, PRs and review culture.' },
  { icon: Cpu, title: 'AI / ML', desc: 'Explorations of machine learning, generative AI and real-world applications.' },
  { icon: Cloud, title: 'Cloud', desc: 'Hands-on with cloud platforms, containers and deployment pipelines.' },
  { icon: Code2, title: 'Web Development', desc: 'Frontend, backend and full-stack development with modern frameworks.' },
  { icon: Terminal, title: 'Developer Tools', desc: 'Git, GitHub, CI/CD, testing and the tooling real developers rely on.' },
];

const benefits = [
  { icon: Users, title: 'Network', desc: 'Connections with students, faculty and industry mentors.' },
  { icon: Rocket, title: 'Portfolio', desc: 'Real projects that showcase your skills to recruiters.' },
  { icon: Globe, title: 'Community', desc: 'A supportive environment to experiment and grow.' },
];

export default function About() {
  return (
    <>
      {/* Page header */}
      <section className="relative overflow-hidden bg-navy-950 pt-32 pb-20 text-center sm:pt-40">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-g-blue/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-g-green/15 blur-3xl" />
        </div>
        <div className="container-x relative z-10">
          <span className="chip border border-white/15 bg-white/5 text-white/80">About Us</span>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            The developer community of{' '}
            <span className="bg-gradient-to-r from-g-blue via-g-green to-g-yellow bg-clip-text text-transparent">
              GCEE, Erode
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/70">
            Google Developer Groups on Campus — a student-run community empowering peers with practical developer skills.
          </p>
        </div>
        <div className="relative z-10 mt-10 flex h-1.5">
          <div className="flex-1 bg-g-blue" />
          <div className="flex-1 bg-g-green" />
          <div className="flex-1 bg-g-yellow" />
          <div className="flex-1 bg-g-red" />
        </div>
      </section>

      {/* Who we are */}
      <section className="bg-white py-20">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <SectionHeading align="left" eyebrow="Who we are" title="Students building students" />
            <p className="text-base leading-relaxed text-ink-muted">
              GDGoC on Campus at Government College of Engineering, Erode is a community of students passionate about
              technology. We organize workshops, hackathons, technical talks and hands-on sessions — all run by
              students, for students.
            </p>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              Whether you are a beginner writing your first line of code or a builder shipping your latest project,
              there is a place for you here.
            </p>
            <Link to="/team" className="btn-primary mt-8">
              Meet our team
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Target, title: 'Our Mission', desc: 'Create a thriving ecosystem where every GCEE student can learn modern development skills, collaborate on projects and grow professionally.', color: 'bg-g-blue/10 text-g-blue' },
                { icon: Eye, title: 'Our Vision', desc: 'A campus where every student developer is empowered to build, innovate and contribute to the wider tech community.', color: 'bg-g-green/10 text-g-green' },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="card p-6 sm:col-span-1">
                  <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-navy-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* What we do */}
      <section className="bg-slate-50 py-20">
        <div className="container-x">
          <Reveal>
            <SectionHeading
              eyebrow="What we do"
              title="From workshops to hackathons"
              subtitle="A calendar full of hands-on learning experiences throughout the academic year."
            />
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activities.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 60}>
                <div className="card group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-g-blue to-g-green text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-base font-bold text-navy-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Community values */}
      <section className="bg-white py-20">
        <div className="container-x">
          <Reveal>
            <SectionHeading
              eyebrow="Community values"
              title="The principles we stand by"
              subtitle="These values shape how we run every event and every interaction."
            />
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 70}>
                <div className="card h-full p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-base font-bold text-navy-900">{title}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Student benefits */}
      <section className="bg-slate-50 py-20">
        <div className="container-x">
          <Reveal>
            <SectionHeading
              eyebrow="For students"
              title="Benefits of being a member"
              subtitle="Everything you gain by being an active part of GDGoC GCEE."
            />
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 70}>
                <div className="card flex h-full items-start gap-4 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-g-yellow/15 text-yellow-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-navy-900">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-12 rounded-3xl bg-navy-950 p-8 text-center sm:p-12">
              <Compass className="mx-auto mb-4 h-10 w-10 text-g-yellow" />
              <h3 className="font-display text-2xl font-bold text-white">Start your journey today</h3>
              <p className="mx-auto mt-3 max-w-lg text-sm text-white/70">
                Registration is open to all GCEE students. Pick your area, join the community and start building.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/join" className="btn-primary !px-6 !py-3">
                  Join Community
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/events" className="btn !px-6 !py-3 border border-white/20 bg-white/5 text-white hover:bg-white/10">
                  Explore Events
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
