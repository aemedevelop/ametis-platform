export type ToolNavItem = {
  href: string;
  titleKey: string;
  shortLabelKey: string;
  descriptionKey: string;
  verticalId: string;
  disabled?: boolean;
  statusKey?: string;
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
    verticalId: "platform-core",
    disabled: true,
    statusKey: "tools.status.soon"
  },
  {
    href: "/tools/newsletter",
    titleKey: "tools.newsletter.title",
    shortLabelKey: "tools.newsletter.short",
    descriptionKey: "tools.newsletter.description",
    verticalId: "enterprise-copilot",
    disabled: true,
    statusKey: "tools.status.soon"
  },
  {
    href: "https://ametis.agent-factory.aemetech.com",
    titleKey: "tools.agentFactory.title",
    shortLabelKey: "tools.agentFactory.short",
    descriptionKey: "tools.agentFactory.description",
    verticalId: "enterprise-copilot"
  },
  {
    href: "/tools/pricing",
    titleKey: "tools.pricing.title",
    shortLabelKey: "tools.pricing.short",
    descriptionKey: "tools.pricing.description",
    verticalId: "commercial-intelligence",
    disabled: true,
    statusKey: "tools.status.soon"
  },
  {
    href: "/tools/market",
    titleKey: "tools.market.title",
    shortLabelKey: "tools.market.short",
    descriptionKey: "tools.market.description",
    verticalId: "mercantile-intelligence",
    disabled: true,
    statusKey: "tools.status.soon"
  },
  {
    href: "/tools/simulator",
    titleKey: "tools.simulator.title",
    shortLabelKey: "tools.simulator.short",
    descriptionKey: "tools.simulator.description",
    verticalId: "financial-intelligence",
    disabled: true,
    statusKey: "tools.status.soon"
  }
];

export const SOLUTION_VERTICALS: SolutionVertical[] = [
  {
    id: "enterprise-copilot",
    titleKey: "vertical.enterpriseCopilot.title",
    descriptionKey: "vertical.enterpriseCopilot.description",
    toolHrefs: ["https://ametis.agent-factory.aemetech.com"]
  },
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
  }
];

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    titleKey: "sidebar.explore",
    items: [
      { labelKey: "sidebar.executiveSummary", href: "/dashboard" },
      { labelKey: "tools.market.title", href: "/tools/market" },
      { labelKey: "tools.newsletter.title", href: "/tools/newsletter" },
      { labelKey: "tools.agentFactory.title", href: "/tools/agent-factory" }
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
