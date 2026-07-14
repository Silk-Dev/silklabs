export interface Question {
  id: number
  text: string
  subtitle?: string
  type: "text" | "choice" | "chips" | "toggle" | "upload" | "regions"
  options?: string[]
  field: string
  followUp?: Question[]
}

export const questions: Question[] = [
  {
    id: 1,
    text: "What is your full name?",
    type: "text",
    field: "name",
  },
  {
    id: 2,
    text: "Are you based in United States?",
    type: "choice",
    options: ["Yes I am!", "No, give country"],
    field: "location",
    followUp: [
      {
        id: 2.1,
        text: "Which country are you based in?",
        type: "text",
        field: "location",
      },
    ],
  },
  {
    id: 3,
    text: "Do you have any prior business experience?",
    type: "choice",
    options: ["Yes I do!", "Not yet."],
    field: "experience",
  },
  {
    id: 4,
    text: "What type of partnerships are you looking for?",
    type: "choice",
    options: [
      "Equity-based",
      "Paid work",
      "Hybrid",
      "Internship-volunteering",
      "Open to anything",
    ],
    field: "partnerships",
  },
  {
    id: 5,
    text: "Tell us about yourself. What is your best skill that you think would be useful in a startup?",
    subtitle:
      "Please include any tools you use, your experience level, and how you've applied this skill.",
    type: "text",
    field: "topSkill",
  },
  {
    id: 6,
    text: "What is your main motivation for joining/starting a startup?",
    type: "choice",
    options: [
      "To improve my skills and gain experience",
      "To build my network and find like-minded people",
      "To make money as soon as possible",
      "To grow something big for the long term",
      "I just enjoy working on cool ideas",
    ],
    field: "motivation",
  },
  {
    id: 7,
    text: "How much time are you willing to invest in a startup?",
    type: "choice",
    options: [
      "A few hours per week",
      "Occasionally",
      "Daily",
      "Full-time",
    ],
    field: "commitment",
  },
  {
    id: 8,
    text: "Do you want to upload a profile picture?",
    type: "upload",
    field: "avatar",
  },
  {
    id: 9,
    text: "Make profile public",
    subtitle:
      "Below, you can select the regions in which your profile is visible and where you can receive project invitations.",
    type: "regions",
    options: [
      "Africa",
      "Asia",
      "Australia",
      "Europe",
      "North America",
      "South America",
    ],
    field: "visibility",
  },
]

export const aiMessages: Record<number, string> = {
  1: "Let's start with the basics — what should people call you?",
  2: "Great! Now, where in the world are you based?",
  3: "Awesome! Let's talk about your background.",
  4: "Perfect. What kind of collaboration are you looking for?",
  5: "Tell me about your best skill. Be specific about tools and experience!",
  6: "What drives you? Pick the option that fits you best.",
  7: "And how much time can you commit?",
  8: "A picture is worth a thousand words. Want to add one?",
  9: "Last step! Set your profile visibility preferences.",
}
