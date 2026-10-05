// MOBCO data/site-data.js: single source of truth for bilingual content used by pages,
// search, the mega menu and the Explore in 3D. Foundation-owned (request changes in docs/requests/).
//
// Every user-facing string is { en, ar } → render with t() from core/i18n.js.
// HONESTY: only facts from docs/BRIEF.md §2. Anything inferred carries a `todo` note and,
// for projects with unknown names, `nameIsDescriptive: true`.

/* ------------------------------------------------------------------ company */
export const COMPANY = {
  name: { en: 'MOBCO Group', ar: 'مجموعة موبكو' },
  nameFirstMention: { en: 'MOBCO Group', ar: 'مجموعة موبكو (MOBCO)' },
  founded: 2001,
  foundedIn: { en: 'Founded in 2001 in Saudi Arabia', ar: 'تأسست عام 2001 في المملكة العربية السعودية' },
  tagline: { en: 'Integrity & Excellence', ar: 'النزاهة والتميّز' },
  headline: { en: 'A Legacy of Trust', ar: 'إرثٌ من الثقة' },
  motto: { en: 'We plan. We build. We manage.', ar: 'نخطّط. نبني. نُدير.' },
  valuesIntro: {
    en: "Our core values of safety, integrity and excellence define our work ethic and guide our workforce in today's rapidly changing and challenging world.",
    ar: 'تُحدِّد قيمنا الجوهرية، وهي السلامة والنزاهة والتميّز، أخلاقيات عملنا، وتوجّه كوادرنا في عالمٍ سريع التغيّر ومليء بالتحديات.',
  },
  whoWeAre: {
    eyebrow: { en: 'Who we are', ar: 'من نحن' },
    title: { en: 'Shaping skylines, elevating standards', ar: 'نرسم الأفق ونرتقي بالمعايير' },
    body: {
      en: 'MOBCO Group is a leading name in real estate construction, development, and project management, serving clients across three continents for over two decades. Renowned for its innovative approach and commitment to quality, MOBCO Group has successfully delivered iconic projects ranging from skyscrapers and commercial malls to residential compounds, governmental and educational institutions, and luxury hotels. Explore how MOBCO Group sets the standard for excellence in the industry.',
      ar: 'تُعدّ مجموعة موبكو (MOBCO) اسمًا رائدًا في مجالات الإنشاءات العقارية والتطوير وإدارة المشاريع، إذ تخدم عملاءها عبر ثلاث قارات منذ أكثر من عقدين. وبفضل نهجها المبتكر والتزامها بالجودة، نجحت المجموعة في تسليم مشاريع بارزة تتنوّع بين ناطحات السحاب والمراكز التجارية، والمجمّعات السكنية، والمؤسسات الحكومية والتعليمية، والفنادق الفاخرة. اكتشف كيف تضع مجموعة موبكو معايير التميّز في هذا القطاع.',
    },
  },
  global: {
    title: { en: 'Global leaders in innovation', ar: 'روّاد عالميون في الابتكار' },
    body: {
      en: 'MOBCO Group demonstrates its global prowess with groundbreaking projects and exceptional service across three continents, setting new standards in the construction and real estate industries.',
      ar: 'تُبرهن مجموعة موبكو على حضورها العالمي من خلال مشاريع رائدة وخدمات استثنائية عبر ثلاث قارات، واضعةً معايير جديدة في قطاعَي الإنشاءات والعقارات.',
    },
  },
  footprint: {
    title: { en: 'Our global footprint', ar: 'بصمتنا العالمية' },
    subtitle: { en: 'Innovating across borders, building excellence across continents', ar: 'نبتكر عبر الحدود، ونبني التميّز عبر القارات' },
  },
  story: {
    title: { en: 'Mastering the art of modern construction', ar: 'إتقان فنّ البناء الحديث' },
    paragraphs: [
      {
        en: "Founded in 2001 in Saudi Arabia, MOBCO Group has become a key player in the contracting and construction sector, recognized for its excellence. With a turnover exceeding SAR 6 billion over the past five years and the completion of more than 150 projects, MOBCO is a leading force in the region's construction landscape.",
        ar: 'تأسست مجموعة موبكو (MOBCO) عام 2001 في المملكة العربية السعودية، وأصبحت لاعبًا رئيسيًا في قطاع المقاولات والإنشاءات، ومشهودًا لها بالتميّز. وبحجم أعمال تجاوز 6 مليارات ريال سعودي خلال السنوات الخمس الماضية، وإنجاز أكثر من 150 مشروعًا، تُعدّ موبكو قوةً رائدة في مشهد الإنشاءات بالمنطقة.',
      },
      {
        en: 'As a privately owned, vertically integrated company, MOBCO Group specializes in construction, real estate development, and education, focusing on acquiring, developing, and managing exceptional communities, along with commercial, medical, business, and educational facilities for diverse clients worldwide.',
        ar: 'بصفتها شركةً خاصة متكاملة رأسيًا، تتخصص مجموعة موبكو في الإنشاءات والتطوير العقاري والتعليم، مع التركيز على الاستحواذ على مجتمعات استثنائية وتطويرها وإدارتها، إلى جانب منشآت تجارية وطبية وأعمال وتعليمية لعملاء متنوّعين حول العالم.',
      },
      {
        en: "For over two decades, we have delivered projects on time, within budget, and to the highest quality standards, earning the trust of industry leaders. At MOBCO, we don't just build structures. We build lasting relationships and groundbreaking achievements that redefine the limits of possibility.",
        ar: 'على مدى أكثر من عقدين، سلّمنا مشاريعنا في مواعيدها وضمن ميزانياتها وبأعلى معايير الجودة، فكسبنا ثقة روّاد القطاع. في موبكو، لا نشيّد المباني فحسب، بل نبني علاقاتٍ راسخة وإنجازاتٍ رائدة تُعيد تعريف حدود الممكن.',
      },
    ],
  },
  vision: {
    eyebrow: { en: 'Our vision', ar: 'رؤيتنا' },
    title: { en: 'Envisioning a sustainable future', ar: 'نحو مستقبلٍ مستدام' },
    paragraphs: [
      {
        en: "We aim to achieve future growth and become the world's leading engineering, construction, and project management company by delivering exceptional results for our clients, offering fulfilling careers for our team, strengthening relationships with current clients, architects, developers, and government and private organizations, and actively pursuing new global opportunities.",
        ar: 'نطمح إلى تحقيق النمو المستقبلي وأن نصبح الشركة الرائدة عالميًا في الهندسة والإنشاءات وإدارة المشاريع، من خلال تحقيق نتائج استثنائية لعملائنا، وتوفير مسارات مهنية مُرضية لفريقنا، وتعزيز علاقاتنا مع عملائنا الحاليين والمعماريين والمطوّرين والجهات الحكومية والخاصة، والسعي الحثيث نحو فرص عالمية جديدة.',
      },
      {
        en: 'MOBCO Group is a creative, innovative, and people-oriented organization providing individual opportunity, personal satisfaction, and rewarding challenges to all members of the firm.',
        ar: 'مجموعة موبكو مؤسسةٌ مبدعة ومبتكرة تضع الإنسان في صميم اهتمامها، وتمنح جميع أعضائها فرصًا فردية ورضًا شخصيًا وتحدياتٍ مُجزية.',
      },
    ],
  },
  mission: {
    eyebrow: { en: 'Our mission', ar: 'رسالتنا' },
    title: { en: 'Our commitment to excellence', ar: 'التزامنا بالتميّز' },
    body: {
      en: 'To provide world-class service and market-leading expertise to our clients. Integrity and consistency are the signatures of our service. We incorporate proven professional state-of-the-art techniques to surpass our current achievements and prosper by embracing innovative thoughts and working hard to achieve new business goals.',
      ar: 'تقديم خدماتٍ عالمية المستوى وخبراتٍ رائدة في السوق لعملائنا؛ فالنزاهة والاتساق هما بصمة خدماتنا. ونعتمد أحدث الأساليب المهنية المُجرَّبة لنتجاوز إنجازاتنا الحالية، ونزدهر بتبنّي الأفكار المبتكرة والعمل الجاد لتحقيق أهداف أعمال جديدة.',
    },
  },
  turnover: { en: 'SAR 6 billion+ turnover over the past five years', ar: 'حجم أعمال يتجاوز 6 مليارات ريال سعودي خلال السنوات الخمس الماضية' },
  continents: 3,
  copyright: { en: '© 2026 MOBCO Group. All Rights Reserved.', ar: '© 2026 مجموعة موبكو. جميع الحقوق محفوظة.' },
  // NOTE: About narrative says "more than 150 projects"; home stats say 430+. Keep both as written (BRIEF §2).
};

/* ------------------------------------------------------------------ stats (home-page numbers) */
export const STATS = [
  { id: 'years', value: 25, suffix: '+', label: { en: 'Years of experience', ar: 'عامًا من الخبرة' } },
  { id: 'professionals', value: 10000, suffix: '+', label: { en: 'Talented professionals', ar: 'كفاءة مهنية متميّزة' } },
  { id: 'projects', value: 430, suffix: '+', label: { en: 'Projects delivered', ar: 'مشروعًا مُنجزًا' } },
  { id: 'engineers', value: 600, suffix: '+', label: { en: 'Engineers & technicians', ar: 'مهندسًا وفنيًا' } },
];

/* ------------------------------------------------------------------ values */
export const VALUES = [
  {
    id: 'safety', icon: 'shield-check',
    title: { en: 'Safety', ar: 'السلامة' },
    text: {
      en: 'We plan every site around the safety of our people, our partners and the public.',
      ar: 'نخطّط لكل موقع بما يحفظ سلامة فرقنا وشركائنا والمجتمع من حولنا.',
    },
  },
  {
    id: 'integrity', icon: 'scale',
    title: { en: 'Integrity', ar: 'النزاهة' },
    text: {
      en: 'Integrity and consistency are the signatures of our service. We do what we commit to.',
      ar: 'النزاهة والاتساق هما بصمة خدماتنا. نفي بكل ما نلتزم به.',
    },
  },
  {
    id: 'excellence', icon: 'award',
    title: { en: 'Excellence', ar: 'التميّز' },
    text: {
      en: 'On time, within budget and to the highest quality standards, on every project.',
      ar: 'في الموعد المحدد، وضمن الميزانية، وبأعلى معايير الجودة، في كل مشروع.',
    },
  },
];

/* ------------------------------------------------------------------ sectors */
export const SECTORS = [
  { id: 'skyscrapers', icon: 'building-2', name: { en: 'Skyscrapers', ar: 'ناطحات السحاب' },
    text: { en: 'Towers that call for careful engineering and tight site logistics.', ar: 'أبراج تتطلّب هندسة دقيقة وإدارة محكمة للموقع.' } },
  { id: 'malls', icon: 'shopping-bag', name: { en: 'Commercial malls', ar: 'المراكز التجارية' },
    text: { en: 'Retail centres planned for easy access, busy footfall and long-term operation.', ar: 'مراكز تسوّق مخطّطة لسهولة الوصول وكثافة الزوار والتشغيل على المدى الطويل.' } },
  { id: 'residential', icon: 'house', name: { en: 'Residential compounds', ar: 'المجمّعات السكنية' },
    text: { en: 'Homes, landscaping, amenities and infrastructure planned as one community.', ar: 'مساكن ومساحات خضراء ومرافق وبنية تحتية ضمن مجتمع واحد.' } },
  { id: 'government', icon: 'landmark', name: { en: 'Governmental institutions', ar: 'المؤسسات الحكومية' },
    text: { en: 'Civic buildings built to strict standards of quality and durability.', ar: 'مبانٍ حكومية تُشيَّد وفق معايير صارمة للجودة والمتانة.' } },
  { id: 'education', icon: 'graduation-cap', name: { en: 'Educational institutions', ar: 'المؤسسات التعليمية' },
    text: { en: 'Schools and campuses built for learning and safety.', ar: 'مدارس وحرم جامعية تُبنى للتعلّم والسلامة.' } },
  { id: 'hotels', icon: 'hotel', name: { en: 'Luxury hotels', ar: 'الفنادق الفاخرة' },
    text: { en: 'Hotels where finishes and detailing matter most.', ar: 'فنادق تأتي فيها جودة التشطيب ودقّة التفاصيل أولًا.' } },
  { id: 'medical', icon: 'hospital', name: { en: 'Medical facilities', ar: 'المنشآت الطبية' },
    text: { en: 'Healthcare buildings that demand precision, coordination and compliance.', ar: 'منشآت صحية تتطلّب الدقة والتنسيق والالتزام بالمعايير.' } },
  { id: 'business', icon: 'briefcase', name: { en: 'Business facilities', ar: 'منشآت الأعمال' },
    text: { en: 'Offices and mixed-use workplaces for growing organisations.', ar: 'مكاتب ومساحات عمل متعددة الاستخدامات للمؤسسات المتنامية.' } },
];

/* ------------------------------------------------------------------ capabilities */
export const CAPABILITIES = [
  {
    id: 'plan', icon: 'drafting-compass', index: '01',
    title: { en: 'We plan', ar: 'نخطّط' },
    subtitle: { en: 'Pre-construction & planning', ar: 'ما قبل التنفيذ والتخطيط' },
    items: [
      { en: 'Pre-construction planning', ar: 'التخطيط لمرحلة ما قبل التنفيذ' },
      { en: 'Design coordination & value engineering', ar: 'تنسيق التصاميم والهندسة القيمية' },
      { en: 'Cost planning & scheduling', ar: 'تخطيط التكاليف والجدولة الزمنية' },
      { en: 'Procurement strategy', ar: 'استراتيجية المشتريات' },
    ],
  },
  {
    id: 'build', icon: 'hard-hat', index: '02',
    title: { en: 'We build', ar: 'نبني' },
    subtitle: { en: 'Construction delivery', ar: 'تنفيذ الإنشاءات' },
    items: [
      { en: 'General contracting', ar: 'المقاولات العامة' },
      { en: 'Structural & civil works', ar: 'الأعمال الإنشائية والمدنية' },
      { en: 'MEP coordination', ar: 'تنسيق الأعمال الكهروميكانيكية' },
      { en: 'Quality, health, safety & environment', ar: 'الجودة والصحة والسلامة والبيئة' },
    ],
  },
  {
    id: 'manage', icon: 'gauge', index: '03',
    title: { en: 'We manage', ar: 'نُدير' },
    subtitle: { en: 'Project & facility management', ar: 'إدارة المشاريع والمرافق' },
    items: [
      { en: 'Project management & controls', ar: 'إدارة المشاريع وضبطها' },
      { en: 'Contract & risk management', ar: 'إدارة العقود والمخاطر' },
      { en: 'Testing, commissioning & handover', ar: 'الاختبار والتشغيل والتسليم' },
      { en: 'Facility management', ar: 'إدارة المرافق' },
    ],
  },
];

/* ------------------------------------------------------------------ subsidiaries */
// Construction / Developments / Real Estate: verbatim text from the client's subsidiary pages (about, tagline).
// Each of those three has its own page (page). Elite Education: generic → client must confirm (todo).
export const SUBSIDIARIES = [
  {
    id: 'mobco-construction',
    name: { en: 'MOBCO Construction', ar: 'موبكو للإنشاءات' },
    logo: { color: 'assets/img/logos/mobco-construction.png', white: 'assets/img/logos/mobco-construction-white.png', navy: 'assets/img/logos/mobco-construction-navy.png', w: 675, h: 497 },
    page: "mobco-construction.html",
    hero: "sub-construction-hero",
    image: "sub-construction-render",
    tagline: {"en": "Elevating industry standards", "ar": "نرتقي بمعايير الصناعة"},
    about: [{"en": "Founded in 2001, MOBCO Construction, the construction arm of MOBCO Group, is a recognized leader in the industry, known for delivering innovative, high-quality projects. MOBCO Group operates across diverse sectors, including construction, development, education, hospitality, and facility management, consistently exceeding client expectations.", "ar": "تأسّست موبكو للإنشاءات عام 2001 بوصفها الذراع الإنشائية لمجموعة موبكو، وهي رائدة معترف بها في القطاع، تشتهر بتنفيذ مشاريع مبتكرة عالية الجودة. وتعمل مجموعة موبكو في قطاعات متنوّعة تشمل الإنشاءات والتطوير والتعليم والضيافة وإدارة المرافق، متجاوزةً توقعات عملائها باستمرار."}, {"en": "With tier-one status in the global construction industry, MOBCO's projects span Saudi Arabia, Canada, the UK, and Egypt. Having completed 438 projects across four continents, our portfolio reflects a strong commitment to excellence and delivering exceptional results.", "ar": "بفضل تصنيفها من الفئة الأولى في قطاع الإنشاءات العالمي، تمتد مشاريع موبكو عبر المملكة العربية السعودية وكندا والمملكة المتحدة ومصر. ومع إنجاز 438 مشروعًا في أربع قارات، تعكس محفظة أعمالنا التزامًا راسخًا بالتميّز وتحقيق نتائج استثنائية."}],
    facts: [{"en": "Founded 2001", "ar": "تأسّست عام 2001"}, {"en": "438 projects completed", "ar": "438 مشروعًا مُنجزًا"}, {"en": "Saudi Arabia · Canada · UK · Egypt", "ar": "السعودية · كندا · المملكة المتحدة · مصر"}, {"en": "Tier-one status", "ar": "تصنيف الفئة الأولى"}],
    accent: '#5fb2b8',
    icon: 'hard-hat',
    short: {"en": "The construction arm of MOBCO Group, founded in 2001 and known for innovative, high-quality projects.", "ar": "الذراع الإنشائية لمجموعة موبكو، تأسّست عام 2001 وتُعرف بمشاريعها المبتكرة عالية الجودة."},
    long: {
      en: 'MOBCO Construction is the group’s contracting company, founded in Saudi Arabia in 2001. It plans, builds and manages towers, commercial and residential buildings, and civic and educational facilities.',
      ar: 'موبكو للإنشاءات هي شركة المقاولات في المجموعة، تأسّست في المملكة العربية السعودية عام 2001. تخطّط وتبني وتُدير الأبراج والمباني التجارية والسكنية والمنشآت الحكومية والتعليمية.',
    },
    focus: [
      { en: 'General contracting', ar: 'المقاولات العامة' },
      { en: 'High-rise & commercial', ar: 'الأبراج والمنشآت التجارية' },
      { en: 'Civic & educational buildings', ar: 'المباني الحكومية والتعليمية' },
    ],
    todo: "Text is verbatim from the client site (subsidiary page; last sentence was cut off after “delivering exceptional”; “results” added). 438 projects / four continents vs 430+ / three continents elsewhere; client to reconcile.",
  },
  {
    id: 'mobco-developments',
    name: { en: 'MOBCO Developments', ar: 'موبكو للتطوير' },
    logo: { color: 'assets/img/logos/mobco-developments.png', white: 'assets/img/logos/mobco-developments-white.png', navy: 'assets/img/logos/mobco-developments-navy.png', w: 638, h: 209 },
    page: "mobco-developments.html",
    hero: "sub-developments-hero",
    image: "eastmain",
    tagline: {"en": "Creating landmarks, defining excellence", "ar": "نصنع المعالم ونرسم ملامح التميّز"},
    about: [{"en": "In our ongoing commitment to expand our world-class expertise, MOBCO Group introduced MOBCO Developments, with a strategic entry into the Egyptian market. This new division builds on the robust foundation of MOBCO Group's construction legacy, aiming to set unprecedented standards in the development sector.", "ar": "في إطار التزامنا المستمر بتوسيع خبراتنا عالمية المستوى، أطلقت مجموعة موبكو شركة موبكو للتطوير بدخولٍ استراتيجي إلى السوق المصرية. ويرتكز هذا القطاع الجديد على الأساس المتين لإرث مجموعة موبكو في الإنشاءات، ساعيًا إلى وضع معايير غير مسبوقة في قطاع التطوير."}, {"en": "At MOBCO Developments, we are focused on transforming prime locations in both Canada and Egypt through innovative and high-quality projects. Our commitment to safety and environmental responsibility drives us to incorporate sustainable practices into every aspect of our work.", "ar": "نركّز في موبكو للتطوير على تحويل مواقع متميّزة في كندا ومصر من خلال مشاريع مبتكرة عالية الجودة. ويدفعنا التزامنا بالسلامة والمسؤولية البيئية إلى تبنّي ممارسات مستدامة في كل جانب من جوانب عملنا."}, {"en": "Leveraging our extensive global experience, we are dedicated to enhancing Egypt's development landscape with visionary projects that reflect our dedication to excellence. Our mission is to create transformative developments that not only meet but surpass the highest industry standards, leaving a significant and lasting impact on Egypt's growth and prosperity. By prioritizing innovation and quality, MOBCO Developments is poised to reshape the future of urban living and commercial spaces in the region.", "ar": "مستفيدين من خبرتنا العالمية الواسعة، نكرّس جهودنا للارتقاء بمشهد التطوير في مصر عبر مشاريع رائدة تعكس التزامنا بالتميّز. ورسالتنا هي إنشاء مشاريع تطوير تحويلية لا تكتفي بتلبية أعلى معايير الصناعة بل تتجاوزها، لتترك أثرًا كبيرًا ودائمًا في نمو مصر وازدهارها. ومن خلال إعطاء الأولوية للابتكار والجودة، تستعد موبكو للتطوير لإعادة رسم مستقبل الحياة الحضرية والمساحات التجارية في المنطقة."}],
    facts: [{"en": "Egypt & Canada", "ar": "مصر وكندا"}, {"en": "Eastmain in the Golden Square, New Cairo", "ar": "إيست مين في المربع الذهبي، القاهرة الجديدة"}, {"en": "Victoria 101 in Port Whitby, Ontario", "ar": "فيكتوريا 101 في بورت ويتبي، أونتاريو"}],
    accent: '#8fcbd0',
    icon: 'building',
    short: {"en": "The group’s development company. It entered the Egyptian market and is transforming prime locations in Canada and Egypt.", "ar": "شركة التطوير في المجموعة. دخلت السوق المصرية، وتعمل على تطوير مواقع متميّزة في كندا ومصر."},
    long: {
      en: 'MOBCO Developments carries the group’s focus on acquiring, developing and managing communities, and commercial, medical and business facilities.',
      ar: 'تحمل موبكو للتطوير تركيز المجموعة على الاستحواذ على المجتمعات السكنية والمنشآت التجارية والطبية ومنشآت الأعمال، وتطويرها وإدارتها.',
    },
    focus: [
      { en: 'Community development', ar: 'تطوير المجتمعات' },
      { en: 'Mixed-use destinations', ar: 'الوجهات متعددة الاستخدامات' },
      { en: 'Commercial & business facilities', ar: 'المنشآت التجارية ومنشآت الأعمال' },
    ],
    todo: "Text verbatim from the client site. Linking Eastmain / Victoria 101 to MOBCO Developments is an inference from “Canada and Egypt” + the subsidiary page imagery; client to confirm.",
  },
  {
    id: 'mobco-real-estate',
    name: { en: 'MOBCO Real Estate Development', ar: 'موبكو للتطوير العقاري' },
    logo: { color: 'assets/img/logos/mobco-real-estate.png', white: null, navy: 'assets/img/logos/mobco-real-estate.png', w: 652, h: 147, needsLightTile: true },
    page: "mobco-real-estate.html",
    hero: "sub-real-estate-hero",
    image: "sub-real-estate-office",
    tagline: {"en": "Simplifying property management", "ar": "نُبسّط إدارة العقارات"},
    about: [{"en": "Established in 2002 in Cairo, Egypt, MOBCO Real Estate Development specializes in leasing and property management for multi-functional buildings. Our flagship project, Mivida Business Park, B1, features modern office spaces designed with a common core that provides essential services, ensuring maximum efficiency and flexibility for our clients. This design allows us to tailor office environments to meet the unique needs of each tenant.", "ar": "تأسّست موبكو للتطوير العقاري عام 2002 في القاهرة بمصر، وتتخصّص في تأجير وإدارة العقارات للمباني متعددة الوظائف. ويضمّ مشروعنا الرئيسي، مجمّع ميفيدا للأعمال، المبنى B1، مساحات مكتبية حديثة مصمّمة حول نواة مشتركة توفّر الخدمات الأساسية، بما يضمن أقصى درجات الكفاءة والمرونة لعملائنا. ويتيح لنا هذا التصميم تهيئة بيئات العمل بما يلبّي الاحتياجات الخاصة بكل مستأجر."}],
    facts: [{"en": "Established 2002, Cairo", "ar": "تأسّست عام 2002، القاهرة"}, {"en": "Leasing & property management", "ar": "التأجير وإدارة العقارات"}, {"en": "Flagship: Mivida Business Park, B1", "ar": "المشروع الرئيسي: مجمّع ميفيدا للأعمال، B1"}],
    accent: '#b2aa8a',
    icon: 'landmark',
    short: {"en": "Established in Cairo in 2002. Leasing and property management for multi-functional buildings, including Mivida Business Park, B1.", "ar": "تأسّست في القاهرة عام 2002. تأجير وإدارة العقارات للمباني متعددة الوظائف، ومنها مجمّع ميفيدا للأعمال، المبنى B1."},
    long: {
      en: 'MOBCO Real Estate Development leases and manages multi-functional buildings. Its flagship is Mivida Business Park, B1, in New Cairo.',
      ar: 'تؤجّر موبكو للتطوير العقاري المباني متعددة الوظائف وتُديرها، ومشروعها الرئيسي مجمّع ميفيدا للأعمال، المبنى B1، في القاهرة الجديدة.',
    },
    // derived from the verbatim client copy ("leasing and property management for multi-functional buildings")
    focus: [
      { en: 'Office leasing', ar: 'تأجير المساحات المكتبية' },
      { en: 'Property management', ar: 'إدارة العقارات' },
      { en: 'Multi-functional buildings', ar: 'المباني متعددة الوظائف' },
    ],
    todo: "Text verbatim from the client site (minor grammar fix: “features an modern” → “features modern”).",
  },
  {
    id: 'elite-education',
    name: { en: 'Elite Education Group', ar: 'مجموعة النخبة التعليمية' },
    logo: { color: 'assets/img/logos/elite-education.png', white: 'assets/img/logos/elite-education-white.png', navy: 'assets/img/logos/elite-education-navy.png', w: 508, h: 498 },
    page: null,
    accent: '#5fb2b8',
    icon: 'graduation-cap',
    short: {
      en: 'The group’s education arm.',
      ar: 'الذراع التعليمية للمجموعة.',
    },
    long: {
      en: 'Elite Education Group carries MOBCO’s work in education, one of the group’s three specialisms.',
      ar: 'تتولّى مجموعة النخبة التعليمية أعمال موبكو في قطاع التعليم، وهو أحد تخصّصات المجموعة الثلاثة.',
    },
    focus: [
      { en: 'Educational facilities', ar: 'المنشآت التعليمية' },
      { en: 'School development', ar: 'تطوير المدارس' },
      { en: 'Education management', ar: 'الإدارة التعليمية' },
    ],
    todo: 'Client to confirm description, schools/campuses and curricula for Elite Education Group.',
  },
];

/* ------------------------------------------------------------------ regions */
export const REGIONS = [
  {
    id: 'ksa', mapKey: 'ksa', image: 'ksa-landmark',
    name: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' },
    short: { en: 'KSA', ar: 'السعودية' },
    blurb: {
      en: 'More than 25 years of premium projects across various sectors, including construction, development, education, hospitality, and facility management.',
      ar: 'أكثر من 25 عامًا من المشاريع المتميّزة في قطاعات متنوّعة، تشمل الإنشاءات والتطوير والتعليم والضيافة وإدارة المرافق.',
    },
  },
  {
    id: 'egypt', mapKey: 'egypt', image: 'eastmain',
    name: { en: 'Egypt', ar: 'مصر' },
    short: { en: 'Egypt', ar: 'مصر' },
    blurb: {
      en: 'Eastmain, a mixed-use development featuring retail, office, and clinic spaces in a thriving metropolitan center located at the heart of the Golden Square, New Cairo.',
      ar: 'إيست مين (Eastmain)، مشروع متعدد الاستخدامات يضمّ مساحات تجارية ومكتبية وعيادات، في مركزٍ حضري نابض بالحياة يقع في قلب المربع الذهبي بالقاهرة الجديدة.',
    },
  },
  {
    id: 'canada', mapKey: 'canada', image: 'victoria-101',
    name: { en: 'Canada', ar: 'كندا' },
    short: { en: 'Canada', ar: 'كندا' },
    blurb: {
      en: 'Victoria 101, a vibrant residential project located at the heart of Port Whitby. A popular yet laid-back neighborhood by the shore of Lake Ontario & local parks.',
      ar: 'فيكتوريا 101 (Victoria 101)، مشروع سكني نابض بالحياة في قلب بورت ويتبي؛ حيٌّ مرغوب يتميّز بأجوائه الهادئة على ضفاف بحيرة أونتاريو وبالقرب من الحدائق المحلية.',
    },
  },
];

/* ------------------------------------------------------------------ offices & careers */
export const OFFICES = [
  {
    id: 'ksa', region: 'ksa', hq: true,
    name: { en: 'KSA Office', ar: 'مكتب المملكة العربية السعودية' },
    label: { en: 'Headquarters', ar: 'المقر الرئيسي' },
    city: { en: 'Riyadh', ar: 'الرياض' },
    addresses: [
      {
        en: ['16th floor, Al Ebdaa Tower', 'King Fahd Road, Olaya District', 'P.O. Box 19481-11435', 'Riyadh, Saudi Arabia'],
        ar: ['الطابق 16، برج الإبداع', 'طريق الملك فهد، حي العليا', 'ص.ب \u206619481-11435\u2069', 'الرياض، المملكة العربية السعودية'],
      },
    ],
    phones: [{ display: '+966 11 293 5966', href: 'tel:+966112935966' }],
    email: 'info.ksa@mobco-group.com',
    geo: { lat: 24.7136, lon: 46.6753, approx: true },
    mapsQuery: 'Al Ebdaa Tower, King Fahd Road, Olaya, Riyadh',
  },
  {
    id: 'egypt', region: 'egypt', hq: false,
    name: { en: 'Egypt Office', ar: 'مكتب مصر' },
    label: { en: 'Regional office', ar: 'المكتب الإقليمي' },
    city: { en: 'Cairo', ar: 'القاهرة' },
    addresses: [
      { en: ['B1 Building, Mivida Compound', 'New Cairo, Egypt'], ar: ['مبنى B1، كمبوند ميفيدا', 'القاهرة الجديدة، مصر'] },
      { en: ['2 Block C Ahmed Hassan St., Ninth District', 'Nasr City, Cairo, Egypt'], ar: ['2 بلوك C شارع أحمد حسن، الحي التاسع', 'مدينة نصر، القاهرة، مصر'] },
    ],
    phones: [
      { display: '02-23866591', href: 'tel:+20223866591' },
      { display: '02-23866592', href: 'tel:+20223866592' },
    ],
    email: 'info.egy@mobco-group.com',
    geo: { lat: 30.013, lon: 31.526, approx: true },
    mapsQuery: 'Mivida, New Cairo, Egypt',
  },
];

export const CAREERS = [
  { id: 'ksa', email: 'careers@mobco-group.com', label: { en: 'Join our KSA team', ar: 'انضم إلى فريقنا في السعودية' } },
  { id: 'egypt', email: 'hr.egy@mobco-group.com', label: { en: 'Join our Egypt team', ar: 'انضم إلى فريقنا في مصر' } },
];

/* ------------------------------------------------------------------ projects */
// The first five come from the renders on the old home page; the rest are the client's portfolio
// list (projects page of mobco-group.com), each with its category tab. featured: shown in the hero ring / home carousel.
// gallery: alternate crops of the same render via object-position (`pos`). status null = unknown.
export const PROJECTS = [
  {
    id: 'eastmain', slug: 'eastmain',
    name: { en: 'Eastmain', ar: 'إيست مين' },
    nameIsDescriptive: false,
    region: 'egypt',
    location: { en: 'Golden Square, New Cairo, Egypt', ar: 'المربع الذهبي، القاهرة الجديدة، مصر' },
    category: 'mixed-use-admin',
    featured: true,
    sectors: ['business', 'medical'],
    typology: { en: 'Mixed-use · Retail, office & clinic', ar: 'متعدد الاستخدامات · تجزئة ومكاتب وعيادات' },
    status: null,
    image: 'eastmain',
    pos: '50% 50%',
    gallery: [
      { base: 'eastmain', pos: '50% 50%', caption: { en: 'Eastmain, evening render', ar: 'إيست مين، تصوّر مسائي' } },
      { base: 'eastmain', pos: '18% 78%', caption: { en: 'Eastmain plaza and shopfronts', ar: 'ساحة إيست مين وواجهاتها التجارية' } },
      { base: 'eastmain', pos: '70% 22%', caption: { en: 'Eastmain glazed façade', ar: 'الواجهة الزجاجية لإيست مين' } },
    ],
    summary: {
      en: 'A mixed-use development featuring retail, office, and clinic spaces in a thriving metropolitan center located at the heart of the Golden Square, New Cairo.',
      ar: 'مشروع متعدد الاستخدامات يضمّ مساحات تجارية ومكتبية وعيادات، في مركزٍ حضري نابض بالحياة يقع في قلب المربع الذهبي بالقاهرة الجديدة.',
    },
    imageNote: { en: 'Night render of a glazed office and retail building with a landscaped plaza and pool.', ar: 'تصوّر ليلي لمبنى مكاتب ومحلات بواجهات زجاجية مع ساحة منسّقة ومسطّح مائي.' },
    highlights: [
      { en: 'Retail spaces', ar: 'مساحات تجارية' },
      { en: 'Office spaces', ar: 'مساحات مكتبية' },
      { en: 'Clinic spaces', ar: 'عيادات' },
      { en: 'Heart of the Golden Square, New Cairo', ar: 'في قلب المربع الذهبي بالقاهرة الجديدة' },
    ],
    studioModel: 'mixed-use',
    todo: ['Confirm status, size, completion date and MOBCO’s role (developer / contractor).'],
  },
  {
    id: 'victoria-101', slug: 'victoria-101',
    name: { en: 'Victoria 101', ar: 'فيكتوريا 101' },
    nameIsDescriptive: false,
    region: 'canada',
    location: { en: 'Port Whitby, Ontario, Canada', ar: 'بورت ويتبي، أونتاريو، كندا' },
    category: 'residential',
    featured: true,
    sectors: ['residential'],
    typology: { en: 'Residential', ar: 'سكني' },
    status: null,
    image: 'victoria-101',
    pos: '50% 50%',
    gallery: [
      { base: 'victoria-101', pos: '50% 50%', caption: { en: 'Victoria 101 at dusk, aerial render', ar: 'فيكتوريا 101 عند الغسق، تصوّر جوي' } },
      { base: 'victoria-101', pos: '42% 30%', caption: { en: 'Victoria 101 tower and rooftop', ar: 'برج فيكتوريا 101 وسطحه' } },
      { base: 'victoria-101', pos: '75% 70%', caption: { en: 'Victoria 101 setting and landscape', ar: 'موقع فيكتوريا 101 ومحيطه' } },
    ],
    summary: {
      en: 'A vibrant residential project located at the heart of Port Whitby. A popular yet laid-back neighborhood by the shore of Lake Ontario & local parks.',
      ar: 'مشروع سكني نابض بالحياة في قلب بورت ويتبي؛ حيٌّ مرغوب يتميّز بأجوائه الهادئة على ضفاف بحيرة أونتاريو وبالقرب من الحدائق المحلية.',
    },
    imageNote: { en: 'Dusk aerial render of a residential tower with a mid-rise wing and rooftop pool.', ar: 'تصوّر جوي عند الغسق لبرج سكني مع جناح متوسط الارتفاع ومسبح على السطح.' },
    highlights: [
      { en: 'Heart of Port Whitby, Ontario', ar: 'في قلب بورت ويتبي، أونتاريو' },
      { en: 'By the shore of Lake Ontario', ar: 'على ضفاف بحيرة أونتاريو' },
      { en: 'Close to local parks', ar: 'بالقرب من الحدائق المحلية' },
    ],
    studioModel: 'residential-tower',
    todo: ['Confirm status, unit count, storeys and completion date (do not infer from render).'],
  },
  {
    id: 'lagoon-villa-community', slug: 'lagoon-villa-community',
    name: { en: 'Lagoon Villa Community', ar: 'مجتمع فلل البحيرات' },
    nameIsDescriptive: true,
    region: null,
    location: null,
    category: 'residential',
    featured: true,
    sectors: ['residential'],
    typology: { en: 'Residential community', ar: 'مجتمع سكني' },
    status: null,
    image: 'aerial-compound',
    pos: '50% 50%',
    gallery: [
      { base: 'aerial-compound', pos: '50% 50%', caption: { en: 'Aerial render of the villa community', ar: 'تصوّر جوي لمجتمع الفلل' } },
      { base: 'aerial-compound-portrait', pos: '50% 50%', caption: { en: 'Boulevard and park (detail)', ar: 'الجادّة والحديقة (تفصيل)' } },
      { base: 'aerial-compound', pos: '78% 30%', caption: { en: 'Lagoon pools and villas (detail)', ar: 'البحيرات الاصطناعية والفلل (تفصيل)' } },
      { base: 'aerial-panorama', pos: '50% 50%', caption: { en: 'Panoramic view of the masterplan', ar: 'منظر بانورامي للمخطط العام' } },
    ],
    summary: {
      en: 'Aerial render of a villa community with lagoon pools, a tree-lined boulevard and a commercial strip.',
      ar: 'تصوّر جوي لمجتمع فلل يضمّ بحيرات اصطناعية وجادّة تصطفّ على جانبيها الأشجار وشريطًا تجاريًا.',
    },
    imageNote: { en: 'Villas, lagoon pools, a tree-lined boulevard and a commercial strip.', ar: 'فلل وبحيرات اصطناعية وجادّة مشجّرة وشريط تجاري.' },
    highlights: [
      { en: 'Villas around lagoon pools', ar: 'فلل حول بحيرات اصطناعية' },
      { en: 'Tree-lined boulevard', ar: 'جادّة مشجّرة' },
      { en: 'Commercial strip', ar: 'شريط تجاري' },
    ],
    studioModel: 'villa-community',
    todo: ['Project name is descriptive; client to supply real name, location, status and role.'],
  },
  {
    id: 'innovation-campus', slug: 'innovation-campus',
    name: { en: 'Innovation Campus', ar: 'حرم الابتكار' },
    nameIsDescriptive: true,
    region: null,
    location: null,
    category: 'education',
    featured: true,
    sectors: ['education'],
    typology: { en: 'Campus', ar: 'حرم تعليمي' },
    status: null,
    image: 'campus',
    pos: '50% 45%',
    gallery: [
      { base: 'campus', pos: '50% 45%', caption: { en: 'Aerial render of the campus', ar: 'تصوّر جوي للحرم' } },
      { base: 'campus', pos: '50% 22%', caption: { en: 'Central tower (detail)', ar: 'البرج المركزي (تفصيل)' } },
      { base: 'campus', pos: '30% 75%', caption: { en: 'Ring buildings and bridges (detail)', ar: 'المباني الحلقية والجسور (تفصيل)' } },
    ],
    summary: {
      en: 'Aerial render of a white campus. Ring-shaped buildings sit around a central tower, linked by bridges across landscaped grounds.',
      ar: 'تصوّر جوي لحرمٍ أبيض. مبانٍ حلقية الشكل تلتفّ حول برج مركزي، وتربطها جسور عبر مساحات خضراء منسّقة.',
    },
    imageNote: { en: 'Ring buildings, a central tower and connecting bridges.', ar: 'مبانٍ حلقية وبرج مركزي وجسور رابطة.' },
    highlights: [
      { en: 'Ring-shaped buildings', ar: 'مبانٍ حلقية الشكل' },
      { en: 'Central tower', ar: 'برج مركزي' },
      { en: 'Connecting bridges', ar: 'جسور رابطة' },
    ],
    studioModel: 'campus',
    todo: ['Project name is descriptive; client to supply real name, location, use and status (sign in render reads “SIC”).'],
  },
  {
    id: 'classical-landmark', slug: 'classical-landmark',
    name: { en: 'Classical Landmark', ar: 'المَعلم الكلاسيكي' },
    nameIsDescriptive: true,
    region: 'ksa',
    location: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' },
    category: null,
    featured: true,
    sectors: [],
    typology: { en: 'Landmark building', ar: 'مبنى معلمي' },
    status: null,
    image: 'ksa-landmark',
    pos: '50% 50%',
    gallery: [
      { base: 'ksa-landmark', pos: '50% 50%', caption: { en: 'Render of the classical building', ar: 'تصوّر للمبنى الكلاسيكي' } },
      { base: 'ksa-landmark', pos: '55% 70%', caption: { en: 'Porte-cochère entrance (detail)', ar: 'المدخل المظلّل (تفصيل)' } },
      { base: 'ksa-landmark', pos: '60% 20%', caption: { en: 'Curved balconies (detail)', ar: 'الشرفات المنحنية (تفصيل)' } },
    ],
    summary: {
      en: 'Render of a classical building in red and cream tones, with curved balconies and a grand porte-cochère entrance.',
      ar: 'تصوّر لمبنى كلاسيكي بدرجات الأحمر والكريمي، بشرفات منحنية ومدخل مظلّل فخم.',
    },
    imageNote: { en: 'Red-and-cream classical façade, curved balconies, porte-cochère.', ar: 'واجهة كلاسيكية بالأحمر والكريمي وشرفات منحنية ومدخل مظلّل.' },
    highlights: [
      { en: 'Curved balconies', ar: 'شرفات منحنية' },
      { en: 'Porte-cochère entrance', ar: 'مدخل مظلّل للسيارات' },
    ],
    studioModel: 'landmark',
    todo: ['Project name is descriptive. Region inferred from the old site’s KSA card; client to confirm name, city, use (sector) and status.'],
  },
  {
    id: "cluster-j07", slug: "cluster-j07",
    name: { en: "Remaining Works for Cluster J07", ar: "الأعمال المتبقية للمجمّع J07" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "mixed-use-admin",
    sectors: ["business", "government"],
    typology: { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
    status: null,
    featured: false,
    image: "cluster-j07",
    pos: '50% 50%',
    gallery: [
      { base: "cluster-j07", pos: '50% 50%', caption: { en: "Remaining Works for Cluster J07", ar: "الأعمال المتبقية للمجمّع J07" } },
    ],
    summary: {
      en: "Completion of the remaining works on Cluster J07, a mixed-use and administrative project in Saudi Arabia.",
      ar: "استكمال الأعمال المتبقية في المجمّع J07، وهو مشروع متعدد الاستخدامات وإداري في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role.", "Cluster code read from a small screenshot caption (“J07”); confirm exact code and location."],
  },
  {
    id: "sofitel-hotel", slug: "sofitel-hotel",
    name: { en: "Sofitel Hotel", ar: "فندق سوفيتيل" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "hospitality",
    sectors: ["hotels"],
    typology: { en: "Hospitality", ar: "الضيافة" },
    status: null,
    featured: true,
    image: "sofitel-hotel",
    pos: '50% 50%',
    gallery: [
      { base: "sofitel-hotel", pos: '50% 50%', caption: { en: "Sofitel Hotel", ar: "فندق سوفيتيل" } },
    ],
    summary: {
      en: "A Sofitel hotel project in Saudi Arabia.",
      ar: "مشروع فندق سوفيتيل في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Hospitality", ar: "الضيافة" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "as-safiyyah-museum-park", slug: "as-safiyyah-museum-park",
    name: { en: "As Safiyyah Museum and Park", ar: "متحف وبستان الصافية" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "special-projects",
    sectors: [],
    typology: { en: "Special Projects", ar: "مشاريع خاصة" },
    status: null,
    featured: true,
    image: "as-safiyyah-museum-park",
    pos: '50% 50%',
    gallery: [
      { base: "as-safiyyah-museum-park", pos: '50% 50%', caption: { en: "As Safiyyah Museum and Park", ar: "متحف وبستان الصافية" } },
    ],
    summary: {
      en: "A museum and park in Saudi Arabia, one of our special projects.",
      ar: "متحف وبستان في المملكة العربية السعودية، ضمن مشاريعنا الخاصة.",
    },
    highlights: [
      { en: "Special Projects", ar: "مشاريع خاصة" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role.", "Commonly located in Madinah; confirm before stating a city."],
  },
  {
    id: "red-palace-redevelopment", slug: "red-palace-redevelopment",
    name: { en: "Re-Development of the Red Palace", ar: "إعادة تطوير القصر الأحمر" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "mixed-use-admin",
    sectors: ["business", "government"],
    typology: { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
    status: null,
    featured: true,
    image: "red-palace-redevelopment",
    pos: '50% 50%',
    gallery: [
      { base: "red-palace-redevelopment", pos: '50% 50%', caption: { en: "Re-Development of the Red Palace", ar: "إعادة تطوير القصر الأحمر" } },
    ],
    summary: {
      en: "Re-development of the Red Palace in Saudi Arabia.",
      ar: "إعادة تطوير القصر الأحمر في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role.", "Commonly located in Riyadh; confirm before stating a city. The “Classical Landmark” render may depict this project; confirm."],
  },
  {
    id: "hq-tower-masjid-museum", slug: "hq-tower-masjid-museum",
    name: { en: "Construction of the Headquarter Tower, Masjid, Museum and Tower Site Development", ar: "إنشاء البرج الرئيسي والمسجد والمتحف وتطوير موقع البرج" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "mixed-use-admin",
    sectors: ["business", "government"],
    typology: { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
    status: null,
    featured: true,
    image: "hq-tower-masjid-museum",
    pos: '50% 50%',
    gallery: [
      { base: "hq-tower-masjid-museum", pos: '50% 50%', caption: { en: "Construction of the Headquarter Tower, Masjid, Museum and Tower Site Development", ar: "إنشاء البرج الرئيسي والمسجد والمتحف وتطوير موقع البرج" } },
    ],
    summary: {
      en: "A headquarters tower, a masjid and a museum, with development of the tower site, in Saudi Arabia.",
      ar: "إنشاء برج رئيسي ومسجد ومتحف، مع تطوير موقع البرج، في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role.", "Client/owner and city not stated on the old site."],
  },
  {
    id: "citadines-hotel", slug: "citadines-hotel",
    name: { en: "Citadines Hotel (Ascott Group)", ar: "فندق سيتادينز (مجموعة أسكوت)" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "hospitality",
    sectors: ["hotels"],
    typology: { en: "Hospitality", ar: "الضيافة" },
    status: null,
    featured: false,
    image: "citadines-hotel",
    pos: '50% 50%',
    gallery: [
      { base: "citadines-hotel", pos: '50% 50%', caption: { en: "Citadines Hotel (Ascott Group)", ar: "فندق سيتادينز (مجموعة أسكوت)" } },
    ],
    summary: {
      en: "A Citadines hotel project (Ascott Group) in Saudi Arabia.",
      ar: "مشروع فندق سيتادينز (مجموعة أسكوت) في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Hospitality", ar: "الضيافة" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "hilton-doubletree-garden-inn", slug: "hilton-doubletree-garden-inn",
    name: { en: "Hilton DoubleTree & Garden Inn", ar: "فندقا هيلتون دبل تري وهيلتون جاردن إن" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "hospitality",
    sectors: ["hotels"],
    typology: { en: "Hospitality", ar: "الضيافة" },
    status: null,
    featured: false,
    image: "hilton-doubletree-garden-inn",
    pos: '50% 50%',
    gallery: [
      { base: "hilton-doubletree-garden-inn", pos: '50% 50%', caption: { en: "Hilton DoubleTree & Garden Inn", ar: "فندقا هيلتون دبل تري وهيلتون جاردن إن" } },
    ],
    summary: {
      en: "A Hilton DoubleTree and Garden Inn hotel project in Saudi Arabia.",
      ar: "مشروع فندقي هيلتون دبل تري وهيلتون جاردن إن في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Hospitality", ar: "الضيافة" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "neom-bay-airport", slug: "neom-bay-airport",
    name: { en: "NEOM Bay Airport (International Flight Reconfiguration)", ar: "مطار خليج نيوم (إعادة تهيئة صالة الرحلات الدولية)" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "NEOM, Saudi Arabia", ar: "نيوم، المملكة العربية السعودية" },
    category: "airport",
    sectors: ["business"],
    typology: { en: "Airport", ar: "المطارات" },
    status: null,
    featured: true,
    image: "neom-bay-airport",
    pos: '50% 50%',
    gallery: [
      { base: "neom-bay-airport", pos: '50% 50%', caption: { en: "NEOM Bay Airport (International Flight Reconfiguration)", ar: "مطار خليج نيوم (إعادة تهيئة صالة الرحلات الدولية)" } },
    ],
    summary: {
      en: "Reconfiguration works for international flights at NEOM Bay Airport.",
      ar: "أعمال إعادة تهيئة صالة الرحلات الدولية في مطار خليج نيوم.",
    },
    highlights: [
      { en: "Airport", ar: "المطارات" },
      { en: "NEOM, Saudi Arabia", ar: "نيوم، المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "neom-construction-village-camp", slug: "neom-construction-village-camp",
    name: { en: "NEOM Construction Villages Camp CV5 (NEOM Company)", ar: "مخيّم قرى الإنشاءات CV5 في نيوم (شركة نيوم)" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "NEOM, Saudi Arabia", ar: "نيوم، المملكة العربية السعودية" },
    category: "ppp",
    sectors: [],
    typology: { en: "PPP", ar: "الشراكة بين القطاعين العام والخاص" },
    status: null,
    featured: false,
    image: "neom-construction-village-camp",
    pos: '50% 50%',
    gallery: [
      { base: "neom-construction-village-camp", pos: '50% 50%', caption: { en: "NEOM Construction Villages Camp CV5 (NEOM Company)", ar: "مخيّم قرى الإنشاءات CV5 في نيوم (شركة نيوم)" } },
    ],
    summary: {
      en: "Construction villages camp CV5 for NEOM Company. A public-private partnership (PPP) project.",
      ar: "مخيّم قرى الإنشاءات CV5 لشركة نيوم، ضمن مشاريع الشراكة بين القطاعين العام والخاص.",
    },
    highlights: [
      { en: "PPP", ar: "الشراكة بين القطاعين العام والخاص" },
      { en: "NEOM, Saudi Arabia", ar: "نيوم، المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); confirm status, year, client and MOBCO’s role.", "Camp code read from a small screenshot caption (“CV5”, could be “CV3”); confirm."],
  },
  {
    id: "taif-municipality-building", slug: "taif-municipality-building",
    name: { en: "Taif Municipality Building", ar: "مبنى أمانة الطائف" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Taif, Saudi Arabia", ar: "الطائف، المملكة العربية السعودية" },
    category: "mixed-use-admin",
    sectors: ["business", "government"],
    typology: { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
    status: null,
    featured: true,
    image: "taif-municipality-building",
    pos: '50% 50%',
    gallery: [
      { base: "taif-municipality-building", pos: '50% 50%', caption: { en: "Taif Municipality Building", ar: "مبنى أمانة الطائف" } },
    ],
    summary: {
      en: "The municipality building in Taif, Saudi Arabia.",
      ar: "مبنى الأمانة في الطائف، المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
      { en: "Taif, Saudi Arabia", ar: "الطائف، المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "kaust-hotel", slug: "kaust-hotel",
    name: { en: "KAUST Hotel", ar: "فندق كاوست" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "KAUST, Thuwal, Saudi Arabia", ar: "كاوست، ثول، المملكة العربية السعودية" },
    category: "hospitality",
    sectors: ["hotels"],
    typology: { en: "Hospitality", ar: "الضيافة" },
    status: null,
    featured: false,
    image: "kaust-hotel",
    pos: '50% 50%',
    gallery: [
      { base: "kaust-hotel", pos: '50% 50%', caption: { en: "KAUST Hotel", ar: "فندق كاوست" } },
    ],
    summary: {
      en: "A hotel at KAUST in Thuwal, Saudi Arabia.",
      ar: "فندق في كاوست بثول، المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Hospitality", ar: "الضيافة" },
      { en: "KAUST, Thuwal, Saudi Arabia", ar: "كاوست، ثول، المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "bus-depot-west", slug: "bus-depot-west",
    name: { en: "Construction of Bus Depot (West)", ar: "إنشاء مستودع الحافلات (الغربي)" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "special-projects",
    sectors: [],
    typology: { en: "Special Projects", ar: "مشاريع خاصة" },
    status: null,
    featured: false,
    image: "bus-depot-west",
    pos: '50% 50%',
    gallery: [
      { base: "bus-depot-west", pos: '50% 50%', caption: { en: "Construction of Bus Depot (West)", ar: "إنشاء مستودع الحافلات (الغربي)" } },
    ],
    summary: {
      en: "Construction of the western bus depot in Saudi Arabia.",
      ar: "إنشاء مستودع الحافلات الغربي في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Special Projects", ar: "مشاريع خاصة" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "bus-depot-east", slug: "bus-depot-east",
    name: { en: "Construction of Bus Depot (East)", ar: "إنشاء مستودع الحافلات (الشرقي)" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "special-projects",
    sectors: [],
    typology: { en: "Special Projects", ar: "مشاريع خاصة" },
    status: null,
    featured: false,
    image: "bus-depot-east",
    pos: '50% 50%',
    gallery: [
      { base: "bus-depot-east", pos: '50% 50%', caption: { en: "Construction of Bus Depot (East)", ar: "إنشاء مستودع الحافلات (الشرقي)" } },
    ],
    summary: {
      en: "Construction of the eastern bus depot in Saudi Arabia.",
      ar: "إنشاء مستودع الحافلات الشرقي في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Special Projects", ar: "مشاريع خاصة" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "al-moosa-specialist-hospital", slug: "al-moosa-specialist-hospital",
    name: { en: "Al-Moosa Specialist Hospital", ar: "مستشفى الموسى التخصصي" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "medical",
    sectors: ["medical"],
    typology: { en: "Medical", ar: "الرعاية الصحية" },
    status: null,
    featured: true,
    image: "al-moosa-specialist-hospital",
    pos: '50% 50%',
    gallery: [
      { base: "al-moosa-specialist-hospital", pos: '50% 50%', caption: { en: "Al-Moosa Specialist Hospital", ar: "مستشفى الموسى التخصصي" } },
    ],
    summary: {
      en: "A specialist hospital project in Saudi Arabia.",
      ar: "مشروع مستشفى تخصصي في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Medical", ar: "الرعاية الصحية" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "neom-gayal-office-housing", slug: "neom-gayal-office-housing",
    name: { en: "Design & Build of NEOM Gayal Office Building & 20 Housing Units", ar: "تصميم وتنفيذ مبنى مكاتب قيال في نيوم و20 وحدة سكنية" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "NEOM, Saudi Arabia", ar: "نيوم، المملكة العربية السعودية" },
    category: "mixed-use-admin",
    sectors: ["business", "government"],
    typology: { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
    status: null,
    featured: false,
    image: "neom-gayal-office-housing",
    pos: '50% 50%',
    gallery: [
      { base: "neom-gayal-office-housing", pos: '50% 50%', caption: { en: "Design & Build of NEOM Gayal Office Building & 20 Housing Units", ar: "تصميم وتنفيذ مبنى مكاتب قيال في نيوم و20 وحدة سكنية" } },
    ],
    summary: {
      en: "Design and build of an office building and 20 housing units in Gayal, NEOM.",
      ar: "تصميم وتنفيذ مبنى مكاتب و20 وحدة سكنية في قيال بنيوم.",
    },
    highlights: [
      { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
      { en: "NEOM, Saudi Arabia", ar: "نيوم، المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "acoustic-barrier-nc1", slug: "acoustic-barrier-nc1",
    name: { en: "Acoustic Barrier System Installation at NC-1", ar: "تركيب نظام الحواجز الصوتية في NC-1" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "infrastructure",
    sectors: [],
    typology: { en: "Infrastructure", ar: "البنية التحتية" },
    status: null,
    featured: false,
    image: "acoustic-barrier-nc1",
    pos: '50% 50%',
    gallery: [
      { base: "acoustic-barrier-nc1", pos: '50% 50%', caption: { en: "Acoustic Barrier System Installation at NC-1", ar: "تركيب نظام الحواجز الصوتية في NC-1" } },
    ],
    summary: {
      en: "Installation of an acoustic barrier system at NC-1 in Saudi Arabia.",
      ar: "تركيب نظام حواجز صوتية في NC-1 بالمملكة العربية السعودية.",
    },
    highlights: [
      { en: "Infrastructure", ar: "البنية التحتية" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role.", "Location of “NC-1” not stated; confirm."],
  },
  {
    id: "al-jaffery-hotel", slug: "al-jaffery-hotel",
    name: { en: "Al Jaffery Hotel", ar: "فندق الجفري" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "hospitality",
    sectors: ["hotels"],
    typology: { en: "Hospitality", ar: "الضيافة" },
    status: null,
    featured: false,
    image: "al-jaffery-hotel",
    pos: '50% 50%',
    gallery: [
      { base: "al-jaffery-hotel", pos: '50% 50%', caption: { en: "Al Jaffery Hotel", ar: "فندق الجفري" } },
    ],
    summary: {
      en: "A hotel project in Saudi Arabia.",
      ar: "مشروع فندقي في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Hospitality", ar: "الضيافة" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "maad-towers-voco", slug: "maad-towers-voco",
    name: { en: "Maad Towers (voco by IHG)", ar: "أبراج معاد (فوكو من IHG)" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "hospitality",
    sectors: ["hotels"],
    typology: { en: "Hospitality", ar: "الضيافة" },
    status: null,
    featured: false,
    image: "maad-towers-voco",
    pos: '50% 50%',
    gallery: [
      { base: "maad-towers-voco", pos: '50% 50%', caption: { en: "Maad Towers (voco by IHG)", ar: "أبراج معاد (فوكو من IHG)" } },
    ],
    summary: {
      en: "Hotel towers for the voco by IHG brand in Saudi Arabia.",
      ar: "أبراج فندقية لعلامة فوكو من IHG في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Hospitality", ar: "الضيافة" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role.", "Arabic spelling of “Maad” to be confirmed by the client."],
  },
  {
    id: "jeddah-regional-building", slug: "jeddah-regional-building",
    name: { en: "Jeddah Regional Building Project", ar: "مشروع المبنى الإقليمي في جدة" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Jeddah, Saudi Arabia", ar: "جدة، المملكة العربية السعودية" },
    category: "mixed-use-admin",
    sectors: ["business", "government"],
    typology: { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
    status: null,
    featured: false,
    image: "jeddah-regional-building",
    pos: '50% 50%',
    gallery: [
      { base: "jeddah-regional-building", pos: '50% 50%', caption: { en: "Jeddah Regional Building Project", ar: "مشروع المبنى الإقليمي في جدة" } },
    ],
    summary: {
      en: "A regional building project in Jeddah.",
      ar: "مشروع مبنى إقليمي في جدة.",
    },
    highlights: [
      { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
      { en: "Jeddah, Saudi Arabia", ar: "جدة، المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "bank-albilad-head-office", slug: "bank-albilad-head-office",
    name: { en: "Bank AlBilad Head Office (Fit-Out Works)", ar: "المقر الرئيسي لبنك البلاد (أعمال التجهيزات الداخلية)" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "mixed-use-admin",
    sectors: ["business", "government"],
    typology: { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
    status: null,
    featured: false,
    image: "bank-albilad-head-office",
    pos: '50% 50%',
    gallery: [
      { base: "bank-albilad-head-office", pos: '50% 50%', caption: { en: "Bank AlBilad Head Office (Fit-Out Works)", ar: "المقر الرئيسي لبنك البلاد (أعمال التجهيزات الداخلية)" } },
    ],
    summary: {
      en: "Fit-out works for the head office of Bank AlBilad in Saudi Arabia.",
      ar: "أعمال التجهيزات الداخلية للمقر الرئيسي لبنك البلاد في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "park-inn-olaya-hotel", slug: "park-inn-olaya-hotel",
    name: { en: "Park Inn Olaya Hotel", ar: "فندق بارك إن العليا" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Olaya, Riyadh, Saudi Arabia", ar: "العليا، الرياض، المملكة العربية السعودية" },
    category: "hospitality",
    sectors: ["hotels"],
    typology: { en: "Hospitality", ar: "الضيافة" },
    status: null,
    featured: false,
    image: "park-inn-olaya-hotel",
    pos: '50% 50%',
    gallery: [
      { base: "park-inn-olaya-hotel", pos: '50% 50%', caption: { en: "Park Inn Olaya Hotel", ar: "فندق بارك إن العليا" } },
    ],
    summary: {
      en: "A Park Inn hotel in Olaya, Riyadh.",
      ar: "فندق بارك إن في حي العليا بالرياض.",
    },
    highlights: [
      { en: "Hospitality", ar: "الضيافة" },
      { en: "Olaya, Riyadh, Saudi Arabia", ar: "العليا، الرياض، المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "mawten-masar-tower", slug: "mawten-masar-tower",
    name: { en: "Mawten Masar Tower", ar: "برج موطن مسار" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "hospitality",
    sectors: ["hotels"],
    typology: { en: "Hospitality", ar: "الضيافة" },
    status: null,
    featured: false,
    image: "mawten-masar-tower",
    pos: '50% 50%',
    gallery: [
      { base: "mawten-masar-tower", pos: '50% 50%', caption: { en: "Mawten Masar Tower", ar: "برج موطن مسار" } },
    ],
    summary: {
      en: "A hospitality tower project in Saudi Arabia.",
      ar: "مشروع برج للضيافة في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Hospitality", ar: "الضيافة" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role.", "Name read from a small screenshot caption; confirm spelling (EN + AR)."],
  },
  {
    id: "raffles-hotel-residence", slug: "raffles-hotel-residence",
    name: { en: "Raffles Hotel & Branded Residence (Main Works Package)", ar: "فندق رافلز والمساكن الفاخرة (حزمة الأعمال الرئيسية)" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "hospitality",
    sectors: ["hotels"],
    typology: { en: "Hospitality", ar: "الضيافة" },
    status: null,
    featured: true,
    image: "raffles-hotel-residence",
    pos: '50% 50%',
    gallery: [
      { base: "raffles-hotel-residence", pos: '50% 50%', caption: { en: "Raffles Hotel & Branded Residence (Main Works Package)", ar: "فندق رافلز والمساكن الفاخرة (حزمة الأعمال الرئيسية)" } },
    ],
    summary: {
      en: "The main works package for a Raffles hotel and branded residences in Saudi Arabia.",
      ar: "حزمة الأعمال الرئيسية لفندق رافلز والمساكن الفاخرة في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Hospitality", ar: "الضيافة" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role.", "Caption partly hidden in the screenshot (“Br… Residence”); confirm full name."],
  },
  {
    id: "khobar-regional-building", slug: "khobar-regional-building",
    name: { en: "Khobar Regional Building Project", ar: "مشروع المبنى الإقليمي في الخبر" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Al Khobar, Saudi Arabia", ar: "الخبر، المملكة العربية السعودية" },
    category: "mixed-use-admin",
    sectors: ["business", "government"],
    typology: { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
    status: null,
    featured: false,
    image: "khobar-regional-building",
    pos: '50% 50%',
    gallery: [
      { base: "khobar-regional-building", pos: '50% 50%', caption: { en: "Khobar Regional Building Project", ar: "مشروع المبنى الإقليمي في الخبر" } },
    ],
    summary: {
      en: "A regional building project in Al Khobar.",
      ar: "مشروع مبنى إقليمي في الخبر.",
    },
    highlights: [
      { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
      { en: "Al Khobar, Saudi Arabia", ar: "الخبر، المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "sulaiman-fakeeh-hospital", slug: "sulaiman-fakeeh-hospital",
    name: { en: "Sulaiman Fakeeh Hospital", ar: "مستشفى سليمان فقيه" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "medical",
    sectors: ["medical"],
    typology: { en: "Medical", ar: "الرعاية الصحية" },
    status: null,
    featured: true,
    image: "sulaiman-fakeeh-hospital",
    pos: '50% 50%',
    gallery: [
      { base: "sulaiman-fakeeh-hospital", pos: '50% 50%', caption: { en: "Sulaiman Fakeeh Hospital", ar: "مستشفى سليمان فقيه" } },
    ],
    summary: {
      en: "A hospital project in Saudi Arabia.",
      ar: "مشروع مستشفى في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Medical", ar: "الرعاية الصحية" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "axis-olaya-business-tower", slug: "axis-olaya-business-tower",
    name: { en: "Axis-Olaya Business Tower", ar: "برج أكسيس العليا للأعمال" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Olaya, Riyadh, Saudi Arabia", ar: "العليا، الرياض، المملكة العربية السعودية" },
    category: "mixed-use-admin",
    sectors: ["business", "government"],
    typology: { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
    status: null,
    featured: false,
    image: "axis-olaya-business-tower",
    pos: '50% 50%',
    gallery: [
      { base: "axis-olaya-business-tower", pos: '50% 50%', caption: { en: "Axis-Olaya Business Tower", ar: "برج أكسيس العليا للأعمال" } },
    ],
    summary: {
      en: "A business tower in Olaya, Riyadh.",
      ar: "برج أعمال في حي العليا بالرياض.",
    },
    highlights: [
      { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" },
      { en: "Olaya, Riyadh, Saudi Arabia", ar: "العليا، الرياض، المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "tbc-schools-group-12", slug: "tbc-schools-group-12",
    name: { en: "TBC Schools (Group 12)", ar: "مدارس شركة تطوير للمباني (TBC)، المجموعة 12" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    category: "education",
    sectors: ["education"],
    typology: { en: "Education", ar: "التعليم" },
    status: null,
    featured: false,
    image: "tbc-schools-group-12",
    pos: '50% 50%',
    gallery: [
      { base: "tbc-schools-group-12", pos: '50% 50%', caption: { en: "TBC Schools (Group 12)", ar: "مدارس شركة تطوير للمباني (TBC)، المجموعة 12" } },
    ],
    summary: {
      en: "Group 12 of the TBC school projects in Saudi Arabia.",
      ar: "المجموعة 12 من مشاريع مدارس شركة تطوير للمباني (TBC) في المملكة العربية السعودية.",
    },
    highlights: [
      { en: "Education", ar: "التعليم" },
      { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); city not stated; confirm status, year, client and MOBCO’s role."],
  },
  {
    id: "neom-truck-service-center", slug: "neom-truck-service-center",
    name: { en: "Design-Build of NEOM Truck Service Center", ar: "تصميم وتنفيذ مركز خدمة الشاحنات في نيوم" },
    nameIsDescriptive: false,
    region: 'ksa',
    location: { en: "NEOM, Saudi Arabia", ar: "نيوم، المملكة العربية السعودية" },
    category: "special-projects",
    sectors: [],
    typology: { en: "Special Projects", ar: "مشاريع خاصة" },
    status: null,
    featured: false,
    image: "neom-truck-service-center",
    pos: '50% 50%',
    gallery: [
      { base: "neom-truck-service-center", pos: '50% 50%', caption: { en: "Design-Build of NEOM Truck Service Center", ar: "تصميم وتنفيذ مركز خدمة الشاحنات في نيوم" } },
    ],
    summary: {
      en: "Design and build of a truck service center in NEOM.",
      ar: "تصميم وتنفيذ مركز لخدمة الشاحنات في نيوم.",
    },
    highlights: [
      { en: "Special Projects", ar: "مشاريع خاصة" },
      { en: "NEOM, Saudi Arabia", ar: "نيوم، المملكة العربية السعودية" },
    ],
    studioModel: null,
    todo: ["Region assumed Saudi Arabia (listed on the client’s projects page); confirm status, year, client and MOBCO’s role."],
  },
];

export const PROJECT_CATEGORIES = [
  { id: "airport", icon: "plane", name: { en: "Airport", ar: "المطارات" }, sectors: [] },
  { id: "education", icon: "graduation-cap", name: { en: "Education", ar: "التعليم" }, sectors: ["education"] },
  { id: "hospitality", icon: "hotel", name: { en: "Hospitality", ar: "الضيافة" }, sectors: ["hotels"] },
  { id: "infrastructure", icon: "route", name: { en: "Infrastructure", ar: "البنية التحتية" }, sectors: [] },
  { id: "medical", icon: "hospital", name: { en: "Medical", ar: "الرعاية الصحية" }, sectors: ["medical"] },
  { id: "mixed-use-admin", icon: "building-2", name: { en: "Mixed Use / Administration", ar: "متعدد الاستخدامات / إداري" }, sectors: ["business", "government", "skyscrapers", "malls"] },
  { id: "ppp", icon: "handshake", name: { en: "PPP", ar: "الشراكة بين القطاعين العام والخاص" }, sectors: [] },
  { id: "special-projects", icon: "sparkles", name: { en: "Special Projects", ar: "مشاريع خاصة" }, sectors: [] },
  { id: "residential", icon: "house", name: { en: "Residential", ar: "السكني" }, sectors: ["residential"] },
];
export const getCategory = (id) => PROJECT_CATEGORIES.find((c) => c.id === id) || null;

/* ------------------------------------------------------------------ navigation */
export const NAV = [
  { id: 'home', href: 'index.html', label: { en: 'Home', ar: 'الرئيسية' } },
  { id: 'about', href: 'about.html', label: { en: 'About', ar: 'من نحن' } },
  { id: 'subsidiaries', href: 'subsidiaries.html', label: { en: 'Subsidiaries', ar: 'الشركات التابعة' } },
  { id: 'projects', href: 'projects.html', label: { en: 'Projects', ar: 'المشاريع' }, mega: true },
  { id: 'studio', href: 'studio.html', label: { en: 'Explore in 3D', ar: 'تجوّل ثلاثي الأبعاد' } },
  { id: 'media', href: 'media.html', label: { en: 'Media', ar: 'الإعلام' } },
  { id: 'careers', href: 'careers.html', label: { en: 'Careers', ar: 'الوظائف' } },
  { id: 'contact', href: 'contact.html', label: { en: 'Contact', ar: 'تواصل معنا' } },
];
export const CTA = { href: 'contact.html#inquiry', label: { en: 'Start a project', ar: 'ابدأ مشروعك' } };

/* ------------------------------------------------------------------ pages (search index) */
export const PAGES = [
  {
    id: 'home', url: 'index.html', icon: 'house',
    title: { en: 'Home', ar: 'الرئيسية' },
    description: { en: 'Integrity & Excellence. A legacy of trust since 2001.', ar: 'النزاهة والتميّز. إرثٌ من الثقة منذ عام 2001.' },
    keywords: { en: ['mobco', 'group', 'construction', 'stats', 'projects delivered', 'legacy of trust'], ar: ['موبكو', 'مجموعة', 'إنشاءات', 'إرث من الثقة', 'مشاريع'] },
  },
  {
    id: 'about', url: 'about.html', icon: 'building-2',
    title: { en: 'About MOBCO Group', ar: 'عن مجموعة موبكو' },
    description: { en: 'Our story since 2001, vision, mission and core values.', ar: 'قصتنا منذ عام 2001، ورؤيتنا ورسالتنا وقيمنا الجوهرية.' },
    keywords: { en: ['about', 'history', '2001', 'vision', 'mission', 'values', 'safety', 'integrity', 'excellence', 'turnover'], ar: ['من نحن', 'تاريخ', 'رؤية', 'رسالة', 'قيم', 'السلامة', 'النزاهة', 'التميز'] },
  },
  {
    id: 'subsidiaries', url: 'subsidiaries.html', icon: 'network',
    title: { en: 'Subsidiaries', ar: 'الشركات التابعة' },
    description: { en: 'Construction, developments, real estate development and education.', ar: 'الإنشاءات والتطوير والتطوير العقاري والتعليم.' },
    keywords: { en: ['subsidiaries', 'companies', 'construction', 'developments', 'real estate', 'education', 'elite'], ar: ['الشركات التابعة', 'شركات', 'إنشاءات', 'تطوير', 'عقاري', 'تعليم', 'النخبة'] },
  },
  {
    id: 'mobco-construction', url: 'mobco-construction.html', icon: 'hard-hat',
    title: { en: 'MOBCO Construction', ar: 'موبكو للإنشاءات' },
    description: { en: 'The construction arm of MOBCO Group, founded in 2001.', ar: 'الذراع الإنشائية لمجموعة موبكو، تأسّست عام 2001.' },
    keywords: { en: ['construction', 'contracting', 'contractor', 'general contracting', 'tier one', 'building', 'uk', 'canada', 'egypt', 'saudi arabia', '438 projects'], ar: ['إنشاءات', 'مقاولات', 'مقاول', 'المقاولات العامة', 'الفئة الأولى', 'بناء', 'المملكة المتحدة', 'كندا', 'مصر', 'السعودية'] },
  },
  {
    id: 'mobco-developments', url: 'mobco-developments.html', icon: 'building',
    title: { en: 'MOBCO Developments', ar: 'موبكو للتطوير' },
    description: { en: 'Development projects in Egypt and Canada.', ar: 'مشاريع تطوير في مصر وكندا.' },
    keywords: { en: ['developments', 'developer', 'real estate development', 'egypt', 'canada', 'eastmain', 'victoria 101', 'new cairo', 'port whitby', 'sustainability'], ar: ['تطوير', 'مطوّر', 'التطوير العقاري', 'مصر', 'كندا', 'إيست مين', 'فيكتوريا 101', 'القاهرة الجديدة', 'الاستدامة'] },
  },
  {
    id: 'mobco-real-estate', url: 'mobco-real-estate.html', icon: 'landmark',
    title: { en: 'MOBCO Real Estate Development', ar: 'موبكو للتطوير العقاري' },
    description: { en: 'Leasing and property management in Cairo since 2002.', ar: 'تأجير وإدارة العقارات في القاهرة منذ عام 2002.' },
    keywords: { en: ['real estate', 'leasing', 'lease', 'property management', 'offices', 'office space', 'mivida', 'business park', 'b1', 'cairo', 'tenants'], ar: ['عقارات', 'تأجير', 'إيجار', 'إدارة العقارات', 'مكاتب', 'مساحات مكتبية', 'ميفيدا', 'مجمّع الأعمال', 'القاهرة', 'مستأجرين'] },
  },
  {
    id: 'projects', url: 'projects.html', icon: 'layout-grid',
    title: { en: 'Projects', ar: 'المشاريع' },
    description: { en: 'Our projects in Saudi Arabia, Egypt and Canada.', ar: 'مشاريعنا في السعودية ومصر وكندا.' },
    keywords: { en: ['projects', 'portfolio', 'map', 'ksa', 'egypt', 'canada', 'residential', 'mixed-use'], ar: ['مشاريع', 'أعمال', 'خريطة', 'السعودية', 'مصر', 'كندا', 'سكني'] },
  },
  {
    id: 'studio', url: 'studio.html', icon: 'rotate-3d',
    title: { en: 'Explore in 3D', ar: 'تجوّل ثلاثي الأبعاد' },
    description: { en: 'Turn, zoom and take apart 3D models of our work.', ar: 'أدِر نماذج مشاريعنا ثلاثية الأبعاد وقرّبها وافصل طوابقها.' },
    keywords: { en: ['explore in 3d', '3d tour', '3d', 'studio', 'viewer', 'model', 'interactive', 'massing'], ar: ['استكشف', 'جولة', 'ثلاثي الأبعاد', 'استوديو', 'نموذج', 'تفاعلي', 'مجسم'] },
  },
  {
    id: 'media', url: 'media.html', icon: 'images',
    title: { en: 'Media Centre', ar: 'المركز الإعلامي' },
    description: { en: 'Image gallery, brand assets and press resources.', ar: 'معرض الصور والهوية المؤسسية والموارد الصحفية.' },
    keywords: { en: ['media', 'gallery', 'images', 'press', 'brand', 'logo', 'downloads'], ar: ['إعلام', 'معرض', 'صور', 'صحافة', 'هوية', 'شعار'] },
  },
  {
    id: 'careers', url: 'careers.html', icon: 'briefcase',
    title: { en: 'Careers', ar: 'الوظائف' },
    description: { en: 'Join our teams in Saudi Arabia and Egypt.', ar: 'انضم إلى فرقنا في السعودية ومصر.' },
    keywords: { en: ['careers', 'jobs', 'join', 'cv', 'resume', 'hr', 'engineers', 'bim', 'hse', 'quantity surveying', 'procurement', 'facility management'], ar: ['وظائف', 'توظيف', 'انضم', 'سيرة ذاتية', 'موارد بشرية', 'مهندسين', 'نمذجة معلومات البناء', 'الصحة والسلامة والبيئة', 'حساب الكميات', 'المشتريات', 'إدارة المرافق'] },
  },
  {
    id: 'contact', url: 'contact.html', icon: 'mail',
    title: { en: 'Contact', ar: 'تواصل معنا' },
    description: { en: 'Our Riyadh headquarters and Cairo office.', ar: 'مقرّنا الرئيسي في الرياض ومكتبنا في القاهرة.' },
    keywords: { en: ['contact', 'address', 'phone', 'email', 'riyadh', 'cairo', 'office', 'inquiry', 'map'], ar: ['تواصل', 'عنوان', 'هاتف', 'بريد', 'الرياض', 'القاهرة', 'مكتب', 'استفسار'] },
  },
];

/** Shortcuts shown in the empty search state. */
export const QUICK_LINKS = [
  { url: 'contact.html#inquiry', icon: 'send', title: { en: 'Start a project', ar: 'ابدأ مشروعك' }, description: { en: 'Send us an inquiry', ar: 'أرسل لنا استفسارك' } },
  { url: 'studio.html', icon: 'rotate-3d', title: { en: 'Explore in 3D', ar: 'تجوّل ثلاثي الأبعاد' }, description: { en: 'Our work as 3D models', ar: 'مشاريعنا بنماذج ثلاثية الأبعاد' } },
  { url: 'careers.html', icon: 'briefcase', title: { en: 'Careers', ar: 'الوظائف' }, description: { en: 'Join our teams', ar: 'انضم إلى فرقنا' } },
];

/* ------------------------------------------------------------------ helpers */
export const getProject = (id) => PROJECTS.find((p) => p.id === id || p.slug === id) || null;
export const getSubsidiary = (id) => SUBSIDIARIES.find((s) => s.id === id) || null;
export const getSector = (id) => SECTORS.find((s) => s.id === id) || null;
export const getRegion = (id) => REGIONS.find((r) => r.id === id) || null;
export const getOffice = (id) => OFFICES.find((o) => o.id === id) || null;
export const getPage = (id) => PAGES.find((p) => p.id === id) || null;
/** Filter projects: projectsBy({ region: 'egypt', sector: 'residential', category: 'hospitality', featured: true }) */
export function projectsBy({ region, sector, category, featured } = {}) {
  return PROJECTS.filter((p) => (!region || p.region === region) && (!sector || p.sectors.includes(sector))
    && (!category || p.category === category) && (featured === undefined || !!p.featured === featured));
}
/** URL of a project detail anchor on the projects page. */
export const projectUrl = (p) => `projects.html#${typeof p === 'string' ? p : p.slug}`;
/** URL of a project in the Explore in 3D (studio.html). */
export const studioUrl = (p) => `studio.html?model=${typeof p === 'string' ? getProject(p)?.studioModel || p : p.studioModel}`;
