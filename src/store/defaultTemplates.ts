import { Template } from "./useStore";

export const defaultTemplates: Template[] = [
  {
    id: "tpl_1",
    name: "Professional Job Application ⭐ (Default)",
    subject: "Application for {{jobTitle}} Role at {{company}}",
    body: `Hi {{firstName}},

I hope you're doing well.

I recently came across the opportunity at {{company}} and was excited to learn more about your team. With experience in {{skills}} and a strong interest in building impactful products, I believe I can contribute effectively to your organization.

I've attached my resume for your review. I would be grateful for the opportunity to discuss how my skills and enthusiasm align with your team's goals.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
{{senderName}}`
  },
  {
    id: "tpl_2",
    name: "Recruiter Outreach",
    subject: "Interested in Opportunities at {{company}}",
    body: `Hi {{firstName}},

I hope you're having a great day.

I wanted to reach out to express my interest in opportunities at {{company}}. I am passionate about software development and enjoy building modern, scalable applications using technologies like {{skills}}.

If there are any suitable openings, I'd be grateful if you could consider my profile. I've attached my resume for your reference.

Thank you for your time, and I hope to connect with you soon.

Best,
{{senderName}}`
  },
  {
    id: "tpl_3",
    name: "Founder Outreach",
    subject: "Excited to Contribute to {{company}}",
    body: `Hi {{firstName}},

I've been following {{company}} and really admire the work your team is doing.

I'm a passionate developer who enjoys solving real-world problems and building products that users love. I'd love the opportunity to contribute to your mission and learn from your team.

I've attached my resume and would appreciate any opportunity to discuss how I could add value.

Looking forward to hearing from you.

Regards,
{{senderName}}`
  },
  {
    id: "tpl_4",
    name: "Startup Application",
    subject: "Application for Software Developer Role",
    body: `Hi {{firstName}},

I recently discovered {{company}} and was impressed by your vision and the problems you're solving.

I enjoy working in fast-paced environments where I can learn quickly, take ownership, and contribute across different areas. I believe my experience with {{skills}} would allow me to contribute effectively.

I've attached my resume and would love the opportunity to connect.

Thank you for your consideration.

Best,
{{senderName}}`
  },
  {
    id: "tpl_5",
    name: "Internship Application",
    subject: "Application for Internship Opportunity",
    body: `Hi {{firstName}},

I hope you're doing well.

I'm currently looking for internship opportunities where I can apply my technical skills while continuing to learn from experienced professionals.

I'm particularly interested in {{company}} because of your innovative work and engineering culture.

I've attached my resume and would be grateful if you could consider my application.

Thank you for your time.

Best regards,
{{senderName}}`
  },
  {
    id: "tpl_6",
    name: "Referral Request",
    subject: "Request for Referral – {{jobTitle}}",
    body: `Hi {{firstName}},

I hope you're doing well.

I recently came across an opening for {{jobTitle}} at {{company}} and wanted to reach out. I believe my background in {{skills}} aligns well with the role.

If you feel my profile is a good fit, I'd truly appreciate your referral. I've attached my resume for your convenience.

Thank you for considering my request.

Best regards,
{{senderName}}`
  },
  {
    id: "tpl_7",
    name: "Cold Email (No Job Posted)",
    subject: "Interested in Joining {{company}}",
    body: `Hi {{firstName}},

I hope this message finds you well.

Although I didn't see any current openings, I wanted to introduce myself because I'm genuinely interested in the work being done at {{company}}.

I'm a software developer with experience in {{skills}} and a passion for creating meaningful products. If any opportunities arise, I'd be grateful if you could keep my profile in mind.

I've attached my resume for your reference.

Thank you for your time.

Regards,
{{senderName}}`
  },
  {
    id: "tpl_8",
    name: "Frontend Developer Application",
    subject: "Frontend Developer Application",
    body: `Hi {{firstName}},

I'm writing to express my interest in frontend development opportunities at {{company}}.

I enjoy building responsive, accessible, and user-friendly web applications using technologies like React, TypeScript, Tailwind CSS, and modern frontend tools.

I've attached my resume and portfolio for your review. I'd be excited to contribute to your engineering team.

Thank you for your time and consideration.

Best regards,
{{senderName}}`
  },
  {
    id: "tpl_9",
    name: "Full Stack Developer Application",
    subject: "Application for Full Stack Developer Role",
    body: `Hi {{firstName}},

I hope you're doing well.

I'm interested in opportunities at {{company}} as a Full Stack Developer. I enjoy building complete web applications—from intuitive user interfaces to scalable backend systems.

My experience includes {{skills}}, and I'm always eager to learn new technologies and solve challenging problems.

I've attached my resume and would appreciate the opportunity to discuss how I can contribute to your team.

Thank you.

Best,
{{senderName}}`
  },
  {
    id: "tpl_10",
    name: "AI-Assisted Smart Template ⭐",
    subject: "{{AI_GENERATED_SUBJECT}}",
    body: `Hi {{firstName}},

I recently came across {{company}} and was genuinely impressed by your work in {{industry}}.

As a {{currentRole}} with experience in {{skills}}, I enjoy solving challenging engineering problems and building products that create real value for users.

I'd be excited to contribute my skills and continue learning alongside your team. I've attached my resume for your review, and I'd be grateful for the opportunity to discuss how I can contribute to {{company}}.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
{{senderName}}`
  }
];
