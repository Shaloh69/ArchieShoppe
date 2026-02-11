import { Link } from "@heroui/link";
import { Snippet } from "@heroui/snippet";
import { Code } from "@heroui/code";
import { button as buttonStyles } from "@heroui/theme";

import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        <span className={title()}>Make&nbsp;</span>
        <span className={title({ color: "pink" })}>beautiful&nbsp;</span> 
        <br />
        <span className={title()}>
          my course work.
        </span>
        <p> Rhodel was here </p>
      </div>

      <div className="flex gap-3">
        <Link
          isExternal
          className={buttonStyles({
            color: "primary",
            radius: "full",
            variant: "shadow",
          })}
          href={siteConfig.links.docs}
        >
          Documentation
        </Link>
        <Link
          isExternal
          className={buttonStyles({ variant: "bordered", radius: "full" })}
          href={siteConfig.links.github}
        >
          <GithubIcon size={20} />
          GitHub
        </Link>
      </div>

      <div className="mt-8">
        <Snippet hideCopyButton hideSymbol variant="bordered">
          <span>
            Get started by editing <Code color="primary">app/page.tsx</Code>
          </span>
           <span>
            Dili diay ko <Code color="primary">app/page.tsx</Code>
          </span>
        </Snippet>
      </div>

      <div className="inline-block max-w-xl text-center justify-center">
        <span className={title()}>EARL LAWRENCE R. LACUBTAN&nbsp;</span>
        <span className={title({ color: "cyan" })}>Bachelor of Science in Computer Engineering&nbsp;</span>
        <br />
        <span className={title()}>
          2025-2026.
        </span>
      </div>
    </section>
  );
}
