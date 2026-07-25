export type ToolNavItem = {
  href: string;
  titleKey: string;
  shortLabelKey: string;
  descriptionKey: string;
  verticalId: string;
};

export type HeaderNavItem = {
  href: string;
  labelKey: string;
};

export type SidebarGroup = {
  titleKey: string;
  items: Array<{ labelKey: string; href: string }>;
};

export type SolutionVertical = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  toolHrefs: string[];
};

export const HEADER_NAV_ITEMS: HeaderNavItem[] = [
  { href: "/#producto", labelKey: "nav.product" },
  { href: "/#soluciones", labelKey: "nav.solutions" },
  { href: "/#planes", labelKey: "nav.pricing" },
  { href: "/#recursos", labelKey: "nav.resources" },
  { href: "http://localhost:8000/swagger-ui.html", labelKey: "nav.docs" },
  { href: "/#comunidad", labelKey: "nav.community" }
];

export const TOOL_NAV_ITEMS: ToolNavItem[] = [
  {
    href: "/tools/core",
    titleKey: "tools.core.title",
    shortLabelKey: "tools.core.short",
    descriptionKey: "tools.core.description",
    verticalId: "platform-core"
  },
  {
    href: "/tools/newsletter",
    titleKey: "tools.newsletter.title",
    shortLabelKey: "tools.newsletter.short",
    descriptionKey: "tools.newsletter.description",
    verticalId: "enterprise-copilot"
  },
  {
    href: "/tools/pricing",
    titleKey: "tools.pricing.title",
    shortLabelKey: "tools.pricing.short",
    descriptionKey: "tools.pricing.description",
    verticalId: "commercial-intelligence"
  },
  {
    href: "/tools/market",
    titleKey: "tools.market.title",
    shortLabelKey: "tools.market.short",
    descriptionKey: "tools.market.description",
    verticalId: "mercantile-intelligence"
  },
  {
    href: "/tools/simulator",
    titleKey: "tools.simulator.title",
    shortLabelKey: "tools.simulator.short",
    descriptionKey: "tools.simulator.description",
    verticalId: "financial-intelligence"
  }
];

export const SOLUTION_VERTICALS: SolutionVertical[] = [
  {
    id: "mercantile-intelligence",
    titleKey: "vertical.mercantileIntelligence.title",
    descriptionKey: "vertical.mercantileIntelligence.description",
    toolHrefs: ["/tools/market"]
  },
  {
    id: "financial-intelligence",
    titleKey: "vertical.financialIntelligence.title",
    descriptionKey: "vertical.financialIntelligence.description",
    toolHrefs: ["/tools/simulator"]
  },
  {
    id: "commercial-intelligence",
    titleKey: "vertical.commercialIntelligence.title",
    descriptionKey: "vertical.commercialIntelligence.description",
    toolHrefs: ["/tools/pricing"]
  },
  {
    id: "enterprise-copilot",
    titleKey: "vertical.enterpriseCopilot.title",
    descriptionKey: "vertical.enterpriseCopilot.description",
    toolHrefs: ["/tools/newsletter"]
  }
];

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    titleKey: "sidebar.explore",
    items: [
      { labelKey: "sidebar.executiveSummary", href: "/dashboard" },
      { labelKey: "tools.market.title", href: "/tools/market" },
      { labelKey: "tools.newsletter.title", href: "/tools/newsletter" }
    ]
  },
  {
    titleKey: "sidebar.build",
    items: [
      { labelKey: "sidebar.pricingStudio", href: "/tools/pricing" },
      { labelKey: "tools.simulator.title", href: "/tools/simulator" },
      { labelKey: "tools.core.title", href: "/tools/core" }
    ]
  },
  {
    titleKey: "sidebar.govern",
    items: [
      { labelKey: "sidebar.usersRoles", href: "/tools/core" },
      { labelKey: "sidebar.permissionsSecurity", href: "/tools/core" },
      { labelKey: "sidebar.saasSubscriptions", href: "/tools/core" }
    ]
  }
];
