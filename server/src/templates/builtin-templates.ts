export const BUILTIN_TEMPLATES = [
  {
    id: "builtin_1",
    category: "Featured",
    name: "Professional Job Application",
    subject: "Application for {{jobTitle}} | {{senderName}}",
    body: "Hi {{firstName}},\n\nI hope you're doing well.\n\nI recently came across the {{jobTitle}} opportunity at {{company}} and was excited to learn more about your team.\n\nI am a passionate {{currentRole}} with experience in {{skills}} and enjoy building scalable, user-focused solutions. I believe my technical skills, curiosity, and willingness to learn would allow me to contribute effectively to your team.\n\nI've attached my resume for your review and would truly appreciate the opportunity to discuss how I can contribute to {{company}}.\n\nThank you for your time and consideration. I look forward to hearing from you.\n\nBest regards,\n{{senderName}}\n\nPortfolio: {{portfolio}}\nGitHub: {{github}}\nLinkedIn: {{linkedin}}"
  },
  {
    id: "builtin_10",
    category: "Featured",
    name: "AI Smart Personalized Template (Premium)",
    subject: "{{AI_GENERATED_SUBJECT}}",
    body: "Hi {{firstName}},\n\nI recently learned about {{company}} and was genuinely impressed by your work in {{industry}}.\n\nAs a {{currentRole}} with experience in {{skills}}, I enjoy solving real-world engineering challenges and building products that create meaningful impact.\n\nI'd love the opportunity to contribute to your team while continuing to learn and grow alongside talented engineers.\n\nI've attached my resume for your review and would appreciate the opportunity to discuss how I can contribute to {{company}}.\n\nThank you for your time and consideration.\n\nBest regards,\n{{senderName}}\n\nPortfolio: {{portfolio}}\nGitHub: {{github}}\nLinkedIn: {{linkedin}}"
  },
  {
    id: "builtin_3",
    category: "Recruiters",
    name: "Recruiter Outreach",
    subject: "Interested in Opportunities at {{company}}",
    body: "Hi {{firstName}},\n\nI hope you're having a great day.\n\nI'm reaching out to express my interest in opportunities at {{company}}.\n\nI enjoy building modern software using {{skills}} and am actively looking for roles where I can contribute while continuing to grow as an engineer.\n\nI've attached my resume for your reference and would appreciate any opportunity to connect.\n\nThank you for your time.\n\nRegards,\n{{senderName}}"
  },
  {
    id: "builtin_6",
    category: "Recruiters",
    name: "Referral Request",
    subject: "Referral Request for {{jobTitle}}",
    body: "Hi {{firstName}},\n\nI hope you're doing well.\n\nI recently came across the {{jobTitle}} opening at {{company}} and found it closely aligned with my experience and interests.\n\nIf you feel my profile is a good fit, I'd sincerely appreciate your referral.\n\nI've attached my resume for your convenience.\n\nThank you very much for your support.\n\nBest regards,\n{{senderName}}"
  },
  {
    id: "builtin_2",
    category: "Startups",
    name: "Startup Founder Outreach",
    subject: "Loved what {{company}} is building",
    body: "Hi {{firstName}},\n\nI've been following {{company}} and genuinely admire what you're building.\n\nStartups excite me because they provide opportunities to solve meaningful problems, learn quickly, and contribute beyond a single role.\n\nI'm a {{currentRole}} with experience in {{skills}} and I'd love the opportunity to contribute to your team.\n\nI've attached my resume and would be grateful if you'd consider my profile for any suitable opportunities.\n\nThank you for your time.\n\nBest,\n{{senderName}}"
  },
  {
    id: "builtin_5",
    category: "Startups",
    name: "Cold Outreach (No Open Position)",
    subject: "Interested in Future Opportunities at {{company}}",
    body: "Hi {{firstName}},\n\nI hope you're doing well.\n\nAlthough I couldn't find an open position matching my profile, I wanted to introduce myself because I'm genuinely interested in the work being done at {{company}}.\n\nI'm a {{currentRole}} with experience in {{skills}} and would love to be considered if any suitable opportunities arise in the future.\n\nI've attached my resume for your reference.\n\nThank you for your time.\n\nRegards,\n{{senderName}}"
  },
  {
    id: "builtin_4",
    category: "Students",
    name: "Internship Application",
    subject: "Application for Internship at {{company}}",
    body: "Hi {{firstName}},\n\nI hope you're doing well.\n\nI'm currently pursuing my studies and actively looking for internship opportunities where I can apply my skills while learning from experienced engineers.\n\n{{company}} stands out to me because of its engineering culture and impactful work.\n\nI've attached my resume and would be grateful if you could consider my application.\n\nThank you for your time.\n\nBest regards,\n{{senderName}}"
  },
  {
    id: "builtin_11",
    category: "Students",
    name: "Fresher Application",
    subject: "Entry-level {{currentRole}} Application",
    body: "Hi {{firstName}},\n\nI hope you're having a great week.\n\nI recently graduated and am excited to begin my career as a {{currentRole}}. I have built foundational experience in {{skills}} through academic and personal projects.\n\n{{company}} is a place I've always admired for its innovation. I am very eager to bring my dedication to your team.\n\nI have attached my resume for your review. Thank you for considering my application.\n\nBest,\n{{senderName}}"
  },
  {
    id: "builtin_7",
    category: "Developers",
    name: "Frontend Developer",
    subject: "Frontend Developer Application",
    body: "Hi {{firstName}},\n\nI'm excited to apply for frontend opportunities at {{company}}.\n\nI enjoy creating fast, responsive, and user-friendly interfaces using React, Next.js, TypeScript, Tailwind CSS, and modern frontend technologies.\n\nI've attached my resume and portfolio for your review.\n\nI'd be grateful for the opportunity to discuss how I can contribute to your engineering team.\n\nThank you.\n\nBest,\n{{senderName}}"
  },
  {
    id: "builtin_8",
    category: "Developers",
    name: "Full Stack Developer",
    subject: "Application for Full Stack Developer",
    body: "Hi {{firstName}},\n\nI hope you're doing well.\n\nI'm interested in opportunities at {{company}} as a Full Stack Developer.\n\nI enjoy building end-to-end applications—from intuitive frontend interfaces to scalable backend services—and have experience with {{skills}}.\n\nI've attached my resume and would appreciate the opportunity to connect.\n\nThank you for your time.\n\nRegards,\n{{senderName}}"
  },
  {
    id: "builtin_9",
    category: "Developers",
    name: "Dream Company Application",
    subject: "Passionate About Joining {{company}}",
    body: "Hi {{firstName}},\n\nI hope you're doing well.\n\nI've admired {{company}} for quite some time because of the products your team builds and the engineering culture you've created.\n\nI'd be thrilled to contribute my skills, continue learning from experienced engineers, and grow alongside your team.\n\nI've attached my resume and would greatly appreciate the opportunity to speak with you.\n\nThank you for your consideration.\n\nBest regards,\n{{senderName}}"
  },
  {
    id: "builtin_12",
    category: "Recruiters",
    name: "The Personalized Connection",
    subject: "Impressed by your work on {{skills}}",
    body: "Hi {{firstName}},\n\nI've been following your work and was particularly impressed by your recent projects utilizing {{skills}}. It's rare to find someone with such strong experience in this area.\n\nI'm currently helping {{company}} build out our engineering team, and given your background, I thought you might be interested in the challenges we're solving.\n\nI know you likely aren't actively looking, but would you be open to a brief 10-minute chat to hear about what we're building, even if just to keep us in mind for the future?\n\nBest,\n{{senderName}}"
  },
  {
    id: "builtin_13",
    category: "Recruiters",
    name: "The Short & Direct (High Volume)",
    subject: "Engineering opportunity at {{company}} / {{skills}}",
    body: "Hi {{firstName}},\n\nI'm reaching out because I'm looking for a {{currentRole}} with deep expertise in {{skills}} to join {{company}}.\n\nWe are currently focused on scaling our core product and I think your experience makes you a great potential fit.\n\nWould a quick conversation make sense this week, or would you prefer I send over a few more details on the role first?\n\nCheers,\n{{senderName}}"
  },
  {
    id: "builtin_14",
    category: "Startups",
    name: "The Value-First Approach",
    subject: "Quick question about {{company}}'s engineering goals",
    body: "Hi {{firstName}},\n\nI noticed {{company}} recently hit a new milestone — congrats on the growth!\n\nI'm reaching out because I'm a {{currentRole}} who has helped similar startups accelerate their product delivery using {{skills}}. \n\nWould you be open to a brief chat to see if my background might create value for your engineering team as you scale?\n\nBest,\n{{senderName}}"
  },
  {
    id: "builtin_15",
    category: "Startups",
    name: "The Permission-Based Opener",
    subject: "Idea for {{company}}'s technical roadmap",
    body: "Hi {{firstName}},\n\nI've been following {{company}}'s growth and had an idea regarding your {{skills}} architecture based on my experience as a {{currentRole}}.\n\nI don't want to take up your time if hiring or engineering optimization isn't on your radar right now—but would you be open to me sending over a 1-page summary of how I could contribute to your team?\n\nThanks,\n{{senderName}}"
  },
  {
    id: "builtin_16",
    category: "Developers",
    name: "Open Source Contributor",
    subject: "Following your open source work / {{currentRole}}",
    body: "Hi {{firstName}},\n\nI've been following your contributions to the open-source community, particularly around {{skills}}, and I genuinely admire the work you do.\n\nI'm a {{currentRole}} who loves building scalable systems, and I am actively looking for a team that values open-source culture and technical excellence as much as {{company}} does.\n\nI've attached my resume and GitHub profile. I would be thrilled to connect if you have any open roles.\n\nBest regards,\n{{senderName}}\n\nGitHub: {{github}}"
  }
];
