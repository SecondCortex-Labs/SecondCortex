import { LINKS, WORDMARK } from "./content";
import s from "./landing.module.css";

const GROUPS: ReadonlyArray<{ title: string; links: ReadonlyArray<{ label: string; href: string }> }> = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how" },
      { label: "Demo", href: "#demo" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Access",
    links: [
      { label: "Login", href: "/login" },
      { label: "Sign up", href: "/signup" },
      { label: "Live graph", href: "/live" },
      { label: "Team Cortex", href: "/?pm=true" },
      { label: "Offline setup", href: "/offline-setup" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "GitHub", href: LINKS.github },
      { label: "VS Code Marketplace", href: LINKS.marketplace },
      { label: "Documentation", href: LINKS.docs },
      { label: "Thesis", href: "/thesis" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "founder@secondcortex.tech", href: "mailto:founder@secondcortex.tech" },
      { label: "+91 9346445141", href: "tel:+919346445141" },
      { label: "secondcortex.tech", href: "https://secondcortex.tech" },
    ],
  },
];

const rows = WORDMARK.split("\n");
const half = rows.length / 2;
const width = Math.max(...rows.slice(0, half).map((row) => row.length));
const WORDMARK_LINE = rows
  .slice(0, half)
  .map((row, i) => `${row.padEnd(width + 1)}${rows[half + i]}`)
  .join("\n");

export default function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.container}>
        <div className={s.footerGrid}>
          <div className={s.footerBrand}>
            <p>Memory for you and your AI coding agents.</p>
            <p className={s.label}>SecondCortex Labs · MIT Manipal, Eswar Nagar, Manipal, Karnataka</p>
          </div>
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className={`${s.label} ${s.footerTitle}`}>{group.title}</p>
              <ul className={s.footerLinks}>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a
                      className={s.footerLink}
                      href={link.href}
                      {...(link.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={s.wordmarkWrap} aria-hidden="true">
          <pre className={`${s.wordmark} ${s.wordmarkStacked}`}>{WORDMARK}</pre>
          <pre className={`${s.wordmark} ${s.wordmarkLine}`}>{WORDMARK_LINE}</pre>
        </div>

        <div className={`${s.legal} ${s.label}`}>
          <span>© 2026 SecondCortex Labs</span>
          <span>MIT licensed · built in Manipal</span>
        </div>
      </div>
    </footer>
  );
}
