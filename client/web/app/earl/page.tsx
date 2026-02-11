import { title } from "@/components/primitives";

interface SearchBarProps { onSearch: (query: string) => void; }


export default function DocsPage() {
  return (
    <div>
      <h1 className={title()}>Hello! Earl</h1>
    </div>
  );
}
