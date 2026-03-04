// Complete Algerian curriculum structure based on dzexams.com

export interface Subject {
  id: string;
  name: string;
  icon: string;
}

export interface YearLevel {
  id: string;
  name: string;
  slug: string;
  subjects: Subject[];
}

export interface Stage {
  id: string;
  name: string;
  icon: string;
  color: string;
  years: YearLevel[];
  certificate?: { name: string; slug: string };
}

const primarySubjects: Subject[] = [
  { id: "math", name: "الرياضيات", icon: "📐" },
  { id: "arabe", name: "اللغة العربية", icon: "📖" },
  { id: "francais", name: "اللغة الفرنسية", icon: "🇫🇷" },
  { id: "anglais", name: "اللغة الإنجليزية", icon: "🇬🇧" },
  { id: "islamia", name: "التربية الإسلامية", icon: "🕌" },
  { id: "civique", name: "التربية المدنية", icon: "🏛️" },
  { id: "tamazight", name: "اللغة الأمازيغية", icon: "ⵣ" },
  { id: "technologie", name: "التربية العلمية والتكنولوجية", icon: "🔬" },
];

const middleSubjects: Subject[] = [
  { id: "math", name: "الرياضيات", icon: "📐" },
  { id: "arabe", name: "اللغة العربية", icon: "📖" },
  { id: "francais", name: "اللغة الفرنسية", icon: "🇫🇷" },
  { id: "anglais", name: "اللغة الإنجليزية", icon: "🇬🇧" },
  { id: "hisgeo", name: "التاريخ والجغرافيا", icon: "🌍" },
  { id: "physique", name: "العلوم الفيزيائية", icon: "⚛️" },
  { id: "sciences", name: "علوم الطبيعة والحياة", icon: "🧬" },
  { id: "islamia", name: "التربية الإسلامية", icon: "🕌" },
  { id: "civique", name: "التربية المدنية", icon: "🏛️" },
  { id: "tamazight", name: "اللغة الأمازيغية", icon: "ⵣ" },
  { id: "informatique", name: "الإعلام الآلي", icon: "💻" },
  { id: "dessin", name: "التربية الفنية", icon: "🎨" },
  { id: "musique", name: "التربية الموسيقية", icon: "🎵" },
];

const secondarySubjects: Subject[] = [
  { id: "math", name: "الرياضيات", icon: "📐" },
  { id: "arabe", name: "اللغة العربية", icon: "📖" },
  { id: "francais", name: "اللغة الفرنسية", icon: "🇫🇷" },
  { id: "anglais", name: "اللغة الإنجليزية", icon: "🇬🇧" },
  { id: "hisgeo", name: "التاريخ والجغرافيا", icon: "🌍" },
  { id: "physique", name: "العلوم الفيزيائية", icon: "⚛️" },
  { id: "sciences", name: "علوم الطبيعة والحياة", icon: "🧬" },
  { id: "islamia", name: "التربية الإسلامية", icon: "🕌" },
  { id: "tamazight", name: "اللغة الأمازيغية", icon: "ⵣ" },
  { id: "informatique", name: "الإعلام الآلي", icon: "💻" },
  { id: "technologie", name: "التكنولوجيا", icon: "⚙️" },
  { id: "dessin", name: "التربية الفنية", icon: "🎨" },
];

const bacSubjects: Subject[] = [
  ...secondarySubjects,
  { id: "philosophie", name: "الفلسفة", icon: "🤔" },
  { id: "economie", name: "الإقتصاد والمناجمنت", icon: "📊" },
  { id: "comptabilite", name: "التسيير المحاسبي والمالي", icon: "💰" },
  { id: "droit", name: "القانون", icon: "⚖️" },
  { id: "gc", name: "الهندسة المدنية", icon: "🏗️" },
  { id: "gm", name: "الهندسة الميكانيكية", icon: "🔧" },
  { id: "gp", name: "هندسة الطرائق", icon: "🧪" },
  { id: "ge", name: "الهندسة الكهربائية", icon: "⚡" },
  { id: "allemand", name: "اللغة الألمانية", icon: "🇩🇪" },
  { id: "espagnol", name: "اللغة الإسبانية", icon: "🇪🇸" },
  { id: "italien", name: "اللغة الإيطالية", icon: "🇮🇹" },
];

export const curriculum: Stage[] = [
  {
    id: "primary",
    name: "التعليم الإبتدائي",
    icon: "🏫",
    color: "hsl(142, 71%, 45%)",
    certificate: { name: "شهادة التعليم الإبتدائي", slug: "bep" },
    years: [
      { id: "0ap", name: "القسم التحضيري", slug: "0ap", subjects: primarySubjects },
      { id: "1ap", name: "السنة الأولى إبتدائي", slug: "1ap", subjects: primarySubjects },
      { id: "2ap", name: "السنة الثانية إبتدائي", slug: "2ap", subjects: primarySubjects },
      { id: "3ap", name: "السنة الثالثة إبتدائي", slug: "3ap", subjects: primarySubjects },
      { id: "4ap", name: "السنة الرابعة إبتدائي", slug: "4ap", subjects: primarySubjects },
      { id: "5ap", name: "السنة الخامسة إبتدائي", slug: "5ap", subjects: primarySubjects },
    ],
  },
  {
    id: "middle",
    name: "التعليم المتوسط",
    icon: "📚",
    color: "hsl(210, 70%, 50%)",
    certificate: { name: "شهادة التعليم المتوسط", slug: "bem" },
    years: [
      { id: "1am", name: "السنة الأولى متوسط", slug: "1am", subjects: middleSubjects },
      { id: "2am", name: "السنة الثانية متوسط", slug: "2am", subjects: middleSubjects },
      { id: "3am", name: "السنة الثالثة متوسط", slug: "3am", subjects: middleSubjects },
      { id: "4am", name: "السنة الرابعة متوسط", slug: "4am", subjects: middleSubjects },
    ],
  },
  {
    id: "secondary",
    name: "التعليم الثانوي",
    icon: "🎓",
    color: "hsl(280, 60%, 50%)",
    certificate: { name: "شهادة البكالوريا", slug: "bac" },
    years: [
      { id: "1as", name: "السنة الأولى ثانوي", slug: "1as", subjects: secondarySubjects },
      { id: "2as", name: "السنة الثانية ثانوي", slug: "2as", subjects: secondarySubjects },
      { id: "3as", name: "السنة الثالثة ثانوي", slug: "3as", subjects: bacSubjects },
    ],
  },
];
