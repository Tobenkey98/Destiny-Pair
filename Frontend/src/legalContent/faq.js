// FAQ content — questions and answers.
// Keys: icon must exist in components/faq/FAQCategory.jsx ICONS map.

export const faqCategories = [
  {
    id: "membership",
    label: "Membership & Registration",
    icon: "Rocket",
    items: [
      {
        q: "What is DestinyPair?",
        a: "DestinyPair is a faith-guided marriage facilitation platform connecting serious Christian singles across Nigeria. We combine intentional introductions, verified profiles, and godly guidance to help you find a marriage partner in a safe, purpose-driven community.",
      },
      {
        q: "How do I join DestinyPair?",
        a: "Create an account on the registration page, confirm your email with the verification code we send you, and complete your profile. Once your profile is ready, our matching system will begin suggesting compatible members.",
      },
      {
        q: "Do I have to be a Christian to join?",
        a: "Yes. DestinyPair is a Christian marriage facilitation platform, and every member is expected to be a practising Christian seeking a faith-based marriage.",
      },
      {
        q: "What is a faith-guided platform?",
        a: "It means everything we do — from matching to counselling — is rooted in Christian values and the desire to see members enter godly marriages. Our guidance is shaped by faith, and we encourage members to seek God's direction in their journey.",
      },
      {
        q: "Can I join if I am not in Nigeria?",
        a: "Yes. While DestinyPair primarily serves members in Nigeria, we welcome serious Christian singles anywhere in the world who are willing to build a marriage with a Nigerian partner.",
      },
      {
        q: "Are there membership fees?",
        a: "Creating an account, building your profile and receiving basic matches are free. Paid subscriptions unlock premium features such as full messaging, advanced matching, calls and counselling. See the Membership page for current plans.",
      },
    ],
  },
  {
    id: "account",
    label: "Account & Profile",
    icon: "User",
    items: [
      {
        q: "How do I delete my account?",
        a: "Contact our support team at pureintentions.globaltech@gmail.com from the email address on your account and request deletion. We will confirm and remove your account and personal data in line with our Privacy Policy.",
      },
      {
        q: "How do I update my profile?",
        a: "Log in and open the Profile section of your dashboard. You can edit your details, preferences, photos and other information there, and changes are saved to your profile immediately.",
      },
      {
        q: "What is profile verification and how does it work?",
        a: "Verification is how we confirm that members are real and genuinely single. We may ask you to confirm your identity and marital status, and this information is kept confidential. Verification helps keep the community safe and trustworthy.",
      },
      {
        q: "My photo is not showing — what do I do?",
        a: "Check that your photo meets our guidelines: a clear, appropriate image in a supported format. If it still does not show, clear your browser cache and refresh, or contact support for help.",
      },
      {
        q: "How do I report a fake profile?",
        a: "Use the Report a User option on the member's profile or the Report a User form on the Contact page, choosing the reason \"Impersonation\". Our team will review the account and take action.",
      },
    ],
  },
  {
    id: "matching",
    label: "Matchmaking & Compatibility",
    icon: "Heart",
    items: [
      {
        q: "How does matching work?",
        a: "Our matching system compares profile information — faith, values, lifestyle, family intentions and preferences — to suggest members who may be compatible with you. These are recommendations to guide you; the decision is always yours.",
      },
      {
        q: "What is a compatibility score?",
        a: "A compatibility score shows how much alignment our system found between your profile and another member's, based on the information you both provided. It is guidance, not a verdict on whether a match is right for you.",
      },
      {
        q: "Can I change my matching preferences?",
        a: "Yes. Update your preferences from your Profile settings, and the matching system will use your new preferences in future suggestions.",
      },
      {
        q: "Why can I not see some profiles?",
        a: "Some members choose limited visibility, and certain profile details are only visible after you connect. Paid plans may also unlock additional visibility and matching features.",
      },
      {
        q: "What happens when I like someone and they like me back?",
        a: "That is a match! Both of you will be notified, and depending on your plan you can begin a conversation and take the connection forward.",
      },
    ],
  },
  {
    id: "messaging",
    label: "Messaging & Connections",
    icon: "MessageCircle",
    items: [
      {
        q: "How do I start a conversation?",
        a: "Once you have matched with a member, open the conversation from your dashboard and send a respectful, genuine first message. Introduce yourself and share what you appreciate about their profile.",
      },
      {
        q: "What is the difference between a like and a connection?",
        a: "A like is a signal of interest in a member. A connection is formed when both members express interest in each other, which then enables messaging between you.",
      },
      {
        q: "Why are my messages not being delivered?",
        a: "Messaging between members is only available on paid plans, and messages may not deliver until both members are connected. If you believe there is a technical issue, contact support.",
      },
      {
        q: "Can I block another member?",
        a: "Yes. You can block a member from their profile, and they will no longer be able to message you or see your profile.",
      },
      {
        q: "What should I do if someone is harassing me?",
        a: "Block the member immediately, then report them with the reason \"Harassment\". Our team reviews every report and will take action to protect you.",
      },
    ],
  },
  {
    id: "subscriptions",
    label: "Subscriptions & Payments",
    icon: "Crown",
    items: [
      {
        q: "What plans are available?",
        a: "DestinyPair offers a free plan and paid plans with premium features such as unlimited messaging, advanced matching, calls and counselling. Visit the Membership page to compare plans and prices.",
      },
      {
        q: "How do I pay for a subscription?",
        a: "Choose a plan on the Membership page and check out through Paystack or Monnify. You will be redirected to the gateway's secure page, complete your payment, and your plan is activated once payment is confirmed.",
      },
      {
        q: "Is it safe to pay on DestinyPair?",
        a: "Yes. Payments are processed entirely on the secure platforms of licensed providers such as Paystack and Monnify. We never see or store your card details.",
      },
      {
        q: "How do I know my payment was successful?",
        a: "After payment, the gateway returns you to DestinyPair, where we verify the payment and confirm your plan is active. You will also see your subscription status in your dashboard.",
      },
      {
        q: "What happens if my payment fails?",
        a: "If a payment fails, your plan is not activated and you are not charged. You can simply try again, or try the other payment method.",
      },
      {
        q: "Can I upgrade or downgrade my plan?",
        a: "Contact our support team at pureintentions.globaltech@gmail.com to discuss changing your plan, and we will guide you through the options available.",
      },
    ],
  },
  {
    id: "calls",
    label: "Calls",
    icon: "Phone",
    items: [
      {
        q: "What are DestinyPair calls?",
        a: "Calls are guided audio or video conversations between members, designed to help you build a connection meaningfully before meeting in person.",
      },
      {
        q: "How do I schedule a call?",
        a: "From your dashboard, choose the member you would like to call, pick a convenient time, and the call will be arranged between you.",
      },
      {
        q: "What do I need for a call to work well?",
        a: "A stable internet connection, a working microphone and camera, and a quiet, private place where you can speak comfortably.",
      },
      {
        q: "What if my call connection is poor?",
        a: "Check your internet connection and try again. If the problem persists, contact support and we will help you resolve it.",
      },
    ],
  },
  {
    id: "counselling",
    label: "Counselling",
    icon: "BookHeart",
    items: [
      {
        q: "What is DestinyPair counselling?",
        a: "Counselling is one-on-one guidance from experienced counsellors on relationship preparation, communication, and preparing for marriage from a faith-based perspective.",
      },
      {
        q: "How do I book a counselling session?",
        a: "Open the Counselling section of your dashboard, choose a counsellor and a time that works for you, and confirm your booking.",
      },
      {
        q: "Is counselling included in my subscription?",
        a: "Counselling is available to members on eligible paid plans. Check your plan's features on the Membership page for details.",
      },
      {
        q: "Can I cancel a counselling session?",
        a: "Yes — contact support as early as possible to reschedule or cancel a booked session.",
      },
    ],
  },
  {
    id: "safety",
    label: "Safety & Reporting",
    icon: "Shield",
    items: [
      {
        q: "How do I report a user?",
        a: "Use the Report a User option on the member's profile or the Report a User form on the Contact page, and choose the reason that best fits — Harassment, Impersonation, Inappropriate content, Requesting money, or Other.",
      },
      {
        q: "What happens after I report someone?",
        a: "Our team reviews your report confidentially and takes appropriate action, which may include a warning, restriction, or removal from the platform. Accounts with repeated genuine reports are reviewed with particular care.",
      },
      {
        q: "Can I meet someone I met on DestinyPair?",
        a: "Meetings are your decision. If you choose to meet, always meet in a public place, tell someone you trust where you are going, and arrange your own transport.",
      },
      {
        q: "How can I stay safe?",
        a: "Follow our safety tips: never send money to anyone on the platform, never share financial details, take your time before sharing contact information, and report anything that makes you uncomfortable.",
      },
      {
        q: "What should I do if someone asks me for money?",
        a: "Do not send anything. Report the member immediately with the reason \"Requesting money\" — no legitimate member or staff member will ever ask you for money.",
      },
    ],
  },
  {
    id: "refunds",
    label: "Refunds",
    icon: "CreditCard",
    items: [
      {
        q: "Can I get a refund?",
        a: "Refunds are reviewed on a case-by-case basis. A payment may be eligible for review if requested within 48 hours of payment and the subscription features have not been used. Approval is at our reasonable discretion — see our Refund & Cancellation Policy.",
      },
      {
        q: "What is the refund eligibility period?",
        a: "The eligibility window is 48 hours from the date of payment, and only where the subscription features have not been used. Requests after 48 hours are generally not eligible.",
      },
      {
        q: "How long do refunds take?",
        a: "Once a refund is confirmed, it is processed back to your original payment method and may take 5–10 business days to appear, depending on your bank or provider.",
      },
      {
        q: "What if I was charged twice?",
        a: "Contact us immediately with the payment reference. We will investigate and reverse any erroneous or duplicate charge.",
      },
    ],
  },
  {
    id: "technical",
    label: "Platform & Technical",
    icon: "HelpCircle",
    items: [
      {
        q: "Why is the website slow?",
        a: "Slow loading is usually caused by your internet connection, browser cache, or device performance. Try refreshing the page, clearing your browser cache, or using an up-to-date browser.",
      },
      {
        q: "The website is blank — what should I do?",
        a: "Refresh the page and clear old session data. If it still does not load, wait a moment and try again, or contact support and we will help.",
      },
      {
        q: "How do I log out?",
        a: "Open the menu on the right side of the navigation bar and choose Log out. You will be signed out of your account on this device.",
      },
      {
        q: "What devices can I use DestinyPair on?",
        a: "DestinyPair works on any modern browser — on computers, tablets and phones. For the best experience, use an up-to-date version of Chrome, Edge, Safari or Firefox.",
      },
    ],
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: "Lock",
    items: [
      {
        q: "Is my personal information safe?",
        a: "Yes. We protect your information with appropriate technical and organisational measures, including secure connections and access controls. Your card details are never handled by us — payments go through licensed gateways.",
      },
      {
        q: "Who can see my profile?",
        a: "Your profile is visible to other members of the platform, so only share what you are comfortable with. Some details can be limited in visibility depending on your plan.",
      },
      {
        q: "Can I control what is shown on my profile?",
        a: "Yes. Manage your profile details and visibility from the Profile section of your dashboard, and update them whenever you like.",
      },
      {
        q: "Do you sell my data?",
        a: "No. We never sell personal information. We only share data as needed to operate the platform — for example with service providers and payment gateways — as described in our Privacy Policy.",
      },
    ],
  },
];
